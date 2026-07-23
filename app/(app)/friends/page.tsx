"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
} from "@/hooks/useFriends";
import { FriendListItem } from "@/components/friends/friend-list-item";
import { FriendRequestCard } from "@/components/friends/friend-request-card";
import { FindUserForm } from "@/components/friends/find-user-form";
import { UnfriendDialog } from "@/components/friends/unfriend-dialog";
import { BlockUserDialog } from "@/components/friends/block-user-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function FriendsPage() {
  const t = useTranslations("friends");
  const tRequests = useTranslations("friends.requests");
  const tList = useTranslations("friends.list");

  const friends = useFriends();
  const incoming = useIncomingRequests();
  const outgoing = useOutgoingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  const [unfriendTarget, setUnfriendTarget] = React.useState<string | null>(null);
  const [blockTarget, setBlockTarget] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">{t("tabs.friends")}</TabsTrigger>
          <TabsTrigger value="requests">{t("tabs.requests")}</TabsTrigger>
          <TabsTrigger value="findPeople">{t("tabs.findPeople")}</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          {friends.isPending && <Skeleton className="h-40 w-full" />}
          {!friends.isPending && friends.data?.length === 0 && (
            <p className="text-muted-foreground">{tList("empty")}</p>
          )}
          <div className="flex flex-col gap-2">
            {friends.data?.map((friend) => (
              <div key={friend.user_id} className="flex flex-col gap-1">
                <FriendListItem
                  friend={friend}
                  onUnfriend={() => setUnfriendTarget(friend.user_id)}
                  onBlock={() => setBlockTarget(friend.user_id)}
                />
                <Link
                  href={`/friends/${friend.user_id}`}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  {tList("viewProfile")}
                </Link>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">{tRequests("incomingTitle")}</h2>
              {incoming.isPending && <Skeleton className="h-24 w-full" />}
              {!incoming.isPending && incoming.data?.length === 0 && (
                <p className="text-muted-foreground text-sm">{tRequests("incomingEmpty")}</p>
              )}
              {incoming.data?.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  direction="incoming"
                  requesterLabel={request.requester_id.slice(0, 8)}
                  onAccept={() => acceptRequest.mutate(request.id)}
                  onDecline={() => declineRequest.mutate(request.id)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">{tRequests("outgoingTitle")}</h2>
              {outgoing.isPending && <Skeleton className="h-24 w-full" />}
              {!outgoing.isPending && outgoing.data?.length === 0 && (
                <p className="text-muted-foreground text-sm">{tRequests("outgoingEmpty")}</p>
              )}
              {outgoing.data?.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  direction="outgoing"
                  requesterLabel={request.addressee_id.slice(0, 8)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="findPeople">
          <FindUserForm />
        </TabsContent>
      </Tabs>

      {unfriendTarget && (
        <UnfriendDialog
          userId={unfriendTarget}
          open={Boolean(unfriendTarget)}
          onOpenChange={(open) => !open && setUnfriendTarget(null)}
        />
      )}
      {blockTarget && (
        <BlockUserDialog
          userId={blockTarget}
          open={Boolean(blockTarget)}
          onOpenChange={(open) => !open && setBlockTarget(null)}
        />
      )}
    </div>
  );
}
