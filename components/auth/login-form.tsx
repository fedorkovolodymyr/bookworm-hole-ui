"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLogin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/lib/api/errors";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("auth.login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const login = useLogin();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => onSuccess(),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {login.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(login.error)}</p>
      )}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
