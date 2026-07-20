import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { VersionDiffViewer } from "./version-diff-viewer";
import enMessages from "@/messages/en.json";
import type { EntityVersionDetailResponse } from "@/lib/api/types";

const before: EntityVersionDetailResponse = {
  id: "v1",
  entity_type: "book",
  entity_id: "b1",
  version_number: 1,
  changed_by_user_id: null,
  change_source: "system",
  contribution_id: null,
  created_at: "2020-01-01T00:00:00Z",
  snapshot: { title: "Dune", description: "Old description" },
};

const after: EntityVersionDetailResponse = {
  ...before,
  id: "v2",
  version_number: 2,
  snapshot: { title: "Dune", description: "New description", first_publication_year: 1965 },
};

describe("VersionDiffViewer", () => {
  it("shows changed fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("Old description")).toBeInTheDocument();
    expect(screen.getByText("New description")).toBeInTheDocument();
  });

  it("shows added fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("first_publication_year")).toBeInTheDocument();
  });

  it("does not show unchanged fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(/^title$/)).not.toBeInTheDocument();
  });

  it("shows a no-diff message when identical", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={before} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No differences between these versions.")).toBeInTheDocument();
  });

  it("treats all fields as added when there is no before version", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
