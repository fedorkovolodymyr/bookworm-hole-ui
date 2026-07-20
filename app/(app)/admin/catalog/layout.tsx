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
