import React, { useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { requestRental } from "../state/rentalsStore";

function Row({ label, value }) {
  if (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
    return null;

  return (
    <div className="grid grid-cols-12 gap-3 py-2 border-b border-colorvar--border">
      <div className="col-span-4 text-sm text-colorvar--text-secondary">
        {label}
      </div>
      <div className="col-span-8 text-sm text-colorvar--text-primary break-words">
        {Array.isArray(value) ? value.join(", ") : value}
      </div>
    </div>
  );
}

export default function BookDetailsModal({ open, book, onClose }) {
  const subjects = book?.subjects ?? [];
  const inStock = Number(book?.quantity ?? 0) > 0;
  const stockId = Number(book?.stockid ?? 0);

  const canRequest = useMemo(() => {
    return Boolean(book) && inStock && stockId > 0;
  }, [book, inStock, stockId]);

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(message, type = "ok") {
    setToast({ message, type });
    window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(null), 2200);
  }

  async function onRequestRental() {
    setErr("");
    if (!canRequest) {
      setErr(
        !book
          ? "No book selected."
          : !inStock
          ? "Out of stock."
          : "Missing stock id."
      );
      return;
    }

    setBusy(true);
    try {
      await requestRental({
        stockId,
        note: note.trim() ? note.trim() : null,
      });
      showToast("Rental request sent.", "ok");
      setNote("");
      onClose?.();
    } catch (e) {
      setErr(String(e?.message || e));
      showToast("Request failed.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Book" onClose={onClose}>
      {!book ? null : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cover */}
          <div className="md:col-span-1">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 border border-colorvar--border">
              <img
                src={book.coverurl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            </div>

            {subjects.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-colorvar--text-secondary mb-2">
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {subjects.slice(0, 12).map((s) => (
                    <span
                      key={String(s)}
                      className="text-xs px-2 py-1 rounded-full border border-colorvar--border bg-colorvar--active-bg text-colorvar--text-primary"
                      title={String(s)}
                    >
                      {String(s)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Details */}
          <div className="md:col-span-2">
            {toast ? (
              <div
                className={[
                  "mb-4 rounded-lg border px-3 py-2 text-sm",
                  toast.type === "ok"
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-red-300 bg-red-50 text-red-900",
                ].join(" ")}
              >
                {toast.message}
              </div>
            ) : null}

            <div className="mb-4">
              <div className="text-xl font-semibold break-words leading-tight line-clamp-2 text-colorvar--text-primary">
                {book.title}
              </div>
              <div className="text-sm break-words text-colorvar--text-secondary mt-1">
                {book.author}
              </div>
              {book.publisher ? (
                <div className="text-sm break-words text-colorvar--text-secondary mt-1">
                  Publisher: {book.publisher}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-colorvar--border overflow-hidden">
              <div className="px-4 py-3 bg-colorvar--active-bg font-semibold text-colorvar--text-primary">
                Book details
              </div>
              <div className="px-4">
                <Row label="OpenLibrary ID" value={book.openlibraryid} />
                <Row label="ISBN" value={book.isbn} />
                <Row label="Release / Publish date" value={book.publishdate} />
                <Row label="Pages" value={book.pages} />
                <Row label="Language" value={book.language} />
                <Row
                  label="Condition (wear)"
                  value={book.condition != null ? `${book.condition}/5` : null}
                />
                <Row
                  label="In stock"
                  value={book.quantity != null ? String(book.quantity) : null}
                />
                <Row
                  label="Stock ID"
                  value={book.stockid != null ? String(book.stockid) : null}
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-colorvar--text-primary mb-2">
                Description
              </div>
              <p className="text-sm leading-6 text-colorvar--text-secondary break-words">
                {book.description || "No description available."}
              </p>
            </div>

            {/* Request rental */}
            <div className="mt-6 rounded-lg border border-colorvar--border bg-colorvar--panel-bg p-4">
              <div className="text-sm font-semibold text-colorvar--text-primary mb-2">
                Request rental
              </div>

              {!inStock ? (
                <div className="text-sm text-red-600 font-semibold">
                  Out of stock.
                </div>
              ) : null}

              {err ? (
                <div className="mt-2 rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
                  {err}
                </div>
              ) : null}

              <label className="block text-xs text-colorvar--text-secondary mt-3 mb-1">
                Note (optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything the librarian should know?"
                className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                disabled={busy}
              />

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={onRequestRental}
                  disabled={!canRequest || busy}
                  className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white font-semibold disabled:opacity-60"
                >
                  {busy ? "Sending..." : "Request rental"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
