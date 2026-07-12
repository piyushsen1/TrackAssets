"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";

export default function AuditPage() {
  const { isAdmin } = useAuth();
  const [department, setDepartment] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [auditors, setAuditors] = useState("");
  const [auditId, setAuditId] = useState("");
  const [tag, setTag] = useState("");
  const [verification, setVerification] = useState("verified");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);

  async function startAudit() {
    setMessage(null);
    try {
      const res = await api.post<{ id: string }>("/audits", {
        department,
        dateRangeStart: dateStart,
        dateRangeEnd: dateEnd,
        auditors: auditors ? auditors.split(",").map((s) => s.trim()) : [],
      });
      setAuditId((res as any).id ?? "");
      setMessage("Audit started.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function updateLine() {
    if (!auditId || !tag) return setMessage("Provide audit id and asset tag.");
    setMessage(null);
    try {
      await api.patch(
        `/audits/${encodeURIComponent(auditId)}/line-items/${encodeURIComponent(tag)}`,
        {
          verification,
          notes,
        },
      );
      setMessage("Line item updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function fetchDiscrepancies() {
    if (!auditId) return setMessage("Provide audit id.");
    setMessage(null);
    try {
      const res = await api.get<any[]>(
        `/audits/${encodeURIComponent(auditId)}/discrepancies`,
      );
      setDiscrepancies(res || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function closeAudit() {
    if (!auditId) return setMessage("Provide audit id.");
    setMessage(null);
    try {
      await api.post(`/audits/${encodeURIComponent(auditId)}/close`);
      setMessage("Audit closed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Audit</h1>

      {message && <div className="mt-4 text-sm text-red-600">{message}</div>}

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-medium">Start audit</h2>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="rounded-md border px-3 py-2"
            />
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="rounded-md border px-3 py-2"
            />
          </div>
          <input
            value={auditors}
            onChange={(e) => setAuditors(e.target.value)}
            placeholder="Auditors (comma separated)"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <div className="mt-2">
            <button
              onClick={startAudit}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white"
            >
              Start audit
            </button>
          </div>
        </div>

        <div>
          <h2 className="font-medium">Update line item</h2>
          <input
            value={auditId}
            onChange={(e) => setAuditId(e.target.value)}
            placeholder="Audit ID"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Asset tag"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            className="mt-2 w-full rounded-md border px-3 py-2"
          >
            <option value="verified">verified</option>
            <option value="missing">missing</option>
            <option value="damaged">damaged</option>
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={updateLine}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white"
            >
              Update
            </button>
            <button
              onClick={fetchDiscrepancies}
              className="rounded-md border px-4 py-2"
            >
              Fetch discrepancies
            </button>
            {isAdmin ? (
              <button
                onClick={closeAudit}
                className="rounded-md bg-red-600 px-4 py-2 text-white"
              >
                Close audit
              </button>
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Closing an audit requires an admin role.
              </div>
            )}
          </div>

          {discrepancies.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium">Discrepancies</h3>
              <ul className="mt-2 space-y-2">
                {discrepancies.map((d) => (
                  <li key={d.tag ?? Math.random()} className="text-sm">
                    {d.tag} — {d.verification ?? JSON.stringify(d)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
