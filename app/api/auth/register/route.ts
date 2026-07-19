// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { setAuthCookies } from "@/lib/auth/cookies";
import type { RegisterPayload, UserResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const payload: RegisterPayload = await request.json();
  const client = createServerApiClient();

  try {
    const { data } = await client.post<{
      user: UserResponse;
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>("/auth/register", payload);

    const response = NextResponse.json({ user: data.user }, { status: 201 });
    setAuthCookies(response, data);
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Registration failed" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
