"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { LogOutIcon, SunIcon, MoonIcon } from "@/components/ui/icons";
import { EditProfileModal } from "@/components/layout/EditProfileModal";

export function AccountMenu() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)] transition hover:opacity-80"
      >
        {(user?.role ?? "U").slice(0, 2).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-2 shadow-[0_16px_40px_rgba(21,145,220,0.15)]">
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {user?.role ? user.role.replace(/_/g, " ") : "Signed in"}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">Account</div>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              setEditOpen(true);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
          >
            Edit profile
          </button>

          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
          >
            Dark mode
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          <button
            onClick={() => {
              signOut();
              router.push("/login");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--danger-fg)]"
          >
            <LogOutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}

      {editOpen && <EditProfileModal onClose={() => setEditOpen(false)} />}
    </div>
  );
}
