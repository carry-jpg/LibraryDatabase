// src/pages/MyRentals.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getMyRentals } from "../state/rentalsStore";

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

export default function MyRentals() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onCh = () => setTick((x) => x + 1);
    window.addEventListener("rentals:changed", onCh);
    return () => window.removeEventListener("rentals:changed", onCh);
  }, []);

  const rows = useMemo(() => {
    const r = getMyRentals();
    return Array.isArray(r) ? r : [];
  }, [tick]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-colorvar--text-primary mb-4">
        My rentals
      </h1>

      {rows.length === 0 ? (
        <div className="text-sm text-colorvar--text-secondary">
          No rentals yet.
        </div>
      ) : (
        <div className="rounded-xl border border-colorvar--border bg-colorvar--panel-bg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-colorvar--active-bg text-colorvar--text-secondary">
              <tr>
                <th className="text-left px-3 py-2">Book</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Start</th>
                <th className="text-left px-3 py-2">End</th>
                <th className="text-left px-3 py-2">Requested</th>
                <th className="text-left px-3 py-2">Returned</th>
                <th className="text-left px-3 py-2">Note</th>
              </tr>
            </thead>

            <tbody className="text-colorvar--text-primary">
              {rows.map((r) => {
                const cover = String(r?.coverurl || "");
                const title = String(r?.title || "Untitled");
                const author = String(r?.author || "");
                const status = String(r?.status || "—");

                return (
                  <tr
                    key={String(r?.rentalid ?? Math.random())}
                    className="border-t border-colorvar--border"
                  >
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
                          <div className="text-xs text-colorvar--text-secondary line-clamp-1">
                            {author || "—"}
                          </div>
                          <div className="text-xs text-colorvar--text-secondary font-mono">
                            {String(r?.openlibraryid || "")}
                          </div>
                        </div>
                      </div>
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

                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmt(r?.startat)}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmt(r?.endat)}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmt(r?.createdat)}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmt(r?.returnedat)}
                    </td>

                    <td className="px-3 py-2">{String(r?.note || "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
