"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useContributorHistory, useContributorVersion } from "@/hooks/useContributors";
import { VersionList } from "@/components/catalog/history/version-list";
import { VersionDiffViewer } from "@/components/catalog/history/version-diff-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminContributorHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: historyPage, isPending } = useContributorHistory(id, { limit: 50 });
  const versions = historyPage?.items ?? [];
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const selectedIndex = versions.findIndex((v) => v.version_number === selected);
  const previousVersionNumber =
    selectedIndex >= 0 && selectedIndex + 1 < versions.length
      ? versions[selectedIndex + 1].version_number
      : undefined;

  const { data: afterVersion } = useContributorVersion(id, selected);
  const { data: beforeVersion } = useContributorVersion(id, previousVersionNumber);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contributor history</h1>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/admin/catalog/contributors/${id}/edit`} />}
        >
          Back to edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <VersionList versions={versions} selectedVersion={selected} onSelect={setSelected} />
        )}
        {afterVersion && <VersionDiffViewer before={beforeVersion} after={afterVersion} />}
      </div>
    </div>
  );
}
