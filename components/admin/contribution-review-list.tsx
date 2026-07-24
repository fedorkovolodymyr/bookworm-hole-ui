"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useClaimContribution } from "@/hooks/useAdminContributions";
import type { AdminContributionResponse, ContributionStatus } from "@/lib/api/types";

export function ContributionReviewList({
  contributions,
  onSelect,
}: {
  contributions: AdminContributionResponse[];
  onSelect: (contributionId: string) => void;
}) {
  const t = useTranslations("admin.contributions");
  const claim = useClaimContribution();

  if (contributions.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {contributions.map((contribution) => (
        <Card key={contribution.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{contribution.kind}</CardTitle>
            <Badge variant="secondary">
              {t(`status.${contribution.status as ContributionStatus}`)}
            </Badge>
          </CardHeader>
          <CardContent>
            {contribution.warnings.length > 0 && (
              <p className="text-destructive text-xs">{contribution.warnings.join(", ")}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {!contribution.reviewer_id && (
              <Button
                variant="outline"
                size="sm"
                disabled={claim.isPending}
                onClick={() => claim.mutate(contribution.id)}
              >
                {t("claim")}
              </Button>
            )}
            <Button size="sm" onClick={() => onSelect(contribution.id)}>
              {t("viewDiff")}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
