"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Asset, AssetStatus, Category, Department } from "@/types";
import { BoxIcon, ClipboardListIcon } from "@/components/ui/icons";

interface AssetListResponse {
  items: Asset[];
  total: number;
}

const statusOptions: Array<{ value: AssetStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "allocated", label: "Allocated" },
  { value: "reserved", label: "Reserved" },
  { value: "under_maintenance", label: "Under maintenance" },
  { value: "lost", label: "Lost" },
  { value: "retired", label: "Retired" },
  { value: "disposed", label: "Disposed" },
];

const TABS = [
  { key: "inventory", label: "Inventory", icon: ClipboardListIcon },
  { key: "register", label: "Register asset", icon: BoxIcon },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AssetsPage() {
  const [tab, setTab] = useState<TabKey>("inventory");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    department: "",
  });
  const [form, setForm] = useState({
    name: "",
    category: "",
    department: "",
    location: "",
    serial: "",
    acquisitionDate: "",
    acquisitionCost: "",
    condition: "",
    photoUrl: "",
    documentUrls: "",
    isBookable: false,
  });

  const loadData = async () => {
    try {
      const [assetData, departmentsData, categoriesData] = await Promise.all([
        api.get<AssetListResponse>(
          `/assets?search=${encodeURIComponent(filters.search)}&category=${filters.category}&status=${filters.status}&department=${filters.department}`,
        ),
        api.get<Department[]>("/org/departments"),
        api.get<Category[]>("/org/categories"),
      ]);
      setAssets(assetData?.items ?? []);
      setDepartments(departmentsData ?? []);
      setCategories(categoriesData ?? []);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to load assets.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [filters.category, filters.department, filters.status, filters.search]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        department: form.department || undefined,
        location: form.location || undefined,
        serial: form.serial || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        acquisitionCost: form.acquisitionCost
          ? Number(form.acquisitionCost)
          : undefined,
        condition: form.condition || undefined,
        photoUrl: form.photoUrl || undefined,
        documentUrls: form.documentUrls
          ? form.documentUrls
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        isBookable: form.isBookable,
      };

      const created = await api.post<{ tag: string; status: string }>(
        "/assets",
        payload,
      );
      setSuccessMessage(`Asset ${created.tag} registered successfully.`);
      setForm({
        name: "",
        category: "",
        department: "",
        location: "",
        serial: "",
        acquisitionDate: "",
        acquisitionCost: "",
        condition: "",
        photoUrl: "",
        documentUrls: "",
        isBookable: false,
      });
      await loadData();
      setTab("inventory");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to register asset.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Asset directory
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Register new assets and search the current inventory.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1">
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

      {formError && (
        <div className="rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {formError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-2xl border border-[var(--success-bg)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-fg)]">
          {successMessage}
        </div>
      )}

      {tab === "register" && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Register asset
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Asset name
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    category: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Department
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    department: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.deptId} value={department.deptId}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Location
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    location: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Serial
              <input
                value={form.serial}
                onChange={(e) =>
                  setForm((current) => ({ ...current, serial: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Condition
              <input
                value={form.condition}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    condition: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Acquisition date
              <input
                type="date"
                value={form.acquisitionDate}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    acquisitionDate: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Acquisition cost
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.acquisitionCost}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    acquisitionCost: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] md:col-span-2 xl:col-span-1">
              <input
                type="checkbox"
                checked={form.isBookable}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    isBookable: e.target.checked,
                  }))
                }
              />
              Bookable resource
            </label>
            <label className="block text-sm font-medium text-[var(--text-primary)] md:col-span-2 xl:col-span-3">
              Document URLs (one per line)
              <textarea
                value={form.documentUrls}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    documentUrls: e.target.value,
                  }))
                }
                rows={3}
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--text-on-primary)] md:w-auto"
          >
            Register asset
          </button>
        </form>
      )}

      {tab === "inventory" && (
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Inventory
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Filter by tag, serial, department, or status.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Search
              <input
                value={filters.search}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    search: e.target.value,
                  }))
                }
                placeholder="Tag, serial, or name"
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Category
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    category: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Status
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    status: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Department
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    department: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.deptId} value={department.deptId}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Loading assets…
            </p>
          )}

          {!loading && assets.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              No assets match the current filters.
            </div>
          )}

          {!loading && assets.length > 0 && (
            <div className="mt-5 max-h-[480px] overflow-auto rounded-2xl border border-[var(--border-subtle)]">
              <table className="min-w-full divide-y divide-[var(--border-subtle)] text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-sunken)] text-left text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tag</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Department</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-card)]">
                  {assets.map((asset) => (
                    <tr key={asset.tag} className="text-[var(--text-primary)]">
                      <td className="px-3 py-2 font-mono text-xs">
                        {asset.tag}
                      </td>
                      <td className="px-3 py-2">{asset.name}</td>
                      <td className="px-3 py-2 capitalize">{asset.status}</td>
                      <td className="px-3 py-2">{asset.category ?? "—"}</td>
                      <td className="px-3 py-2">
                        {asset.departmentName ?? "—"}
                      </td>
                      <td className="px-3 py-2">{asset.location ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
