"use client";

import { useTranslations } from "next-intl";
import type { CatalogImportJobStatusResponse } from "@/lib/api/types";

export function CatalogImportStatus({
  status,
}: {
  status: CatalogImportJobStatusResponse;
}) {
  const t = useTranslations("admin.catalogImports");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        <span className="text-muted-foreground">{t("jobId")}: </span>
        <span className="font-mono">{status.job_id}</span>
      </p>
      <p>
        <span className="text-muted-foreground">{t("statusLabel")}: </span>
        {status.status}
      </p>
      {status.result != null && (
        <div>
          <p className="text-muted-foreground">{t("result")}:</p>
          <pre className="bg-muted rounded-md p-3 text-xs">
            {JSON.stringify(status.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
