// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAdminUsers, setUserRole } from "../state/usersStore";

function AdminBadge() {
  return (
    <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-bold">
      ADMIN
    </span>
  );
}

export default function UserManagement() {
  const [tick, setTick] = useState(0);

  // UI state
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState(null);

  // toast
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  function showToast(message, type = "ok") {
    setToast({ message, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    const onCh = () => setTick((x) => x + 1);
    window.addEventListener("users:changed", onCh);
    return () => window.removeEventListener("users:changed", onCh);
  }, []);

  const users = useMemo(() => {
    const rows = getAdminUsers();
    return Array.isArray(rows) ? rows : [];
  }, [tick]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;

    return users.filter((u) => {
      const s = [
        u?.userid,
        u?.email,
        u?.name,
        u?.role,
        u?.createdat,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return s.includes(needle);
    });
  }, [users, q]);

  async function onChangeRole(userId, role) {
    setSavingId(userId);
    try {
      await setUserRole(Number(userId), role);
      showToast("Role updated.", "ok");
    } catch (e) {
      showToast(String(e?.message || e), "err");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {toast ? (
        <div
          className={[
            "fixed bottom-5 right-5 z-[1000] px-4 py-3 rounded-lg border shadow-xl text-sm",
            toast.type === "ok"
              ? "border-green-300 bg-green-50 text-green-900"
              : toast.type === "err"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-colorvar--border bg-colorvar--panel-bg text-colorvar--text-primary",
          ].join(" ")}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-colorvar--text-primary">
            User management
          </h1>
          <AdminBadge />
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by id, email, name, role..."
          className="w-full max-w-md px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary placeholder:text-colorvar--text-secondary"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-colorvar--text-secondary">No users.</div>
      ) : (
        <div className="rounded-xl border border-colorvar--border bg-colorvar--panel-bg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-colorvar--active-bg text-colorvar--text-secondary">
              <tr>
                <th className="text-left px-3 py-2">User ID</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>

            <tbody className="text-colorvar--text-primary">
              {filtered.map((u) => {
                const userId = Number(u?.userid);
                const role = String(u?.role || "user");

                const busy = savingId === userId;

                return (
                  <tr
                    key={String(userId)}
                    className="border-t border-colorvar--border"
                  >
                    <td className="px-3 py-2 font-mono">{String(userId)}</td>
                    <td className="px-3 py-2">{String(u?.email || "—")}</td>
                    <td className="px-3 py-2">{String(u?.name || "—")}</td>
                    <td className="px-3 py-2">
                      <select
                        className="px-2 py-1 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                        value={role}
                        disabled={busy}
                        onChange={(e) =>
                          onChangeRole(userId, String(e.target.value))
                        }
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(u?.createdat || "—")}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-xs text-colorvar--text-primary disabled:opacity-60"
                        disabled={busy}
                        onClick={() => onChangeRole(userId, role)}
                        title="Re-apply same role (usually unnecessary)"
                      >
                        {busy ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="px-3 py-3 text-xs text-colorvar--text-secondary border-t border-colorvar--border">
            Note: passwords are never shown; this view exposes only id/email/name/role/createdAt.
          </div>
        </div>
      )}
    </div>
  );
}
