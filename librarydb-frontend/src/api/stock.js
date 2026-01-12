import { apiPost } from "./http";

/** POST /api/stock/set  Body: { olid, quality, quantity, importIfMissing } [file:228] */
export async function setStock({ olid, quality, quantity, importIfMissing = true }) {
  return apiPost("/stock/set", { olid, quality, quantity, importIfMissing });
}
