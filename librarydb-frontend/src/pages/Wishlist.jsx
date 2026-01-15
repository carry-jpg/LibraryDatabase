// src/pages/Wishlist.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal";
import { olSearch, olEdition } from "../api/openlibrary";
import { apiGet, apiPost } from "../api/http";

function fmtList(v) {
  if (!Array.isArray(v) || v.length === 0) return "";
  return v.filter(Boolean).join(", ");
}

function safeFirst(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : "";
}

function extractYear(s) {
  const m = String(s || "").match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function pickEditionOlidFromDoc(doc) {
  const cek = String(doc?.cover_edition_key || "").toUpperCase();
  if (cek.endsWith("M")) return cek;

  const ek = doc?.edition_key;
  if (Array.isArray(ek) && ek.length > 0) {
    const k = String(ek[0] || "").toUpperCase();
    if (k.endsWith("M")) return k;
  }
  return "";
}

function coverThumbUrl(doc) {
  if (doc?.cover_i)
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg?default=false`;
  const cek = String(doc?.cover_edition_key || "").toUpperCase();
  if (cek) return `https://covers.openlibrary.org/b/olid/${cek}-S.jpg?default=false`;
  return "";
}

function editionCoverUrl(olid) {
  const id = String(olid || "").trim().toUpperCase();
  if (!id) return "";
  return `https://covers.openlibrary.org/b/olid/${id}-L.jpg?default=false`;
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
  const languageKey = ed?.languages?.[0]?.key || "";
  const lang = typeof languageKey === "string" ? languageKey.split("/").pop() : "";
  return { title, author, publishDate, publishers, pages, isbn13, isbn10, lang };
}

export default function Wishlist() {
  // Server wishlist rows
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadWishlist() {
    setErr("");
    setLoading(true);
    try {
      const rows = await apiGet("wishlist/me"); // GET /api/wishlist/me [file:87]
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
    window.addEventListener("wishlist:changed", loadWishlist);
    return () => window.removeEventListener("wishlist:changed", loadWishlist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  function showToast(message, type = "ok") {
    setToast({ message, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
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

  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  const editionReqId = useRef(0);

  const docs = useMemo(() => searchRes?.docs || [], [searchRes]);
  const numFound = useMemo(() => {
    const n = searchRes?.numFound;
    return Number.isFinite(n) ? n : 0;
  }, [searchRes]);

  const totalPages = useMemo(() => {
    if (!numFound || !limit) return 1;
    return Math.max(1, Math.ceil(numFound / limit));
  }, [numFound, limit]);

  useEffect(() => setGotoPage(String(page)), [page]);

  function openAdd() {
    setAddErr("");
    setSearchErr("");
    setSearchRes(null);
    setQuery("");
    setPage(1);
    setGotoPage("1");
    setSelectedOlid("");
    setSelectedEdition(null);
    setAddOpen(true);
  }

  async function runSearch(nextPage = 1) {
    setSearchErr("");
    setSelectedEdition(null);
    const q = query.trim();
    if (!q) return;

    setLoadingSearch(true);
    try {
      setPage(nextPage);
      const fields =
        "key,title,author_name,first_publish_year,cover_i,cover_edition_key,edition_key";
      const data = await olSearch(q, limit, nextPage, fields);
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
    setAddErr("");

    if (!clean) return;

    setLoadingEdition(true);
    try {
      const ed = await olEdition(clean);
      if (reqId !== editionReqId.current) return;
      setSelectedEdition(ed);
    } catch (e) {
      if (reqId !== editionReqId.current) return;
      setSelectedEdition({ error: String(e?.message || e) });
    } finally {
      if (reqId === editionReqId.current) setLoadingEdition(false);
    }
  }

  function goToTypedPage() {
    const p = Math.max(1, Math.min(totalPages, parseInt(gotoPage || "1", 10) || 1));
    runSearch(p);
  }

  async function addToWishlist() {
    setAddErr("");

    if (!selectedEdition || selectedEdition?.error) {
      setAddErr("Please select an edition and click “Load edition info” first.");
      return;
    }

    const olid = String(selectedOlid || "").trim().toUpperCase();
    if (!olid || !olid.endsWith("M")) {
      setAddErr("Please select a valid edition OLID ending with 'M'.");
      return;
    }

    const vm = editionViewModel(selectedEdition);

    setAdding(true);
    try {
      const payload = {
        olid,
        title: vm?.title || "Unknown title",
        author: vm?.author || "Unknown author",
        releaseyear: extractYear(vm?.publishDate) || null,
        coverurl: editionCoverUrl(olid) || "",
      };

      const res = await apiPost("wishlist/toggle", payload); // POST /api/wishlist/toggle [file:87]
      if (res?.wished) showToast(`Added “${payload.title}”.`, "ok");
      else showToast(`Removed “${payload.title}”.`, "info");

      window.dispatchEvent(new Event("wishlist:changed"));
      setAddOpen(false);
    } catch (e) {
      setAddErr(String(e?.message || e));
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(olid) {
    try {
      await apiPost("wishlist/remove", { olid }); // POST /api/wishlist/remove [file:87]
      window.dispatchEvent(new Event("wishlist:changed"));
      showToast("Removed from wishlist.", "ok");
    } catch (e) {
      showToast(String(e?.message || e), "err");
    }
  }

  return (
    <div className="max-w-6xl">
      {/* Toast */}
      {toast ? (
        <div
          className={[
            "fixed bottom-5 right-5 z-[1000] px-4 py-3 rounded-lg border shadow-xl text-sm",
            toast.type === "ok"
              ? "border-green-300 bg-green-50 text-green-900"
              : toast.type === "info"
              ? "border-colorvar--border bg-colorvar--panel-bg text-colorvar--text-primary"
              : "border-red-300 bg-red-50 text-red-900",
          ].join(" ")}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-colorvar--text-primary">Wishlist</h1>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold"
        >
          Add new
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-colorvar--text-secondary">Loading…</div>
      ) : err ? (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3">
          <div className="font-semibold">Wishlist error</div>
          <div className="text-sm mt-1">{err}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-colorvar--text-secondary">
          No items yet. Use the banner icon on a book, or click Add new to search
          OpenLibrary.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((b) => (
            <div
              key={b.openlibraryid}
              className="rounded-xl border border-colorvar--border bg-colorvar--panel-bg p-3"
            >
              <img
                src={b.coverurl || ""}
                alt={b.title || "Cover"}
                className="w-full aspect-[3/4] object-cover rounded-lg border border-colorvar--border bg-colorvar--active-bg"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />

              <div className="mt-3">
                <div
                  className="font-semibold text-colorvar--text-primary line-clamp-2"
                  title={b.title}
                >
                  {b.title || "Untitled"}
                </div>
                <div
                  className="text-sm text-colorvar--text-secondary line-clamp-1"
                  title={b.author}
                >
                  {b.author || "Unknown"}
                </div>
                <div className="text-xs text-colorvar--text-secondary mt-1 font-mono">
                  {b.openlibraryid}
                </div>

                <button
                  type="button"
                  className="mt-3 w-full px-3 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-red-600"
                  onClick={() => removeItem(b.openlibraryid)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} title="Add to wishlist" onClose={() => setAddOpen(false)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search */}
          <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
            <div className="font-semibold text-colorvar--text-primary mb-3">
              Search OpenLibrary
            </div>

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
                type="button"
                className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold disabled:opacity-60"
                onClick={() => runSearch(1)}
                disabled={loadingSearch}
              >
                {loadingSearch ? "Searching..." : "Search"}
              </button>
            </div>

            {searchErr ? <div className="text-sm text-red-600 mt-3">{searchErr}</div> : null}

            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-colorvar--text-secondary">
              <div>
                Found {searchRes ? searchRes.numFound ?? docs.length : 0}{" "}
                {searchRes ? (
                  <>
                    · Page {page}/{totalPages}
                  </>
                ) : null}
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
                  <span>Go</span>
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

            {docs.length === 0 ? null : (
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
                      key={String(d.key) + "-" + title}
                      type="button"
                      className={[
                        "text-left rounded-lg border p-3 transition-colors flex gap-3 items-start",
                        selectedOlid === olid
                          ? "border-colorvar--accent bg-colorvar--active-bg"
                          : "border-colorvar--border hover:bg-colorvar--active-bg",
                        disabled ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                      onClick={disabled ? null : () => loadEdition(olid)}
                      disabled={disabled}
                      title={
                        disabled
                          ? "No edition OLID in this result. Try another result."
                          : "Select"
                      }
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt="Cover"
                          className="w-10 h-14 object-cover rounded border border-colorvar--border bg-colorvar--active-bg"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : (
                        <div className="w-10 h-14 rounded border border-colorvar--border bg-colorvar--active-bg" />
                      )}

                      <div className="min-w-0">
                        <div className="font-semibold text-colorvar--text-primary line-clamp-2">
                          {title}
                        </div>
                        <div className="text-sm text-colorvar--text-secondary">
                          {author || "Unknown"}
                          {year ? ` · ${year}` : ""}
                        </div>
                        <div className="text-xs text-colorvar--text-secondary mt-1">
                          OLID: <span className="font-mono">{olid || "—"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected edition / Add */}
          <div className="space-y-6">
            <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-colorvar--text-primary">Selected edition</div>
                <div className="text-xs text-colorvar--text-secondary">
                  {selectedOlid || "None"}
                </div>
              </div>

              {loadingEdition ? (
                <div className="text-sm text-colorvar--text-secondary">Loading edition…</div>
              ) : !selectedOlid ? (
                <div className="text-sm text-colorvar--text-secondary">
                  Pick a search result or paste a manual OLID below.
                </div>
              ) : selectedEdition?.error ? (
                <div className="text-sm text-red-600">{selectedEdition.error}</div>
              ) : (
                (() => {
                  const vm = editionViewModel(selectedEdition);
                  return (
                    <div className="flex gap-4">
                      <img
                        src={editionCoverUrl(selectedOlid)}
                        alt="Cover"
                        className="w-24 h-36 object-cover rounded-md border border-colorvar--border bg-colorvar--active-bg"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <div className="text-sm">
                        <div className="text-lg font-semibold text-colorvar--text-primary">
                          {vm?.title || "Unknown title"}
                        </div>
                        <div className="text-colorvar--text-secondary">
                          {vm?.author || "Unknown author"}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-colorvar--text-secondary">
                          <div>Publish date: {vm?.publishDate || "—"}</div>
                          <div>Pages: {vm?.pages || "—"}</div>
                          <div>Publishers: {vm?.publishers || "—"}</div>
                          <div>
                            ISBN:{" "}
                            <span className="font-mono">
                              {vm?.isbn13 || vm?.isbn10 || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
              <div className="font-semibold text-colorvar--text-primary mb-3">Add</div>

              <label className="block text-xs text-colorvar--text-secondary mb-1">
                Manual OLID (edition)
              </label>
              <input
                value={selectedOlid}
                onChange={(e) => setSelectedOlid(e.target.value.trim().toUpperCase())}
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

              <button
                type="button"
                onClick={addToWishlist}
                disabled={adding || loadingEdition || !selectedEdition || !!selectedEdition?.error}
                className="w-full px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add to wishlist"}
              </button>

              {addErr ? <div className="text-sm text-red-600 mt-3">{addErr}</div> : null}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
