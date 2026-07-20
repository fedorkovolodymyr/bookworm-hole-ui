"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useExternalSearch } from "@/hooks/useExternalSearch";
import { useMe } from "@/hooks/useMe";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportBookDialog } from "@/components/catalog/admin/import-book-dialog";

export default function ExternalSearchPage() {
  const t = useTranslations("catalog.external");
  const [query, setQuery] = React.useState("");
  const { data: me } = useMe();
  const { data, isPending } = useExternalSearch(query);

  const failedSources = data ? Object.keys(data.partial_failures) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Input
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {failedSources.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {t("partialFailureNotice", { sources: failedSources.join(", ") })}
        </p>
      )}
      {!isPending && data && data.hits.length === 0 && query.trim() && (
        <p className="text-muted-foreground text-sm">{t("noResults")}</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.hits ?? []).map((hit, index) => (
          <Card key={`${hit.source}-${hit.isbns[0] ?? index}`}>
            <CardHeader>
              <CardTitle className="line-clamp-2 text-base">{hit.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-muted-foreground text-sm">{hit.authors.join(", ")}</p>
              {me?.is_admin && <ImportBookDialog hit={hit} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
