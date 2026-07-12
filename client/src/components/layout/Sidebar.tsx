"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Organization setup", href: "/organization" },
  { label: "Assets", href: "/assets" },
  { label: "Allocation & Transfer", href: "/allocation" },
  { label: "Resource Booking", href: "/booking" },
  { label: "Maintenance", href: "/maintenance" },
  { label: "Audit", href: "/audit" },
  { label: "Reports", href: "/reports" },
  { label: "Notifications", href: "/notifications" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-5 text-lg font-bold text-gray-900">AssetFlow</div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
