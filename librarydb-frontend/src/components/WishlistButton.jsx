// src/components/WishlistButton.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../api/http";

// Simple module cache so 50 book cards don't trigger 50 network calls
let cachedIds = null;
let idsPromise = null;

async function loadWishlistIds() {
  if (Array.isArray(cachedIds)) return cachedIds;
  if (idsPromise) return idsPromise;
  idsPromise = apiGet("wishlist/ids")
    .then((ids) => {
      cachedIds = Array.isArray(ids) ? ids.map((x) => String(x).toUpperCase()) : [];
      return cachedIds;
    })
    .finally(() => {
      idsPromise = null;
    });
  return idsPromise;
}

export default function WishlistButton({ item, className = "" }) {
  const id = String(item?.openlibraryid || "").trim().toUpperCase();

  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anim, setAnim] = useState(false);
  const tRef = useRef(null);

  const disabled = !id || busy;

  const title = useMemo(
    () => (filled ? "Remove from wishlist" : "Add to wishlist"),
    [filled]
  );

  // initial state from server
  useEffect(() => {
    let alive = true;
    if (!id) return;

    (async () => {
      try {
        const ids = await loadWishlistIds();
        if (!alive) return;
        setFilled(ids.includes(id));
      } catch {
        // ignore; button will still work on click
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setBusy(true);
    try {
      const payload = {
        olid: id,
        title: item?.title ?? null,
        author: item?.author ?? null,
        coverurl: item?.coverurl ?? null,
        releaseyear: item?.releaseyear ?? null,
      };

      const res = await apiPost("wishlist/toggle", payload); // { wished: true/false } [file:87]
      const next = !!res?.wished;

      setFilled(next);

      // update cache
      const ids = await loadWishlistIds().catch(() => null);
      if (Array.isArray(ids)) {
        const s = new Set(ids);
        if (next) s.add(id);
        else s.delete(id);
        cachedIds = Array.from(s);
      }

      // small “pop” animation
      setAnim(true);
      clearTimeout(tRef.current);
      tRef.current = setTimeout(() => setAnim(false), 260);

      window.dispatchEvent(new Event("wishlist:changed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={[
        "w-9 h-9 rounded-full border border-colorvar--border flex items-center justify-center",
        "bg-colorvar--panel-bg hover:bg-colorvar--active-bg transition-colors",
        anim ? "scale-110" : "scale-100",
        className,
      ].join(" ")}
    >
      <span className={filled ? "text-colorvar--accent" : "text-colorvar--text-secondary"}>
        {/* simple icon */}
        {filled ? "★" : "☆"}
      </span>
    </button>
  );
}
