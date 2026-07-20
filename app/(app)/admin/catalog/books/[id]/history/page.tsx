"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useBookHistory, useBookVersion } from "@/hooks/useBooks";
import { VersionList } from "@/components/catalog/history/version-list";
import { VersionDiffViewer } from "@/components/catalog/history/version-diff-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBookHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: historyPage, isPending } = useBookHistory(id, { limit: 50 });
  const versions = historyPage?.items ?? [];
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const selectedIndex = versions.findIndex((v) => v.version_number === selected);
  const previousVersionNumber =
    selectedIndex >= 0 && selectedIndex + 1 < versions.length
      ? versions[selectedIndex + 1].version_number
      : undefined;

  const { data: afterVersion } = useBookVersion(id, selected);
  const { data: beforeVersion } = useBookVersion(id, previousVersionNumber);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Book history</h1>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/admin/catalog/books/${id}/edit`} />}
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
