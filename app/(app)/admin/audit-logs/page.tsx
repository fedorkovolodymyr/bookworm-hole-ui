"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import type { AdminAuditLogListParams } from "@/lib/api/types";

const PAGE_SIZE = 20;

export default function AdminAuditLogsPage() {
  const t = useTranslations("admin.auditLogs");
  const [filters, setFilters] = useState<AdminAuditLogListParams>({});
  const [skip, setSkip] = useState(0);

  const { data, isPending } = useAdminAuditLogs({ ...filters, skip, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <AuditLogFilters
        value={filters}
        onChange={(next) => {
          setSkip(0);
          setFilters(next);
        }}
      />
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && <AuditLogTable logs={data?.items ?? []} />}
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
    </div>
  );
}
