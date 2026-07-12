"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<any>("/dashboard/overview")
      .then((data) => {
        if (mounted) setOverview(data);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">
        Today&apos;s overview and recent activity.
      </p>

      {loading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {overview && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {Object.entries(overview).map(([key, val]) => (
            <div key={key} className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">{key}</div>
              <div className="mt-1 text-2xl font-semibold">{String(val)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
