import { apiGet } from "./http";

export async function getBooks() {
  const rows = await apiGet("/api/stock/list");
  const arr = Array.isArray(rows) ? rows : [];

  return arr.map((r) => ({
    stockid: Number(r.stockid ?? r.stockId ?? r.id ?? 0),
    openlibraryid: String(r.openlibraryid ?? r.olid ?? ""),
    title: String(r.title ?? ""),
    author: String(r.author ?? ""),
    publisher: String(r.publisher ?? ""),
    publishdate: r.releaseyear ?? r.publish_date ?? "",
    pages: r.pages ?? null,
    language: r.language ?? "",
    isbn: String(r.isbn ?? ""),
    description: String(r.description ?? ""),
    subjects: Array.isArray(r.subjects) ? r.subjects : [],
    quantity: Number(r.quantity ?? 0),
    condition: Number(r.quality ?? r.condition ?? 0),
    coverurl:
      r.coverurl ??
      r.cover_url ??
      (r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-L.jpg` : null) ??
      "https://via.placeholder.com/400x600?text=No+Cover",
  }));
}
