"use client";

import { useTranslations } from "next-intl";
import { useMe } from "@/hooks/useMe";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { DeleteAccountSection } from "@/components/profile/delete-account-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { data: profile, isPending } = useMe();

  if (isPending || !profile) {
    return <p className="text-muted-foreground">{t("loadingProfile")}</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("changePasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("dangerZoneTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountSection deletionScheduledAt={profile.deletion_scheduled_at} />
        </CardContent>
      </Card>
    </div>
  );
}
