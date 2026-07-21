"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useFriendCollections, useFriendLibrary } from "@/hooks/useFriendContent";
import { CollectionCard } from "@/components/collections/collection-card";
import { StatusListItem } from "@/components/statuses/status-list-item";
import { Skeleton } from "@/components/ui/skeleton";

export default function FriendShelfPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const t = useTranslations("collections");
  const statusesT = useTranslations("statuses");
  const commonT = useTranslations("common");
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
    </div>
  );
}
