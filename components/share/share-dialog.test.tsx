import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ShareDialog } from "./share-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof ShareDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ShareDialog kind="book" targetId="b1" {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ShareDialog", () => {
  it("shares a book with a friend and message", async () => {
    server.use(http.post("/api/share/book/:id", () => HttpResponse.json({ id: "m1", thread_id: "t1" })));
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /^share$/i }));
    await user.type(screen.getByLabelText(/friend's user id/i), "f1");
    await user.type(screen.getByLabelText(/message/i), "check this out");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shares a collection when kind is collection", async () => {
    server.use(http.post("/api/share/collection/:id", () => HttpResponse.json({ id: "m1", thread_id: "t1" })));
    const user = userEvent.setup();
    renderDialog({ kind: "collection", targetId: "c1" });
    await user.click(screen.getByRole("button", { name: /^share$/i }));
    await user.type(screen.getByLabelText(/friend's user id/i), "f1");
    await user.type(screen.getByLabelText(/message/i), "check this out");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
