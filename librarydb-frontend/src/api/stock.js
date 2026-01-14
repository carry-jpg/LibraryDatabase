// File: src/api/stock.js
import { apiPost } from "./http";

/** POST /api/stock/set Body: { olid, quality, quantity, importIfMissing } */
export async function setStock({ olid, quality, quantity, importIfMissing = true }) {
  return apiPost("/stock/set", { olid, quality, quantity, importIfMissing });
}
