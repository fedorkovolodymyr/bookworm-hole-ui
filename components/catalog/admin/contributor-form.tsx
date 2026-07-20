"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateContributor, useUpdateContributor } from "@/hooks/useContributorAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ContributorResponse } from "@/lib/api/types";

export function ContributorForm({
  contributor,
  onSuccess,
}: {
  contributor?: ContributorResponse;
  onSuccess: (contributor: ContributorResponse) => void;
}) {
  const t = useTranslations("catalogAdmin.contributor");
  const [fullName, setFullName] = React.useState(contributor?.full_name ?? "");
  const [sortName, setSortName] = React.useState(contributor?.sort_name ?? "");
  const [birthYear, setBirthYear] = React.useState(contributor?.birth_year?.toString() ?? "");
  const [deathYear, setDeathYear] = React.useState(contributor?.death_year?.toString() ?? "");
  const [bio, setBio] = React.useState(contributor?.bio ?? "");

  const createContributor = useCreateContributor();
  const updateContributor = useUpdateContributor(contributor?.id ?? "");
  const mutation = contributor ? updateContributor : createContributor;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        full_name: fullName,
        sort_name: sortName,
        birth_year: birthYear ? Number(birthYear) : null,
        death_year: deathYear ? Number(deathYear) : null,
        bio: bio || null,
      },
      { onSuccess: (result) => onSuccess(result) },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-full-name" className="text-sm font-medium">
          {t("fullNameLabel")}
        </label>
        <Input
          id="contributor-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-sort-name" className="text-sm font-medium">
          {t("sortNameLabel")}
        </label>
        <Input
          id="contributor-sort-name"
          value={sortName}
          onChange={(e) => setSortName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-birth-year" className="text-sm font-medium">
          {t("birthYearLabel")}
        </label>
        <Input
          id="contributor-birth-year"
          type="number"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-death-year" className="text-sm font-medium">
          {t("deathYearLabel")}
        </label>
        <Input
          id="contributor-death-year"
          type="number"
          value={deathYear}
          onChange={(e) => setDeathYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-bio" className="text-sm font-medium">
          {t("bioLabel")}
        </label>
        <Textarea id="contributor-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {contributor
          ? mutation.isPending
            ? t("saving")
            : t("editSubmit")
          : mutation.isPending
            ? t("creating")
            : t("createSubmit")}
      </Button>
    </form>
  );
}
