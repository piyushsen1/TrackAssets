"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { token } = await api.post<{ token: string }>("/auth/login", {
        email,
        password,
      });

      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Check your email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] px-4 py-12 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border-default)] bg-[var(--surface-card)] p-8 shadow-[0_24px_60px_rgba(21,145,220,0.15)]">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
            TrackAssets
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-[var(--primary)]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Sign in to manage assets, bookings, and reports.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-2xl border border-[var(--danger-bg)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Email
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Password
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--text-on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="flex items-center justify-between text-sm text-[var(--text-link)]">
            <Link
              href="/signup"
              className="font-medium hover:text-[var(--primary-hover)]"
            >
              Create account
            </Link>
            <Link href="/" className="hover:text-[var(--primary-hover)]">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
