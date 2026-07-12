"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AssetDetailPage({
  params,
}: {
  params: { tag: string };
}) {
  const { tag } = params;
  const [asset, setAsset] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get<any>(`/assets/${encodeURIComponent(tag)}`),
      api.get<any[]>(`/assets/${encodeURIComponent(tag)}/history`),
    ])
      .then(([a, h]) => {
        if (!mounted) return;
        setAsset(a || null);
        setHistory(h || []);
      })
      .catch(
        (err) =>
          mounted && setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [tag]);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        {asset?.name ?? asset?.tag ?? tag}
      </h1>
      <div className="mt-4 space-y-2">
        <div className="text-sm">Tag: {asset?.tag}</div>
        <div className="text-sm">Category: {asset?.category}</div>
        <div className="text-sm">Department: {asset?.department}</div>
        <div className="text-sm">Location: {asset?.location}</div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium">History</h2>
        {history.length === 0 && (
          <div className="text-sm text-gray-500">No history available.</div>
        )}
        <ul className="mt-2 space-y-2">
          {history.map((h) => (
            <li key={h.id ?? JSON.stringify(h)} className="text-sm">
              <div>{h.type ?? h.event}</div>
              <div className="text-xs text-gray-500">
                {h.note ?? JSON.stringify(h)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
