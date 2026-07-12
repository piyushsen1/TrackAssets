"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  PlusIcon,
  SearchIcon,
  UsersIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";

type TicketStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "technician_assigned"
  | "in_progress"
  | "resolved";

type TicketPriority = "low" | "medium" | "high";

type Ticket = {
  ticketId: string;
  tag: string;
  issueDescription: string;
  priority: TicketPriority;
  status: TicketStatus;
  technicianName: string | null;
  raisedBy: string;
  resolutionNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AssetOption = { tag: string; name: string };

const COLUMNS: { key: TicketStatus; label: string; tone: BadgeTone }[] = [
  { key: "pending", label: "Pending", tone: "neutral" },
  { key: "approved", label: "Approved", tone: "info" },
  { key: "technician_assigned", label: "Technician assigned", tone: "teal" },
  { key: "in_progress", label: "In progress", tone: "warning" },
  { key: "resolved", label: "Resolved", tone: "success" },
  { key: "rejected", label: "Rejected", tone: "danger" },
];

const PRIORITY_TONE: Record<TicketPriority, BadgeTone> = {
  low: "neutral",
  medium: "info",
  high: "danger",
};

type ActionModal =
  | { type: "reject"; ticket: Ticket }
  | { type: "assign"; ticket: Ticket }
  | { type: "resolve"; ticket: Ticket };

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const canApprove = user?.role === "admin" || user?.role === "asset_manager";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Ticket[]>("/maintenance/tickets"),
      api.get<{ items: AssetOption[] }>("/assets?pageSize=100"),
    ])
      .then(([t, a]) => {
        setTickets(t || []);
        setAssets(a?.items || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = tickets.filter(
    (t) => !q || t.tag.toLowerCase().includes(q) || t.issueDescription.toLowerCase().includes(q),
  );
  const byColumn = useMemo(() => {
    const map = new Map<TicketStatus, Ticket[]>();
    COLUMNS.forEach((c) => map.set(c.key, []));
    filtered.forEach((t) => map.get(t.status)?.push(t));
    return map;
  }, [filtered]);

  async function handleRaiseSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/maintenance/tickets", {
        tag: form.get("tag"),
        issueDescription: form.get("issueDescription"),
        priority: form.get("priority") || "medium",
        raisedBy: form.get("raisedBy"),
      });
      setRaiseOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function approve(ticket: Ticket) {
    try {
      await api.patch(`/maintenance/tickets/${ticket.ticketId}/approve`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function start(ticket: Ticket) {
    try {
      await api.patch(`/maintenance/tickets/${ticket.ticketId}/start`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleActionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!actionModal) return;
    setFormError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { type, ticket } = actionModal;

    try {
      if (type === "reject") {
        await api.patch(`/maintenance/tickets/${ticket.ticketId}/reject`, {
          reason: form.get("reason") || undefined,
        });
      } else if (type === "assign") {
        await api.patch(`/maintenance/tickets/${ticket.ticketId}/assign-technician`, {
          technicianName: form.get("technicianName"),
        });
      } else {
        await api.patch(`/maintenance/tickets/${ticket.ticketId}/resolve`, {
          resolutionNotes: form.get("resolutionNotes") || undefined,
        });
      }
      setActionModal(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Maintenance</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Track tickets from request through repair to resolution.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setRaiseOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)]"
        >
          <PlusIcon className="h-4 w-4" />
          Raise ticket
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by asset tag or issue…"
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] py-14 text-center text-sm text-[var(--text-tertiary)]">
          Loading…
        </div>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const colTickets = byColumn.get(col.key) ?? [];
            return (
              <div key={col.key} className="w-72 shrink-0">
                <div className="flex items-center justify-between px-1 pb-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {col.label}
                  </span>
                  <Badge tone={col.tone} dot={false}>
                    {colTickets.length}
                  </Badge>
                </div>

                <div className="space-y-3 rounded-2xl bg-[var(--surface-sunken)] p-3 min-h-[120px]">
                  {colTickets.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <ClipboardListIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-tertiary)]">No tickets</span>
                    </div>
                  )}

                  {colTickets.map((ticket) => (
                    <div
                      key={ticket.ticketId}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="num rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-semibold text-[var(--text-primary)]">
                          {ticket.tag}
                        </span>
                        <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
                      </div>

                      <p className="mt-2.5 text-sm text-[var(--text-primary)]">
                        {ticket.issueDescription}
                      </p>

                      {ticket.technicianName && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                          <UsersIcon className="h-3.5 w-3.5" />
                          {ticket.technicianName}
                        </div>
                      )}
                      {ticket.status === "resolved" && ticket.resolutionNotes && (
                        <div className="mt-2 rounded-lg bg-[var(--success-bg)] px-2.5 py-1.5 text-xs text-[var(--success-fg)]">
                          {ticket.resolutionNotes}
                        </div>
                      )}
                      {ticket.status === "rejected" && ticket.rejectionReason && (
                        <div className="mt-2 rounded-lg bg-[var(--danger-bg)] px-2.5 py-1.5 text-xs text-[var(--danger-fg)]">
                          {ticket.rejectionReason}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {ticket.raisedBy} · {timeAgo(ticket.updatedAt)}
                        </span>
                      </div>

                      {ticket.status === "pending" && canApprove && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => approve(ticket)}
                            className="flex-1 rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setFormError(null);
                              setActionModal({ type: "reject", ticket });
                            }}
                            className="flex-1 rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {ticket.status === "approved" && (
                        <button
                          onClick={() => {
                            setFormError(null);
                            setActionModal({ type: "assign", ticket });
                          }}
                          className="mt-3 w-full rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
                        >
                          Assign technician
                        </button>
                      )}

                      {ticket.status === "technician_assigned" && (
                        <button
                          onClick={() => start(ticket)}
                          className="mt-3 w-full rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
                        >
                          Start work
                        </button>
                      )}

                      {ticket.status === "in_progress" && (
                        <button
                          onClick={() => {
                            setFormError(null);
                            setActionModal({ type: "resolve", ticket });
                          }}
                          className="mt-3 w-full rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {raiseOpen && (
        <Modal title="Raise ticket" onClose={() => setRaiseOpen(false)}>
          <form onSubmit={handleRaiseSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger-fg)]">
                {formError}
              </div>
            )}
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Asset
              <select
                name="tag"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              >
                <option value="" disabled>
                  Select an asset
                </option>
                {assets.map((a) => (
                  <option key={a.tag} value={a.tag}>
                    {a.tag} — {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Issue description
              <textarea
                name="issueDescription"
                required
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Priority
              <select
                name="priority"
                defaultValue="medium"
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Raised by
              <input
                name="raisedBy"
                required
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Raising…" : "Raise ticket"}
            </button>
          </form>
        </Modal>
      )}

      {actionModal && (
        <Modal
          title={
            actionModal.type === "reject"
              ? "Reject ticket"
              : actionModal.type === "assign"
                ? "Assign technician"
                : "Resolve ticket"
          }
          onClose={() => setActionModal(null)}
        >
          <form onSubmit={handleActionSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger-fg)]">
                {formError}
              </div>
            )}

            {actionModal.type === "reject" && (
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Reason (optional)
                <textarea
                  name="reason"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
            )}

            {actionModal.type === "assign" && (
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Technician name
                <input
                  name="technicianName"
                  required
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
            )}

            {actionModal.type === "resolve" && (
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Resolution notes (optional)
                <textarea
                  name="resolutionNotes"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
