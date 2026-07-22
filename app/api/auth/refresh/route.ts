// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { setAuthCookies, getRefreshToken, clearAuthCookies } from "@/lib/auth/cookies";
import { NO_REFRESH_TOKEN_DETAIL } from "@/lib/auth/constants";
import type { AuthTokens } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshToken(request);
  if (!refreshToken) {
    return NextResponse.json({ detail: NO_REFRESH_TOKEN_DETAIL }, { status: 401 });
  }

  const client = createServerApiClient();
  try {
    const { data } = await client.post<AuthTokens>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, data);
    return response;
  } catch {
    const response = NextResponse.json({ detail: "Refresh failed" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
