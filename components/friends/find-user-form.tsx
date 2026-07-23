"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePublicProfile } from "@/hooks/useUserProfile";
import { useSendFriendRequest } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicProfileCard } from "./public-profile-card";
import { extractErrorMessage } from "@/lib/api/errors";

export function FindUserForm() {
  const t = useTranslations("friends.findForm");
  const [username, setUsername] = React.useState("");
  const [submittedUsername, setSubmittedUsername] = React.useState<string | undefined>(undefined);

  const profile = usePublicProfile(submittedUsername);
  const sendRequest = useSendFriendRequest();

  const notFound =
    profile.isError &&
    (profile.error as { response?: { status?: number } })?.response?.status === 404;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendRequest.reset();
    setSubmittedUsername(username);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="find-username" className="text-sm font-medium">
          {t("label")}
        </label>
        <Input
          id="find-username"
          placeholder={t("placeholder")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={profile.isFetching || !username}>
        {profile.isFetching ? t("submitting") : t("submit")}
      </Button>
      {notFound && <p className="text-muted-foreground text-sm">{t("notFound")}</p>}
      {profile.isSuccess && profile.data && (
        <PublicProfileCard
          profile={profile.data}
          action={
            sendRequest.isSuccess ? (
              <p className="text-muted-foreground text-sm">{t("requestSent")}</p>
            ) : (
              <Button
                size="sm"
                disabled={sendRequest.isPending}
                onClick={() => sendRequest.mutate({ username: profile.data.username })}
              >
                {t("sendRequestAction")}
              </Button>
            )
          }
        />
      )}
      {sendRequest.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(sendRequest.error)}</p>
      )}
    </form>
  );
}
