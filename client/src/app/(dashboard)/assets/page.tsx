"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<{ items: any[] }>("/assets")
      .then((data) => mounted && setAssets(data?.items || []))
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
      <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
      {loading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 space-y-3">
          {assets.length === 0 && (
            <div className="text-sm text-gray-500">No assets found.</div>
          )}
          {assets.map((a) => (
            <div
              key={a.tag ?? a.id ?? Math.random()}
              className="rounded-lg border p-3"
            >
              <div className="text-sm font-medium text-gray-800">
                {a.name ?? a.tag}
              </div>
              <div className="text-xs text-gray-500">
                {a.category ?? a.departmentName ?? "Unassigned"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
