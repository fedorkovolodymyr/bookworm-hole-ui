import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";
import { isAxiosError } from "@/lib/api/errors";
import type { UpdateProfilePayload } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);

  try {
    const { data } = await client.get("/users/me");
    return NextResponse.json(data);
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Failed to fetch profile" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const payload: UpdateProfilePayload = await request.json();
  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);

  try {
    const { data } = await client.patch("/users/me", payload);
    return NextResponse.json(data);
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Failed to update profile" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}
