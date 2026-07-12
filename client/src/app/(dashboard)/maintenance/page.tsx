"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [tag, setTag] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<any[]>("/maintenance/tickets")
      .then((data) => mounted && setTickets(data || []))
      .catch(
        (err) =>
          mounted &&
          setMessage(err instanceof Error ? err.message : String(err)),
      );
    return () => {
      mounted = false;
    };
  }, []);

  async function raise() {
    if (!tag || !issueDescription || !raisedBy)
      return setMessage("Fill all fields to raise a ticket.");
    setLoading(true);
    setMessage(null);
    try {
      await api.post("/maintenance/tickets", {
        tag,
        issueDescription,
        raisedBy,
      });
      setMessage("Ticket raised.");
      setTag("");
      setIssueDescription("");
      setRaisedBy("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Maintenance</h1>

      {message && <div className="mt-4 text-sm text-red-600">{message}</div>}

      <div className="mt-6 space-y-4 max-w-lg">
        <div>
          <h2 className="text-lg font-medium">Raise a ticket</h2>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Asset tag"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Describe the issue"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <input
            value={raisedBy}
            onChange={(e) => setRaisedBy(e.target.value)}
            placeholder="Your name / id"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <div className="mt-2">
            <button
              onClick={raise}
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white"
            >
              {loading ? "Raising…" : "Raise ticket"}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium">Open tickets</h2>
          <div className="mt-2 space-y-2">
            {tickets.length === 0 && (
              <div className="text-sm text-gray-500">No open tickets.</div>
            )}
            {tickets.map((t) => (
              <div key={t.id ?? t.ticketId} className="rounded-md border p-3">
                <div className="text-sm font-medium">{t.tag}</div>
                <div className="text-xs text-gray-500">
                  {t.issueDescription}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
