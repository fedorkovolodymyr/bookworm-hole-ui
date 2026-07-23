import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { UnfriendDialog } from "./unfriend-dialog";

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

describe("UnfriendDialog", () => {
  it("removes the friend on confirm and closes", async () => {
    const onOpenChange = vi.fn();
    server.use(http.delete("/api/friends/u1", () => new HttpResponse(null, { status: 204 })));
    renderWithProviders(<UnfriendDialog userId="u1" open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Unfriend" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
