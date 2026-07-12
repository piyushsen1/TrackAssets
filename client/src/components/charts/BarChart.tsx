"use client";

import { useState } from "react";

export type BarDatum = { label: string; value: number };

export function BarChart({
  data,
  color = "var(--primary)",
  max = 100,
  valueSuffix = "%",
}: {
  data: BarDatum[];
  color?: string;
  max?: number;
  valueSuffix?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">No data yet.</div>
    );
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));

  return (
    <div>
      <div className="flex justify-between pl-[128px] text-xs text-[var(--text-tertiary)]">
        {ticks.map((t) => (
          <span key={t} className="num">
            {t}
            {valueSuffix}
          </span>
        ))}
      </div>
      <div className="mt-2 space-y-2.5">
        {data.map((d, i) => {
          const pct = Math.max(0, Math.min(100, (d.value / max) * 100));
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span
                className="w-32 shrink-0 truncate text-xs text-[var(--text-secondary)]"
                title={d.label}
              >
                {d.label}
              </span>
              <div className="relative h-[18px] flex-1 bg-[var(--surface-sunken)]">
                <div className="pointer-events-none absolute inset-0 flex justify-between">
                  {ticks.map((t) => (
                    <span key={t} className="h-full w-px bg-[var(--border-subtle)]" />
                  ))}
                </div>
                <div
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  tabIndex={0}
                  title={`${d.label}: ${d.value}${valueSuffix}`}
                  className="relative h-full rounded-r-[4px] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    opacity: hovered === i ? 0.85 : 1,
                  }}
                />
              </div>
              <span className="num w-12 shrink-0 text-right text-xs font-semibold text-[var(--text-primary)]">
                {d.value}
                {valueSuffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
