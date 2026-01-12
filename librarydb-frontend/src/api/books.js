import { apiGet } from "./http";

/**
 * Expected backend: GET /api/stock/list
 * Returns rows joining stock + book fields. [file:200]
 */
export async function getBooks() {
  const rows = await apiGet("/api/stock/list");

  // Map backend rows -> frontend book card shape
  return (rows || []).map((r) => ({
    stock_id: Number(r.stockid ?? r.stockId ?? r.stock_id ?? r.id ?? 0),
    open_library_id: String(r.openlibraryid ?? r.openLibraryId ?? r.open_library_id ?? r.olid ?? ""),
    title: String(r.title ?? ""),
    author: String(r.author ?? ""),
    publisher: r.publisher ?? "",
    publish_date: r.releaseyear ?? r.releaseYear ?? r.publish_date ?? "",
    pages: r.pages ?? null,
    language: r.language ?? "",
    isbn: r.isbn ?? "",
    description: r.description ?? "",
    subjects: Array.isArray(r.subjects) ? r.subjects : [],

    // Stock
    quantity: Number(r.quantity ?? 0),
    condition: Number(r.quality ?? r.condition ?? 0),

    // Cover
    cover_url:
      r.cover_url ??
      (r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-L.jpg` : null) ??
      "https://via.placeholder.com/400x600?text=No+Cover",
  }));
}
