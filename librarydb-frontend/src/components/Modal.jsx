import React, { useEffect } from "react";

export default function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* panel */}
      <div className="relative w-full max-w-4xl mx-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-bg)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
          <div className="font-semibold text-[color:var(--text-primary)]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md text-sm border border-[color:var(--border)] hover:bg-[color:var(--active-bg)] text-[color:var(--text-secondary)]"
          >
            Close
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
