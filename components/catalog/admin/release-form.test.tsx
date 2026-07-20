import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ReleaseForm } from "./release-form";
import enMessages from "@/messages/en.json";

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReleaseForm bookId="b1" onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("ReleaseForm", () => {
  it("creates a release on submit", async () => {
    server.use(
      http.post("/api/releases", async ({ request }) => {
        const body = (await request.json()) as { publisher: string };
        return HttpResponse.json(
          {
            id: "new-release",
            publisher: body.publisher,
            format: "hardcover",
            isbns: [],
            average_rating: null,
            rating_count: 0,
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    const onSuccess = renderForm();
    await user.type(screen.getByLabelText("Publisher"), "Ace Books");
    await user.type(screen.getByLabelText("Language"), "en");
    await user.click(screen.getByRole("button", { name: "Create release" }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
