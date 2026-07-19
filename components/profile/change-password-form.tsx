"use client";

import * as React from "react";
import { useChangePassword } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/lib/api/errors";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const changePassword = useChangePassword();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current-password" className="text-sm font-medium">
          Current password
        </label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      {changePassword.isSuccess && (
        <p className="text-muted-foreground text-sm">Password changed.</p>
      )}
      {changePassword.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(changePassword.error)}</p>
      )}
      <Button type="submit" disabled={changePassword.isPending} className="self-start">
        {changePassword.isPending ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}
