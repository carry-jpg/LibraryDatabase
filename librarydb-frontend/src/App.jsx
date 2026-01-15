import React, { useEffect, useMemo, useState } from "react";
import {
  Library,
  Pencil,
  FolderPlus,
  CreditCard,
  Users,
  Barcode,
  LayoutDashboard,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Search,
  SlidersHorizontal,
  ArrowDown,
  LayoutGrid,
  Bookmark,
} from "lucide-react";

import EditStock from "./pages/EditStock";
import { getBooks } from "./api/books";
import SettingsPage from "./pages/Settings";
import SupportPage from "./pages/Support";
import BookDetailsModal from "./components/BookDetailsModal";
import FiltersPanel from "./components/FiltersPanel";
import Modal from "./components/Modal";
import { apiGet, apiPost } from "./api/http";
import WishlistButton from "./components/WishlistButton";
import WishlistPage from "./pages/Wishlist";
import LendingPage from "./pages/Lending";
import MyRentalsPage from "./pages/MyRentals";
import UserManagementPage from "./pages/UserManagement";
import appLogo from "./assets/logo.jpg";


function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function firstLetterOf(title) {
  const t = (title || "").trim();
  if (!t) return "#";
  const ch = t[0].toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

function normalizeYear(publishDate) {
  const m = String(publishDate || "").match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function AdminPill() {
  return (
    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-[10px] font-black tracking-widest">
      ADMIN
    </span>
  );
}


function NavItem({ icon, label, active = false, admin = false, onClick }) {
  let iconNode = null;
  if (React.isValidElement(icon)) iconNode = icon;
  else if (typeof icon === "function" || typeof icon === "object") {
    iconNode = React.createElement(icon, { size: 20 });
  } else iconNode = icon ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left relative flex items-center gap-4 px-4 py-2 cursor-pointer transition-colors group rounded-md",
        active
          ? "text-colorvar--accent bg-colorvar--active-bg"
          : "text-colorvar--text-secondary hover:text-colorvar--text-primary hover:bg-colorvar--active-bg",
      ].join(" ")}
    >
      <span
        className={[
          active
            ? "text-colorvar--accent"
            : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300",
        ].join(" ")}
      >
        {iconNode}
      </span>

      <span className="text-[15px] font-medium tracking-wide">{label}</span>
      {admin ? <AdminPill /> : null}


      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-colorvar--accent rounded-r-md" />
      )}
    </button>
  );
}

function BookCard({ book, role }) {
  const coverSrc =
    book.coverurl && String(book.coverurl).trim() !== ""
      ? book.coverurl
      : "https://via.placeholder.com/400x600?text=No+Cover";

  const wear = Number(book.condition ?? 0);

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[1/1.5] w-full mb-3 shadow-card group-hover:shadow-card-hover transition-all duration-300 rounded-[4px] overflow-hidden bg-gray-100">
        <img
          src={coverSrc}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/400x600?text=No+Cover";
          }}
        />

        {role === "user" ? (
          <WishlistButton item={book} className="absolute top-2 left-2" />
        ) : null}

        {Number.isFinite(wear) && wear > 0 ? (
          <div
            className={[
              "absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-black bg-black/70 text-white border border-white/10",
              wear >= 5 ? "ring-2 ring-red-400/80" : "",
            ].join(" ")}
            title="Condition"
          >
            {wear}/5
          </div>
        ) : null}
      </div>

      <div className="pr-2 min-h-[64px]">
        <h3
          className="font-bold text-colorvar--text-primary text-[15px] leading-tight mb-1 line-clamp-2"
          title={book.title}
        >
          {book.title}
        </h3>
        <p
          className="text-sm text-colorvar--text-secondary line-clamp-1"
          title={book.author}
        >
          {book.author}
        </p>

        {Number(book.quantity ?? 0) === 0 && (
          <p className="text-xs text-red-500 font-bold mt-1">Out of Stock</p>
        )}
      </div>
    </div>
  );
}

const GRID_CLASS_BY_COLS = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
  7: "xl:grid-cols-7",
  8: "xl:grid-cols-8",
  9: "xl:grid-cols-9",
  10: "xl:grid-cols-10",
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALL = "ALL";

