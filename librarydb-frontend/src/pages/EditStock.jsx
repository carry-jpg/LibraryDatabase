import React, { useMemo, useState } from "react";
import { olSearch, olEdition } from "../api/openlibrary";
import { setStock } from "../api/stock";

function pickEditionOlidFromSearchDoc(doc) {
  // Search API may include edition_key array (edition OLIDs). [web:16]
  const ek = doc?.edition_key;
  if (Array.isArray(ek) && ek.length > 0) return String(ek[0]); // like "OL7353617M"
  return "";
}

export default function EditStock({ onSaved }) {
  const [mode, setMode] = useState("search"); // search | isbn (isbn stub)
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);

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

  const docs = useMemo(() => searchRes?.docs || [], [searchRes]);

  async function runSearch() {
    setSearchErr("");
    setSearchRes(null);
    setSelectedOlid("");
    setSelectedEdition(null);

    const q = query.trim();
    if (!q) return;

    setLoadingSearch(true);
    try {
      const data = await olSearch(q, limit);
      setSearchRes(data);
    } catch (e) {
      setSearchErr(String(e?.message || e));
    } finally {
      setLoadingSearch(false);
    }
  }

  async function loadEdition(olid) {
    setSelectedOlid(olid);
    setSelectedEdition(null);
    if (!olid) return;

    setLoadingEdition(true);
    try {
      const ed = await olEdition(olid);
      setSelectedEdition(ed);
    } catch (e) {
      setSelectedEdition({ error: String(e?.message || e) });
    } finally {
      setLoadingEdition(false);
    }
  }

  async function saveStock() {
    setSaveErr("");
    setSaveMsg("");

    if (!selectedOlid) {
      setSaveErr("Pick an edition (OLID) first.");
      return;
    }

    setSaving(true);
    try {
      await setStock({
        olid: selectedOlid,
        quality: Number(quality),
        quantity: Number(quantity),
        importIfMissing: true,
      }); // backend will import edition if missing [file:228]
      setSaveMsg("Saved.");
      onSaved?.();
    } catch (e) {
      setSaveErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2 text-[color:var(--text-primary)]">Edit stock</h1>
      <p className="text-sm text-[color:var(--text-secondary)] mb-6">
        Choose a book (OpenLibrary edition) then set quality + quantity and save.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          className={[
            "px-4 py-2 rounded-md border text-sm",
            mode === "search"
              ? "bg-[color:var(--active-bg)] border-[color:var(--border)] text-[color:var(--text-primary)]"
              : "bg-[color:var(--panel-bg)] border-[color:var(--border)] text-[color:var(--text-secondary)]",
          ].join(" ")}
          onClick={() => setMode("search")}
        >
          Search
        </button>

        <button
          className={[
            "px-4 py-2 rounded-md border text-sm",
            mode === "isbn"
              ? "bg-[color:var(--active-bg)] border-[color:var(--border)] text-[color:var(--text-primary)]"
              : "bg-[color:var(--panel-bg)] border-[color:var(--border)] text-[color:var(--text-secondary)]",
          ].join(" ")}
          onClick={() => setMode("isbn")}
          title="Requires an ISBN proxy endpoint; can be added next."
        >
          ISBN (next)
        </button>
      </div>

      {mode === "search" && (
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-4 mb-6">
          <div className="flex gap-3 items-center">
            <input
              className="flex-1 px-3 py-2 rounded-md border border-[color:var(--border)] bg-transparent"
              placeholder="Search title/author..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? runSearch() : null)}
            />
            <select
              className="px-3 py-2 rounded-md border border-[color:var(--border)] bg-transparent text-sm"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              className="px-4 py-2 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-semibold"
              onClick={runSearch}
              disabled={loadingSearch}
            >
              {loadingSearch ? "Searching..." : "Search"}
            </button>
          </div>

          {searchErr && <div className="text-sm text-red-600 mt-3">{searchErr}</div>}

          {searchRes && (
            <div className="mt-4 text-sm text-[color:var(--text-secondary)]">
              Found: {searchRes.numFound ?? docs.length}
            </div>
          )}

          {docs.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.slice(0, limit).map((d) => {
                const olid = pickEditionOlidFromSearchDoc(d);
                const title = d?.title ?? "";
                const author = Array.isArray(d?.author_name) ? d.author_name[0] : "";
                const year = d?.first_publish_year ?? "";

                return (
                  <button
                    key={`${d.key}-${olid}-${title}`}
                    type="button"
                    className={[
                      "text-left rounded-lg border p-3 transition-colors",
                      selectedOlid === olid
                        ? "border-[color:var(--accent)] bg-[color:var(--active-bg)]"
                        : "border-[color:var(--border)] hover:bg-[color:var(--active-bg)]",
                    ].join(" ")}
                    onClick={() => loadEdition(olid)}
                    disabled={!olid}
                    title={!olid ? "No edition OLID found in this result" : `Select ${olid}`}
                  >
                    <div className="font-semibold text-[color:var(--text-primary)] line-clamp-2">{title}</div>
                    <div className="text-sm text-[color:var(--text-secondary)]">
                      {author} {year ? `• ${year}` : ""}
                    </div>
                    <div className="text-xs text-[color:var(--text-secondary)] mt-1">
                      OLID: {olid || "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "isbn" && (
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-4 mb-6 text-sm text-[color:var(--text-secondary)]">
          ISBN autofill is next: it will call Open Library Books API (bibkeys=ISBN:...&format=json&jscmd=data). [web:10]
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Edition preview */}
        <div className="md:col-span-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Selected edition</div>
            <div className="text-xs text-[color:var(--text-secondary)]">{selectedOlid || "None"}</div>
          </div>

          {loadingEdition && <div className="text-sm text-[color:var(--text-secondary)]">Loading edition...</div>}

          {!loadingEdition && !selectedOlid && (
            <div className="text-sm text-[color:var(--text-secondary)]">Pick a search result to load its edition JSON.</div>
          )}

          {!loadingEdition && selectedOlid && (
            <>
              {selectedEdition?.error ? (
                <div className="text-sm text-red-600">{selectedEdition.error}</div>
              ) : (
                <pre className="text-xs overflow-auto max-h-80 bg-[color:var(--active-bg)] border border-[color:var(--border)] rounded-md p-3">
                  {JSON.stringify(selectedEdition, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>

        {/* Stock editor */}
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-4">
          <div className="font-semibold mb-3">Stock</div>

          <label className="block text-xs text-[color:var(--text-secondary)] mb-1">Quality (1–5)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-md border border-[color:var(--border)] bg-transparent"
          />

          <label className="block text-xs text-[color:var(--text-secondary)] mb-1">Quantity</label>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-md border border-[color:var(--border)] bg-transparent"
          />

          <button
            type="button"
            onClick={saveStock}
            disabled={saving}
            className="w-full px-4 py-2 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => setQuantity(0)}
            className="w-full mt-2 px-4 py-2 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--active-bg)] text-sm text-[color:var(--text-secondary)]"
            title="This is effectively delete with current backend: set quantity to 0."
          >
            Set quantity = 0
          </button>

          {saveMsg && <div className="text-sm text-green-700 mt-3">{saveMsg}</div>}
          {saveErr && <div className="text-sm text-red-600 mt-3">{saveErr}</div>}
        </div>
      </div>
    </div>
  );
}
