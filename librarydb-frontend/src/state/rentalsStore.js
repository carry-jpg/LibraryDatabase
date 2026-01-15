// src/state/rentalsStore.js
import {
  apiRentalsMy,
  apiRentalsRequest,
  apiRentalsAdminRequests,
  apiRentalsAdminApproved,
  apiRentalsAdminActive,
  apiRentalsAdminApprove,
  apiRentalsAdminDismiss,
  apiRentalsAdminComplete,
} from "../api/rentals";

const state = {
  // user
  myLoaded: false,
  myLoading: null,
  myItems: [],

  // admin - pending requests
  reqLoaded: false,
  reqLoading: null,
  requests: [],

  // admin - approved list
  apprLoaded: false,
  apprLoading: null,
  approved: [],

  // admin - active rentals (approved + not_returned)
  activeLoaded: false,
  activeLoading: null,
  active: [],
};

function emit() {
  window.dispatchEvent(new Event("rentals:changed"));
}

function invalidateAll() {
  state.myLoaded = false;
  state.reqLoaded = false;
  state.apprLoaded = false;
  state.activeLoaded = false;
}

async function loadMyOnce() {
  if (state.myLoaded) return;
  if (state.myLoading) return state.myLoading;

  state.myLoading = (async () => {
    const rows = await apiRentalsMy();
    state.myItems = Array.isArray(rows) ? rows : [];
    state.myLoaded = true;
    emit();
  })().finally(() => {
    state.myLoading = null;
  });

  return state.myLoading;
}

async function loadRequestsOnce() {
  if (state.reqLoaded) return;
  if (state.reqLoading) return state.reqLoading;

  state.reqLoading = (async () => {
    const rows = await apiRentalsAdminRequests();
    state.requests = Array.isArray(rows) ? rows : [];
    state.reqLoaded = true;
    emit();
  })().finally(() => {
    state.reqLoading = null;
  });

  return state.reqLoading;
}

async function loadApprovedOnce() {
  if (state.apprLoaded) return;
  if (state.apprLoading) return state.apprLoading;

  state.apprLoading = (async () => {
    const rows = await apiRentalsAdminApproved();
    state.approved = Array.isArray(rows) ? rows : [];
    state.apprLoaded = true;
    emit();
  })().finally(() => {
    state.apprLoading = null;
  });

  return state.apprLoading;
}

async function loadActiveOnce() {
  if (state.activeLoaded) return;
  if (state.activeLoading) return state.activeLoading;

  state.activeLoading = (async () => {
    const rows = await apiRentalsAdminActive();
    state.active = Array.isArray(rows) ? rows : [];
    state.activeLoaded = true;
    emit();
  })().finally(() => {
    state.activeLoading = null;
  });

  return state.activeLoading;
}

// -------------------- Getters --------------------
export function getMyRentals() {
  loadMyOnce().catch(() => {});
  return state.myItems;
}

export function getAdminRentalRequests() {
  loadRequestsOnce().catch(() => {});
  return state.requests;
}

export function getAdminApprovedRentals() {
  loadApprovedOnce().catch(() => {});
  return state.approved;
}

export function getAdminActiveRentals() {
  loadActiveOnce().catch(() => {});
  return state.active;
}

export function getAdminPendingCount() {
  loadRequestsOnce().catch(() => {});
  return Array.isArray(state.requests) ? state.requests.length : 0;
}

// -------------------- Actions --------------------
export async function requestRental({ stockId, note = null }) {
  const res = await apiRentalsRequest({ stockId, note });
  invalidateAll();
  emit();
  return res;
}

export async function approveRentalRequest(requestId, startAt, endAt) {
  const res = await apiRentalsAdminApprove({ requestId, startAt, endAt });

  // optimistic: remove from pending list
  state.requests = (state.requests || []).filter(
    (r) => Number(r?.rentalid ?? r?.requestid) !== Number(requestId)
  );

  // approved and active list changed -> refresh next access
  state.apprLoaded = false;
  state.activeLoaded = false;
  state.myLoaded = false;

  emit();
  return res;
}

export async function dismissRentalRequest(requestId) {
  const res = await apiRentalsAdminDismiss({ requestId });

  // optimistic: remove from pending list
  state.requests = (state.requests || []).filter(
    (r) => Number(r?.rentalid ?? r?.requestid) !== Number(requestId)
  );

  state.myLoaded = false;
  emit();
  return res;
}

export async function completeRental(rentalId) {
  const res = await apiRentalsAdminComplete({ rentalId });

  // optimistic: remove from active list
  state.active = (state.active || []).filter(
    (r) => Number(r?.rentalid) !== Number(rentalId)
  );

  // other lists changed -> refresh next access
  state.apprLoaded = false; // approved list no longer contains completed anyway, but safe
  state.myLoaded = false;

  emit();
  return res;
}

export function invalidateRentals() {
  invalidateAll();
  emit();
}
