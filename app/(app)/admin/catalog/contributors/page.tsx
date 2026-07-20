// app/(app)/admin/catalog/contributors/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useContributorList } from "@/hooks/useContributors";
import { ContributorForm } from "@/components/catalog/admin/contributor-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminContributorsPage() {
  const t = useTranslations("catalogAdmin.pages");
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isPending } = useContributorList({ limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage contributors</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>New contributor</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New contributor</DialogTitle>
            </DialogHeader>
            <ContributorForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {!isPending && (
        <div className="flex flex-col gap-3">
          {(data?.items ?? []).map((contributor) => (
            <Card key={contributor.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{contributor.full_name}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/admin/catalog/contributors/${contributor.id}/edit`} />}
                >
                  {t("edit")}
                </Button>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
