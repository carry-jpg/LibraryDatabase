// File: src/api/openlibrary.js
import { apiGet } from "./http";

/** GET /api/openlibrary/search?q=...&limit=... */
export async function olSearch(q, limit = 20) {
  return apiGet(`/openlibrary/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

/** GET /api/openlibrary/edition?olid=... */
export async function olEdition(olid) {
  return apiGet(`/openlibrary/edition?olid=${encodeURIComponent(olid)}`);
}
