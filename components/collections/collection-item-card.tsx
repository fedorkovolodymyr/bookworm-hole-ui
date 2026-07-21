"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUpIcon, ChevronDownIcon, XIcon } from "lucide-react";
import type { CollectionItemResponse } from "@/lib/api/types";

export function CollectionItemCard({
  item,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  item: CollectionItemResponse;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("collections.detail");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{item.book_id ?? item.release_id}</p>
          {item.note && <p className="text-muted-foreground text-sm">{item.note}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" disabled={isFirst} onClick={onMoveUp} aria-label={t("moveUp")}>
            <ChevronUpIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={isLast} onClick={onMoveDown} aria-label={t("moveDown")}>
            <ChevronDownIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("removeItem")}>
            <XIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
