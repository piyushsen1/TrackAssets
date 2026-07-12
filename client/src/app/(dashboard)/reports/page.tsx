"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ReportsPage() {
  const [utilization, setUtilization] = useState<any[]>([]);
  const [maintenanceFreq, setMaintenanceFreq] = useState<any[]>([]);
  const [mostUsed, setMostUsed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get<any[]>("/reports/utilization-by-department"),
      api.get<any[]>("/reports/maintenance-frequency"),
      api.get<any[]>("/reports/most-used-assets"),
    ])
      .then(([u, m, mu]) => {
        if (!mounted) return;
        setUtilization(u || []);
        setMaintenanceFreq(m || []);
        setMostUsed(mu || []);
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
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

      {loading && (
        <div className="mt-4 text-sm text-gray-500">Loading reports…</div>
      )}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-6 grid grid-cols-3 gap-6">
        <section>
          <h2 className="text-lg font-medium">Utilization by Department</h2>
          <div className="mt-2">
            {utilization.length === 0 && (
              <div className="text-sm text-gray-500">No data</div>
            )}
            <ul className="mt-2 space-y-2">
              {utilization.map((row) => (
                <li key={row.department} className="text-sm">
                  <div className="font-medium">{row.department}</div>
                  <div className="text-xs text-gray-500">{row.utilization}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Maintenance Frequency</h2>
          <div className="mt-2">
            {maintenanceFreq.length === 0 && (
              <div className="text-sm text-gray-500">No data</div>
            )}
            <ul className="mt-2 space-y-2">
              {maintenanceFreq.map((r, i) => (
                <li key={i} className="text-sm">
                  {r.label ?? JSON.stringify(r)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Most Used Assets</h2>
          <div className="mt-2">
            {mostUsed.length === 0 && (
              <div className="text-sm text-gray-500">No data</div>
            )}
            <ol className="mt-2 list-decimal space-y-2 pl-4">
              {mostUsed.map((a) => (
                <li key={a.tag ?? a.id} className="text-sm">
                  {a.name ?? a.tag} — {a.count}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
