import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api/server-client";
import type { UserProfileResponse } from "@/lib/api/types";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login?from=/admin");
  }

  // This is the REAL authorization gate for all of /admin/*, mirroring
  // app/(app)/admin/catalog/layout.tsx. proxy.ts middleware only decodes the
  // JWT's (unverified) is_admin claim for a fast, non-authoritative redirect;
  // this layout is the backstop that calls the live API with the actual
  // bearer token and trusts only the API's verified, signed claims.
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
    redirect("/login?from=/admin");
  }

  if (!profile.is_admin) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
