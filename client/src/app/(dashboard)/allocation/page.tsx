"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AllocationPage() {
  const [tag, setTag] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [holder, setHolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function checkCurrent() {
    if (!tag) return setMessage("Enter an asset tag to check.");
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get<{ holder: string | null }>(
        `/allocations/${encodeURIComponent(tag)}/current`,
      );
      setHolder(res?.holder ?? null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function allocate() {
    if (!tag || !employeeId)
      return setMessage("Provide tag and employee id to allocate.");
    setLoading(true);
    setMessage(null);
    try {
      await api.post("/allocations", { tag, employeeId });
      setMessage("Allocation created.");
      setHolder(employeeId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Allocation & Transfer
      </h1>

      <div className="mt-6 space-y-4 max-w-lg">
        {message && <div className="text-sm text-red-600">{message}</div>}

        <div className="flex gap-2">
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Asset tag"
            className="flex-1 rounded-md border px-3 py-2"
          />
          <button
            onClick={checkCurrent}
            disabled={loading}
            className="rounded-md bg-gray-100 px-4 py-2"
          >
            {loading ? "Checking…" : "Check current"}
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Current holder: {holder ?? "Unallocated"}
        </div>

        <div className="mt-4">
          <input
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Assign to employee id"
            className="w-full rounded-md border px-3 py-2"
          />
          <div className="mt-2">
            <button
              onClick={allocate}
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white"
            >
              {loading ? "Allocating…" : "Allocate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
