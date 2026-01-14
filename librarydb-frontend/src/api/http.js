// File: src/api/http.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api";

function joinUrl(base, path) {
  if (!base) return path;
  return `${base}${path}`;
}

function apiPath(path) {
  // If caller already passed "/api/..." keep it.
  if (path.startsWith("/api/")) return path;

  // Ensure prefix starts with /
  const prefix = API_PREFIX.startsWith("/") ? API_PREFIX : `/${API_PREFIX}`;

  // Ensure path starts with /
  const p = path.startsWith("/") ? path : `/${path}`;

  return `${prefix}${p}`;
}

async function parseJson(res) {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : null;
  } catch {
    return { error: txt || `HTTP ${res.status}` };
  }
}

export async function apiGet(path) {
  const url = joinUrl(API_BASE_URL, apiPath(path));
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error || `GET ${url} failed: ${res.status}`);
  return data;
}

export async function apiPost(path, body) {
  const url = joinUrl(API_BASE_URL, apiPath(path));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(body ?? {}),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error || `POST ${url} failed: ${res.status}`);
  return data;
}
