"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useThreadMessages, useSendMessage, useMarkThreadRead } from "@/hooks/useChat";
import { useMe } from "@/hooks/useMe";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const t = useTranslations("chat.thread");
  const router = useRouter();
  const { data: me } = useMe();

  const messages = useThreadMessages(threadId);
  const sendMessage = useSendMessage(threadId);
  const markRead = useMarkThreadRead();

  React.useEffect(() => {
    markRead.mutate(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  if (messages.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={() => router.push("/chat")}>
          {t("backToThreads")}
        </Button>
      </div>
    );
  }

  const allMessages = messages.data?.pages.flat() ?? [];
  const orderedOldestFirst = [...allMessages].reverse();

  return (
    <div className="flex h-full flex-col gap-4">
      {messages.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => messages.fetchNextPage()}
          disabled={messages.isFetchingNextPage}
        >
          {t("loadEarlier")}
        </Button>
      )}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {messages.isPending && <Skeleton className="h-40 w-full" />}
        {me &&
          orderedOldestFirst.map((message) => (
            <MessageBubble key={message.id} message={message} isOwn={message.sender_id === me.id} />
          ))}
      </div>
      <ChatComposer
        onSend={(body) => sendMessage.mutate({ body })}
        isSending={sendMessage.isPending}
      />
    </div>
  );
}
