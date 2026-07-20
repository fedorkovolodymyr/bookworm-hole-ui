import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/profile", "/admin"];

export function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Presence-only check for UX/redirect purposes — the API still validates
  // the token and returns 401 if it's invalid or expired. Admin-specific
  // authorization (is_admin) is checked server-side in
  // app/(app)/admin/catalog/layout.tsx, not here — the JWT carries no
  // admin claim yet (see bookworm-hole-api#144), so middleware has no way
  // to distinguish an admin from a regular authenticated user at this layer.
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
