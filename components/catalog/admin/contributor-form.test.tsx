import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ContributorForm } from "./contributor-form";
import enMessages from "@/messages/en.json";

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ContributorForm onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("ContributorForm", () => {
  it("creates a contributor on submit", async () => {
    server.use(
      http.post("/api/contributors", async ({ request }) => {
        const body = (await request.json()) as { full_name: string };
        return HttpResponse.json(
          { id: "new-c", full_name: body.full_name, sort_name: body.full_name, slug: "x" },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    const onSuccess = renderForm();
    await user.type(screen.getByLabelText("Full name"), "Frank Herbert");
    await user.type(screen.getByLabelText("Sort name"), "Herbert, Frank");
    await user.click(screen.getByRole("button", { name: "Create contributor" }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
