"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function BookingPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<any[]>("/resources")
      .then((data) => mounted && setResources(data || []))
      .catch(
        (err) =>
          mounted &&
          setMessage(err instanceof Error ? err.message : String(err)),
      );
    return () => {
      mounted = false;
    };
  }, []);

  async function book() {
    if (!resourceId || !date || !startTime || !endTime || !requesterId)
      return setMessage("Fill all booking fields.");
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
      setMessage("Booking created.");
      // clear form
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Resource Booking</h1>

      {message && <div className="mt-4 text-sm text-red-600">{message}</div>}

      <div className="mt-6 space-y-4 max-w-lg">
        <label className="block">
          <div className="text-sm text-gray-700">Resource</div>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value="">Select a resource</option>
            {resources.map((r) => (
              <option key={r.id ?? r.resourceId} value={r.id ?? r.resourceId}>
                {r.name ?? r.id}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm text-gray-700">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>

        <div className="flex gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2"
          />
        </div>

        <input
          value={requesterId}
          onChange={(e) => setRequesterId(e.target.value)}
          placeholder="Requester ID"
          className="w-full rounded-md border px-3 py-2"
        />

        <div>
          <button
            onClick={book}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white"
          >
            {loading ? "Booking…" : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