function AuthScreen({ mode, setMode, onLogin, onRegister, error, busy, darkMode }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-colorvar--app-bg text-colorvar--text-primary flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-colorvar--border bg-colorvar--panel-bg p-6 shadow-xl">
        {/* Header (logo + titles) */}
        <div className="mb-4 flex flex-col items-center text-center">
          <img
            src={appLogo}
            alt="TomeNest"
            className="w-20 h-20 rounded-lg border border-colorvar--border mb-3"
            style={{ filter: darkMode ? "invert(1)" : "invert(0)" }}
          />

          <div className="text-2xl font-black text-[color:var(--text-primary)]">
            TomeNest
          </div>

          <div className="text-sm text-colorvar--text-secondary mt-1">
            {mode === "login"
              ? "Sign in to continue."
              : "Create your account to continue."}
          </div>

          <div className="mt-3 text-lg font-bold">
            {mode === "login" ? "Login" : "Register"}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-colorvar--text-secondary mb-1">
              Email
            </label>
            <input
              className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          {mode === "register" ? (
            <div>
              <label className="block text-xs text-colorvar--text-secondary mb-1">
                Name
              </label>
              <input
                className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-xs text-colorvar--text-secondary mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters..."
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const payload = { email: email.trim(), password };
              if (mode === "login") onLogin(payload);
              else onRegister({ ...payload, name: name.trim() });
            }}
            className="w-full px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>

          <button
            type="button"
            className="w-full px-4 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminWishlistsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(() => loadLS("adminWishlists.pageSize", 20));
  const [page, setPage] = useState(1);

  // details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  // add-to-stock modal
  const [stockOpen, setStockOpen] = useState(false);
  const [stockItem, setStockItem] = useState(null);
  const [stockQuality, setStockQuality] = useState(3);
  const [stockQty, setStockQty] = useState(1);
  const [stockBusy, setStockBusy] = useState(false);
  const [stockErr, setStockErr] = useState("");

  // tiny toast
  const [toast, setToast] = useState(null);

  function showToast(message, type = "ok") {
    setToast({ message, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiGet("wishlist/admin/summary");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    saveLS("adminWishlists.pageSize", pageSize);
  }, [pageSize]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    const out = (Array.isArray(rows) ? rows : []).filter((r) => {
      if (!query) return true;
      const title = String(r?.title || "").toLowerCase();
      const author = String(r?.author || "").toLowerCase();
      const olid = String(r?.openlibraryid || "").toLowerCase();
      return title.includes(query) || author.includes(query) || olid.includes(query);
    });

    out.sort((a, b) => {
      const aw = Number(a?.wishcount ?? 0);
      const bw = Number(b?.wishcount ?? 0);
      if (bw !== aw) return bw - aw;
      return String(a?.title || "").localeCompare(String(b?.title || ""));
    });

    return out;
  }, [rows, q]);

  const totalPages = useMemo(() => {
    const ps = Math.max(1, Number(pageSize) || 20);
    return Math.max(1, Math.ceil(filtered.length / ps));
  }, [filtered.length, pageSize]);

  useEffect(() => {
    setPage((p) => Math.max(1, Math.min(totalPages, p)));
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const ps = Math.max(1, Number(pageSize) || 20);
    const start = (page - 1) * ps;
    return filtered.slice(start, start + ps);
  }, [filtered, page, pageSize]);

  function openDetails(item) {
    setDetailsItem(item);
    setDetailsOpen(true);
  }

  function openStockModal(item) {
    setStockErr("");
    setStockItem(item);
    setStockQuality(3);
    setStockQty(1);
    setStockOpen(true);
  }

  async function submitStock() {
    if (!stockItem?.openlibraryid) return;

    const qlty = Math.max(1, Math.min(5, parseInt(String(stockQuality), 10) || 1));
    const qty = Math.max(1, parseInt(String(stockQty), 10) || 1);

    setStockErr("");
    setStockBusy(true);
    try {
      // Assumption: backend accepts { openlibraryid, quality, quantity } on /api/stock/set
      const olid = String(stockItem.openlibraryid || "").trim().toUpperCase();
      if (!olid || !olid.endsWith("M")) {
        setStockErr("Invalid OLID (must be an edition id ending with 'M').");
        return;
      }


      // Ensure the book exists in your DB (import if needed)
      await apiPost("books/import-edition", {
        olid, // for controllers expecting "olid"
        openlibraryid: olid, // for controllers expecting "openlibraryid"
      });

      // Now add/update stock
      await apiPost("stock/set", {
        olid,                 // required by your backend (error says missing/invalid: olid)
        openlibraryid: olid,  // keep for compatibility
        quality: qlty,        // keep for compatibility
        condition: qlty,      // keep for compatibility
        quantity: qty,        // keep for compatibility
        qty,                  // keep for compatibility
      });



      showToast("Stock updated.", "ok");
      window.dispatchEvent(new Event("data:changed"));
      setStockOpen(false);
    } catch (e) {
      setStockErr(String(e?.message || e));
      showToast("Failed to update stock.", "err");
    } finally {
      setStockBusy(false);
    }
  }

  return (
    <div className="max-w-6xl">
      {toast ? (
        <div
          className={[
            "fixed bottom-5 right-5 z-[1000] px-4 py-3 rounded-lg border shadow-xl text-sm",
            toast.type === "ok"
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-900",
          ].join(" ")}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-3xl font-bold text-colorvar--text-primary">
          Wishlists (Admin)
        </h1>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search title / author / OLID..."
            className="w-72 max-w-[60vw] px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-sm text-colorvar--text-primary placeholder:text-colorvar--text-secondary"
          />

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-sm text-colorvar--text-primary"
            title="Rows per page"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-colorvar--text-secondary">Loading…</div>
      ) : err ? (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3">
          <div className="font-semibold">Admin wishlist load error</div>
          <div className="text-sm mt-1">{err}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-colorvar--text-secondary">
          No wishlist items found.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-colorvar--text-secondary">
              Showing{" "}
              <span className="font-semibold text-colorvar--text-primary">
                {filtered.length}
              </span>{" "}
              items
            </div>

            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div className="text-colorvar--text-secondary">
                Page{" "}
                <span className="font-semibold text-colorvar--text-primary">
                  {page}
                </span>{" "}
                / {totalPages}
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>

          {/* Spreadsheet-like single-column list (one row per book) */}
          <div className="rounded-xl border border-colorvar--border bg-colorvar--panel-bg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-colorvar--active-bg border-b border-colorvar--border">
                <tr className="text-left text-colorvar--text-secondary">
                  <th className="p-3 w-[56px]" title="Add to stock">
                    Stock
                  </th>
                  <th className="p-3 w-[64px]">Cover</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Author</th>
                  <th className="p-3 w-[90px]">Year</th>
                  <th className="p-3 w-[110px]">Wishcount</th>
                  <th className="p-3 w-[160px]">OLID</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const olid = String(r?.openlibraryid || "").trim().toUpperCase();
                  const title = String(r?.title || "Untitled");
                  const author = String(r?.author || "Unknown");
                  const year =
                    r?.releaseyear === null || r?.releaseyear === undefined
                      ? "—"
                      : String(r.releaseyear);
                  const wishcount = Number(r?.wishcount ?? 0);

                  const cover =
                    String(r?.coverurl || "").trim() ||
                    (olid
                      ? `https://covers.openlibrary.org/b/olid/${olid}-S.jpg?default=false`
                      : "");

                  return (
                    <tr
                      key={olid || `${title}-${author}-${year}`}
                      className="border-b border-colorvar--border hover:bg-colorvar--active-bg cursor-pointer"
                      onClick={() => openDetails(r)}
                      title="Click for details"
                    >
                      <td className="p-3">
                        <button
                          type="button"
                          className="w-9 h-9 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-colorvar--text-primary font-black"
                          title="Add to stock"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openStockModal(r);
                          }}
                        >
                          +
                        </button>
                      </td>

                      <td className="p-3">
                        <div className="w-10 h-14 rounded-md overflow-hidden border border-colorvar--border bg-colorvar--active-bg">
                          {cover ? (
                            <img
                              src={cover}
                              alt="Cover"
                              className="w-full h-full object-cover"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          ) : null}
                        </div>
                      </td>

                      <td className="p-3 text-colorvar--text-primary">
                        <div className="font-semibold line-clamp-2" title={title}>
                          {title}
                        </div>
                      </td>

                      <td className="p-3 text-colorvar--text-secondary">
                        <div className="line-clamp-1" title={author}>
                          {author}
                        </div>
                      </td>

                      <td className="p-3 text-colorvar--text-secondary font-mono">
                        {year}
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-1 rounded-md text-xs font-bold border border-colorvar--border bg-colorvar--active-bg text-colorvar--text-secondary">
                          {wishcount}
                        </span>
                      </td>

                      <td className="p-3 text-colorvar--text-secondary font-mono">
                        {olid || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Details modal */}
          <Modal
            open={detailsOpen}
            title="Wishlist item details"
            onClose={() => setDetailsOpen(false)}
          >
            {detailsItem ? (
              (() => {
                const olid = String(detailsItem?.openlibraryid || "")
                  .trim()
                  .toUpperCase();
                const title = String(detailsItem?.title || "Untitled");
                const author = String(detailsItem?.author || "Unknown");
                const year =
                  detailsItem?.releaseyear === null ||
                    detailsItem?.releaseyear === undefined
                    ? "—"
                    : String(detailsItem.releaseyear);
                const wishcount = Number(detailsItem?.wishcount ?? 0);

                const cover =
                  String(detailsItem?.coverurl || "").trim() ||
                  (olid
                    ? `https://covers.openlibrary.org/b/olid/${olid}-L.jpg?default=false`
                    : "");

                return (
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-full md:w-[220px]">
                      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-colorvar--border bg-colorvar--active-bg">
                        {cover ? (
                          <img
                            src={cover}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold"
                        onClick={() => {
                          setDetailsOpen(false);
                          openStockModal(detailsItem);
                        }}
                      >
                        Add to stock
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xl font-bold text-colorvar--text-primary">
                        {title}
                      </div>
                      <div className="text-sm text-colorvar--text-secondary mt-1">
                        {author}
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-3">
                          <div className="text-xs text-colorvar--text-secondary">
                            OLID
                          </div>
                          <div className="font-mono text-colorvar--text-primary">
                            {olid || "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-3">
                          <div className="text-xs text-colorvar--text-secondary">
                            Release year
                          </div>
                          <div className="font-mono text-colorvar--text-primary">
                            {year}
                          </div>
                        </div>

                        <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-3">
                          <div className="text-xs text-colorvar--text-secondary">
                            Wishcount
                          </div>
                          <div className="text-colorvar--text-primary font-bold">
                            {wishcount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-sm text-colorvar--text-secondary">No item.</div>
            )}
          </Modal>

          {/* Add-to-stock modal */}
          <Modal
            open={stockOpen}
            title="Add to stock"
            onClose={() => setStockOpen(false)}
          >
            {stockItem ? (
              <div className="space-y-4">
                <div className="text-sm text-colorvar--text-secondary">
                  Adding:{" "}
                  <span className="font-semibold text-colorvar--text-primary">
                    {String(stockItem?.title || "Untitled")}
                  </span>{" "}
                  <span className="font-mono">
                    ({String(stockItem?.openlibraryid || "").toUpperCase()})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-colorvar--text-secondary mb-1">
                      Condition (1–5)
                    </label>
                    <select
                      value={stockQuality}
                      onChange={(e) => setStockQuality(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-colorvar--text-secondary mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                    />
                  </div>
                </div>

                {stockErr ? (
                  <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
                    {stockErr}
                  </div>
                ) : null}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm"
                    onClick={() => setStockOpen(false)}
                    disabled={stockBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold disabled:opacity-60"
                    onClick={submitStock}
                    disabled={stockBusy}
                  >
                    {stockBusy ? "Saving..." : "Add"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-colorvar--text-secondary">No item.</div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}


export default function App() {
  const [activePage, setActivePage] = useState("library"); // library | stock | settings | support | wishlist | wishlists | users
  const [theme, setTheme] = useState(() => loadLS("ui.theme", "teal"));
  const [darkMode, setDarkMode] = useState(() => loadLS("ui.darkMode", false));
  const [booksPerLine, setBooksPerLine] = useState(() =>
    clamp(loadLS("ui.booksPerLine", 5), 3, 10)
  );

  const [user, setUser] = useState(null);
  const isAdmin = (user?.role ?? "") === "admin";
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [activeLetter, setActiveLetter] = useState(ALL);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [filters, setFilters] = useState(() => ({
    onlyInStock: false,
    minCondition: 1,
    author: "",
    publisher: "",
    subject: "",
  }));

  const [sortBy, setSortBy] = useState("title"); // title | author | year | condition
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [loadError, setLoadError] = useState("");

  // Auth bootstrap
  useEffect(() => {
    let alive = true;

    (async () => {
      setAuthLoading(true);
      try {
        const data = await apiGet("auth/me");
        if (!alive) return;
        setUser(data?.user ?? null);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (alive) setAuthLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin({ email, password }) {
    setAuthError("");
    setAuthBusy(true);
    try {
      const data = await apiPost("auth/login", { email, password });
      setUser(data.user);
    } catch (e) {
      setAuthError(String(e?.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister({ email, name, password }) {
    setAuthError("");
    setAuthBusy(true);
    try {
      const data = await apiPost("auth/register", { email, name, password });
      setUser(data.user);
    } catch (e) {
      setAuthError(String(e?.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await apiPost("auth/logout", {});
    } finally {
      setUser(null);
      setAuthMode("login");
      setActivePage("library");
    }
  }

  // Theme/dark
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");

    saveLS("ui.theme", theme);
    saveLS("ui.darkMode", darkMode);
  }, [theme, darkMode]);

  // Books-per-line persistence
  useEffect(() => {
    const v = clamp(booksPerLine, 3, 10);
    if (v !== booksPerLine) setBooksPerLine(v);
    saveLS("ui.booksPerLine", v);
  }, [booksPerLine]);

  async function refresh() {
    setLoadError("");
    try {
      const list = await getBooks();
      setBooks(Array.isArray(list) ? list : []);
    } catch (e) {
      setLoadError(String(e?.message || e));
      setBooks([]);
    }
  }

  // Re-fetch books whenever you switch back to the Library page
  useEffect(() => {
    if (activePage === "library") refresh();
  }, [activePage]);

  // Also allow any page to trigger a refresh via a global event
  useEffect(() => {
    const onChanged = () => {
      if (activePage === "library") refresh();
    };
    window.addEventListener("data:changed", onChanged);
    return () => window.removeEventListener("data:changed", onChanged);
  }, [activePage]);


  const filtered = useMemo(() => {
    const src = Array.isArray(books) ? books : [];
    const q = searchTerm.trim().toLowerCase();

    const result = src
      .filter((b) => {
        if (!q) return true;
        const title = String(b.title || "").toLowerCase();
        const author = String(b.author || "").toLowerCase();
        const isbn = String(b.isbn || "").toLowerCase();
        return (
          title.includes(q) || author.includes(q) || (isbn && isbn.includes(q))
        );
      })
      .filter((b) =>
        activeLetter === ALL ? true : firstLetterOf(b.title) === activeLetter
      )
      .filter((b) => (filters.onlyInStock ? Number(b.quantity ?? 0) > 0 : true))
      .filter(
        (b) => Number(b.condition ?? 1) >= Number(filters.minCondition ?? 1)
      )
      .filter((b) =>
        filters.author ? String(b.author || "").includes(filters.author) : true
      )
      .filter((b) =>
        filters.publisher
          ? String(b.publisher || "").includes(filters.publisher)
          : true
      )
      .filter((b) => {
        if (!filters.subject) return true;
        const subs = b.subjects;
        if (!Array.isArray(subs)) return false;
        return subs.includes(filters.subject);
      });

    const dir = sortDir === "asc" ? 1 : -1;

    return result.sort((a, b) => {
      const av =
        sortBy === "title"
          ? a.title
          : sortBy === "author"
            ? a.author
            : sortBy === "year"
              ? normalizeYear(a.publishdate) ?? 0
              : Number(a.condition ?? 0);

      const bv =
        sortBy === "title"
          ? b.title
          : sortBy === "author"
            ? b.author
            : sortBy === "year"
              ? normalizeYear(b.publishdate) ?? 0
              : Number(b.condition ?? 0);

      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }, [books, searchTerm, activeLetter, filters, sortBy, sortDir]);

  const gridColsClass = GRID_CLASS_BY_COLS[booksPerLine] ?? "xl:grid-cols-5";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-colorvar--app-bg text-colorvar--text-primary flex items-center justify-center">
        <div className="text-colorvar--text-secondary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={authError}
        busy={authBusy}
      />
    );
  }

  return (
    <div className="min-h-screen bg-colorvar--app-bg text-colorvar--text-primary">
      <div className="flex min-h-screen font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-colorvar--sidebar-bg border-r border-colorvar--border flex flex-col fixed h-full z-20">
          <div className="h-20 flex items-center px-6 gap-3 border-b border-colorvar--border">
            <img
              src={appLogo}
              alt="TomeNest"
              className="w-10 h-10 rounded-lg border border-colorvar--border"
              style={{ filter: darkMode ? "invert(1)" : "invert(0)" }}
            />

            <div className="leading-tight min-w-0">
              <div className="text-lg font-semibold text-colorvar--text-primary leading-tight">
                TomeNest
              </div>
              <div className="text-xs text-colorvar--text-secondary truncate">
                Library system
              </div>
            </div>
          </div>


          <nav className="flex-1 px-4 overflow-y-auto py-4">
            {/* Normal pages */}
            <div className="space-y-1">
              <NavItem
                icon={Library}
                label="Library"
                active={activePage === "library"}
                onClick={() => setActivePage("library")}
              />

              <NavItem
                icon={FolderPlus}
                label="My wishlist"
                active={activePage === "wishlist"}
                onClick={() => setActivePage("wishlist")}
              />

              <NavItem
                icon={CreditCard}
                label={isAdmin ? "Rentals" : "My rentals"}
                admin={isAdmin}
                active={isAdmin ? activePage === "rentals" : activePage === "myrentals"}
                onClick={() => setActivePage(isAdmin ? "rentals" : "myrentals")}
              />
            </div>

            {/* Admin pages */}
            {isAdmin ? (
              <div className="mt-6 pt-6 border-t border-colorvar--border space-y-1">
                <div className="px-4 pb-2 text-[11px] font-black tracking-widest text-red-600">
                  ADMIN
                </div>

                <NavItem
                  icon={Pencil}
                  label="Edit stock"
                  admin
                  active={activePage === "stock"}
                  onClick={() => setActivePage("stock")}
                />

                <NavItem
                  icon={FolderPlus}
                  label="Wishlists"
                  admin
                  active={activePage === "wishlists"}
                  onClick={() => setActivePage("wishlists")}
                />

                <NavItem
                  icon={Users}
                  label="User management"
                  admin
                  active={activePage === "users"}
                  onClick={() => setActivePage("users")}
                />
              </div>
            ) : null}
          </nav>


          <div className="p-4 space-y-1 bg-colorvar--sidebar-bg border-t border-colorvar--border">
            <NavItem
              icon={SettingsIcon}
              label="Settings"
              active={activePage === "settings"}
              onClick={() => setActivePage("settings")}
            />
            <NavItem
              icon={HelpCircle}
              label="About"
              active={activePage === "support"}
              onClick={() => setActivePage("support")}
            />
            <NavItem icon={LogOut} label="Logout" onClick={handleLogout} />
          </div>
        </aside>

        {/* Main */}
        <main className="ml-64 flex-1 px-10 py-8 w-full">
          <div className="mx-auto max-w-[1600px]">
            {activePage === "settings" ? (
              <SettingsPage
                theme={theme}
                setTheme={setTheme}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                booksPerLine={booksPerLine}
                setBooksPerLine={setBooksPerLine}
              />
            ) : null}

            {activePage === "support" ? <SupportPage /> : null}
            {activePage === "stock" ? <EditStock onSaved={refresh} /> : null}
            {activePage === "wishlist" ? <WishlistPage /> : null}
            {activePage === "wishlists" ? <AdminWishlistsPage /> : null}
            {activePage === "users" ? <UserManagementPage /> : null}
            {activePage === "myrentals" ? <MyRentalsPage /> : null}
            {activePage === "rentals" ? <LendingPage /> : null}




            {activePage === "library" ? (
              <>
                <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-4 w-full max-w-xl">
                    <Search className="w-6 h-6" />
                    <input
                      type="text"
                      placeholder="Start Searching..."
                      className="w-full bg-transparent border-none focus:ring-0 text-xl placeholder:text-colorvar--text-secondary font-light outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePage("myrentals")}
                    className="flex items-center rounded-full pl-5 pr-1 py-1 gap-3 bg-[color:var(--active-bg)] border border-[color:var(--border)] hover:bg-[color:var(--panel-bg)] transition-colors"
                    title="Open My Rentals"
                  >
                    <span className="text-sm font-semibold">
                      {(user?.name || "My") + "'s Rentals"}
                    </span>

                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-gray-800">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          user?.name || user?.email || "user"
                        )}`}
                        alt="avatar"
                      />
                    </div>
                  </button>

                </div>

                {loadError ? (
                  <div className="mb-6 rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3">
                    <div className="font-semibold">Backend error</div>
                    <div className="text-sm">{loadError}</div>
                    <div className="text-sm mt-2">
                      Check VITE_API_BASE_URL and that your PHP server allows
                      CORS.
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="flex items-center rounded-lg p-1.5 pr-4 bg-colorvar--active-bg border border-colorvar--border">
                    <div className="px-3 text-2xl font-bold">My Books</div>
                    <span className="bg-colorvar--panel-bg border border-colorvar--border text-colorvar--text-secondary px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                      {filtered.length}
                    </span>
                    <div className="ml-2">
                      <ArrowDown size={16} className="opacity-60 -rotate-90" />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 md:mt-0">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-colorvar--panel-bg border border-colorvar--border rounded-md text-colorvar--text-secondary text-sm font-medium shadow-sm hover:bg-colorvar--active-bg"
                    >
                      <LayoutGrid size={16} />
                      <span>Covers</span>
                    </button>


                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 bg-colorvar--panel-bg border border-colorvar--border rounded-md text-sm text-colorvar--text-primary"
                    >
                      <option value="title">Title</option>
                      <option value="author">Author</option>
                      <option value="year">Year</option>
                      <option value="condition">Condition</option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-colorvar--panel-bg border border-colorvar--border rounded-md text-colorvar--text-secondary text-sm font-medium shadow-sm hover:bg-colorvar--active-bg"
                      title="Toggle sort direction"
                    >
                      <span>{sortDir === "asc" ? "Asc" : "Desc"}</span>
                      <ArrowDown
                        size={14}
                        className={
                          sortDir === "asc"
                            ? "opacity-60 rotate-180"
                            : "opacity-60"
                        }
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFiltersOpen(true)}
                      className="flex items-center gap-2 px-5 py-2 bg-colorvar--accent hover:bg-colorvar--accent-hover text-white rounded-md text-sm font-bold shadow-sm transition-colors"
                    >
                      <SlidersHorizontal size={16} />
                      <span>Filters</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-xs font-bold opacity-70 mb-6 px-1 select-none tracking-widest text-colorvar--text-secondary">
                  {[ALL, ...LETTERS].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setActiveLetter(ch)}
                      className={[
                        "cursor-pointer transition-colors",
                        ch === activeLetter
                          ? "text-colorvar--accent hover:text-colorvar--accent"
                          : "",
                      ].join(" ")}
                      title={ch === ALL ? "All" : ch}
                    >
                      {ch === ALL ? "All" : ch}
                    </button>
                  ))}
                </div>

                <h2 className="text-2xl font-bold mb-8 text-colorvar--accent">
                  {activeLetter === ALL ? "All books" : activeLetter}
                </h2>

                <div
                  className={[
                    "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                    gridColsClass,
                    "gap-x-8 gap-y-12 items-start",
                  ].join(" ")}
                >
                  {filtered.map((b) => (
                    <div
                      key={b.openlibraryid || `${b.title}-${b.isbn}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedBook(b)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedBook(b);
                      }}
                      className="text-left focus:outline-none cursor-pointer"
                    >
                      <div className="rounded-md hover:bg-colorvar--active-bg p-2 -m-2 transition-colors">
                        <BookCard book={b} role={user?.role} />
                      </div>
                    </div>
                  ))}
                </div>

                <FiltersPanel
                  open={isFiltersOpen}
                  onClose={() => setIsFiltersOpen(false)}
                  books={books}
                  filters={filters}
                  setFilters={setFilters}
                />

                <BookDetailsModal
                  open={!!selectedBook}
                  book={selectedBook}
                  onClose={() => setSelectedBook(null)}
                />
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

