"use client";

import { useEffect } from "react";
import { XIcon } from "./icons";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 sm:items-center">
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-[0_24px_60px_rgba(21,145,220,0.2)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
