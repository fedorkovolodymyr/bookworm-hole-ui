// components/admin/catalog-import-form.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStartCatalogImport } from "@/hooks/useAdminCatalogImports";
import type { CatalogImportProfile } from "@/lib/api/types";

const PROFILES: CatalogImportProfile[] = ["books", "comics", "manga"];

export function CatalogImportForm({ onStarted }: { onStarted: (jobId: string) => void }) {
  const t = useTranslations("admin.catalogImports");
  const [profile, setProfile] = useState<CatalogImportProfile>("books");
  const startImport = useStartCatalogImport();

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="import-profile" className="text-sm font-medium">
          {t("profileLabel")}
        </label>
        <Select value={profile} onValueChange={(next) => setProfile(next as CatalogImportProfile)}>
          <SelectTrigger id="import-profile">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROFILES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`profile${p[0].toUpperCase()}${p.slice(1)}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        disabled={startImport.isPending}
        onClick={() =>
          startImport.mutate({ profile }, { onSuccess: (status) => onStarted(status.job_id) })
        }
      >
        {startImport.isPending ? t("starting") : t("start")}
      </Button>
    </div>
  );
}
