// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { setAuthCookies } from "@/lib/auth/cookies";
import type { LoginPayload, UserResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const payload: LoginPayload = await request.json();
  const client = createServerApiClient();

  try {
    const { data } = await client.post<{
      user: UserResponse;
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>("/auth/login", payload);

    const response = NextResponse.json({ user: data.user }, { status: 200 });
    setAuthCookies(response, data);
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Login failed" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
