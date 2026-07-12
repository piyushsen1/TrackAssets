"use client";

<<<<<<< HEAD
=======
import Link from "next/link";
>>>>>>> cdd4f7f (add sign up and login page)
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
=======
  const [isSubmitting, setIsSubmitting] = useState(false);
>>>>>>> cdd4f7f (add sign up and login page)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
<<<<<<< HEAD
=======
    setIsSubmitting(true);

>>>>>>> cdd4f7f (add sign up and login page)
    try {
      const { token } = await api.post<{ token: string }>("/auth/login", {
        email,
        password,
      });
<<<<<<< HEAD
      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
=======

      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Check your email.",
      );
    } finally {
      setIsSubmitting(false);
>>>>>>> cdd4f7f (add sign up and login page)
    }
  }

  return (
<<<<<<< HEAD
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Sign in to AssetFlow</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in
        </button>
        <div className="flex justify-between text-sm text-gray-500">
          <a href="/forgot-password" className="hover:underline">
            Forgot password?
          </a>
          <a href="/signup" className="hover:underline">
            Create account
          </a>
        </div>
      </form>
=======
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
>>>>>>> cdd4f7f (add sign up and login page)
    </div>
  );
}
