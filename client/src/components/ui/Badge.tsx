export type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "teal"
  | "neutral"
  | "primary";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-[var(--success-bg)] text-[var(--success-fg)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)]",
  info: "bg-[var(--info-bg)] text-[var(--info-fg)]",
  teal: "bg-[var(--teal-bg)] text-[var(--teal-fg)]",
  neutral: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
};

export function Badge({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
