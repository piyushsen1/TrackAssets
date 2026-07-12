import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/organization",
  "/assets",
  "/allocation",
  "/booking",
  "/maintenance",
  "/audit",
  "/reports",
  "/notifications",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/organization/:path*",
    "/assets/:path*",
    "/allocation/:path*",
    "/booking/:path*",
    "/maintenance/:path*",
    "/audit/:path*",
    "/reports/:path*",
    "/notifications/:path*",
  ],
};
