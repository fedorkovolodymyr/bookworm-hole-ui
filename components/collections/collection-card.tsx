"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollectionResponse } from "@/lib/api/types";

export function CollectionCard({ collection }: { collection: CollectionResponse }) {
  const t = useTranslations("collections.card");
  return (
    <Link href={`/collections/${collection.id}`}>
      <Card className="hover:border-foreground/30 h-full transition-colors">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="line-clamp-2">{collection.name}</CardTitle>
          {collection.is_public && <Badge variant="secondary">{t("publicBadge")}</Badge>}
        </CardHeader>
        {collection.description && (
          <CardContent>
            <p className="text-muted-foreground line-clamp-3 text-sm">{collection.description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
