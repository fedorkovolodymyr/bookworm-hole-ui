"use client";

import { useTranslations } from "next-intl";
import { useImportBook } from "@/hooks/useImportBook";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ExternalSearchHit } from "@/lib/api/types";

export function ImportBookDialog({ hit }: { hit: ExternalSearchHit }) {
  const t = useTranslations("catalog.external");
  const importBook = useImportBook();

  const isImportSupported = hit.source === "open_library" && hit.isbns.length > 0;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>{t("import")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hit.title}</DialogTitle>
        </DialogHeader>
        {!isImportSupported && (
          <p className="text-muted-foreground text-sm">{t("importUnsupportedForSource")}</p>
        )}
        {importBook.isSuccess && <p className="text-muted-foreground text-sm">{t("imported")}</p>}
        {importBook.isError && (
          <p className="text-destructive text-sm">{extractErrorMessage(importBook.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={!isImportSupported || importBook.isPending}
            onClick={() => importBook.mutate({ source: hit.source, source_id: hit.isbns[0] })}
          >
            {importBook.isPending ? t("importing") : t("import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
