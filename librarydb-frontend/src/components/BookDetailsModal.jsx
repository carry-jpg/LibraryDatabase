import React from "react";
import Modal from "./Modal";

function Row({ label, value }) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="grid grid-cols-12 gap-3 py-2 border-b border-[color:var(--border)]">
      <div className="col-span-4 text-sm text-[color:var(--text-secondary)]">{label}</div>
      <div className="col-span-8 text-sm text-[color:var(--text-primary)] break-words">
        {Array.isArray(value) ? value.join(", ") : value}
      </div>
    </div>
  );
}

export default function BookDetailsModal({ open, book, onClose }) {
  const subjects = book?.subjects ?? []; // OpenLibrary-style tags/subjects [page:0]

  return (
    <Modal open={open} title={book?.title ?? "Book"} onClose={onClose}>
      {!book ? null : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cover */}
          <div className="md:col-span-1">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 border border-[color:var(--border)]">
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            </div>

            {subjects.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-[color:var(--text-secondary)] mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {subjects.slice(0, 12).map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--active-bg)] text-[color:var(--text-primary)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <div className="text-sm text-[color:var(--text-secondary)]">{book.author}</div>
              {book.publisher && (
                <div className="text-sm text-[color:var(--text-secondary)]">Publisher: {book.publisher}</div>
              )}
            </div>

            <div className="rounded-lg border border-[color:var(--border)] overflow-hidden">
              <div className="px-4 py-3 bg-[color:var(--active-bg)] font-semibold text-[color:var(--text-primary)]">
                Book details
              </div>

              <div className="px-4">
                <Row label="OpenLibrary ID" value={book.open_library_id} />
                <Row label="ISBN" value={book.isbn} />
                <Row label="Release / Publish date" value={book.publish_date} />
                <Row label="Pages" value={book.pages} />
                <Row label="Language" value={book.language} />
                <Row label="Condition (wear)" value={book.condition != null ? `${book.condition}/5` : null} />
                <Row label="In stock" value={book.quantity != null ? String(book.quantity) : null} />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-[color:var(--text-primary)] mb-2">Description</div>
              <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                {book.description || "No description available."}
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
