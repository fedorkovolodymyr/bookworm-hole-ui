"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatThreadWithLastMessageResponse, FriendResponse } from "@/lib/api/types";

export interface ThreadListItemProps {
  thread: ChatThreadWithLastMessageResponse;
  friend: FriendResponse | undefined;
  currentUserId: string;
  onClick: () => void;
}

export function ThreadListItem({ thread, friend, currentUserId, onClick }: ThreadListItemProps) {
  const t = useTranslations("chat.threadList");
  const isUnread =
    thread.last_message !== null &&
    thread.last_message.sender_id !== currentUserId &&
    thread.last_message.read_at === null;
  const displayName = friend?.display_name ?? thread.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex w-full items-center gap-3 rounded-md p-3 text-left"
    >
      <Avatar>
        {friend?.avatar_url && <AvatarImage src={friend.avatar_url} alt={displayName} />}
        <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{displayName}</p>
          {isUnread && (
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-label={t("unread")} />
          )}
        </div>
        <p className="text-muted-foreground truncate text-sm">
          {thread.last_message?.body ?? t("empty")}
        </p>
      </div>
    </button>
  );
}
