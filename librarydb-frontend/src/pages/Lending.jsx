// src/pages/Lending.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal";
import {
  approveRentalRequest,
  completeRental,
  dismissRentalRequest,
  getAdminActiveRentals,
  getAdminApprovedRentals,
  getAdminRentalRequests,
} from "../state/rentalsStore";

function toDatetimeLocalValue(dt) {
  if (!dt) return "";
  // dt is expected "YYYY-MM-DD HH:MM:SS"
  const s = String(dt).replace(" ", "T");
  return s.slice(0, 16);
}

function fromDatetimeLocalValue(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  // Convert "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DD HH:MM:SS"
  return s.replace("T", " ") + ":00";
}

function fmt(dt) {
  const s = String(dt || "").trim();
  return s ? s : "—";
}

function statusPill(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved")
    return "bg-green-50 text-green-800 border-green-200";
  if (s === "pending")
    return "bg-yellow-50 text-yellow-900 border-yellow-200";
  if (s === "dismissed") return "bg-gray-50 text-gray-800 border-gray-200";
  if (s === "completed") return "bg-blue-50 text-blue-800 border-blue-200";
  if (s === "not_returned") return "bg-red-50 text-red-800 border-red-200";
  return "bg-gray-50 text-gray-800 border-gray-200";
}

