// components/statuses/lend-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { LendDialog } from "./lend-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof LendDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <LendDialog statusId="s1" open={true} onOpenChange={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("LendDialog", () => {
  it("lends to a free-text name and calls onOpenChange(false) on success", async () => {
    server.use(
      http.post("/api/me/statuses/:id/lend", () =>
        HttpResponse.json({ id: "s1", status: "lent_out", lent_to_name: "Alex" }),
      ),
    );
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });
    await user.type(screen.getByLabelText(/or a name/i), "Alex");
    await user.click(screen.getByRole("button", { name: /^lend$/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
