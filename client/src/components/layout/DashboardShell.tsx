"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { MenuIcon } from "@/components/ui/icons";

const COLLAPSE_KEY = "sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleSidebar() {
    setMobileOpen((v) => !v);
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-page)]">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)]"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-[var(--text-on-primary)]">
          TA
        </span>
        <span className="text-sm font-bold text-[var(--text-primary)]">TrackAssets</span>
        <div className="ml-auto flex items-center gap-2">
          <AccountMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar open={mobileOpen} collapsed={collapsed} onClose={() => setMobileOpen(false)} />

        {mobileOpen && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