export default function Lending() {
  const [tab, setTab] = useState("requests"); // requests | approved | active
  const [tick, setTick] = useState(0);

  // toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(message, type = "ok") {
    setToast({ message, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }

  // approve modal state
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveItem, setApproveItem] = useState(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onCh = () => setTick((x) => x + 1);
    window.addEventListener("rentals:changed", onCh);
    return () => window.removeEventListener("rentals:changed", onCh);
  }, []);

  // trigger loads
  const requests = getAdminRentalRequests();
  const approved = getAdminApprovedRentals();
  const active = getAdminActiveRentals();

  const rows = useMemo(() => {
    const src =
      tab === "requests" ? requests : tab === "approved" ? approved : active;
    return Array.isArray(src) ? src : [];
  }, [tab, requests, approved, active, tick]);

  function openApprove(r) {
    setErr("");
    setApproveItem(r);

    // defaults
    const now = new Date();
    const start = new Date(now.getTime() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const fmtLocal = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setStartAt(fmtLocal(start));
    setEndAt(fmtLocal(end));
    setApproveOpen(true);
  }

  async function onApprove() {
    setErr("");
    if (!approveItem?.rentalid) return;

    const s = fromDatetimeLocalValue(startAt);
    const e = fromDatetimeLocalValue(endAt);

    if (!s || !e) {
      setErr("Start and end time are required.");
      return;
    }
    if (e <= s) {
      setErr("End must be after start.");
      return;
    }

    setBusy(true);
    try {
      await approveRentalRequest(Number(approveItem.rentalid), s, e);
      setApproveOpen(false);
      showToast("Approved.", "ok");
    } catch (ex) {
      setErr(String(ex?.message || ex));
      showToast("Approve failed.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function onDismiss(r) {
    const ok = window.confirm("Dismiss this request?");
    if (!ok) return;

    try {
      await dismissRentalRequest(Number(r?.rentalid));
      showToast("Dismissed.", "ok");
    } catch (ex) {
      showToast(String(ex?.message || ex), "err");
    }
  }

  async function onComplete(r) {
    const ok = window.confirm("Mark this rental as returned (complete)?");
    if (!ok) return;

    try {
      await completeRental(Number(r?.rentalid));
      showToast("Completed (returned).", "ok");
    } catch (ex) {
      showToast(String(ex?.message || ex), "err");
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

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-colorvar--text-primary">
          Lending
        </h1>

        <div className="flex gap-2">
          <button
            type="button"
            className={[
              "px-3 py-2 rounded-md border text-sm",
              tab === "requests"
                ? "border-colorvar--accent bg-colorvar--active-bg text-colorvar--text-primary"
                : "border-colorvar--border hover:bg-colorvar--active-bg text-colorvar--text-primary",
            ].join(" ")}
            onClick={() => setTab("requests")}
          >
            Requests
          </button>

          <button
            type="button"
            className={[
              "px-3 py-2 rounded-md border text-sm",
              tab === "approved"
                ? "border-colorvar--accent bg-colorvar--active-bg text-colorvar--text-primary"
                : "border-colorvar--border hover:bg-colorvar--active-bg text-colorvar--text-primary",
            ].join(" ")}
            onClick={() => setTab("approved")}
          >
            Approved
          </button>

          <button
            type="button"
            className={[
              "px-3 py-2 rounded-md border text-sm",
              tab === "active"
                ? "border-colorvar--accent bg-colorvar--active-bg text-colorvar--text-primary"
                : "border-colorvar--border hover:bg-colorvar--active-bg text-colorvar--text-primary",
            ].join(" ")}
            onClick={() => setTab("active")}
          >
            Active
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-colorvar--text-secondary">
          No rows in this view.
        </div>
      ) : (
        <div className="rounded-xl border border-colorvar--border bg-colorvar--panel-bg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-colorvar--active-bg text-colorvar--text-secondary">
              {tab === "requests" ? (
                <tr>
                  <th className="text-left px-3 py-2">Actions</th>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Book</th>
                  <th className="text-left px-3 py-2">Stock</th>
                  <th className="text-left px-3 py-2">Note</th>
                  <th className="text-left px-3 py-2">Created</th>
                </tr>
              ) : tab === "approved" ? (
                <tr>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Book</th>
                  <th className="text-left px-3 py-2">Start</th>
                  <th className="text-left px-3 py-2">End</th>
                  <th className="text-left px-3 py-2">Stock</th>
                  <th className="text-left px-3 py-2">Note</th>
                </tr>
              ) : (
                <tr>
                  <th className="text-left px-3 py-2">Actions</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Book</th>
                  <th className="text-left px-3 py-2">Start</th>
                  <th className="text-left px-3 py-2">End</th>
                  <th className="text-left px-3 py-2">Stock</th>
                </tr>
              )}
            </thead>

            <tbody className="text-colorvar--text-primary">
              {rows.map((r) => {
                const userLabel = String(r?.name || r?.email || `#${r?.userid}`);
                const title = String(r?.title || "Untitled");
                const cover = String(r?.coverurl || "");
                const status = String(r?.status || "—");

                return (
                  <tr
                    key={String(r?.rentalid ?? Math.random())}
                    className="border-t border-colorvar--border"
                  >
                    {tab === "requests" ? (
                      <>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white text-xs font-semibold"
                              onClick={() => openApprove(r)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-xs text-red-600"
                              onClick={() => onDismiss(r)}
                            >
                              Dismiss
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">{userLabel}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {cover ? (
                              <img
                                src={cover}
                                alt="Cover"
                                className="w-10 h-14 object-cover rounded border border-colorvar--border bg-colorvar--active-bg"
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="font-semibold line-clamp-2">
                                {title}
                              </div>
                              <div className="text-xs text-colorvar--text-secondary font-mono">
                                {String(r?.openlibraryid || "")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          #{String(r?.stockid || "—")} (qty{" "}
                          {String(r?.quantity ?? "?")})
                        </td>
                        <td className="px-3 py-2">{String(r?.note || "—")}</td>
                        <td className="px-3 py-2">{fmt(r?.createdat)}</td>
                      </>
                    ) : tab === "approved" ? (
                      <>
                        <td className="px-3 py-2">{userLabel}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {cover ? (
                              <img
                                src={cover}
                                alt="Cover"
                                className="w-10 h-14 object-cover rounded border border-colorvar--border bg-colorvar--active-bg"
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="font-semibold line-clamp-2">
                                {title}
                              </div>
                              <div className="text-xs text-colorvar--text-secondary font-mono">
                                {String(r?.openlibraryid || "")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {fmt(r?.startat)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {fmt(r?.endat)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          #{String(r?.stockid || "—")}
                        </td>
                        <td className="px-3 py-2">{String(r?.note || "—")}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white text-xs font-semibold"
                            onClick={() => onComplete(r)}
                          >
                            Complete
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={[
                              "inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold",
                              statusPill(status),
                            ].join(" ")}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{userLabel}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {cover ? (
                              <img
                                src={cover}
                                alt="Cover"
                                className="w-10 h-14 object-cover rounded border border-colorvar--border bg-colorvar--active-bg"
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="font-semibold line-clamp-2">
                                {title}
                              </div>
                              <div className="text-xs text-colorvar--text-secondary font-mono">
                                {String(r?.openlibraryid || "")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {fmt(r?.startat)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {fmt(r?.endat)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          #{String(r?.stockid || "—")}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={approveOpen}
        title="Approve rental request"
        onClose={() => (busy ? null : setApproveOpen(false))}
      >
        <div className="space-y-4">
          {approveItem ? (
            <div className="text-sm text-colorvar--text-secondary">
              Approving request #{String(approveItem?.rentalid)} for{" "}
              <span className="font-semibold text-colorvar--text-primary">
                {String(approveItem?.title || "Untitled")}
              </span>
              .
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs text-colorvar--text-secondary mb-1">
                Start
              </div>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                disabled={busy}
              />
            </label>

            <label className="block">
              <div className="text-xs text-colorvar--text-secondary mb-1">
                End
              </div>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-colorvar--border bg-transparent text-colorvar--text-primary"
                disabled={busy}
              />
            </label>
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-colorvar--border hover:bg-colorvar--active-bg text-sm text-colorvar--text-primary disabled:opacity-60"
              onClick={() => setApproveOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-md bg-colorvar--accent hover:bg-colorvar--accent-hover text-white text-sm font-semibold disabled:opacity-60"
              onClick={onApprove}
              disabled={busy}
            >
              {busy ? "Approving..." : "Approve"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
