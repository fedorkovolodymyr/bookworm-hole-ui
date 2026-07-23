"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { FriendResponse } from "@/lib/api/types";

export function FriendListItem({
  friend,
  onUnfriend,
  onBlock,
}: {
  friend: FriendResponse;
  onUnfriend: () => void;
  onBlock: () => void;
}) {
  const t = useTranslations("friends.list");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar>
            {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={friend.display_name} />}
            <AvatarFallback>{friend.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{friend.display_name}</p>
            <p className="text-muted-foreground text-xs">{friend.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onUnfriend}>
            {t("unfriendAction")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onBlock}>
            {t("blockAction")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
