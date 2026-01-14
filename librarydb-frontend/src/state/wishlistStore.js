const KEY = "librarydb_wishlist_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event("wishlist:changed"));
}

export function getWishlist() {
  return read();
}

export function isWishlisted(openlibraryid) {
  const id = String(openlibraryid || "").trim().toUpperCase();
  return read().some((x) => String(x.openlibraryid).toUpperCase() === id);
}

export function addToWishlist(item) {
  const id = String(item?.openlibraryid || "").trim().toUpperCase();
  if (!id) return;

  const cur = read();
  if (cur.some((x) => String(x.openlibraryid).toUpperCase() === id)) return;

  // Store a tiny snapshot so Wishlist can render even if API changes.
  cur.unshift({
    openlibraryid: id,
    title: item?.title ?? "",
    author: item?.author ?? "",
    coverurl: item?.coverurl ?? `https://covers.openlibrary.org/b/olid/${id}-M.jpg?default=false`,
    createdAt: Date.now(),
  });

  write(cur);
}

export function removeFromWishlist(openlibraryid) {
  const id = String(openlibraryid || "").trim().toUpperCase();
  if (!id) return;

  const next = read().filter((x) => String(x.openlibraryid).toUpperCase() !== id);
  write(next);
}

export function toggleWishlist(item) {
  const id = String(item?.openlibraryid || "").trim().toUpperCase();
  if (!id) return false;

  if (isWishlisted(id)) {
    removeFromWishlist(id);
    return false;
  }

  addToWishlist(item);
  return true;
}
