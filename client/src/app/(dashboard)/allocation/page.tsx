"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import {
  SearchIcon,
  SwapIcon,
  AlertTriangleIcon,
  ClipboardListIcon,
  UsersIcon,
} from "@/components/ui/icons";

type AssetOption = { tag: string; name: string; status: string };

type EmployeeOption = { id: string; name: string; departmentName?: string | null };

type Holder = {
  allocationId: string;
  employeeId: string;
  name: string;
  allocatedSince: string;
  expectedReturnDate: string | null;
  isOverdue: boolean;
};

type HistoryItem = {
  allocationId: string;
  employeeId: string;
  employeeName: string;
  allocatedSince: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  conditionOnReturn: string | null;
  isOverdue: boolean;
};

type PendingTransfer = {
  requestId: string;
  tag: string;
  fromName: string;
  toName: string;
  reason: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function AllocationPage() {
  const { user } = useAuth();
  const canApproveTransfer =
    user?.role === "admin" || user?.role === "asset_manager" || user?.role === "department_head";
  const canProcessReturn = user?.role === "admin" || user?.role === "asset_manager";

  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [holder, setHolder] = useState<Holder | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [allocateEmployeeId, setAllocateEmployeeId] = useState("");
  const [allocateReturnDate, setAllocateReturnDate] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [reviewRequestId, setReviewRequestId] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [showTransfers, setShowTransfers] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ items: AssetOption[] }>("/assets?pageSize=100"),
      api.get<EmployeeOption[]>("/org/employees"),
    ])
      .then(([a, e]) => {
        setAssets(a?.items || []);
        setEmployees(e || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const q = assetSearch.trim().toLowerCase();
  const filteredAssets = assets.filter(
    (a) => !q || a.tag.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
  );
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const pagedAssets = filteredAssets.slice((page - 1) * pageSize, page * pageSize);

  const employeeName = useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? id,
    [employees],
  );

  const loadDetail = useCallback((tag: string) => {
    setDetailLoading(true);
    setError(null);
    setNotice(null);
    Promise.all([
      api.get<{ tag: string; holder: Holder | null }>(`/allocations/${encodeURIComponent(tag)}/current`),
      api.get<HistoryItem[]>(`/allocations/${encodeURIComponent(tag)}/history`),
    ])
      .then(([current, hist]) => {
        setHolder(current?.holder ?? null);
        setHistory(hist || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setDetailLoading(false));
  }, []);

  function selectAsset(tag: string) {
    setSelectedTag(tag);
    setShowTransfers(false);
    setAllocateEmployeeId("");
    setAllocateReturnDate("");
    setTransferToId("");
    setTransferReason("");
    setReturnNotes("");
    loadDetail(tag);
  }

  const selectedAsset = useMemo(
    () => assets.find((a) => a.tag === selectedTag) ?? null,
    [assets, selectedTag],
  );

  async function handleAllocate() {
    if (!selectedTag || !allocateEmployeeId) {
      setError("Choose an employee to allocate this asset to.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/allocations", {
        tag: selectedTag,
        employeeId: allocateEmployeeId,
        expectedReturnDate: allocateReturnDate || undefined,
      });
      setNotice("Asset allocated.");
      loadDetail(selectedTag);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTransferRequest() {
    if (!selectedTag || !holder || !transferToId) {
      setError("Choose an employee to transfer this asset to.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<{ requestId: string; status: string }>("/transfer-requests", {
        tag: selectedTag,
        fromEmployeeId: holder.employeeId,
        toEmployeeId: transferToId,
        reason: transferReason,
      });
      setPendingTransfers((prev) => [
        {
          requestId: res.requestId,
          tag: selectedTag,
          fromName: holder.name,
          toName: employeeName(transferToId),
          reason: transferReason,
        },
        ...prev,
      ]);
      setTransferToId("");
      setTransferReason("");
      setNotice("Transfer request submitted — awaiting approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReturn() {
    if (!holder) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/allocations/${holder.allocationId}/return`, {
        conditionNotes: returnNotes || undefined,
      });
      setNotice("Asset marked as returned.");
      setReturnNotes("");
      if (selectedTag) loadDetail(selectedTag);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function decideTransfer(requestId: string, decision: "approve" | "reject", reason?: string) {
    setError(null);
    try {
      await api.patch(`/transfer-requests/${requestId}/${decision}`, {
        reason: reason || undefined,
      });
      setPendingTransfers((prev) => prev.filter((p) => p.requestId !== requestId));
      setNotice(`Transfer ${decision === "approve" ? "approved" : "rejected"}.`);
      if (selectedTag) loadDetail(selectedTag);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Allocation &amp; Transfer
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Assign assets to employees and manage reassignment through transfer requests.
          </p>
        </div>
        <button
          onClick={() => {
            setShowTransfers(true);
            setSelectedTag(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)]"
        >
          <SwapIcon className="h-4 w-4" />
          Pending transfers
          {pendingTransfers.length > 0 && (
            <Badge tone="primary" dot={false}>
              {pendingTransfers.length}
            </Badge>
          )}
        </button>
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

      {!selectedTag && !showTransfers && (
        <>
          <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
            <SearchIcon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <input
              value={assetSearch}
              onChange={(e) => {
                setAssetSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by tag or name…"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-sunken)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tag</th>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {pagedAssets.map((a) => (
                  <tr
                    key={a.tag}
                    onClick={() => selectAsset(a.tag)}
                    className="cursor-pointer transition hover:bg-[var(--surface-sunken)]"
                  >
                    <td className="num px-5 py-3.5 font-medium text-[var(--text-primary)]">{a.tag}</td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">{a.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={a.status === "available" ? "success" : "neutral"}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
                      No assets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredAssets.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>{filteredAssets.length} total</span>
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
        </>
      )}

      {selectedTag && (
        <div className="mt-6 space-y-6">
          <button
            onClick={() => setSelectedTag(null)}
            className="text-sm font-medium text-[var(--text-link)] hover:text-[var(--primary-hover)]"
          >
            ← Back to assets
          </button>

          {detailLoading && (
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] py-16 text-center text-sm text-[var(--text-tertiary)]">
              Loading…
            </div>
          )}

          {!detailLoading && selectedAsset && (
            <>
              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="num text-lg font-semibold text-[var(--text-primary)]">
                      {selectedAsset.tag}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">{selectedAsset.name}</div>
                  </div>
                  <Badge tone={selectedAsset.status === "available" ? "success" : "neutral"}>
                    {selectedAsset.status}
                  </Badge>
                </div>

                {holder ? (
                  <>
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--warning-bg)] bg-[var(--warning-bg)] px-4 py-3.5 text-sm text-[var(--warning-fg)]">
                      <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <span className="font-semibold">Already allocated.</span> Held by{" "}
                        <span className="font-medium">{holder.name}</span> since{" "}
                        {formatDate(holder.allocatedSince)}
                        {holder.expectedReturnDate && (
                          <> — due back {formatDate(holder.expectedReturnDate)}</>
                        )}
                        {holder.isOverdue && (
                          <span className="ml-2 font-semibold">(overdue)</span>
                        )}
                        . Direct re-allocation is blocked — submit a transfer request instead.
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          Request transfer
                        </h3>
                        <div className="mt-3 space-y-3">
                          <label className="block text-xs font-medium text-[var(--text-secondary)]">
                            From
                            <input
                              disabled
                              value={holder.name}
                              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-tertiary)]"
                            />
                          </label>
                          <label className="block text-xs font-medium text-[var(--text-secondary)]">
                            To
                            <select
                              value={transferToId}
                              onChange={(e) => setTransferToId(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                            >
                              <option value="">Select employee</option>
                              {employees
                                .filter((e) => e.id !== holder.employeeId)
                                .map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="block text-xs font-medium text-[var(--text-secondary)]">
                            Reason
                            <textarea
                              value={transferReason}
                              onChange={(e) => setTransferReason(e.target.value)}
                              rows={2}
                              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                            />
                          </label>
                          <button
                            onClick={handleTransferRequest}
                            disabled={saving}
                            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-70"
                          >
                            Submit request
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          Process return
                        </h3>
                        {canProcessReturn ? (
                          <div className="mt-3 space-y-3">
                            <label className="block text-xs font-medium text-[var(--text-secondary)]">
                              Condition on return (optional)
                              <textarea
                                value={returnNotes}
                                onChange={(e) => setReturnNotes(e.target.value)}
                                rows={2}
                                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                              />
                            </label>
                            <button
                              onClick={handleReturn}
                              disabled={saving}
                              className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] disabled:opacity-70"
                            >
                              Mark as returned
                            </button>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--text-tertiary)]">
                            Processing a return requires the admin or asset manager role.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Allocate this asset
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
                      <label className="block text-xs font-medium text-[var(--text-secondary)]">
                        Employee
                        <select
                          value={allocateEmployeeId}
                          onChange={(e) => setAllocateEmployeeId(e.target.value)}
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
                      <label className="block text-xs font-medium text-[var(--text-secondary)]">
                        Expected return
                        <input
                          type="date"
                          value={allocateReturnDate}
                          onChange={(e) => setAllocateReturnDate(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                        />
                      </label>
                      <button
                        onClick={handleAllocate}
                        disabled={saving}
                        className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-70"
                      >
                        Allocate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Allocation history
                </h3>
                <div className="mt-3 max-h-[420px] divide-y divide-[var(--border-subtle)] overflow-y-auto pr-1">
                  {history.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <ClipboardListIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                      <span className="text-sm text-[var(--text-tertiary)]">
                        No allocation history for this asset yet.
                      </span>
                    </div>
                  )}
                  {history.map((h) => (
                    <div key={h.allocationId} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-sm">
                        <UsersIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="font-medium text-[var(--text-primary)]">{h.employeeName}</span>
                        <span className="text-[var(--text-tertiary)]">
                          {formatDate(h.allocatedSince)} → {formatDate(h.returnedAt)}
                        </span>
                      </div>
                      {!h.returnedAt ? (
                        <Badge tone={h.isOverdue ? "danger" : "primary"}>
                          {h.isOverdue ? "overdue" : "current"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">returned</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!detailLoading && selectedAsset && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-sm font-medium text-[var(--text-link)] hover:text-[var(--primary-hover)]"
            >
              ← Back to assets
            </button>
          )}
        </div>
      )}

      {showTransfers && (
        <div className="mt-6 space-y-4">
          <button
            onClick={() => setShowTransfers(false)}
            className="text-sm font-medium text-[var(--text-link)] hover:text-[var(--primary-hover)]"
          >
            ← Back to assets
          </button>

          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pending transfer requests</h3>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Requests submitted from this browser this session — approve, reject, or resolve one by ID below.
        </p>

        {pendingTransfers.length === 0 && (
          <div className="mt-4 py-4 text-center text-sm text-[var(--text-tertiary)]">
            No pending requests submitted this session.
          </div>
        )}

        <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {pendingTransfers.map((p) => (
            <div
              key={p.requestId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-4 py-3"
            >
              <div className="text-sm">
                <span className="num font-semibold text-[var(--text-primary)]">{p.tag}</span>{" "}
                <span className="text-[var(--text-secondary)]">
                  {p.fromName} → {p.toName}
                </span>
                {p.reason && <div className="text-xs text-[var(--text-tertiary)]">{p.reason}</div>}
              </div>
              {canApproveTransfer && (
                <div className="flex gap-2">
                  <button
                    onClick={() => decideTransfer(p.requestId, "approve")}
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decideTransfer(p.requestId, "reject")}
                    className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canApproveTransfer && (
          <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Resolve a request by ID
            </h4>
            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <input
                value={reviewRequestId}
                onChange={(e) => setReviewRequestId(e.target.value)}
                placeholder="Transfer request ID"
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
              <input
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Rejection reason (optional)"
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
              <button
                onClick={() => reviewRequestId && decideTransfer(reviewRequestId, "approve")}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
              >
                Approve
              </button>
              <button
                onClick={() =>
                  reviewRequestId && decideTransfer(reviewRequestId, "reject", reviewReason)
                }
                className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
