import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);

  try {
    const { data } = await client.post("/users/me/delete/cancel");
    return NextResponse.json(data);
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(
        error.response?.data ?? { detail: "Failed to cancel account deletion" },
        { status: error.response?.status ?? 500 },
      );
    }
    throw error;
  }
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
