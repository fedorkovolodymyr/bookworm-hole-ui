"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRegister } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/lib/api/errors";

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("auth.register");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const register = useRegister();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    register.mutate(
      { email, username, display_name: displayName, password },
      { onSuccess: () => onSuccess() },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-username" className="text-sm font-medium">
          {t("username")}
        </label>
        <Input
          id="register-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-display-name" className="text-sm font-medium">
          {t("displayName")}
        </label>
        <Input
          id="register-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {register.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(register.error)}</p>
      )}
      <Button type="submit" disabled={register.isPending}>
        {register.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
