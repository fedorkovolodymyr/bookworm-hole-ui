"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFriendCollections, useFriendLibrary } from "@/hooks/useFriendContent";
import { useFriends } from "@/hooks/useFriends";
import { useStartThread } from "@/hooks/useChat";
import { ChatFriendRequiredError } from "@/lib/api/chat";
import { CollectionCard } from "@/components/collections/collection-card";
import { StatusListItem } from "@/components/statuses/status-list-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UnfriendDialog } from "@/components/friends/unfriend-dialog";
import { BlockUserDialog } from "@/components/friends/block-user-dialog";

export default function FriendShelfPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const t = useTranslations("collections");
  const statusesT = useTranslations("statuses");
  const commonT = useTranslations("common");
  const friendsT = useTranslations("friends.profile.friendActions");
  const chatT = useTranslations("chat");

  const friends = useFriends();
  const friend = friends.data?.find((f) => f.user_id === userId);

  const [unfriendOpen, setUnfriendOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [messageError, setMessageError] = React.useState<string | null>(null);
  const startThread = useStartThread();

  function handleMessage() {
    setMessageError(null);
    startThread.mutate(userId, {
      onSuccess: (thread) => router.push(`/chat/${thread.id}`),
      onError: (error) => {
        if (error instanceof ChatFriendRequiredError) {
          setMessageError(chatT("friendRequiredError"));
        }
      },
    });
  }

  const {
    data: collectionsPage,
    isPending: collectionsPending,
    isError: collectionsError,
  } = useFriendCollections(userId);
  const {
    data: libraryPage,
    isPending: libraryPending,
    isError: libraryError,
  } = useFriendLibrary(userId);

  return (
    <div className="flex flex-col gap-8">
      {friend && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar>
                {friend.avatar_url && (
                  <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
                )}
                <AvatarFallback>{friend.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <p className="text-lg font-medium">{friend.display_name}</p>
                <p className="text-muted-foreground text-sm">{friend.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMessage}
                disabled={startThread.isPending}
              >
                {chatT("messageButton")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUnfriendOpen(true)}>
                {friendsT("unfriend")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBlockOpen(true)}>
                {friendsT("block")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {messageError && <p className="text-destructive text-sm">{messageError}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("pageTitle")}</h2>
        {collectionsPending && <Skeleton className="h-40 w-full" />}
        {collectionsError && <p className="text-muted-foreground">{commonT("notAvailable")}</p>}
        {!collectionsPending && !collectionsError && collectionsPage?.items.length === 0 && (
          <p className="text-muted-foreground">{t("empty")}</p>
        )}
        {!collectionsPending &&
          !collectionsError &&
          collectionsPage &&
          collectionsPage.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collectionsPage.items.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{statusesT("tabs.library")}</h2>
        {libraryPending && <Skeleton className="h-40 w-full" />}
        {libraryError && <p className="text-muted-foreground">{commonT("notAvailable")}</p>}
        {!libraryPending && !libraryError && libraryPage?.items.length === 0 && (
          <p className="text-muted-foreground">{statusesT("empty")}</p>
        )}
        {!libraryPending && !libraryError && libraryPage && libraryPage.items.length > 0 && (
          <div className="flex flex-col gap-2">
            {libraryPage.items.map((status) => (
              <StatusListItem
                key={status.id}
                status={status}
                onChangeStatus={() => {}}
                onLend={() => {}}
                onReturn={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      <UnfriendDialog userId={userId} open={unfriendOpen} onOpenChange={setUnfriendOpen} />
      <BlockUserDialog userId={userId} open={blockOpen} onOpenChange={setBlockOpen} />
    </div>
  );
}
