"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

type Department = { deptId: string; name: string };

type Employee = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  departmentId: string | null;
  status: string;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]";

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, isAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.employeeId) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get<Department[]>("/org/departments"),
      api.get<Employee[]>("/org/employees"),
    ])
      .then(([depts, employees]) => {
        setDepartments(depts || []);
        setEmployee(employees.find((e) => e.id === user.employeeId) ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [user?.employeeId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.employeeId) return;
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/org/employees/${user.employeeId}`, {
        name: form.get("name"),
        title: form.get("title") || null,
        deptId: form.get("deptId") || null,
      });
      setNotice("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit profile" onClose={onClose}>
      {!user?.employeeId ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Your account isn&apos;t linked to an employee record yet — that happens via
          Organization Setup. Once an admin links your account to a department, you&apos;ll be
          able to edit these details here.
        </p>
      ) : loading ? (
        <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
      ) : !employee ? (
        <p className="text-sm text-[var(--text-secondary)]">Couldn&apos;t find your employee record.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger-fg)]">
              {error === "forbidden"
                ? "Only admins can currently update employee details — ask an admin to make this change for you."
                : error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-[var(--success-bg)] bg-[var(--success-bg)] px-3.5 py-2.5 text-sm text-[var(--success-fg)]">
              {notice}
            </div>
          )}
          {!isAdmin && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text-tertiary)]">
              Only admins can update employee details right now — ask an admin to make changes for you.
            </div>
          )}

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Name
            <input
              name="name"
              defaultValue={employee.name}
              required
              disabled={!isAdmin}
              className={`${inputClass} ${!isAdmin ? "cursor-not-allowed opacity-60" : ""}`}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Email
            <input value={employee.email} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
          </label>
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Title
            <input
              name="title"
              defaultValue={employee.title ?? ""}
              disabled={!isAdmin}
              className={`${inputClass} ${!isAdmin ? "cursor-not-allowed opacity-60" : ""}`}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Department
            <select
              name="deptId"
              defaultValue={employee.departmentId ?? ""}
              disabled={!isAdmin}
              className={`${inputClass} ${!isAdmin ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.deptId} value={d.deptId}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          {isAdmin && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
