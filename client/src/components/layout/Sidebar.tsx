"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
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
  LogOutIcon,
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--text-on-primary)]">
          AF
        </span>
        <div className="leading-tight">
          <div className="text-base font-bold text-[var(--text-primary)]">
            TrackAssets
          </div>
          <div className="text-[11px] font-medium text-[var(--text-tertiary)]">
            AssetFlow
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border-subtle)] px-3 py-4">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
            {(user?.role ?? "U").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {user?.role
                ? user.role.replace(/_/g, " ")
                : "Signed in"}
            </div>
            <div className="truncate text-xs text-[var(--text-tertiary)]">
              Account
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            signOut();
            router.push("/login");
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--danger-fg)]"
        >
          <LogOutIcon className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
