import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api/server-client";
import type { UserProfileResponse } from "@/lib/api/types";

export default async function AdminCatalogLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login?from=/admin/catalog");
  }

  // This is the REAL authorization gate. The access token JWT now embeds a
  // signed `is_admin` claim (bookworm-hole-api#144) and proxy.ts middleware
  // decodes it for a fast, non-authoritative redirect — but middleware can
  // only decode a JWT's payload, not verify its signature, so that check is
  // UX-only. This layout is the backstop: it calls the live API with the
  // actual bearer token and trusts only what the API's verified, signed
  // claims say the profile is. Every request that reaches this layout gets
  // this real check, regardless of what the fast edge check decided.
  //
  // NOTE: the is_admin check below is deliberately kept OUTSIDE this try/catch.
  // redirect() throws a framework-internal NEXT_REDIRECT control-flow error;
  // catching it here would misreport a legitimate non-admin redirect as a
  // network/auth failure and send the user to /login instead of /.
  let profile: UserProfileResponse;
  try {
    const client = createServerApiClient(accessToken);
    ({ data: profile } = await client.get<UserProfileResponse>("/users/me"));
  } catch {
    redirect("/login?from=/admin/catalog");
  }

  if (!profile.is_admin) {
    redirect("/");
  }

  return <div className="flex flex-col gap-6">{children}</div>;
}
