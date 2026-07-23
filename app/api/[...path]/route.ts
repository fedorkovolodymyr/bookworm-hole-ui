import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";
import { isAxiosError } from "@/lib/api/errors";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function proxy(request: NextRequest): Promise<NextResponse> {
  if (MUTATING_METHODS.has(request.method)) {
    const csrfCookie = request.cookies.get("csrf_token")?.value;
    const csrfHeader = request.headers.get("x-csrf-token");
    if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
      return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
    }
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  // Derive the target path from the raw pathname (not the `path` segments array) so a
  // trailing slash on the incoming request (e.g. /api/chat/threads/) is preserved when
  // forwarded upstream — Next.js's [...path] catch-all never includes a trailing empty
  // segment, so path.join("/") would silently drop it.
  const targetPath = request.nextUrl.pathname.replace(/^\/api/, "");
  const search = request.nextUrl.search;

  let body: unknown;
  if (MUTATING_METHODS.has(request.method)) {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
      }
    }
  }

  try {
    const { data, status } = await client.request({
      url: `${targetPath}${search}`,
      method: request.method,
      data: body,
    });
    if (status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(data, { status });
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Request failed" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}
