import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ContributionDiffViewer } from "./contribution-diff-viewer";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ContributionDiffViewer", () => {
  it("renders changed fields between current and proposed", () => {
    renderWithIntl(
      <ContributionDiffViewer
        diff={{
          proposed: { title: "New Title" },
          current: { title: "Old Title" },
          warnings: [],
        }}
      />,
    );
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("Old Title")).toBeInTheDocument();
    expect(screen.getByText("New Title")).toBeInTheDocument();
  });

  it("shows a no-current-record message when current is null", () => {
    renderWithIntl(
      <ContributionDiffViewer diff={{ proposed: { title: "New" }, current: null, warnings: [] }} />,
    );
    expect(screen.getByText("No existing record — this is a new entity.")).toBeInTheDocument();
  });

  it("renders warnings when present", () => {
    renderWithIntl(
      <ContributionDiffViewer
        diff={{ proposed: {}, current: null, warnings: ["Missing ISBN"] }}
      />,
    );
    expect(screen.getByText("Missing ISBN")).toBeInTheDocument();
  });
});
