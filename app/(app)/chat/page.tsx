"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useThreads } from "@/hooks/useChat";
import { useFriends } from "@/hooks/useFriends";
import { useMe } from "@/hooks/useMe";
import { ThreadListItem } from "@/components/chat/thread-list-item";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatThreadsPage() {
  const t = useTranslations("chat");
  const router = useRouter();
  const { data: me } = useMe();
  const threads = useThreads();
  const friends = useFriends();

  function otherUserId(userAId: string, userBId: string, currentUserId: string) {
    return userAId === currentUserId ? userBId : userAId;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      {threads.isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {threads.isSuccess && threads.data.length === 0 && (
        <p className="text-muted-foreground">{t("threadList.empty")}</p>
      )}
      {threads.isSuccess && me && (
        <div className="flex flex-col gap-1">
          {threads.data.map((thread) => {
            const friendId = otherUserId(thread.user_a_id, thread.user_b_id, me.id);
            const friend = friends.data?.find((f) => f.user_id === friendId);
            return (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                friend={friend}
                currentUserId={me.id}
                onClick={() => router.push(`/chat/${thread.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
