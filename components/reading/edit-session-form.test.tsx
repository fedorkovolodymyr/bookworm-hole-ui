import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { EditSessionForm } from "./edit-session-form";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: "2026-07-22T10:00:00Z",
  position_start: 1,
  position_end: 20,
  position_unit: "page",
  pages_read: 19,
  notes: "Old note",
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T10:00:00Z",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("EditSessionForm", () => {
  it("pre-fills fields from the session and submits an update", async () => {
    const onSuccess = vi.fn();
    server.use(
      http.patch("/api/me/reading/sessions/s1", () =>
        HttpResponse.json({ ...session, notes: "New note" }),
      ),
    );
    renderWithProviders(<EditSessionForm session={session} onSuccess={onSuccess} />);
    expect(screen.getByDisplayValue("Old note")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Notes"));
    await userEvent.type(screen.getByLabelText("Notes"), "New note");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
