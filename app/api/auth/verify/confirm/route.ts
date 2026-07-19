import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  const client = createServerApiClient();
  const { data } = await client.post("/auth/verify/confirm", { token });
  return NextResponse.json(data);
}
