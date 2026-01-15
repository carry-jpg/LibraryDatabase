import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal";
import { olSearch, olEdition } from "../api/openlibrary";
import { apiGet } from "../api/http";
import { setStock } from "../api/stock";

function fmtList(v) {
  if (!Array.isArray(v) || v.length === 0) return "";
  return v.filter(Boolean).join(", ");
}

function safeFirst(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : "";
}

function extractOlidFromKey(key) {
  const s = String(key || "").trim();
  if (!s) return "";
  const parts = s.split("/");
  const last = parts[parts.length - 1] || "";
  return last.toUpperCase().startsWith("OL") ? last.toUpperCase() : "";
}

function pickEditionOlidFromDoc(doc) {
  // Prefer cover_edition_key; it is intended as the representative edition for a search hit.
  const cek = String(doc?.cover_edition_key || "").toUpperCase();
  if (cek.endsWith("M")) return cek;

  // Fallback to first edition_key if present.
  const ek = doc?.edition_key;
  if (Array.isArray(ek) && ek.length > 0) {
    const k = String(ek[0] || "").toUpperCase();
    if (k.endsWith("M")) return k;
  }

  return "";
}

function coverThumbUrl(doc) {
  // Cover API by cover_i or OLID (edition).
  if (doc?.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg?default=false`;
  const cek = String(doc?.cover_edition_key || "").toUpperCase();
  if (cek) return `https://covers.openlibrary.org/b/olid/${cek}-S.jpg?default=false`;
  return "";
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stockToCsv(rows) {
  const header = ["Title", "Author", "Year", "Quality", "Qty", "OLID", "ISBN"];
  const lines = [header.map(csvEscape).join(",")];

  for (const r of rows || []) {
    lines.push(
      [
        r.title,
        r.author,
        r.releaseyear ?? r.release_year ?? "",
        r.quality,
        r.quantity,
        r.openlibraryid,
        r.isbn,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return lines.join("\n");
}

// Local POST helper matching your /api routing.
async function apiPostJson(path, body) {
  const base = import.meta?.env?.VITE_API_BASE_URL || "";
  const res = await fetch(`${base}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export default function EditStock({ onSaved }) {
  // Stock table
  const [stockRows, setStockRows] = useState([]);
  const [stockErr, setStockErr] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);

  // Column filters
  const [col, setCol] = useState({
    title: "",
    author: "",
    year: "",
    quality: "",
    qty: "",
    olid: "",
    isbn: "",
  });

  // Add new modal
  const [addOpen, setAddOpen] = useState(false);

  // Search state inside modal
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [gotoPage, setGotoPage] = useState("1");

  const [searchRes, setSearchRes] = useState(null);
  const [searchErr, setSearchErr] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [selectedOlid, setSelectedOlid] = useState("");
  const [selectedEdition, setSelectedEdition] = useState(null);
  const [loadingEdition, setLoadingEdition] = useState(false);

  const [quality, setQuality] = useState(3);
  const [quantity, setQuantity] = useState(1);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  // Prevent stale edition response from overwriting current selection.
  const editionReqId = useRef(0);

  // Cache search pages
  const searchCacheRef = useRef(new Map());

  const docs = useMemo(() => searchRes?.docs || [], [searchRes]);

  const numFound = useMemo(() => {
    const n = searchRes?.numFound;
    return Number.isFinite(n) ? n : 0;
  }, [searchRes]);

  const totalPages = useMemo(() => {
    if (!numFound || !limit) return 1;
    return Math.max(1, Math.ceil(numFound / limit));
  }, [numFound, limit]);

  useEffect(() => {
    setGotoPage(String(page));
  }, [page]);

  async function loadStock() {
    setStockErr("");
    setLoadingStock(true);
    try {
      const rows = await apiGet("/stock/list");
      setStockRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setStockErr(String(e?.message || e));
    } finally {
      setLoadingStock(false);
    }
  }

  useEffect(() => {
    loadStock();
  }, []);

  const filteredStockRows = useMemo(() => {
    const norm = (s) => String(s ?? "").toLowerCase();
    const f = {
      title: norm(col.title).trim(),
      author: norm(col.author).trim(),
      year: norm(col.year).trim(),
      quality: norm(col.quality).trim(),
      qty: norm(col.qty).trim(),
      olid: norm(col.olid).trim(),
      isbn: norm(col.isbn).trim(),
    };

    return (stockRows || []).filter((r) => {
      const title = norm(r.title);
      const author = norm(r.author);
      const year = norm(r.releaseyear ?? r.release_year);
      const quality = norm(r.quality);
      const qty = norm(r.quantity);
      const olid = norm(r.openlibraryid);
      const isbn = norm(r.isbn);

      if (f.title && !title.includes(f.title)) return false;
      if (f.author && !author.includes(f.author)) return false;
      if (f.year && !year.includes(f.year)) return false;
      if (f.quality && !quality.includes(f.quality)) return false;
      if (f.qty && !qty.includes(f.qty)) return false;
      if (f.olid && !olid.includes(f.olid)) return false;
      if (f.isbn && !isbn.includes(f.isbn)) return false;

      return true;
    });
  }, [stockRows, col]);

  async function copyStockCsv() {
    try {
      const csv = stockToCsv(filteredStockRows);
      await navigator.clipboard.writeText(csv);
    } catch {
      // ignore
    }
  }

  function downloadStockCsv() {
    const csv = stockToCsv(filteredStockRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stock.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function deleteStockRow(stockid) {
    if (!stockid) return;
    const ok = window.confirm("Delete this stock row? This cannot be undone.");
    if (!ok) return;

    try {
      await apiPostJson("/stock/delete", { stockId: Number(stockid) });
      await loadStock();
      window.dispatchEvent(new Event("data:changed"));
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  function openAdd() {
    setSearchErr("");
    setSearchRes(null);
    setSelectedOlid("");
    setSelectedEdition(null);
    setSaveErr("");
    setSaveMsg("");
    setQuery("");
    setPage(1);
    setGotoPage("1");
    setQuality(3);
    setQuantity(1);
    setAddOpen(true);
  }

  async function runSearch(nextPage = 1) {
    setSearchErr("");
    setSelectedEdition(null);

    const q = query.trim();
    if (!q) return;

    const cacheKey = `${q}|||${limit}|||${nextPage}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setPage(nextPage);
      setSearchRes(cached);
      return;
    }

    setLoadingSearch(true);
    try {
      setPage(nextPage);

      // Keep fields lean but include cover_edition_key to choose a stable edition.
      const fields = "key,title,author_name,first_publish_year,cover_i,cover_edition_key,edition_key";
      const data = await olSearch(q, limit, nextPage, fields);

      searchCacheRef.current.set(cacheKey, data);
      setSearchRes(data);
    } catch (e) {
      setSearchErr(String(e?.message || e));
    } finally {
      setLoadingSearch(false);
    }
  }

  async function loadEdition(olid) {
    const reqId = ++editionReqId.current;

    const clean = String(olid || "").trim().toUpperCase();
    setSelectedOlid(clean);
    setSelectedEdition(null);
    if (!clean) return;

    setLoadingEdition(true);
    try {
      const ed = await olEdition(clean);
      if (reqId !== editionReqId.current) return; // ignore stale
      setSelectedEdition(ed);
    } catch (e) {
      if (reqId !== editionReqId.current) return;
      setSelectedEdition({ error: String(e?.message || e) });
    } finally {
      if (reqId === editionReqId.current) setLoadingEdition(false);
    }
  }

  function editionViewModel(ed) {
    if (!ed || ed.error) return null;

    const title = ed.title || "Unknown title";
    const author = ed.by_statement || "Unknown author";
    const publishDate = ed.publish_date || "";
    const publishers = fmtList(ed.publishers);
    const pages = ed.number_of_pages || "";
    const isbn13 = safeFirst(ed.isbn_13);
    const isbn10 = safeFirst(ed.isbn_10);

    return { title, author, publishDate, publishers, pages, isbn13, isbn10 };
  }

  async function saveStock() {
    setSaveErr("");
    setSaveMsg("");

    // Require a loaded edition (forces "choose edition" workflow).
    if (!selectedEdition || selectedEdition?.error) {
      setSaveErr("Please select an edition and click “Load edition info” before saving.");
      return;
    }

    const loadedOlid = extractOlidFromKey(selectedEdition?.key);
    const olid = String(loadedOlid || "").trim().toUpperCase();

    if (!olid || !olid.endsWith("M")) {
      setSaveErr("Selected edition is invalid. Please pick a valid edition OLID ending with 'M'.");
      return;
    }

    const q = Number(quality);
    const qty = Number(quantity);

    if (!Number.isFinite(q) || q < 1 || q > 5) {
      setSaveErr("Quality must be between 1 and 5.");
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setSaveErr("Quantity must be 0 or more.");
      return;
    }

    setSaving(true);
    try {
      await setStock({
        olid,
        quality: q,
        quantity: qty,
        importIfMissing: true,
      });
      setSaveMsg("Saved.");
      await loadStock();
      window.dispatchEvent(new Event("data:changed"));
      onSaved?.();
    } catch (e) {
      setSaveErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }


  function goToTypedPage() {
    const p = Math.max(1, Math.min(totalPages, parseInt(gotoPage || "1", 10) || 1));
    runSearch(p);
  }

  const edVM = editionViewModel(selectedEdition);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-colorvar--text-primary">Edit stock</h1>
          <p className="text-sm text-colorvar--text-secondary">
            Manage stock rows. Use “Add new” to import from OpenLibrary and create/update stock.
          </p>
        </div>

        <button
          className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold"
          onClick={openAdd}
        >
          + Add new
        </button>
      </div>

      {/* Current stock table */}
      <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4 mb-6">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="font-semibold text-colorvar--text-primary">Current stock</div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-colorvar--text-primary"
              onClick={copyStockCsv}
              disabled={loadingStock || !filteredStockRows?.length}
              title="Copy filtered rows as CSV"
            >
              Copy CSV
            </button>

            <button
              className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-colorvar--text-primary"
              onClick={downloadStockCsv}
              disabled={loadingStock || !filteredStockRows?.length}
              title="Download filtered rows as CSV"
            >
              Download
            </button>

            <button
              className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-colorvar--text-primary"
              onClick={loadStock}
              disabled={loadingStock}
            >
              {loadingStock ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {stockErr && <div className="text-sm text-red-600 mb-2">{stockErr}</div>}

        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-colorvar--text-secondary">
          <div>
            Rows: {filteredStockRows.length}
            {filteredStockRows.length !== (stockRows?.length || 0) ? ` (filtered from ${stockRows.length})` : ""}
          </div>

          <button
            className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-colorvar--text-primary"
            onClick={() => setCol({ title: "", author: "", year: "", quality: "", qty: "", olid: "", isbn: "" })}
          >
            Clear filters
          </button>
        </div>

        <div className="overflow-auto max-h-96 border border-colorvar--border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-colorvar--panel-bg z-10">
              <tr className="text-left border-b border-colorvar--border">
                <th className="p-2">Title</th>
                <th className="p-2">Author</th>
                <th className="p-2">Year</th>
                <th className="p-2">Quality</th>
                <th className="p-2">Qty</th>
                <th className="p-2">OLID</th>
                <th className="p-2">ISBN</th>
                <th className="p-2">Actions</th>
              </tr>

              <tr className="border-b border-colorvar--border">
                {[
                  ["title", "Title…"],
                  ["author", "Author…"],
                  ["year", "Year…"],
                  ["quality", "Quality…"],
                  ["qty", "Qty…"],
                  ["olid", "OLID…"],
                  ["isbn", "ISBN…"],
                ].map(([k, ph]) => (
                  <th key={k} className="p-2">
                    <input
                      className="w-full px-2 py-1 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary placeholder:text-colorvar--text-secondary"
                      placeholder={ph}
                      value={col[k]}
                      onChange={(e) => setCol((c) => ({ ...c, [k]: e.target.value }))}
                    />
                  </th>
                ))}
                <th className="p-2" />
              </tr>
            </thead>

            <tbody>
              {Array.isArray(filteredStockRows) &&
                filteredStockRows.map((r, idx) => (
                  <tr
                    key={r.stockid ?? `${r.openlibraryid}-${r.quality}-${idx}`}
                    className={[
                      "border-b border-colorvar--border",
                      idx % 2 === 0 ? "bg-transparent" : "bg-colorvar--active-bg",
                    ].join(" ")}
                  >
                    <td className="p-2">{r.title}</td>
                    <td className="p-2">{r.author}</td>
                    <td className="p-2">{r.releaseyear ?? r.release_year}</td>
                    <td className="p-2">{r.quality}</td>
                    <td className="p-2">{r.quantity}</td>
                    <td className="p-2 font-mono">{r.openlibraryid}</td>
                    <td className="p-2 font-mono">{r.isbn}</td>
                    <td className="p-2">
                      <button
                        className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-red-600"
                        onClick={() => deleteStockRow(r.stockid)}
                        title="Delete stock row"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

              {(!filteredStockRows || filteredStockRows.length === 0) && (
                <tr>
                  <td className="p-3 text-colorvar--text-secondary" colSpan={8}>
                    No rows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add new modal */}
      <Modal open={addOpen} title="Add / Update stock" onClose={() => setAddOpen(false)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
              <div className="font-semibold text-colorvar--text-primary mb-3">Search OpenLibrary</div>

              <div className="flex gap-3 items-center">
                <input
                  className="flex-1 px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary placeholder:text-colorvar--text-secondary"
                  placeholder="Search title/author..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" ? runSearch(1) : null)}
                />

                <select
                  className="px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-sm text-colorvar--text-primary"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>

                <button
                  className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold"
                  onClick={() => runSearch(1)}
                  disabled={loadingSearch}
                >
                  {loadingSearch ? "Searching..." : "Search"}
                </button>
              </div>

              {searchErr && <div className="text-sm text-red-600 mt-3">{searchErr}</div>}

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-colorvar--text-secondary">
                <div>
                  Found: {searchRes ? searchRes.numFound ?? docs.length : 0}
                  {searchRes ? ` • Page ${page} / ${totalPages}` : ""}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg disabled:opacity-50 text-colorvar--text-primary"
                    disabled={loadingSearch || page <= 1}
                    onClick={() => runSearch(page - 1)}
                  >
                    Prev
                  </button>

                  <button
                    className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg disabled:opacity-50 text-colorvar--text-primary"
                    disabled={loadingSearch || !searchRes || page >= totalPages}
                    onClick={() => runSearch(page + 1)}
                  >
                    Next
                  </button>

                  <div className="flex items-center gap-2">
                    <span>Go:</span>
                    <input
                      className="w-20 px-2 py-1 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                      value={gotoPage}
                      onChange={(e) => setGotoPage(e.target.value)}
                      onKeyDown={(e) => (e.key === "Enter" ? goToTypedPage() : null)}
                    />
                    <button
                      className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg disabled:opacity-50 text-colorvar--text-primary"
                      disabled={loadingSearch || !searchRes}
                      onClick={goToTypedPage}
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>

              {docs.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 max-h-96 overflow-auto pr-1">
                  {docs.map((d) => {
                    const olid = pickEditionOlidFromDoc(d);
                    const title = d?.title ?? "";
                    const author = Array.isArray(d?.author_name) ? d.author_name[0] : "";
                    const year = d?.first_publish_year ?? "";
                    const disabled = !olid;
                    const thumb = coverThumbUrl(d);

                    return (
                      <button
                        key={`${d.key}-${title}`}
                        type="button"
                        className={[
                          "text-left rounded-lg border p-3 transition-colors flex gap-3",
                          selectedOlid && olid && selectedOlid === olid
                            ? "border-colorvar--accent bg-colorvar--active-bg"
                            : "border-colorvar--border hover:bg-colorvar--active-bg",
                          disabled ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                        onClick={disabled ? null : () => loadEdition(olid)}
                        disabled={disabled}
                        title={disabled ? "No edition OLID in this result. Try another result." : `Select ${olid}`}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt="Cover"
                            className="w-10 h-14 object-cover rounded border border-colorvar--border bg-colorvar--active-bg"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-14 rounded border border-colorvar--border bg-colorvar--active-bg" />
                        )}

                        <div className="min-w-0">
                          <div className="font-semibold text-colorvar--text-primary line-clamp-2">{title}</div>
                          <div className="text-sm text-colorvar--text-secondary">
                            {author || "Unknown"}
                            {year ? ` • ${year}` : ""}
                          </div>
                          <div className="text-xs text-colorvar--text-secondary mt-1">OLID: {olid || "—"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-colorvar--text-primary">Selected edition</div>
                <div className="text-xs text-colorvar--text-secondary">{selectedOlid || "None"}</div>
              </div>

              {loadingEdition && <div className="text-sm text-colorvar--text-secondary">Loading edition...</div>}

              {!loadingEdition && !selectedOlid && (
                <div className="text-sm text-colorvar--text-secondary">
                  Pick a search result or paste a manual OLID below.
                </div>
              )}

              {!loadingEdition && selectedOlid && selectedEdition?.error && (
                <div className="text-sm text-red-600">{selectedEdition.error}</div>
              )}

              {!loadingEdition && selectedOlid && !selectedEdition?.error && (
                <div className="flex gap-4">
                  <img
                    src={`https://covers.openlibrary.org/b/olid/${selectedOlid}-M.jpg?default=false`}
                    alt="Cover"
                    className="w-24 h-36 object-cover rounded-md border border-colorvar--border bg-colorvar--active-bg"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="text-sm">
                    <div className="text-lg font-semibold text-colorvar--text-primary">
                      {edVM?.title || "Unknown title"}
                    </div>
                    <div className="text-colorvar--text-secondary">{edVM?.author || "Unknown author"}</div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-colorvar--text-secondary">
                      <div>Publish date: {edVM?.publishDate || "—"}</div>
                      <div>Pages: {edVM?.pages || "—"}</div>
                      <div>Publishers: {edVM?.publishers || "—"}</div>
                      <div>
                        ISBN-13: <span className="font-mono">{edVM?.isbn13 || "—"}</span>
                      </div>
                      <div>
                        ISBN-10: <span className="font-mono">{edVM?.isbn10 || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
              <div className="font-semibold text-colorvar--text-primary mb-3">Stock</div>

              <label className="block text-xs text-colorvar--text-secondary mb-1">Manual OLID (edition)</label>
              <input
                value={selectedOlid}
                onChange={(e) => setSelectedOlid(e.target.value.trim())}
                placeholder="OL7353617M"
                className="w-full mb-3 px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary placeholder:text-colorvar--text-secondary"
              />

              <button
                type="button"
                onClick={() => loadEdition(selectedOlid)}
                className="w-full mb-4 px-4 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-colorvar--text-primary"
              >
                Load edition info
              </button>

              <label className="block text-xs text-colorvar--text-secondary mb-1">Quality (1–5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
              />

              <label className="block text-xs text-colorvar--text-secondary mb-1">Quantity</label>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full mb-4 px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
              />

              <button
                type="button"
                onClick={saveStock}
                disabled={saving || loadingEdition || !edVM || !!selectedEdition?.error}
                className="w-full px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {saving ? "Saving..." : "Save"}

              {saveMsg && <div className="text-sm text-green-700 mt-3">{saveMsg}</div>}
              {saveErr && <div className="text-sm text-red-600 mt-3">{saveErr}</div>}
            </div>
          </div>
        </div>
      </Modal >
    </div >
  );
}
