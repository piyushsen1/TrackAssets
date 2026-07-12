"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { BellIcon } from "@/components/ui/icons";
import {
  NOTIFICATION_TYPE_TONE,
  NOTIFICATION_TYPE_ICON,
  type NotificationType,
} from "@/lib/notificationTypes";

type NotificationItem = {
  eventId: string;
  type: NotificationType;
  message: string;
  relatedEntityTag: string | null;
  readAt: string | null;
  timestamp: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const TABS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "approval", label: "Approvals" },
  { key: "booking", label: "Bookings" },
  { key: "transfer", label: "Transfers" },
  { key: "allocation", label: "Allocations" },
  { key: "audit", label: "Audit" },
];

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<NotificationType | "all">("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<NotificationsResponse>(`/notifications?page=${page}&type=${tab}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [page, tab]);

  useEffect(() => {
    load();
  }, [load]);

  function selectTab(key: NotificationType | "all") {
    setTab(key);
    setPage(1);
  }

  async function markRead(eventId: string) {
    try {
      await api.patch(`/notifications/${eventId}/read`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) =>
                n.eventId === eventId ? { ...n, readAt: new Date().toISOString() } : n,
              ),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          A chronological log of allocations, bookings, maintenance, transfers, and audits.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => selectTab(key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        {loading && (
          <div className="py-14 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <BellIcon className="h-6 w-6 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-tertiary)]">No notifications here yet.</span>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="max-h-[560px] divide-y divide-[var(--border-subtle)] overflow-y-auto">
            {items.map((n) => {
              const Icon = NOTIFICATION_TYPE_ICON[n.type];
              const unread = !n.readAt;
              return (
                <div
                  key={n.eventId}
                  className={`flex items-start gap-3 px-5 py-4 ${unread ? "bg-[var(--surface-sunken)]" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      unread ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={NOTIFICATION_TYPE_TONE[n.type]}>{n.type}</Badge>
                      {n.relatedEntityTag && (
                        <span className="num text-xs text-[var(--text-tertiary)]">
                          {n.relatedEntityTag}
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatTimestamp(n.timestamp)}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${unread ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                      {n.message}
                    </p>
                  </div>
                  {unread && (
                    <button
                      onClick={() => markRead(n.eventId)}
                      className="shrink-0 rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-card)]"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>{data.total} total</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
