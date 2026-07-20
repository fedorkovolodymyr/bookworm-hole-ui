import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { SuggestEditDialog } from "./suggest-edit-dialog";
import enMessages from "@/messages/en.json";

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <SuggestEditDialog
          kind="new_book"
          buildPayload={() => ({ title: "Dune", description: "A sci-fi epic." })}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("SuggestEditDialog", () => {
  it("creates and submits a contribution with the edited title, not the seed value", async () => {
    let capturedBody: { payload?: { title?: string; description?: string } } | undefined;
    server.use(
      http.post("/api/contributions", async ({ request }) => {
        capturedBody = (await request.json()) as typeof capturedBody;
        return HttpResponse.json(
          {
            id: "c1",
            user_id: "u1",
            kind: "new_book",
            target_id: null,
            payload: {},
            status: "draft",
            reviewer_id: null,
            review_notes: null,
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2020-01-01T00:00:00Z",
          },
          { status: 201 },
        );
      }),
      http.post("/api/contributions/:id/submit", ({ params }) => {
        return HttpResponse.json({
          id: params.id,
          user_id: "u1",
          kind: "new_book",
          target_id: null,
          payload: {},
          status: "submitted",
          reviewer_id: null,
          review_notes: null,
          created_at: "2020-01-01T00:00:00Z",
          updated_at: "2020-01-01T00:00:00Z",
        });
      }),
    );

    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Suggest an edit" }));

    const titleInput = screen.getByLabelText("Title");
    expect(titleInput).toHaveValue("Dune");
    await user.clear(titleInput);
    await user.type(titleInput, "Dune Messiah");

    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(screen.getByText("Submitted for review.")).toBeInTheDocument());

    expect(capturedBody?.payload?.title).toBe("Dune Messiah");
    expect(capturedBody?.payload?.description).toBe("A sci-fi epic.");
  });
});
