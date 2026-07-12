"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GridIcon,
  BuildingIcon,
  BoxIcon,
  SwapIcon,
  CalendarIcon,
  WrenchIcon,
  ClipboardCheckIcon,
  BarChartIcon,
  BellIcon,
  XIcon,
} from "@/components/ui/icons";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: GridIcon },
  { label: "Organization setup", href: "/organization", icon: BuildingIcon },
  { label: "Assets", href: "/assets", icon: BoxIcon },
  { label: "Allocation & Transfer", href: "/allocation", icon: SwapIcon },
  { label: "Resource Booking", href: "/booking", icon: CalendarIcon },
  { label: "Maintenance", href: "/maintenance", icon: WrenchIcon },
  { label: "Audit", href: "/audit", icon: ClipboardCheckIcon },
  { label: "Reports", href: "/reports", icon: BarChartIcon },
  { label: "Notifications", href: "/notifications", icon: BellIcon },
];

export function Sidebar({
  open,
  collapsed,
  onClose,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-card)] transition-all duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-auto lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
    >
      <div className="flex items-center justify-between gap-2.5 px-5 py-5 lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--text-on-primary)]">
            TA
          </span>
          <div className="leading-tight">
            <div className="text-base font-bold text-[var(--text-primary)]">
              TrackAssets
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-sunken)]"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? "lg:justify-center" : ""
              } ${
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={collapsed ? "truncate lg:hidden" : "truncate"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
