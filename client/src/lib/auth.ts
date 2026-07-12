const TOKEN_COOKIE = "token";

// Stored as a plain (non-httpOnly) cookie so both client components and the
// Next.js middleware can read it. Swap for a server-set httpOnly cookie once
// the login request is proxied through a Next.js route handler.

export function setToken(token: string) {
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24}`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}
