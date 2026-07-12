"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  PlusIcon,
  SearchIcon,
  BuildingIcon,
  TagIcon,
  UsersIcon,
} from "@/components/ui/icons";

type Department = {
  deptId: string;
  name: string;
  headEmployeeId: string | null;
  headEmployeeName: string | null;
  parentDeptId: string | null;
  status: string;
};

type Category = {
  categoryId: string;
  name: string;
};

type Role = "employee" | "department_head" | "asset_manager" | "admin";

type Employee = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  departmentId: string | null;
  departmentName: string | null;
  status: string;
  role: Role;
  hasAccount: boolean;
};

const TABS = [
  { key: "departments", label: "Departments", icon: BuildingIcon },
  { key: "categories", label: "Categories", icon: TagIcon },
  { key: "employees", label: "Employees", icon: UsersIcon },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ROLE_TONE: Record<Role, "primary" | "info" | "teal" | "neutral"> = {
  admin: "primary",
  asset_manager: "teal",
  department_head: "info",
  employee: "neutral",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-[var(--text-primary)]">
      {label}
      {children}
    </label>
  );
}

export default function OrganizationPage() {
  const { isAdmin, user } = useAuth();
  const [tab, setTab] = useState<TabKey>("departments");
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Department[]>("/org/departments"),
      api.get<Category[]>("/org/categories"),
      api.get<Employee[]>("/org/employees"),
    ])
      .then(([d, c, e]) => {
        setDepartments(d || []);
        setCategories(c || []);
        setEmployees(e || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deptNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.deptId, d.name));
    return map;
  }, [departments]);

  const q = search.trim().toLowerCase();
  const filteredDepartments = departments.filter((d) => !q || d.name.toLowerCase().includes(q));
  const filteredCategories = categories.filter((c) => !q || c.name.toLowerCase().includes(q));
  const filteredEmployees = employees.filter(
    (e) => !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
  );

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);

    try {
      if (tab === "departments") {
        await api.post("/org/departments", {
          name: form.get("name"),
          headEmployeeId: form.get("headEmployeeId") || null,
          parentDeptId: form.get("parentDeptId") || null,
          status: form.get("status") || "active",
        });
      } else if (tab === "categories") {
        await api.post("/org/categories", { name: form.get("name") });
      } else {
        await api.post("/org/employees", {
          name: form.get("name"),
          email: form.get("email"),
          deptId: form.get("deptId") || null,
          title: form.get("title") || null,
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(employeeId: string, role: Role) {
    try {
      await api.patch(`/org/employees/${employeeId}/role`, { role });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Organization setup
        </h1>
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {user
              ? "This section is restricted to admins."
              : "Sign in as an admin to manage departments, categories, and employees."}
          </p>
        </div>
      </div>
    );
  }

  const addLabel =
    tab === "departments" ? "Add department" : tab === "categories" ? "Add category" : "Add employee";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Organization setup
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage master data that feeds asset and allocation picklists.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)]"
        >
          <PlusIcon className="h-4 w-4" />
          {addLabel}
        </button>
      </div>

      <div className="mt-6 inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab}…`}
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        {loading ? (
          <div className="py-14 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
        ) : (
          <>
            {tab === "departments" && (
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-sunken)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Head</th>
                    <th className="px-5 py-3 font-semibold">Parent department</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredDepartments.map((d) => (
                    <tr key={d.deptId} className="hover:bg-[var(--surface-sunken)]">
                      <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">{d.name}</td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                        {d.headEmployeeName ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                        {d.parentDeptId ? deptNameById.get(d.parentDeptId) ?? "—" : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={d.status === "active" ? "success" : "neutral"}>
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filteredDepartments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[var(--text-tertiary)]">
                        No departments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "categories" && (
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-sunken)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredCategories.map((c) => (
                    <tr key={c.categoryId} className="hover:bg-[var(--surface-sunken)]">
                      <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">{c.name}</td>
                    </tr>
                  ))}
                  {filteredCategories.length === 0 && (
                    <tr>
                      <td className="px-5 py-10 text-center text-[var(--text-tertiary)]">
                        No categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "employees" && (
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-sunken)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredEmployees.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--surface-sunken)]">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-[var(--text-primary)]">{e.name}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">{e.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                        {e.departmentName ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)]">{e.title ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        {e.hasAccount ? (
                          <select
                            value={e.role}
                            onChange={(ev) => handleRoleChange(e.id, ev.target.value as Role)}
                            className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide outline-none ${
                              ROLE_TONE[e.role] === "primary"
                                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                : ROLE_TONE[e.role] === "info"
                                  ? "bg-[var(--info-bg)] text-[var(--info-fg)]"
                                  : ROLE_TONE[e.role] === "teal"
                                    ? "bg-[var(--teal-bg)] text-[var(--teal-fg)]"
                                    : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                            }`}
                          >
                            <option value="employee">employee</option>
                            <option value="department_head">department head</option>
                            <option value="asset_manager">asset manager</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <Badge tone="neutral">no account</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[var(--text-tertiary)]">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <Modal title={addLabel} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger-fg)]">
                {formError}
              </div>
            )}

            {tab === "departments" && (
              <>
                <Field label="Name">
                  <input name="name" required className={inputClass} />
                </Field>
                <Field label="Head (optional)">
                  <select name="headEmployeeId" defaultValue="" className={inputClass}>
                    <option value="">— None —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Parent department (optional)">
                  <select name="parentDeptId" defaultValue="" className={inputClass}>
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.deptId} value={d.deptId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue="active" className={inputClass}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </>
            )}

            {tab === "categories" && (
              <Field label="Name">
                <input name="name" required className={inputClass} />
              </Field>
            )}

            {tab === "employees" && (
              <>
                <Field label="Name">
                  <input name="name" required className={inputClass} />
                </Field>
                <Field label="Email">
                  <input name="email" type="email" required className={inputClass} />
                </Field>
                <Field label="Department (optional)">
                  <select name="deptId" defaultValue="" className={inputClass}>
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.deptId} value={d.deptId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Title (optional)">
                  <input name="title" className={inputClass} />
                </Field>
              </>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
