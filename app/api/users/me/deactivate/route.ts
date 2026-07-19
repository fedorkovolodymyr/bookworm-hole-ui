import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";
import { isAxiosError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);

  try {
    const { data } = await client.post("/users/me/deactivate");
    return NextResponse.json(data);
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Failed to deactivate account" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}
