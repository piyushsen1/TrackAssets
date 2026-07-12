"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get<any[]>("/org/departments"),
      api.get<any[]>("/org/categories"),
      api.get<any[]>("/org/employees"),
    ])
      .then(([d, c, e]) => {
        if (!mounted) return;
        setDepartments(d || []);
        setCategories(c || []);
        setEmployees(e || []);
      })
      .catch(
        (err) =>
          mounted && setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Organization setup
      </h1>

      {loading && <div className="mt-4 text-sm text-gray-500">Loading…</div>}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-medium">Departments</h2>
          <ul className="mt-2 space-y-2">
            {departments.map((d) => (
              <li key={d.id ?? d.deptId} className="text-sm">
                {d.name}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium">Categories</h2>
          <ul className="mt-2 space-y-2">
            {categories.map((c) => (
              <li key={c.id ?? c.name} className="text-sm">
                {c.name}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium">Employees</h2>
          <ul className="mt-2 space-y-2">
            {employees.map((e) => (
              <li key={e.id ?? e.email} className="text-sm">
                {e.name ?? e.email}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
