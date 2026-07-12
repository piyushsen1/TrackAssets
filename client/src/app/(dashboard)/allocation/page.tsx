"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { BoxIcon, SwapIcon } from "@/components/ui/icons";

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  departmentName: string | null;
  role: string;
};

type HolderInfo = {
  allocationId: string;
  employeeId: string;
  name: string;
  allocatedSince: string;
  expectedReturnDate: string | null;
  isOverdue: boolean;
};

type AllocationHistoryItem = {
  allocationId: string;
  employeeId: string;
  employeeName: string;
  allocatedSince: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  conditionOnReturn: string | null;
  isOverdue: boolean;
};

type MessageState = {
  tone: "success" | "error";
  text: string;
};

export default function AllocationPage() {
  const { user } = useAuth();
  const [assetTag, setAssetTag] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [currentHolder, setCurrentHolder] = useState<HolderInfo | null>(null);
  const [history, setHistory] = useState<AllocationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [allocationFeedback, setAllocationFeedback] =
    useState<MessageState | null>(null);
  const [transferFeedback, setTransferFeedback] = useState<MessageState | null>(
    null,
  );
  const [returnFeedback, setReturnFeedback] = useState<MessageState | null>(
    null,
  );
  const [transferForm, setTransferForm] = useState({
    tag: "",
    fromEmployeeId: "",
    toEmployeeId: "",
    reason: "",
  });
  const [returnForm, setReturnForm] = useState({
    allocationId: "",
    conditionNotes: "",
  });

  const role = (user?.role ?? user?.roles?.[0] ?? "employee") as string;
  const normalizedRole = role.toLowerCase();
  const canManageAllocations = ["admin", "asset_manager"].includes(
    normalizedRole,
  );
  const canRequestTransfer = canManageAllocations;
  const canRecordReturn = canManageAllocations;
  const roleLabel =
    normalizedRole === "department_head"
      ? "Department head"
      : normalizedRole === "asset_manager"
        ? "Asset manager"
        : normalizedRole === "admin"
          ? "Admin"
          : "Employee";

  useEffect(() => {
    api
      .get<EmployeeOption[]>("/org/employees")
      .then((data) => setEmployees(data || []))
      .catch(() => undefined);
  }, []);

  async function checkCurrent(e?: FormEvent) {
    e?.preventDefault();
    if (!assetTag.trim()) {
      setMessage({ tone: "error", text: "Enter an asset tag to check." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get<{ tag: string; holder: HolderInfo | null }>(
        `/allocations/${encodeURIComponent(assetTag.trim())}/current`,
      );
      setCurrentHolder(res?.holder ?? null);
      setTransferForm((current) => ({
        ...current,
        tag: assetTag.trim(),
        fromEmployeeId: res?.holder?.employeeId ?? current.fromEmployeeId,
      }));
      if (returnForm.allocationId === "" && res?.holder?.allocationId) {
        setReturnForm((current) => ({
          ...current,
          allocationId: res.holder!.allocationId,
        }));
      }
      const historyRes = await api.get<AllocationHistoryItem[]>(
        `/allocations/${encodeURIComponent(assetTag.trim())}/history`,
      );
      setHistory(historyRes || []);
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : "Unable to load allocation details.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function allocate(e?: FormEvent) {
    e?.preventDefault();
    if (!assetTag.trim() || !employeeId) {
      setMessage({
        tone: "error",
        text: "Provide an asset tag and select an employee.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const created = await api.post<{
        allocationId: string;
        tag: string;
        employeeId: string;
        employeeName: string;
      }>("/allocations", {
        tag: assetTag.trim(),
        employeeId,
        expectedReturnDate: expectedReturnDate || undefined,
      });
      setAllocationFeedback({
        tone: "success",
        text: `Allocated to ${created.employeeName}.`,
      });
      setCurrentHolder({
        allocationId: created.allocationId,
        employeeId: created.employeeId,
        name: created.employeeName,
        allocatedSince: new Date().toISOString(),
        expectedReturnDate: expectedReturnDate || null,
        isOverdue: false,
      });
      setTransferForm((current) => ({
        ...current,
        tag: assetTag.trim(),
        fromEmployeeId: created.employeeId,
      }));
      setReturnForm((current) => ({
        ...current,
        allocationId: created.allocationId,
      }));
      await checkCurrent();
    } catch (err) {
      setAllocationFeedback({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : "Allocation could not be completed.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitTransfer(e: FormEvent) {
    e.preventDefault();
    if (
      !transferForm.tag ||
      !transferForm.fromEmployeeId ||
      !transferForm.toEmployeeId
    ) {
      setMessage({
        tone: "error",
        text: "Choose the asset, current holder, and destination employee.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await api.post("/transfer-requests", {
        tag: transferForm.tag,
        fromEmployeeId: transferForm.fromEmployeeId,
        toEmployeeId: transferForm.toEmployeeId,
        reason: transferForm.reason || undefined,
      });
      setTransferFeedback({
        tone: "success",
        text: "Transfer request created.",
      });
      setTransferForm((current) => ({ ...current, reason: "" }));
    } catch (err) {
      setTransferFeedback({
        tone: "error",
        text: err instanceof Error ? err.message : "Transfer request failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitReturn(e: FormEvent) {
    e.preventDefault();
    if (!returnForm.allocationId) {
      setMessage({ tone: "error", text: "Select an active allocation first." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await api.patch(`/allocations/${returnForm.allocationId}/return`, {
        conditionNotes: returnForm.conditionNotes || undefined,
      });
      setReturnFeedback({
        tone: "success",
        text: "Asset returned successfully.",
      });
      setCurrentHolder(null);
      setReturnForm((current) => ({ ...current, conditionNotes: "" }));
      await checkCurrent();
    } catch (err) {
      setReturnFeedback({
        tone: "error",
        text:
          err instanceof Error ? err.message : "Return could not be completed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Allocation & transfer
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Allocate assets, request transfers, and record returns with the same
            workflow patterns used elsewhere in the app.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
          Signed in as{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {roleLabel}
          </span>
        </div>
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Asset status
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Check the live holder and allocation history for a tag.
                </p>
              </div>
              <Badge tone={currentHolder ? "warning" : "success"}>
                {currentHolder ? "Allocated" : "Available"}
              </Badge>
            </div>

            <form onSubmit={checkCurrent} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Asset tag
                <input
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                  placeholder="AF-0001"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <BoxIcon className="h-4 w-4" />
                {loading ? "Checking…" : "Check status"}
              </button>
            </form>

            {assetTag ? (
              currentHolder ? (
                <div className="mt-4 rounded-2xl border border-[var(--warning-bg)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)]">
                  This asset is already allocated to{" "}
                  <span className="font-semibold">{currentHolder.name}</span>.
                  Use the transfer form below to request a reassignment.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--success-bg)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-fg)]">
                  No active holder is recorded for this asset yet.
                </div>
              )
            ) : (
              <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                Enter an asset tag to inspect its allocation status and history.
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Current holder
              </div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                {currentHolder ? (
                  <div className="space-y-1">
                    <div className="font-medium text-[var(--text-primary)]">
                      {currentHolder.name}
                    </div>
                    <div>Employee ID: {currentHolder.employeeId}</div>
                    <div>
                      Allocated since:{" "}
                      {new Date(currentHolder.allocatedSince).toLocaleString()}
                    </div>
                    {currentHolder.expectedReturnDate && (
                      <div>
                        Expected return:{" "}
                        {new Date(
                          currentHolder.expectedReturnDate,
                        ).toLocaleDateString()}
                      </div>
                    )}
                    {currentHolder.isOverdue && (
                      <div className="font-medium text-[var(--danger-fg)]">
                        Overdue
                      </div>
                    )}
                  </div>
                ) : (
                  "Unallocated"
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Allocate asset
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Assign an asset to an employee and optionally set an expected
              return date.
            </p>

            {!canManageAllocations && (
              <div className="mt-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
                Only admins and asset managers can allocate assets.
              </div>
            )}

            <form onSubmit={allocate} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Employee
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={loading || !canManageAllocations}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">
                    {employees.length === 0
                      ? "No employees available"
                      : "Select employee"}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} · {employee.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Expected return date (optional)
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  disabled={loading || !canManageAllocations}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !canManageAllocations}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <SwapIcon className="h-4 w-4" />
                Allocate
              </button>
            </form>

            {allocationFeedback && (
              <div
                className={`mt-3 rounded-2xl border px-3.5 py-2.5 text-sm ${
                  allocationFeedback.tone === "success"
                    ? "border-[var(--success-bg)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                    : "border-[var(--danger-bg)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                }`}
              >
                {allocationFeedback.text}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Transfer request
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Request a reassignment when the asset is already assigned to
              someone else.
            </p>

            {!canRequestTransfer && (
              <div className="mt-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
                Only admins and asset managers can request transfers.
              </div>
            )}

            <form onSubmit={submitTransfer} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Asset tag
                <input
                  value={transferForm.tag}
                  onChange={(e) =>
                    setTransferForm((current) => ({
                      ...current,
                      tag: e.target.value,
                    }))
                  }
                  disabled={loading || !canRequestTransfer}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Current holder
                <select
                  value={transferForm.fromEmployeeId}
                  onChange={(e) =>
                    setTransferForm((current) => ({
                      ...current,
                      fromEmployeeId: e.target.value,
                    }))
                  }
                  disabled={loading || !canRequestTransfer}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">Select current holder</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Destination employee
                <select
                  value={transferForm.toEmployeeId}
                  onChange={(e) =>
                    setTransferForm((current) => ({
                      ...current,
                      toEmployeeId: e.target.value,
                    }))
                  }
                  disabled={loading || !canRequestTransfer}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">Select destination employee</option>
                  {employees.map((employee) => (
                    <option key={`${employee.id}-to`} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Reason
                <textarea
                  value={transferForm.reason}
                  onChange={(e) =>
                    setTransferForm((current) => ({
                      ...current,
                      reason: e.target.value,
                    }))
                  }
                  rows={3}
                  disabled={loading || !canRequestTransfer}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !canRequestTransfer}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <SwapIcon className="h-4 w-4" />
                Request transfer
              </button>
            </form>

            {transferFeedback && (
              <div
                className={`mt-3 rounded-2xl border px-3.5 py-2.5 text-sm ${
                  transferFeedback.tone === "success"
                    ? "border-[var(--success-bg)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                    : "border-[var(--danger-bg)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                }`}
              >
                {transferFeedback.text}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Return asset
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Record a return and note the condition on handoff.
            </p>

            {!canRecordReturn && (
              <div className="mt-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
                Only admins and asset managers can record returns.
              </div>
            )}

            <form onSubmit={submitReturn} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Allocation ID
                <input
                  value={returnForm.allocationId}
                  onChange={(e) =>
                    setReturnForm((current) => ({
                      ...current,
                      allocationId: e.target.value,
                    }))
                  }
                  disabled={loading || !canRecordReturn}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="allocation id"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Condition notes
                <textarea
                  value={returnForm.conditionNotes}
                  onChange={(e) =>
                    setReturnForm((current) => ({
                      ...current,
                      conditionNotes: e.target.value,
                    }))
                  }
                  rows={3}
                  disabled={loading || !canRecordReturn}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !canRecordReturn}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <BoxIcon className="h-4 w-4" />
                Return asset
              </button>
            </form>

            {returnFeedback && (
              <div
                className={`mt-3 rounded-2xl border px-3.5 py-2.5 text-sm ${
                  returnFeedback.tone === "success"
                    ? "border-[var(--success-bg)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                    : "border-[var(--danger-bg)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                }`}
              >
                {returnFeedback.text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Allocation history
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Review the full allocation timeline for the selected asset.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-sunken)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Allocated</th>
                <th className="px-4 py-3 font-semibold">Returned</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[var(--text-tertiary)]"
                  >
                    {assetTag
                      ? "No allocation history yet for this tag."
                      : "Check an asset tag to view its allocation timeline."}
                  </td>
                </tr>
              )}
              {history.map((entry) => (
                <tr
                  key={entry.allocationId}
                  className="hover:bg-[var(--surface-sunken)]"
                >
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-[var(--text-primary)]">
                      {entry.employeeName}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {entry.employeeId}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                    {new Date(entry.allocatedSince).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                    {entry.returnedAt
                      ? new Date(entry.returnedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    {entry.returnedAt ? (
                      <Badge tone="success">Returned</Badge>
                    ) : entry.isOverdue ? (
                      <Badge tone="danger">Overdue</Badge>
                    ) : (
                      <Badge tone="info">Active</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
