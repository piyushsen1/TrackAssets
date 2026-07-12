"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  BoxIcon,
  ClipboardCheckIcon,
  WrenchIcon,
  SwapIcon,
  BellIcon,
  RefreshIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";

type Overview = {
  totalAssets: number;
  openAudits: number;
  openTickets: number;
  pendingTransfers: number;
  unreadNotifications: number;
};

type Alert = {
  eventId: string;
  message: string;
  relatedEntityTag?: string | null;
  createdAt: string;
};

type ActivityItem = {
  type: "notification" | "maintenance";
  id: string;
  message: string;
  relatedTag?: string | null;
  timestamp: string;
};

const STAT_CARDS: {
  key: keyof Overview;
  label: string;
  icon: typeof BoxIcon;
  tone: string;
}[] = [
  { key: "totalAssets", label: "Total assets", icon: BoxIcon, tone: "primary" },
  { key: "openAudits", label: "Open audits", icon: ClipboardCheckIcon, tone: "info" },
  { key: "openTickets", label: "Open maintenance tickets", icon: WrenchIcon, tone: "warning" },
  { key: "pendingTransfers", label: "Pending transfers", icon: SwapIcon, tone: "teal" },
  { key: "unreadNotifications", label: "Unread notifications", icon: BellIcon, tone: "danger" },
];

const TONE_ICON_CLASSES: Record<string, string> = {
  primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
  info: "bg-[var(--info-bg)] text-[var(--info-fg)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
  teal: "bg-[var(--teal-bg)] text-[var(--teal-fg)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)]",
};

const QUICK_ACTIONS = [
  { label: "Register asset", href: "/assets", icon: BoxIcon },
  { label: "Book a resource", href: "/booking", icon: CalendarIcon },
  { label: "Raise a ticket", href: "/maintenance", icon: WrenchIcon },
];

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.get<Overview>("/dashboard/overview"),
      api.get<Alert[]>("/dashboard/alerts"),
      api.get<ActivityItem[]>("/dashboard/recent-activity?limit=10"),
    ]).then(([overviewRes, alertsRes, activityRes]) => {
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
      else setError(overviewRes.reason instanceof Error ? overviewRes.reason.message : String(overviewRes.reason));
      if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value);
      if (activityRes.status === "fulfilled") setActivity(activityRes.value);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Here&apos;s what&apos;s happening across your assets today.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] disabled:opacity-60"
        >
          <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && !overview && (
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
          Dashboard data isn&apos;t available yet ({error}).
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--warning-bg)] bg-[var(--warning-bg)] px-4 py-3.5 text-sm text-[var(--warning-fg)]">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">{alerts.length} alert{alerts.length > 1 ? "s" : ""} need attention.</span>{" "}
            {alerts[0].message}
            {alerts.length > 1 && (
              <Link href="/notifications" className="ml-2 font-medium underline underline-offset-2">
                View all
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map(({ key, label, icon: Icon, tone }) => (
          <div
            key={key}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 transition hover:shadow-[0_8px_24px_rgba(21,145,220,0.1)]"
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${TONE_ICON_CLASSES[tone]}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="num mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {loading ? "—" : (overview?.[key] ?? 0)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-tertiary)]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Quick actions
          </h2>
          <div className="mt-4 space-y-2">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-3.5 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--primary)]"
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recent activity
            </h2>
            <Link
              href="/notifications"
              className="text-xs font-medium text-[var(--text-link)] hover:text-[var(--primary-hover)]"
            >
              View all →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-[var(--border-subtle)]">
            {loading && (
              <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                Loading…
              </div>
            )}
            {!loading && activity.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-[var(--text-tertiary)]">
                  <ClipboardListIcon className="h-5 w-5" />
                </span>
                <div className="text-sm text-[var(--text-tertiary)]">
                  No recent activity yet.
                </div>
              </div>
            )}
            {activity.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    item.type === "maintenance" ? "bg-[var(--warning-fg)]" : "bg-[var(--info-fg)]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">{item.message}</p>
                  {item.relatedTag && (
                    <span className="text-xs text-[var(--text-tertiary)]">{item.relatedTag}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
