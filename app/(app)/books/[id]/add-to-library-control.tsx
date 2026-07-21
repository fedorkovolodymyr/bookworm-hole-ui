"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStatus } from "@/hooks/useStatuses";
import type { BookStatusKind } from "@/lib/api/types";

const LIBRARY_STATUS_KINDS: BookStatusKind[] = ["owned", "wishlist", "pre_order"];

export function AddToLibraryControl({ bookId }: { bookId: string }) {
  const t = useTranslations("statuses");
  const createStatus = useCreateStatus();

  return (
    <Select
      onValueChange={(value) => createStatus.mutate({ book_id: bookId, status: value as BookStatusKind })}
    >
      <SelectTrigger aria-label={t("pageTitle")}>
        <SelectValue placeholder={t("pageTitle")} />
      </SelectTrigger>
      <SelectContent>
        {LIBRARY_STATUS_KINDS.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {t(`kind.${kind}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
