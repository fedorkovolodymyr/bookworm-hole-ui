import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { DeleteSessionDialog } from "./delete-session-dialog";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: null,
  position_start: null,
  position_end: null,
  position_unit: null,
  pages_read: null,
  notes: null,
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T09:00:00Z",
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

describe("DeleteSessionDialog", () => {
  it("deletes the session on confirm", async () => {
    server.use(
      http.delete("/api/me/reading/sessions/s1", () => new HttpResponse(null, { status: 204 })),
    );
    const onOpenChange = vi.fn();
    renderWithProviders(
      <DeleteSessionDialog session={session} open={true} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
