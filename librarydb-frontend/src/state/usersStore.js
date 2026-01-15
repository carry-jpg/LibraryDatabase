// src/state/usersStore.js
import { apiAdminUsersList, apiAdminUsersSetRole } from "../api/users";

const state = {
  loaded: false,
  loading: null,
  users: [],
};

function emit() {
  window.dispatchEvent(new Event("users:changed"));
}

export function invalidateUsers() {
  state.loaded = false;
  emit();
}

async function loadOnce() {
  if (state.loaded) return;
  if (state.loading) return state.loading;

  state.loading = (async () => {
    const rows = await apiAdminUsersList();
    state.users = Array.isArray(rows) ? rows : [];
    state.loaded = true;
    emit();
  })().finally(() => {
    state.loading = null;
  });

  return state.loading;
}

// -------------------- Getters --------------------
export function getAdminUsers() {
  loadOnce().catch(() => {});
  return state.users;
}

// -------------------- Actions --------------------
export async function setUserRole(userId, role) {
  const res = await apiAdminUsersSetRole({ userId, role });

  // optimistic update
  state.users = (state.users || []).map((u) =>
    Number(u?.userid) === Number(userId) ? { ...u, role } : u
  );

  emit();
  return res;
}
