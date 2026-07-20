"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ChangeSource, EntityVersionResponse } from "@/lib/api/types";

export function VersionList({
  versions,
  selectedVersion,
  onSelect,
}: {
  versions: EntityVersionResponse[];
  selectedVersion?: number;
  onSelect: (version: number) => void;
}) {
  const t = useTranslations("history");

  if (versions.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {versions.map((version) => (
        <li key={version.id}>
          <Button
            variant={version.version_number === selectedVersion ? "secondary" : "ghost"}
            className="w-full justify-between"
            onClick={() => onSelect(version.version_number)}
          >
            <span>{t("versionLabel", { version: version.version_number })}</span>
            <span className="text-muted-foreground text-xs">
              {t(`changeSource.${version.change_source as ChangeSource}`)}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
