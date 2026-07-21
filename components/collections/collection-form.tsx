"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateCollection, useUpdateCollection } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { extractErrorMessage } from "@/lib/api/errors";
import type { CollectionResponse } from "@/lib/api/types";

export function CollectionForm({
  collection,
  onSuccess,
}: {
  collection?: CollectionResponse;
  onSuccess: () => void;
}) {
  const t = useTranslations("collections.form");
  const isEditing = Boolean(collection);
  const [name, setName] = React.useState(collection?.name ?? "");
  const [description, setDescription] = React.useState(collection?.description ?? "");
  const [isPublic, setIsPublic] = React.useState(collection?.is_public ?? false);
  const [coverImageUrl, setCoverImageUrl] = React.useState(collection?.cover_image_url ?? "");

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection(collection?.id ?? "");
  const mutation = isEditing ? updateCollection : createCollection;

  function handleSubmit() {
    const payload = {
      name,
      description: description || null,
      is_public: isPublic,
      cover_image_url: coverImageUrl || null,
    };
    mutation.mutate(payload as never, { onSuccess });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-name" className="text-sm font-medium">
          {t("nameLabel")}
        </label>
        <Input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-description" className="text-sm font-medium">
          {t("descriptionLabel")}
        </label>
        <Textarea
          id="collection-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-cover" className="text-sm font-medium">
          {t("coverImageLabel")}
        </label>
        <Input
          id="collection-cover"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
        {t("isPublicLabel")}
      </label>
      {mutation.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button disabled={!name.trim() || mutation.isPending} onClick={handleSubmit}>
        {mutation.isPending ? t("submitting") : isEditing ? t("submitEdit") : t("submitCreate")}
      </Button>
    </div>
  );
}
