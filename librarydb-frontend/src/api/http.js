// src/api/http.js

const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "") ||
  "http://localhost:8000";

function buildUrl(path) {
  const clean = String(path ?? "").replace(/^\/+/, "");
  // Backend routes are /api/auth/me, /api/wishlist/me, /api/rentals/..., etc.
  return `${API_BASE}/api/${clean}`;
}

async function parseJson(res) {
  if (res.status === 204) return null;

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // If backend returns plain text or HTML error
    return text;
  }
}

function pickErrorMessage(res, data) {
  return (
    (data && typeof data === "object" && data.error) ||
    (typeof data === "string" ? data : null) ||
    `HTTP ${res.status}`
  );
}

export async function apiGet(path) {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(pickErrorMessage(res, data));
  }

  return data;
}

export async function apiPost(path, body = {}) {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(pickErrorMessage(res, data));
  }

  return data;
}
