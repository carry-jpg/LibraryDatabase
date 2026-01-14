import React, { useEffect, useMemo, useState } from "react";
import { getWishlist, removeFromWishlist } from "../state/wishlistStore";

export default function Wishlist() {
  const [rows, setRows] = useState(() => getWishlist());

  useEffect(() => {
    const onChange = () => setRows(getWishlist());
    window.addEventListener("wishlist:changed", onChange);
    return () => window.removeEventListener("wishlist:changed", onChange);
  }, []);

  const items = useMemo(() => rows || [], [rows]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-4 text-colorvar--text-primary">Wishlist</h1>

      {items.length === 0 && (
        <div className="text-sm text-colorvar--text-secondary">
          No items yet. Use the bookmark icon on a book to add it here.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((b) => (
          <div
            key={b.openlibraryid}
            className="rounded-xl border border-colorvar--border bg-colorvar--panel-bg p-3"
          >
            <img
              src={b.coverurl}
              alt={b.title || "Cover"}
              className="w-full aspect-[3/4] object-cover rounded-lg border border-colorvar--border bg-colorvar--active-bg"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

            <div className="mt-3">
              <div className="font-semibold text-colorvar--text-primary line-clamp-2">
                {b.title || "Untitled"}
              </div>
              <div className="text-sm text-colorvar--text-secondary line-clamp-1">
                {b.author || "Unknown"}
              </div>

              <button
                className="mt-3 w-full px-3 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-red-600"
                onClick={() => removeFromWishlist(b.openlibraryid)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
