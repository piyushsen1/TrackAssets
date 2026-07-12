"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  PlusIcon,
  ClipboardCheckIcon,
  AlertTriangleIcon,
  UsersIcon,
  CalendarIcon,
} from "@/components/ui/icons";

type Department = { deptId: string; name: string };
type EmployeeOption = { id: string; name: string };
type VerificationResult = "verified" | "missing" | "damaged";

type LineItem = {
  tag: string;
  expectedLocation: string;
  result?: VerificationResult;
  notes?: string;
};

type AuditMeta = {
  department: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  auditors: string[];
  status: "open" | "closed";
};

type Discrepancy = { id: string; tag: string; result: VerificationResult; expectedLocation: string; notes: string | null };

const RESULT_TONE: Record<VerificationResult, BadgeTone> = {
  verified: "success",
  missing: "warning",
  damaged: "danger",
};

export default function AuditPage() {
  const { isAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [auditId, setAuditId] = useState("");
  const [auditMeta, setAuditMeta] = useState<AuditMeta | null>(null);
  const [lineItems, setLineItems] = useState<Record<string, LineItem>>({});
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);

  const [newTag, setNewTag] = useState("");
  const [newResult, setNewResult] = useState<VerificationResult>("verified");
  const [newNotes, setNewNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Department[]>("/org/departments"),
      api.get<EmployeeOption[]>("/org/employees"),
    ])
      .then(([d, e]) => {
        setDepartments(d || []);
        setEmployees(e || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const employeeName = useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? id,
    [employees],
  );

  const items = useMemo(() => Object.values(lineItems), [lineItems]);

  const fetchDiscrepancies = useCallback((id: string) => {
    api
      .get<Discrepancy[]>(`/audits/${encodeURIComponent(id)}/discrepancies`)
      .then((data) => setDiscrepancies(data || []))
      .catch(() => {
        // Discrepancy refresh failing shouldn't block the rest of the page.
      });
  }, []);

  async function handleStartAudit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const selectedAuditors = form.getAll("auditors") as string[];

    try {
      const res = await api.post<{
        auditId: string;
        department: string;
        dateRangeStart: string;
        dateRangeEnd: string;
        auditors: string[];
        status: "open" | "closed";
        lineItems: { tag: string; expectedLocation: string }[];
      }>("/audits", {
        department: form.get("department"),
        dateRangeStart: form.get("dateRangeStart"),
        dateRangeEnd: form.get("dateRangeEnd"),
        auditors: selectedAuditors,
      });

      setAuditId(res.auditId);
      setAuditMeta({
        department: res.department,
        dateRangeStart: res.dateRangeStart,
        dateRangeEnd: res.dateRangeEnd,
        auditors: res.auditors,
        status: res.status,
      });
      const nextItems: Record<string, LineItem> = {};
      res.lineItems.forEach((li) => {
        nextItems[li.tag] = { tag: li.tag, expectedLocation: li.expectedLocation };
      });
      setLineItems(nextItems);
      setDiscrepancies([]);
      setStartOpen(false);
      setNotice(`Audit cycle started for ${res.department}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function recordVerification(tag: string, result: VerificationResult, notes: string) {
    if (!auditId || !tag) {
      setError("Enter an audit ID and asset tag first.");
      return;
    }
    setError(null);
    try {
      await api.patch(`/audits/${encodeURIComponent(auditId)}/line-items/${encodeURIComponent(tag)}`, {
        verification: result,
        notes: notes || undefined,
      });
      setLineItems((prev) => ({
        ...prev,
        [tag]: { tag, expectedLocation: prev[tag]?.expectedLocation ?? "—", result, notes },
      }));
      fetchDiscrepancies(auditId);
      setNotice(`Recorded ${result} for ${tag}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAddAdHoc() {
    if (!newTag) {
      setError("Enter an asset tag.");
      return;
    }
    await recordVerification(newTag, newResult, newNotes);
    setNewTag("");
    setNewNotes("");
  }

  async function handleCloseAudit() {
    if (!auditId) return;
    setError(null);
    try {
      const res = await api.post<{ auditId: string; closed: boolean; discrepancies: number }>(
        `/audits/${encodeURIComponent(auditId)}/close`,
      );
      setAuditMeta((prev) => (prev ? { ...prev, status: "closed" } : prev));
      setNotice(`Audit closed — ${res.discrepancies} discrepanc${res.discrepancies === 1 ? "y" : "ies"} flagged.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Audit</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Run periodic physical verification cycles against expected asset locations.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setStartOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)]"
          >
            <PlusIcon className="h-4 w-4" />
            Start audit cycle
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

      <div className="mt-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Audit cycle ID
          <input
            value={auditId}
            onChange={(e) => {
              setAuditId(e.target.value);
              setAuditMeta(null);
              setLineItems({});
              setDiscrepancies([]);
            }}
            placeholder="Paste an existing audit ID, or start a new cycle above"
            className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          />
        </label>

        {auditMeta && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--surface-sunken)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <CalendarIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
              {new Date(auditMeta.dateRangeStart).toLocaleDateString()} –{" "}
              {new Date(auditMeta.dateRangeEnd).toLocaleDateString()}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">{auditMeta.department}</div>
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <UsersIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
              {auditMeta.auditors.length > 0
                ? auditMeta.auditors.map(employeeName).join(", ")
                : "No auditors assigned"}
            </div>
            <Badge tone={auditMeta.status === "open" ? "info" : "neutral"}>{auditMeta.status}</Badge>
          </div>
        )}
      </div>

      {auditId && (
        <>
          {discrepancies.length > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--warning-bg)] bg-[var(--warning-bg)] px-4 py-3.5 text-sm text-[var(--warning-fg)]">
              <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">
                  {discrepancies.length} discrepanc{discrepancies.length === 1 ? "y" : "ies"} flagged.
                </span>{" "}
                {discrepancies.map((d) => `${d.tag} (${d.result})`).join(", ")}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <ClipboardCheckIcon className="h-4 w-4" />
                Checklist
              </h3>
              {isAdmin && auditMeta?.status !== "closed" && (
                <button
                  onClick={handleCloseAudit}
                  className="rounded-xl border border-[var(--border-default)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                >
                  Close audit cycle
                </button>
              )}
            </div>

            {items.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                No line items recorded yet for this audit ID.
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-4 max-h-[480px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--surface-card)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Asset</th>
                      <th className="py-2 pr-3 font-semibold">Expected location</th>
                      <th className="py-2 pr-3 font-semibold">Verification</th>
                      <th className="py-2 pr-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {items.map((item) => (
                      <ChecklistRow
                        key={item.tag}
                        item={item}
                        onSave={(result, notes) => recordVerification(item.tag, result, notes)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Record a result for another asset tag
              </h4>
              <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto]">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Asset tag"
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                />
                <select
                  value={newResult}
                  onChange={(e) => setNewResult(e.target.value as VerificationResult)}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                >
                  <option value="verified">Verified</option>
                  <option value="missing">Missing</option>
                  <option value="damaged">Damaged</option>
                </select>
                <input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAddAdHoc}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
                >
                  Record
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {startOpen && (
        <Modal title="Start audit cycle" onClose={() => setStartOpen(false)}>
          <form onSubmit={handleStartAudit} className="space-y-4">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Department
              <select
                name="department"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
              >
                <option value="" disabled>
                  Select department
                </option>
                {departments.map((d) => (
                  <option key={d.deptId} value={d.deptId}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Start date
                <input
                  name="dateRangeStart"
                  type="date"
                  required
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                End date
                <input
                  name="dateRangeEnd"
                  type="date"
                  required
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </label>
            </div>
            <div>
              <span className="block text-sm font-medium text-[var(--text-primary)]">Auditors</span>
              <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-2">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-card)]">
                    <input type="checkbox" name="auditors" value={e.id} />
                    {e.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Starting…" : "Start audit"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  onSave,
}: {
  item: LineItem;
  onSave: (result: VerificationResult, notes: string) => void;
}) {
  const [result, setResult] = useState<VerificationResult>(item.result ?? "verified");
  const [notes, setNotes] = useState(item.notes ?? "");

  return (
    <tr>
      <td className="py-2.5 pr-3">
        <span className="num rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-semibold text-[var(--text-primary)]">
          {item.tag}
        </span>
      </td>
      <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{item.expectedLocation}</td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as VerificationResult)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1 text-xs"
          >
            <option value="verified">Verified</option>
            <option value="missing">Missing</option>
            <option value="damaged">Damaged</option>
          </select>
          {item.result && <Badge tone={RESULT_TONE[item.result]}>{item.result}</Badge>}
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1 text-xs"
          />
          <button
            onClick={() => onSave(result, notes)}
            className="shrink-0 rounded-lg bg-[var(--primary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]"
          >
            Save
          </button>
        </div>
      </td>
    </tr>
  );
}
