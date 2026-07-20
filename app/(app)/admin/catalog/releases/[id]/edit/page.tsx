// app/(app)/admin/catalog/releases/[id]/edit/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useRelease } from "@/hooks/useReleases";
import { ReleaseForm } from "@/components/catalog/admin/release-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminReleaseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: release, isPending, isError, refetch } = useRelease(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !release) {
    return <p className="text-muted-foreground">Release not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit release</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/catalog/releases/${id}/history`} />}
          >
            History
          </Button>
        </div>
      </div>
      <ReleaseForm release={release} onSuccess={() => refetch()} />
    </div>
  );
}
