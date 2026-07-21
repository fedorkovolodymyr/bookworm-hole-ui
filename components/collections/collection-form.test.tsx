// components/collections/collection-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { CollectionForm } from "./collection-form";
import enMessages from "@/messages/en.json";

function renderForm(props: Partial<React.ComponentProps<typeof CollectionForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <CollectionForm onSuccess={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("CollectionForm", () => {
  it("requires a name before submitting", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /create collection/i }));
    expect(screen.getByRole("button", { name: /create collection/i })).toBeDisabled();
  });

  it("submits a new collection and calls onSuccess", async () => {
    server.use(
      http.post("/api/collections", () => HttpResponse.json({ id: "c1", name: "Favorites" }, { status: 201 })),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSuccess });
    await user.type(screen.getByLabelText(/name/i), "Favorites");
    await user.click(screen.getByRole("button", { name: /create collection/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("pre-fills fields when editing an existing collection", () => {
    renderForm({
      collection: {
        id: "c1",
        user_id: "u1",
        name: "Favorites",
        description: "desc",
        is_public: true,
        cover_image_url: null,
        sort_order: 0,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    });
    expect(screen.getByDisplayValue("Favorites")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
