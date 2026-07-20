// app/(app)/admin/catalog/books/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBookList } from "@/hooks/useBooks";
import { useDeleteBook } from "@/hooks/useBookAdmin";
import { BookForm } from "@/components/catalog/admin/book-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminBooksPage() {
  const t = useTranslations("catalogAdmin.pages");
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isPending } = useBookList({ limit: 50 });
  const deleteBook = useDeleteBook();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("manageBooks")}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>{t("newBook")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newBook")}</DialogTitle>
            </DialogHeader>
            <BookForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {!isPending && (
        <div className="flex flex-col gap-3">
          {(data?.items ?? []).map((book) => (
            <Card key={book.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{book.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/admin/catalog/books/${book.id}/edit`} />}
                  >
                    {t("edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(t("confirmDelete"))) {
                        deleteBook.mutate(book.id);
                      }
                    }}
                  >
                    {t("deleteBook")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
