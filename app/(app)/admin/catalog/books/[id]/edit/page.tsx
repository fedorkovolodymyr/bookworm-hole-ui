// app/(app)/admin/catalog/books/[id]/edit/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBook } from "@/hooks/useBooks";
import { BookForm } from "@/components/catalog/admin/book-form";
import { ReleaseForm } from "@/components/catalog/admin/release-form";
import { MergeBooksDialog } from "@/components/catalog/admin/merge-books-dialog";
import { AttachContributorDialog } from "@/components/catalog/admin/attach-contributor-dialog";
import { ReleaseCard } from "@/components/catalog/release-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminBookEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalogAdmin.pages");
  const [addReleaseOpen, setAddReleaseOpen] = useState(false);
  const { data: book, isPending, isError, refetch } = useBook(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !book) {
    return <p className="text-muted-foreground">Book not found.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("editBook")}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href="/admin/catalog/books" />}>
            {t("backToList")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/catalog/books/${id}/history`} />}
          >
            History
          </Button>
        </div>
      </div>
      <BookForm book={book} onSuccess={() => refetch()} />
      <div className="flex items-center gap-2">
        <MergeBooksDialog
          sourceBookId={book.id}
          sourceBookTitle={book.title}
          onSuccess={() => refetch()}
        />
        <AttachContributorDialog bookId={book.id} onSuccess={() => refetch()} />
      </div>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Editions</h2>
          <Dialog open={addReleaseOpen} onOpenChange={setAddReleaseOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              {t("addRelease")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addRelease")}</DialogTitle>
              </DialogHeader>
              <ReleaseForm
                bookId={book.id}
                onSuccess={() => {
                  setAddReleaseOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {book.releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </section>
    </div>
  );
}
