import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const { token } = await request.json();
  const client = createServerApiClient();
  const { data } = await client.post("/auth/verify/confirm", { token });
  return NextResponse.json(data);
}
