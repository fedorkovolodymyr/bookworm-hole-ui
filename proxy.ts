import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = [
  "/profile",
  "/admin",
  "/collections",
  "/library",
  "/reading",
  "/chat",
  "/ai",
  "/friends",
  "/contributions",
];

/**
 * Decode (NOT verify) a JWT's payload segment. JWTs are base64url-encoded
 * JSON, not encrypted, so this reveals the claims without proving they're
 * authentic — anyone can forge a token with any payload they like. This is
 * intentionally NOT a security check on its own; see the rationale where
 * it's used below. Returns null on any malformed/garbage input rather than
 * throwing, since middleware must never crash on a bad cookie value.
 */
function decodeJwtPayload(token: string): { is_admin?: boolean } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(payloadJson);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed as { is_admin?: boolean };
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Presence-only check for UX/redirect purposes — the API still validates
  // the token and returns 401 if it's invalid or expired.
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin authorization is a two-layer defense-in-depth check:
  //
  // 1. FAST edge check (here): the access token JWT now embeds a signed
  //    `is_admin` claim (bookworm-hole-api#144). Middleware can't verify the
  //    JWT signature (no server-only secret, no reliable Node `crypto` across
  //    Edge runtimes), but it CAN decode the payload without verification,
  //    since JWTs are base64url JSON, not encrypted. We use the decoded claim
  //    ONLY to short-circuit an obvious non-admin to `/` faster than waiting
  //    on the layout's network round-trip — pure UX, not a security boundary.
  // 2. REAL check (app/(app)/admin/catalog/layout.tsx): calls `GET /users/me`
  //    with the actual bearer token and lets the API's verified, signed
  //    claims decide. This always runs for any `/admin` request that reaches
  //    it — the edge check can only redirect early, never grant access.
  //
  // A malicious client could forge a token with `is_admin: true` in its
  // decoded payload, but the signature would be invalid, so it fails both
  // the backend's `require_admin` dependency on every real admin request AND
  // the layout's `/users/me` backstop (which asks the API, using that same
  // bearer token, what the real profile is — the API rejects the bad
  // signature). A forged claim can at best skip the fast redirect; it can
  // never skip the real authorization checks.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const payload = decodeJwtPayload(accessToken);
    if (payload !== null && payload.is_admin === false) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // payload === null (malformed/undecodable), is_admin is undefined/non-boolean
    // (old pre-#144 token), or is_admin === true: fall through and let the
    // layout backstop make the real authorization decision.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/admin/:path*",
    "/collections/:path*",
    "/library/:path*",
    "/reading/:path*",
    "/chat/:path*",
    "/ai/:path*",
    "/friends/:path*",
    "/contributions/:path*",
  ],
};
