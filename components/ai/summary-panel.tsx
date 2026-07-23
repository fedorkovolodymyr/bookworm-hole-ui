"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSummary } from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function SummaryPanel() {
  const t = useTranslations("ai.summary");
  const tAi = useTranslations("ai");
  const [text, setText] = React.useState("");
  const summary = useSummary();

  const isUnavailable = summary.error instanceof AiFeatureUnavailableError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("inputLabel")}
        />
        <Button
          onClick={() => summary.mutate({ text })}
          disabled={!text.trim() || summary.isPending || isUnavailable}
        >
          {summary.isPending ? t("submitting") : t("submit")}
        </Button>
        {isUnavailable && <p className="text-muted-foreground text-sm">{tAi("comingSoon")}</p>}
        {summary.isSuccess && <p className="text-sm">{summary.data.summary}</p>}
      </CardContent>
    </Card>
  );
}
