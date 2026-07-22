// components/statuses/return-confirm-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ReturnConfirmDialog } from "./return-confirm-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof ReturnConfirmDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReturnConfirmDialog statusId="s1" open={true} onOpenChange={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReturnConfirmDialog", () => {
  it("confirms the return and calls onOpenChange(false) on success", async () => {
    server.use(
      http.post("/api/me/statuses/:id/return", () =>
        HttpResponse.json({ id: "s1", status: "owned" }),
      ),
    );
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });
    await user.click(screen.getByRole("button", { name: /mark returned/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
