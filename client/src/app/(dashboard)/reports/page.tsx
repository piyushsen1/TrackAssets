"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { BarChart, type BarDatum } from "@/components/charts/BarChart";
import { LineChart, type LineDatum } from "@/components/charts/LineChart";
import { ClipboardListIcon, WrenchIcon } from "@/components/ui/icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type UtilizationRow = { department: string; utilization: number };
type FrequencyRow = { label: string; count: number };
type MostUsedRow = { tag: string; name: string; count: number };
type IdleAsset = { tag: string; name: string; category: string | null; department: string | null; lastUpdated: string };
type DueAsset = {
  tag: string;
  name: string;
  status: string;
  department: string | null;
  category: string | null;
  ageYears: number | null;
  note: string;
};

function monthLabel(raw: string) {
  const [year, month] = raw.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString([], { month: "short", year: "2-digit" });
}

type ChartType = "bar" | "line";

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const [utilizationChartType, setUtilizationChartType] = useState<ChartType>("bar");
  const [frequencyChartType, setFrequencyChartType] = useState<ChartType>("line");
  const [utilization, setUtilization] = useState<UtilizationRow[]>([]);
  const [frequency, setFrequency] = useState<FrequencyRow[]>([]);
  const [mostUsed, setMostUsed] = useState<MostUsedRow[]>([]);
  const [idle, setIdle] = useState<IdleAsset[]>([]);
  const [due, setDue] = useState<DueAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      api.get<UtilizationRow[]>("/reports/utilization-by-department"),
      api.get<FrequencyRow[]>("/reports/maintenance-frequency"),
      api.get<MostUsedRow[]>("/reports/most-used-assets"),
      api.get<IdleAsset[]>("/reports/idle-assets"),
      api.get<DueAsset[]>("/reports/due-for-maintenance"),
    ])
      .then(([u, f, mu, i, d]) => {
        setUtilization(u || []);
        setFrequency(f || []);
        setMostUsed(mu || []);
        setIdle(i || []);
        setDue(d || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/reports/export?format=csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "assetflow-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reports</h1>
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Reports are restricted to admins.
          </p>
        </div>
      </div>
    );
  }

  const utilizationData: BarDatum[] = utilization.map((u) => ({ label: u.department, value: u.utilization }));
  const frequencyData: LineDatum[] = frequency.map((f) => ({ label: monthLabel(f.label), value: f.count }));
  const frequencyMax = Math.max(5, ...frequencyData.map((d) => d.value));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reports</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Utilization, maintenance trends, and asset health at a glance.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] disabled:opacity-60"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] py-14 text-center text-sm text-[var(--text-tertiary)]">
          Loading…
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Utilization by department</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">Share of assets currently allocated.</p>
                </div>
                <ChartTypeToggle value={utilizationChartType} onChange={setUtilizationChartType} />
              </div>
              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[360px]">
                  {utilizationChartType === "bar" ? (
                    <BarChart data={utilizationData} />
                  ) : (
                    <LineChart data={utilizationData} color="var(--primary)" />
                  )}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-[var(--text-link)]">
                  View as table
                </summary>
                <table className="mt-2 w-full text-left text-xs">
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {utilization.map((u) => (
                      <tr key={u.department}>
                        <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{u.department}</td>
                        <td className="num py-1.5 text-right font-semibold text-[var(--text-primary)]">
                          {u.utilization}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>

            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Maintenance frequency</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">Tickets raised per month.</p>
                </div>
                <ChartTypeToggle value={frequencyChartType} onChange={setFrequencyChartType} />
              </div>
              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[360px]">
                  {frequencyChartType === "line" ? (
                    <LineChart data={frequencyData} />
                  ) : (
                    <BarChart data={frequencyData} color="var(--teal-fg)" max={frequencyMax} valueSuffix="" />
                  )}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-[var(--text-link)]">
                  View as table
                </summary>
                <table className="mt-2 w-full text-left text-xs">
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {frequency.map((f) => (
                      <tr key={f.label}>
                        <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{monthLabel(f.label)}</td>
                        <td className="num py-1.5 text-right font-semibold text-[var(--text-primary)]">
                          {f.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Most used assets</h2>
              <div className="mt-3 max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {mostUsed.length === 0 && (
                  <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">No data yet.</div>
                )}
                {mostUsed.map((a, i) => (
                  <div key={a.tag} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--surface-sunken)]">
                    <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">{a.name}</div>
                      <div className="num text-xs text-[var(--text-tertiary)]">{a.tag}</div>
                    </div>
                    <Badge tone="primary" dot={false}>
                      {a.count}×
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Idle assets</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Available, untouched for 90+ days.</p>
              <div className="mt-3 max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {idle.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <ClipboardListIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                    <span className="text-sm text-[var(--text-tertiary)]">No idle assets.</span>
                  </div>
                )}
                {idle.map((a) => (
                  <div key={a.tag} className="rounded-xl px-2 py-2 hover:bg-[var(--surface-sunken)]">
                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">{a.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      <span className="num">{a.tag}</span> · {a.department ?? "Unassigned"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <WrenchIcon className="h-4 w-4" />
                Due for maintenance
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">Long allocations or nearing retirement.</p>
              <div className="mt-3 max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {due.length === 0 && (
                  <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">Nothing flagged.</div>
                )}
                {due.map((a) => (
                  <div key={a.tag} className="rounded-xl px-2 py-2 hover:bg-[var(--surface-sunken)]">
                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">{a.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{a.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChartTypeToggle({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (next: ChartType) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5">
      {(["bar", "line"] as const).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
            value === type
              ? "bg-[var(--surface-card)] text-[var(--primary)] shadow-sm"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
