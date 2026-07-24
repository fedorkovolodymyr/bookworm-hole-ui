import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CatalogImportStatus } from "./catalog-import-status";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("CatalogImportStatus", () => {
  it("renders the job id and status", () => {
    renderWithIntl(
      <CatalogImportStatus status={{ job_id: "job1", status: "pending" }} />,
    );
    expect(screen.getByText("job1")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders the result once populated", () => {
    renderWithIntl(
      <CatalogImportStatus
        status={{ job_id: "job1", status: "completed", result: { imported: 5 } }}
      />,
    );
    expect(screen.getByText(/"imported": 5/)).toBeInTheDocument();
  });
});
