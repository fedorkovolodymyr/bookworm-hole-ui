"use client";

import { useTranslations } from "next-intl";
import { useMyContributions } from "@/hooks/useContributions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContributionStatus } from "@/lib/api/types";

export default function MyContributionsPage() {
  const t = useTranslations("catalog.myContributions");
  const { data, isPending } = useMyContributions({ limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && (data?.items.length ?? 0) === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}
      <div className="flex flex-col gap-3">
        {(data?.items ?? []).map((contribution) => (
          <Card key={contribution.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{contribution.kind}</CardTitle>
              <Badge variant="secondary">
                {t(`status.${contribution.status as ContributionStatus}`)}
              </Badge>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
