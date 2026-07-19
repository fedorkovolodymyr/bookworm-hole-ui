// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { clearAuthCookies, getRefreshToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const refreshToken = getRefreshToken(request);
  const client = createServerApiClient();

  if (refreshToken) {
    try {
      await client.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // Already-invalid refresh token shouldn't block clearing local cookies.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
