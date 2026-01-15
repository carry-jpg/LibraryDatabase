import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const API_BASE = process.env.API_BASE || "http://localhost:8000";
const OLID = (process.env.TEST_OLID || "OL7353617M").trim(); // should be an edition OLID ending with M
const OUT_DIR = path.resolve("tests-runner", "output");

fs.mkdirSync(OUT_DIR, { recursive: true });

function nowIso() {
  return new Date().toISOString();
}

function makeClient() {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      baseURL: API_BASE,
      withCredentials: true,
      jar,
      validateStatus: () => true
    })
  );
  return client;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function api(client, method, url, data) {
  const res = await client.request({ method, url, data });
  return res;
}

function record(results, name, status, extra = {}) {
  results.push({ name, status, at: nowIso(), ...extra });
}

async function runTest(results, name, fn) {
  try {
    await fn();
    record(results, name, "PASS");
  } catch (e) {
    record(results, name, "FAIL", { error: String(e?.message || e) });
  }
}

async function runSkip(results, name, reason) {
  record(results, name, "SKIP", { reason });
}

function writeReports(meta, results) {
  const json = { meta, results };
  fs.writeFileSync(path.join(OUT_DIR, "test-results.json"), JSON.stringify(json, null, 2), "utf-8");

  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  const skip = results.filter(r => r.status === "SKIP").length;

  const lines = [];
  lines.push("# TomeNest – Automated API Test Results");
  lines.push("");
  lines.push(`- Date: ${nowIso()}`);
  lines.push(`- API_BASE: ${meta.API_BASE}`);
  lines.push(`- TEST_OLID: ${meta.OLID}`);
  lines.push(`- Admin email: ${meta.adminEmail}`);
  lines.push(`- User email: ${meta.userEmail}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Total: ${results.length}`);
  lines.push(`- Passed: ${pass}`);
  lines.push(`- Failed: ${fail}`);
  lines.push(`- Skipped: ${skip}`);
  lines.push("");
  lines.push("## Details");
  for (const r of results) {
    lines.push(`- ${r.status} — ${r.name}`);
    if (r.reason) lines.push(`  - Reason: ${r.reason}`);
    if (r.error) lines.push(`  - Error: ${r.error}`);
  }
  lines.push("");

  fs.writeFileSync(path.join(OUT_DIR, "TEST_RESULTS.md"), lines.join("\n"), "utf-8");
}

