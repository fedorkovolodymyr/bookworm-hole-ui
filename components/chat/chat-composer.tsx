"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface ChatComposerProps {
  onSend: (body: string) => void;
  isSending: boolean;
}

export function ChatComposer({ onSend, isSending }: ChatComposerProps) {
  const t = useTranslations("chat.thread");
  const [value, setValue] = React.useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("placeholder")}
        className="min-h-10 flex-1 resize-none"
        disabled={isSending}
      />
      <Button type="submit" disabled={isSending || !value.trim()}>
        {isSending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
