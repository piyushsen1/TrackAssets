"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  SearchIcon,
  PlusIcon,
  CalendarIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";

type Resource = { resourceId: string; name: string; type: string };

type EmployeeOption = { id: string; name: string };

type BookingStatus = "confirmed" | "cancelled";
type DisplayStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

type Slot = {
  bookingId: string;
  requesterId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  displayStatus: DisplayStatus;
};

const DISPLAY_TONE: Record<DisplayStatus, BadgeTone> = {
  upcoming: "info",
  ongoing: "success",
  completed: "neutral",
  cancelled: "danger",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function BookingPage() {
  const { user } = useAuth();
  const canManageResources = user?.role === "admin" || user?.role === "asset_manager";

  const [resources, setResources] = useState<Resource[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [resourceSearch, setResourceSearch] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [bookStart, setBookStart] = useState("");
  const [bookEnd, setBookEnd] = useState("");
  const [bookRequesterId, setBookRequesterId] = useState(user?.employeeId ?? "");
  const [saving, setSaving] = useState(false);

  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState<Slot | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Resource[]>("/resources"),
      api.get<EmployeeOption[]>("/org/employees"),
    ])
      .then(([r, e]) => {
        setResources(r || []);
        setEmployees(e || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const loadSlots = useCallback((resourceId: string, forDate: string) => {
    setLoadingSlots(true);
    setError(null);
    api
      .get<Slot[]>(`/resources/${resourceId}/availability?date=${forDate}`)
      .then((data) => setSlots(data || []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingSlots(false));
  }, []);

  useEffect(() => {
    if (selectedResourceId) loadSlots(selectedResourceId, date);
  }, [selectedResourceId, date, loadSlots]);

  const q = resourceSearch.trim().toLowerCase();
  const filteredResources = resources.filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
  );
  const selectedResource = useMemo(
    () => resources.find((r) => r.resourceId === selectedResourceId) ?? null,
    [resources, selectedResourceId],
  );

  const employeeName = useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? id,
    [employees],
  );

  function selectResource(id: string) {
    setSelectedResourceId(id);
    setBookStart("");
    setBookEnd("");
    setNotice(null);
  }

  async function handleBook() {
    if (!selectedResourceId || !bookStart || !bookEnd || !bookRequesterId) {
      setError("Fill in start time, end time, and requester.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/bookings", {
        resourceId: selectedResourceId,
        date,
        startTime: bookStart,
        endTime: bookEnd,
        requesterId: bookRequesterId,
      });
      setNotice("Slot booked.");
      setBookStart("");
      setBookEnd("");
      loadSlots(selectedResourceId, date);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(slot: Slot) {
    setError(null);
    try {
      await api.delete(`/bookings/${slot.bookingId}`);
      setNotice("Booking cancelled.");
      if (selectedResourceId) loadSlots(selectedResourceId, date);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rescheduleSlot) return;
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/bookings/${rescheduleSlot.bookingId}`, {
        date: form.get("date"),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
      });
      setRescheduleSlot(null);
      setNotice("Booking rescheduled.");
      if (selectedResourceId) loadSlots(selectedResourceId, date);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddResource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/resources", { name: form.get("name"), type: form.get("type") });
      setAddResourceOpen(false);
      api.get<Resource[]>("/resources").then((r) => setResources(r || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function canModify(slot: Slot) {
    return user?.role === "admin" || user?.employeeId === slot.requesterId;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Resource booking</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Book shared resources like rooms and vehicles by time slot.
          </p>
        </div>
        {canManageResources && (
          <button
            onClick={() => setAddResourceOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)]"
          >
            <PlusIcon className="h-4 w-4" />
            Add resource
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-2xl border border-[var(--success-bg)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-fg)]">
          {notice}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5">
            <SearchIcon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <input
              value={resourceSearch}
              onChange={(e) => setResourceSearch(e.target.value)}
              placeholder="Search resources…"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>

          <div className="mt-3 max-h-[520px] space-y-1.5 overflow-y-auto">
            {filteredResources.map((r) => (
              <button
                key={r.resourceId}
                onClick={() => selectResource(r.resourceId)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  selectedResourceId === r.resourceId
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                <span className="truncate font-medium">{r.name}</span>
                <Badge tone="neutral">{r.type}</Badge>
              </button>
            ))}
            {filteredResources.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                No resources found.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {!selectedResourceId && (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] py-16 text-center">
              <CalendarIcon className="h-6 w-6 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-tertiary)]">
                Select a resource on the left to view and book its schedule.
              </p>
            </div>
          )}

          {selectedResourceId && selectedResource && (
            <>
              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedResource.name}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">{selectedResource.type}</div>
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {loadingSlots && (
                    <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
                  )}
                  {!loadingSlots && slots.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <ClipboardListIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                      <span className="text-sm text-[var(--text-tertiary)]">
                        No bookings for this day yet.
                      </span>
                    </div>
                  )}
                  {slots.map((slot) => (
                    <div
                      key={slot.bookingId}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border border-[var(--border-subtle)] px-4 py-3 ${
                        slot.status === "cancelled"
                          ? "border-l-[var(--text-tertiary)] opacity-60"
                          : "border-l-[var(--primary)]"
                      }`}
                    >
                      <div className="text-sm">
                        <span className="num font-semibold text-[var(--text-primary)]">
                          {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                        </span>{" "}
                        <span className="text-[var(--text-secondary)]">
                          {employeeName(slot.requesterId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={DISPLAY_TONE[slot.displayStatus]}>{slot.displayStatus}</Badge>
                        {slot.status === "confirmed" && canModify(slot) && (
                          <>
                            <button
                              onClick={() => setRescheduleSlot(slot)}
                              className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(slot)}
                              className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-xs font-semibold text-[var(--danger-fg)] hover:bg-[var(--danger-bg)]"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Book a slot</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-end">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Start
                    <input
                      type="time"
                      value={bookStart}
                      onChange={(e) => setBookStart(e.target.value)}
                      className="mt-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    End
                    <input
                      type="time"
                      value={bookEnd}
                      onChange={(e) => setBookEnd(e.target.value)}
                      className="mt-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Requester
                    <select
                      value={bookRequesterId}
                      onChange={(e) => setBookRequesterId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                    >
                      <option value="">Select employee</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={handleBook}
                    disabled={saving}
                    className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-70"
                  >
                    Book slot
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {addResourceOpen && (
        <Modal title="Add resource" onClose={() => setAddResourceOpen(false)}>
          <form onSubmit={handleAddResource} className="space-y-4">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Name
              <input
                name="name"
                required
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Type
              <input
                name="type"
                required
                placeholder="Room, vehicle, equipment…"
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:opacity-70"
            >
              {saving ? "Saving…" : "Add resource"}
            </button>
          </form>
        </Modal>
      )}

      {rescheduleSlot && (
        <Modal title="Reschedule booking" onClose={() => setRescheduleSlot(null)}>
          <form onSubmit={handleReschedule} className="space-y-4">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Date
              <input
                name="date"
                type="date"
                defaultValue={date}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Start
                <input
                  name="startTime"
                  type="time"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                End
                <input
                  name="endTime"
                  type="time"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:opacity-70"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
