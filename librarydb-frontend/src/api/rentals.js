// src/api/rentals.js
import { apiGet, apiPost } from "./http";

// -------------------- User --------------------
export function apiRentalsMy() {
  return apiGet("rentals/my");
}

export function apiRentalsRequest(payload) {
  // payload example: { stockId, note }
  return apiPost("rentals/request", payload);
}

// -------------------- Admin --------------------
export function apiRentalsAdminRequests() {
  return apiGet("rentals/admin/requests");
}

export function apiRentalsAdminApproved() {
  return apiGet("rentals/admin/approved");
}

export function apiRentalsAdminActive() {
  return apiGet("rentals/admin/active");
}

export function apiRentalsAdminApprove(payload) {
  // payload example: { requestId, startAt, endAt }
  return apiPost("rentals/admin/approve", payload);
}

export function apiRentalsAdminDismiss(payload) {
  // payload example: { requestId }
  return apiPost("rentals/admin/dismiss", payload);
}

export function apiRentalsAdminComplete(payload) {
  // payload example: { rentalId }
  return apiPost("rentals/admin/complete", payload);
}
