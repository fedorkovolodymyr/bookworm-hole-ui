"use client";

import * as React from "react";
import { useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserProfileResponse } from "@/lib/api/types";

export function ProfileForm({ profile }: { profile: UserProfileResponse }) {
  const [displayName, setDisplayName] = React.useState(profile.display_name);
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const updateProfile = useUpdateProfile();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateProfile.mutate({ display_name: displayName, bio });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-display-name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-bio" className="text-sm font-medium">
          Bio
        </label>
        <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      {updateProfile.isSuccess && <p className="text-muted-foreground text-sm">Profile updated.</p>}
      <Button type="submit" disabled={updateProfile.isPending} className="self-start">
        {updateProfile.isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
