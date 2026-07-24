"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CatalogImportForm } from "@/components/admin/catalog-import-form";
import { CatalogImportStatus } from "@/components/admin/catalog-import-status";
import { useCatalogImportStatus } from "@/hooks/useAdminCatalogImports";

export default function AdminCatalogImportsPage() {
  const t = useTranslations("admin.catalogImports");
  const [jobId, setJobId] = useState<string | undefined>();
  const { data } = useCatalogImportStatus(jobId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <CatalogImportForm onStarted={setJobId} />
      {data && <CatalogImportStatus status={data} />}
    </div>
  );
}
