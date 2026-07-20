import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { VersionList } from "./version-list";
import enMessages from "@/messages/en.json";
import type { EntityVersionResponse } from "@/lib/api/types";

const versions: EntityVersionResponse[] = [
  {
    id: "v2",
    entity_type: "book",
    entity_id: "b1",
    version_number: 2,
    changed_by_user_id: "u1",
    change_source: "admin",
    contribution_id: null,
    created_at: "2020-02-01T00:00:00Z",
  },
  {
    id: "v1",
    entity_type: "book",
    entity_id: "b1",
    version_number: 1,
    changed_by_user_id: null,
    change_source: "system",
    contribution_id: null,
    created_at: "2020-01-01T00:00:00Z",
  },
];

describe("VersionList", () => {
  it("renders each version with its change source", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionList versions={versions} onSelect={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(screen.getByText("Admin edit")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls onSelect when a version is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionList versions={versions} onSelect={onSelect} />
      </NextIntlClientProvider>,
    );
    await user.click(screen.getByText("Version 2"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("shows an empty state with no versions", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionList versions={[]} onSelect={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No version history yet.")).toBeInTheDocument();
  });
});
