// File: src/api/auth.js
import { apiGet, apiPost } from "./http";

export async function authMe() {
  try {
    const data = await apiGet("/auth/me");
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function authRegister({ email, name, password }) {
  const data = await apiPost("/auth/register", { email, name, password });
  return data?.user ?? data;
}

export async function authLogin({ email, password }) {
  const data = await apiPost("/auth/login", { email, password });
  return data?.user ?? data;
}

export async function authLogout() {
  await apiPost("/auth/logout", {});
}
