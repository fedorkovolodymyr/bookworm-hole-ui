import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { BlockUserDialog } from "./block-user-dialog";

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

describe("BlockUserDialog", () => {
  it("blocks the user on confirm and closes", async () => {
    const onOpenChange = vi.fn();
    server.use(
      http.post("/api/friends/u1/block", () =>
        HttpResponse.json({ id: "f1", status: "blocked" }, { status: 201 }),
      ),
    );
    renderWithProviders(<BlockUserDialog userId="u1" open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Block" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
