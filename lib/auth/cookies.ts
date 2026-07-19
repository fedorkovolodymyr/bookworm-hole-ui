import type { NextRequest, NextResponse } from "next/server";
import type { AuthTokens } from "@/lib/api/types";
import { generateCsrfToken } from "./csrf";

const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 min, matches API access_token_expire_minutes
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches API refresh_token_expire_days

const isProd = process.env.NODE_ENV === "production";

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  response.cookies.set("access_token", tokens.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  response.cookies.set("csrf_token", generateCsrfToken(), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("csrf_token");
}

export function getAccessToken(request: NextRequest): string | undefined {
  return request.cookies.get("access_token")?.value;
}

export function getRefreshToken(request: NextRequest): string | undefined {
  return request.cookies.get("refresh_token")?.value;
}
