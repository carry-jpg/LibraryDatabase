// src/api/users.js
import { apiGet, apiPost } from "./http";

// Admin
export function apiAdminUsersList() {
  return apiGet("admin/users");
}

export function apiAdminUsersSetRole({ userId, role }) {
  return apiPost("admin/users/role", { userId, role });
}
