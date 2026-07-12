"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";

export default function TransferRequestsPage() {
  const { isAdmin } = useAuth();
  const [tag, setTag] = useState("");
  const [fromEmployeeId, setFromEmployeeId] = useState("");
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function requestTransfer() {
    if (!tag || !fromEmployeeId || !toEmployeeId)
      return setMessage("Fill required fields");
    setMessage(null);
    try {
      await api.post("/transfer-requests", {
        tag,
        fromEmployeeId,
        toEmployeeId,
        reason,
      });
      setMessage("Transfer request created");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const [requestId, setRequestId] = useState("");
  async function approve() {
    if (!requestId) return setMessage("Provide requestId");
    setMessage(null);
    try {
      await api.patch(
        `/transfer-requests/${encodeURIComponent(requestId)}/approve`,
      );
      setMessage("Request approved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function reject() {
    if (!requestId) return setMessage("Provide requestId");
    setMessage(null);
    try {
      await api.patch(
        `/transfer-requests/${encodeURIComponent(requestId)}/reject`,
        { reason },
      );
      setMessage("Request rejected");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Transfer Requests
      </h1>
      {message && <div className="mt-4 text-sm text-red-600">{message}</div>}

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-medium">Create request</h2>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Asset tag"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <input
            value={fromEmployeeId}
            onChange={(e) => setFromEmployeeId(e.target.value)}
            placeholder="From employee id"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <input
            value={toEmployeeId}
            onChange={(e) => setToEmployeeId(e.target.value)}
            placeholder="To employee id"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="mt-2 w-full rounded-md border px-3 py-2"
          />
          <div className="mt-2">
            <button
              onClick={requestTransfer}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white"
            >
              Request transfer
            </button>
          </div>
        </div>

        <div>
          <h2 className="font-medium">Approve / Reject</h2>
          {isAdmin ? (
            <>
              <input
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="Request ID"
                className="mt-2 w-full rounded-md border px-3 py-2"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={approve}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white"
                >
                  Approve
                </button>
                <button
                  onClick={reject}
                  className="rounded-md bg-red-600 px-4 py-2 text-white"
                >
                  Reject
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Approving and rejecting transfer requests requires an admin role.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
