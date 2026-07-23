"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FriendRequestResponse } from "@/lib/api/types";

export function FriendRequestCard({
  direction,
  requesterLabel,
  onAccept,
  onDecline,
}: {
  request: FriendRequestResponse;
  direction: "incoming" | "outgoing";
  requesterLabel: string;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const t = useTranslations("friends.requests");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{requesterLabel}</p>
        {direction === "incoming" ? (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAccept}>
              {t("acceptAction")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDecline}>
              {t("declineAction")}
            </Button>
          </div>
        ) : (
          <Badge variant="secondary">{t("pendingBadge")}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
