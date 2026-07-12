"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { BoxIcon } from "@/components/ui/icons";

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  departmentName: string | null;
  role: string;
};

type ResourceOption = {
  resourceId: string;
  name: string;
  type: string;
};

type BookingItem = {
  bookingId: string;
  requesterId: string;
  requesterName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

type MessageState = {
  tone: "success" | "error";
  text: string;
};

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookingPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [requesterId, setRequesterId] = useState("");
  const [availability, setAvailability] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    if (user?.employeeId) {
      setRequesterId(user.employeeId);
    }
  }, [user?.employeeId]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [resourceData, employeeData] = await Promise.all([
          api.get<ResourceOption[]>("/resources"),
          api.get<EmployeeOption[]>("/org/employees"),
        ]);

        if (!mounted) return;

        setResources(resourceData || []);
        setEmployees(employeeData || []);

        if (!resourceId && (resourceData?.length ?? 0) > 0) {
          setResourceId(resourceData[0].resourceId);
        }
      } catch (err) {
        if (!mounted) return;
        setMessage({
          tone: "error",
          text:
            err instanceof Error ? err.message : "Unable to load resources.",
        });
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!resourceId || !date) {
      setAvailability([]);
      return;
    }

    async function refreshAvailability() {
      try {
        const data = await api.get<BookingItem[]>(
          `/resources/${resourceId}/availability?date=${date}`,
        );
        setAvailability(data || []);
      } catch {
        setAvailability([]);
      }
    }

    refreshAvailability();
  }, [resourceId, date]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resourceId || !date || !startTime || !endTime || !requesterId) {
      setMessage({ tone: "error", text: "Fill in all booking fields." });
      return;
    }

    if (startTime >= endTime) {
      setMessage({
        tone: "error",
        text: "End time must be later than start time.",
      });
      return;
    }

    const currentStart = new Date(`${date}T${startTime}`);
    const currentEnd = new Date(`${date}T${endTime}`);
    const conflict = availability.some((booking) => {
      if (booking.status !== "confirmed") return false;
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return currentStart < bookingEnd && currentEnd > bookingStart;
    });

    if (conflict) {
      setMessage({
        tone: "error",
        text: "That time slot overlaps an existing booking.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post("/bookings", {
        resourceId,
        date,
        startTime,
        endTime,
        requesterId,
      });
      setMessage({ tone: "success", text: "Booking created successfully." });
      const data = await api.get<BookingItem[]>(
        `/resources/${resourceId}/availability?date=${date}`,
      );
      setAvailability(data || []);
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : "Booking could not be completed.",
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedResource = resources.find(
    (resource) => resource.resourceId === resourceId,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Resource booking
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Reserve shared resources without conflicting with existing bookings.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.tone === "success"
              ? "border-[var(--success-bg)] bg-[var(--success-bg)] text-[var(--success-fg)]"
              : "border-[var(--danger-bg)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Book a resource
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Pick a resource, choose a time slot, and create a booking.
              </p>
            </div>
            <Badge tone="info">{selectedResource?.type ?? "Resource"}</Badge>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Resource
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              >
                <option value="">Select a resource</option>
                {resources.map((resource) => (
                  <option key={resource.resourceId} value={resource.resourceId}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Start time
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                End time
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Requester
              <select
                value={requesterId}
                onChange={(e) => setRequesterId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              >
                <option value="">Select requester</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} · {employee.email}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={loading || !resourceId || !date || !requesterId}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <BoxIcon className="h-4 w-4" />
              {loading ? "Booking…" : "Book resource"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Availability for {formatDateLabel(date)}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Existing confirmed bookings for the chosen day.
                </p>
              </div>
              <Badge tone={availability.length > 0 ? "warning" : "success"}>
                {availability.length > 0
                  ? `${availability.length} booked`
                  : "Open"}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {availability.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {resourceId
                    ? "No bookings are scheduled for this resource on the selected date."
                    : "Select a resource to view its availability."}
                </div>
              ) : (
                availability.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {booking.startTime.slice(11, 16)} –{" "}
                        {booking.endTime.slice(11, 16)}
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        {booking.requesterName ?? booking.requesterId}
                      </div>
                    </div>
                    <Badge
                      tone={booking.status === "confirmed" ? "info" : "warning"}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Booking guidance
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>
                • Choose a resource and date first to see the current schedule.
              </li>
              <li>
                • Time slots that overlap an existing booking will be blocked.
              </li>
              <li>
                • You can reuse this view to confirm availability before sharing
                a room or asset.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
