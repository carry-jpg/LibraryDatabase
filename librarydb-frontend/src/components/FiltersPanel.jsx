import React, { useMemo } from "react";

export default function FiltersPanel({
  open,
  onClose,
  books,
  filters,
  setFilters,
}) {
  const authors = useMemo(() => {
    const set = new Set(books.map((b) => b.author).filter(Boolean));
    return Array.from(set).sort();
  }, [books]);

  const publishers = useMemo(() => {
    const set = new Set(books.map((b) => b.publisher).filter(Boolean));
    return Array.from(set).sort();
  }, [books]);

  const subjects = useMemo(() => {
    const set = new Set();
    books.forEach((b) => (b.subjects || []).forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [books]);

  const hasSubjects = subjects.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[998]">
      <button
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close filters"
      />

      <div className="absolute right-8 top-36 w-[380px] rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-bg)] shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
          <div className="font-semibold text-[color:var(--text-primary)]">Filters</div>
          <button
            className="text-sm px-3 py-1 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--active-bg)] text-[color:var(--text-secondary)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filters.onlyInStock}
              onChange={(e) => setFilters((f) => ({ ...f, onlyInStock: e.target.checked }))}
            />
            <span className="text-sm text-[color:var(--text-primary)]">Only show in-stock</span>
          </label>

          <div>
            <div className="text-xs font-semibold text-[color:var(--text-secondary)] mb-2">Minimum condition</div>
            <input
              type="range"
              min={1}
              max={5}
              value={filters.minCondition}
              onChange={(e) => setFilters((f) => ({ ...f, minCondition: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="text-sm text-[color:var(--text-secondary)] mt-1">≥ {filters.minCondition}/5</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-[color:var(--text-secondary)] mb-2">Author</div>
              <select
                value={filters.author}
                onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value }))}
                className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">All</option>
                {authors.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-[color:var(--text-secondary)] mb-2">Publisher</div>
              <select
                value={filters.publisher}
                onChange={(e) => setFilters((f) => ({ ...f, publisher: e.target.value }))}
                className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">All</option>
                {publishers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {hasSubjects && (
            <div>
              <div className="text-xs font-semibold text-[color:var(--text-secondary)] mb-2">Tag (subject)</div>
              <select
                value={filters.subject}
                onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">All</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-between">
            <button
              className="text-sm px-3 py-2 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--active-bg)] text-[color:var(--text-secondary)]"
              onClick={() => setFilters({ onlyInStock: false, minCondition: 1, author: "", publisher: "", subject: "" })}
            >
              Reset
            </button>

            <button
              className="text-sm px-3 py-2 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-semibold"
              onClick={onClose}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