async function main() {
  const results = [];
  const suffix = Date.now();

  const adminEmail = `admin_${suffix}@example.com`;
  const userEmail = `user_${suffix}@example.com`;
  const adminPass = "password123";
  const userPass = "password123";

  const anon = makeClient();
  const admin = makeClient();
  const user = makeClient();

  const meta = { API_BASE, OLID, adminEmail, userEmail };

  // 0) Unauthenticated checks
  await runTest(results, "Unauthenticated /api/auth/me returns 401", async () => {
    const res = await api(anon, "GET", "/api/auth/me");
    assert(res.status === 401, `Expected 401, got ${res.status} :: ${JSON.stringify(res.data)}`);
  });

  // 1) Register admin (first user becomes admin on fresh DB)
  let adminRole = null;
  await runTest(results, "Register admin user", async () => {
    const res = await api(admin, "POST", "/api/auth/register", {
      email: adminEmail,
      name: "Admin User",
      password: adminPass
    });
    assert(res.status === 201, `Expected 201, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.user?.email === adminEmail, "Admin email mismatch");
    adminRole = res.data?.user?.role || null;
  });

  await runTest(results, "Admin /api/auth/me returns current session", async () => {
    const res = await api(admin, "GET", "/api/auth/me");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.user?.email === adminEmail, "Session user mismatch");
  });

  // 2) Register normal user
  await runTest(results, "Register normal user", async () => {
    const res = await api(user, "POST", "/api/auth/register", {
      email: userEmail,
      name: "Normal User",
      password: userPass
    });
    assert(res.status === 201, `Expected 201, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.user?.email === userEmail, "User email mismatch");
  });

  await runTest(results, "User /api/auth/me returns current session", async () => {
    const res = await api(user, "GET", "/api/auth/me");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.user?.email === userEmail, "Session user mismatch");
  });

  // If DB was not fresh, the "admin" might actually be a user -> admin-only tests would fail.
  const hasAdmin = adminRole === "admin";
  if (!hasAdmin) {
    await runSkip(
      results,
      "Admin-only tests block",
      `First registered account role is '${adminRole}'. For a full admin flow test, start with an empty users table so the first user becomes admin.`
    );

    writeReports(meta, results);
    process.exit(results.some(r => r.status === "FAIL") ? 1 : 0);
  }

  // 3) Authorization check (user blocked from admin endpoint)
  await runTest(results, "Non-admin blocked from /api/wishlist/admin/summary (403)", async () => {
    const res = await api(user, "GET", "/api/wishlist/admin/summary");
    assert(res.status === 403, `Expected 403, got ${res.status} :: ${JSON.stringify(res.data)}`);
  });

  // 4) Stock setup: create 1 copy to rent
  await runTest(results, "Admin sets stock (POST /api/stock/set)", async () => {
    const res = await api(admin, "POST", "/api/stock/set", {
      olid: OLID,
      quality: 3,
      quantity: 1,
      importIfMissing: true
    });
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.ok === true, "Expected { ok: true }");
  });

  // 5) Get stockId from /api/stock/list
  let stockId = null;
  await runTest(results, "Stock list returns the created OLID with stockId", async () => {
    const res = await api(admin, "GET", "/api/stock/list");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(Array.isArray(res.data), "Expected array response");
    const row = res.data.find(r => String(r?.openlibraryid || "").toUpperCase() === OLID.toUpperCase());
    assert(row, `Stock row not found for OLID ${OLID}`);
    stockId = Number(row.stockid);
    assert(Number.isFinite(stockId) && stockId > 0, "Invalid stockId");
  });

  // 6) Wishlist tests
  await runTest(results, "Wishlist toggle add returns wished=true", async () => {
    const res = await api(user, "POST", "/api/wishlist/toggle", {
      olid: OLID,
      title: "Test title",
      author: "Test author",
      releaseyear: 2000,
      coverurl: `https://covers.openlibrary.org/b/olid/${OLID}-M.jpg?default=false`
    });
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.wished === true, "Expected wished=true");
  });

  await runTest(results, "Wishlist ids contains OLID", async () => {
    const res = await api(user, "GET", "/api/wishlist/ids");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(Array.isArray(res.data), "Expected array of ids");
    assert(res.data.map(x => String(x).toUpperCase()).includes(OLID.toUpperCase()), "OLID not found in wishlist ids");
  });

  await runTest(results, "Wishlist toggle remove returns wished=false", async () => {
    const res = await api(user, "POST", "/api/wishlist/toggle", { olid: OLID });
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.wished === false, "Expected wished=false");
  });

  // 7) Rentals: create two pending requests for same stockId
  let rentalId1 = null;
  let rentalId2 = null;

  await runTest(results, "User creates rental request #1 (pending)", async () => {
    const res = await api(user, "POST", "/api/rentals/request", { stockId, note: "Request 1" });
    assert(res.status === 201, `Expected 201, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.ok === true, "Expected ok=true");
    rentalId1 = Number(res.data?.rentalid);
    assert(Number.isFinite(rentalId1) && rentalId1 > 0, "Invalid rentalid");
  });

  await runTest(results, "User creates rental request #2 (pending)", async () => {
    const res = await api(user, "POST", "/api/rentals/request", { stockId, note: "Request 2" });
    assert(res.status === 201, `Expected 201, got ${res.status} :: ${JSON.stringify(res.data)}`);
    rentalId2 = Number(res.data?.rentalid);
    assert(Number.isFinite(rentalId2) && rentalId2 > 0, "Invalid rentalid");
  });

  // 8) Admin sees pending requests
  await runTest(results, "Admin can list pending rental requests", async () => {
    const res = await api(admin, "GET", "/api/rentals/admin/requests");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(Array.isArray(res.data), "Expected array");
    const ids = res.data.map(r => Number(r.rentalid));
    assert(ids.includes(rentalId1) && ids.includes(rentalId2), "Pending rentals not found in admin list");
  });

  // 9) Admin approves rental #1 => stock quantity decremented
  const startAt = "2026-01-16 10:00:00";
  const endAt = "2026-01-20 10:00:00";

  await runTest(results, "Admin approves rental #1 (sets dates, decrements stock)", async () => {
    const res = await api(admin, "POST", "/api/rentals/admin/approve", {
      requestId: rentalId1,
      startAt,
      endAt
    });
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.ok === true, "Expected ok=true");
  });

  await runTest(results, "Stock quantity becomes 0 after approval (was 1)", async () => {
    const res = await api(admin, "GET", "/api/stock/list");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    const row = res.data.find(r => Number(r.stockid) === stockId);
    assert(row, "Stock row not found");
    assert(Number(row.quantity) === 0, `Expected quantity 0, got ${row.quantity}`);
  });

  // 10) Approving rental #2 should fail out-of-stock
  await runTest(results, "Admin cannot approve rental #2 when out of stock (409)", async () => {
    const res = await api(admin, "POST", "/api/rentals/admin/approve", {
      requestId: rentalId2,
      startAt,
      endAt
    });
    assert(res.status === 409, `Expected 409, got ${res.status} :: ${JSON.stringify(res.data)}`);
  });

  // 11) Admin dismisses rental #2 (still pending)
  await runTest(results, "Admin dismisses rental #2", async () => {
    const res = await api(admin, "POST", "/api/rentals/admin/dismiss", { requestId: rentalId2 });
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.ok === true, "Expected ok=true");
  });

  // 12) User sees their rentals and statuses
  await runTest(results, "User /api/rentals/my shows approved + dismissed rentals", async () => {
    const res = await api(user, "GET", "/api/rentals/my");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(Array.isArray(res.data), "Expected array");
    const r1 = res.data.find(r => Number(r.rentalid) === rentalId1);
    const r2 = res.data.find(r => Number(r.rentalid) === rentalId2);
    assert(r1 && r2, "Missing rentals in /api/rentals/my");
    assert(String(r1.status) === "approved", `Expected rental #1 status approved, got ${r1.status}`);
    assert(String(r2.status) === "dismissed", `Expected rental #2 status dismissed, got ${r2.status}`);
  });

  // 13) Admin completes rental #1 => stock quantity incremented back
  await runTest(results, "Admin completes rental #1 (return)", async () => {
    const res = await api(admin, "POST", "/api/rentals/admin/complete", { rentalId: rentalId1 });
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    assert(res.data?.ok === true, "Expected ok=true");
  });

  await runTest(results, "Stock quantity returns to 1 after completion", async () => {
    const res = await api(admin, "GET", "/api/stock/list");
    assert(res.status === 200, `Expected 200, got ${res.status} :: ${JSON.stringify(res.data)}`);
    const row = res.data.find(r => Number(r.stockid) === stockId);
    assert(row, "Stock row not found");
    assert(Number(row.quantity) === 1, `Expected quantity 1, got ${row.quantity}`);
  });

  writeReports(meta, results);

  // Exit non-zero if any FAIL
  process.exit(results.some(r => r.status === "FAIL") ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
