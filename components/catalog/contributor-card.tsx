"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorResponse } from "@/lib/api/types";

export function ContributorCard({ contributor }: { contributor: ContributorResponse }) {
  const t = useTranslations("catalog.contributor");

  return (
    <Link href={`/contributors/${contributor.id}`}>
      <Card className="hover:border-foreground/30 h-full transition-colors">
        <CardHeader>
          <CardTitle>{contributor.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {contributor.bio || t("noBio")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
