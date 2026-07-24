"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserTable } from "@/components/admin/user-table";
import { PasswordResetDialog } from "@/components/admin/password-reset-dialog";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { AdminUserListParams } from "@/lib/api/types";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const [filters, setFilters] = useState<AdminUserListParams>({});
  const [skip, setSkip] = useState(0);
  const [resetUserId, setResetUserId] = useState<string | undefined>();

  const { data, isPending } = useAdminUsers({ ...filters, skip, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-email" className="text-sm font-medium">
            {t("filters.emailLabel")}
          </label>
          <Input
            id="filter-email"
            placeholder={t("filters.emailPlaceholder")}
            value={filters.email ?? ""}
            onChange={(e) => {
              setSkip(0);
              setFilters({ ...filters, email: e.target.value || undefined });
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-username" className="text-sm font-medium">
            {t("filters.usernameLabel")}
          </label>
          <Input
            id="filter-username"
            placeholder={t("filters.usernamePlaceholder")}
            value={filters.username ?? ""}
            onChange={(e) => {
              setSkip(0);
              setFilters({ ...filters, username: e.target.value || undefined });
            }}
          />
        </div>
      </div>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && <UserTable users={data?.items ?? []} onResetPassword={setResetUserId} />}
      {data && data.total > PAGE_SIZE && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={skip + PAGE_SIZE >= data.total}
            onClick={() => setSkip(skip + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
      <PasswordResetDialog
        userId={resetUserId}
        open={resetUserId !== undefined}
        onOpenChange={(open) => !open && setResetUserId(undefined)}
      />
    </div>
  );
}
