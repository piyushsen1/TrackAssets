"use client";

import { useMemo, useState } from "react";

export type LineDatum = { label: string; value: number };

const WIDTH = 600;
const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };

export function LineChart({
  data,
  color = "var(--teal-fg)",
  height = 220,
}: {
  data: LineDatum[];
  color?: string;
  height?: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(maxValue / 5) * 5 || 5;

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        x: PADDING.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
        y: PADDING.top + plotH - (d.value / niceMax) * plotH,
        ...d,
      })),
    [data, plotW, plotH, niceMax],
  );

  if (data.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">No data yet.</div>
    );
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round(f * niceMax));
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * plotW + PADDING.left;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" style={{ height }}>
        {ticks.map((t) => {
          const y = PADDING.top + plotH - (t / niceMax) * plotH;
          return (
            <g key={t}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={1}
              />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-tertiary)">
                {t}
              </text>
            </g>
          );
        })}

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PADDING.top}
            y2={PADDING.top + plotH}
            stroke="var(--border-default)"
            strokeWidth={1}
          />
        )}

        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={4} fill={color} stroke="var(--surface-card)" strokeWidth={2} />
        ))}

        <text
          x={points[points.length - 1].x}
          y={points[points.length - 1].y - 10}
          textAnchor="end"
          fontSize={11}
          fontWeight={600}
          fill="var(--text-primary)"
        >
          {points[points.length - 1].value}
        </text>

        {points.map((p) => (
          <text key={`${p.label}-axis`} x={p.x} y={height - 8} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">
            {p.label}
          </text>
        ))}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: 4, transform: "translateX(-50%)" }}
        >
          <div className="font-semibold text-[var(--text-primary)]">{hovered.value}</div>
          <div className="text-[var(--text-tertiary)]">{hovered.label}</div>
        </div>
      )}
    </div>
  );
}
