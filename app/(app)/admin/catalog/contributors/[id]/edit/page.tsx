// app/(app)/admin/catalog/contributors/[id]/edit/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useContributor } from "@/hooks/useContributors";
import { ContributorForm } from "@/components/catalog/admin/contributor-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminContributorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalogAdmin.pages");
  const { data: contributor, isPending, isError, refetch } = useContributor(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !contributor) {
    return <p className="text-muted-foreground">Contributor not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit contributor</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/catalog/contributors" />}
          >
            {t("backToList")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/admin/catalog/contributors/${id}/history`} />}
          >
            History
          </Button>
        </div>
      </div>
      <ContributorForm contributor={contributor} onSuccess={() => refetch()} />
    </div>
  );
}
