// File: src/components/WishlistButton.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { isWishlisted, toggleWishlist } from "../state/wishlistStore";

export default function WishlistButton({ item, className = "" }) {
  const id = String(item?.openlibraryid || "").trim().toUpperCase();

  const [filled, setFilled] = useState(() => (id ? isWishlisted(id) : false));
  const [anim, setAnim] = useState(false);
  const tRef = useRef(null);

  const disabled = !id;

  const title = useMemo(
    () => (filled ? "Remove from wishlist" : "Add to wishlist"),
    [filled]
  );

  // Keep state in sync if wishlist changes elsewhere (e.g. from Wishlist page remove)
  useEffect(() => {
    if (!id) return;

    const sync = () => setFilled(isWishlisted(id));
    window.addEventListener("wishlist:changed", sync);
    return () => window.removeEventListener("wishlist:changed", sync);
  }, [id]);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    const next = toggleWishlist(item);
    setFilled(next);

    // small “pop” animation
    setAnim(true);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setAnim(false), 260);
  }

  return (
    <>
      <button
        type="button"
        className={[
          "wish-btn",
          filled ? "is-filled" : "",
          anim ? "is-anim" : "",
          className,
        ].join(" ")}
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        title={title}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M6 3.5C6 2.67 6.67 2 7.5 2h9C17.33 2 18 2.67 18 3.5V22l-6-3-6 3V3.5z"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <style>{`
        .wish-btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:34px;
          height:34px;
          border-radius:10px;
          border:1px solid var(--colorvar--border);
          color: var(--colorvar--text-secondary);
          background: transparent;
          transition: transform 120ms ease, background 120ms ease, color 120ms ease;
        }
        .wish-btn:hover{ background: var(--colorvar--active-bg); }
        .wish-btn:disabled{ opacity: .5; cursor: not-allowed; }
        .wish-btn.is-filled{ color: var(--colorvar--accent); }
        .wish-btn.is-anim{ animation: wishpop 240ms ease-out; }
        @keyframes wishpop{
          0%{ transform: scale(1); }
          45%{ transform: scale(1.18); }
          100%{ transform: scale(1); }
        }
      `}</style>
    </>
  );
}
