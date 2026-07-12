const TOKEN_COOKIE = "token";

<<<<<<< HEAD
// Stored as a plain (non-httpOnly) cookie so both client components and the
// Next.js middleware can read it. Swap for a server-set httpOnly cookie once
// the login request is proxied through a Next.js route handler.

export function setToken(token: string) {
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24}`;
=======
// Stored as a plain (non-httpOnly) cookie so client components and middleware
// can access the token during the current phase of the project.
export function setToken(token: string) {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
>>>>>>> cdd4f7f (add sign up and login page)
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
<<<<<<< HEAD
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
=======
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`),
  );
>>>>>>> cdd4f7f (add sign up and login page)
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearToken() {
<<<<<<< HEAD
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
=======
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
>>>>>>> cdd4f7f (add sign up and login page)
}
