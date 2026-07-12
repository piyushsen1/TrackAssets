"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<any[]>(`/notifications?page=${page}`)
      .then((data) => mounted && setNotifications(data || []))
      .catch(
        (err) =>
          mounted && setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>

      {loading && <div className="mt-4 text-sm text-gray-500">Loading…</div>}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-6 space-y-3">
        {notifications.length === 0 && !loading && (
          <div className="text-sm text-gray-500">No notifications.</div>
        )}
        {notifications.map((n) => (
          <div key={n.id ?? n.eventId} className="rounded-md border p-3">
            <div className="text-sm font-medium">{n.title ?? n.type}</div>
            <div className="text-xs text-gray-500">{n.message ?? n.body}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-md border px-3 py-1"
        >
          Prev
        </button>
        <div className="px-2">Page {page}</div>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border px-3 py-1"
        >
          Next
        </button>
      </div>
    </div>
  );
}
