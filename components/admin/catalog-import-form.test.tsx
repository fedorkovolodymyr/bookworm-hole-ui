// components/admin/catalog-import-form.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CatalogImportForm } from "./catalog-import-form";
import * as useAdminCatalogImportsHooks from "@/hooks/useAdminCatalogImports";

vi.mock("@/hooks/useAdminCatalogImports");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("CatalogImportForm", () => {
  beforeEach(() => {
    vi.mocked(useAdminCatalogImportsHooks.useStartCatalogImport).mockReturnValue({
      mutate: vi.fn((_payload, opts) => opts?.onSuccess?.({ job_id: "job1", status: "pending" })),
      isPending: false,
    } as never);
  });

  it("starts an import with the default profile and reports the job id", () => {
    const onStarted = vi.fn();
    renderWithIntl(<CatalogImportForm onStarted={onStarted} />);

    fireEvent.click(screen.getByRole("button", { name: "Start import" }));

    expect(onStarted).toHaveBeenCalledWith("job1");
  });
});
