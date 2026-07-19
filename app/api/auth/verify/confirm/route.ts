import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { isAxiosError } from "@/lib/api/errors";

// No CSRF check here by design: the single-use, out-of-band token from the
// email link is itself sufficient CSRF protection, and requiring a CSRF
// cookie would break confirmation for users with no active session in this
// browser/tab (e.g. clicking the link on a different device).
export async function POST(request: NextRequest) {
  const { token } = await request.json();
  const client = createServerApiClient();

  try {
    const { data } = await client.post("/auth/verify/confirm", { token });
    return NextResponse.json(data);
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Verification failed" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}
