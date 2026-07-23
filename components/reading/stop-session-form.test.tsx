import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { StopSessionForm } from "./stop-session-form";

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

describe("StopSessionForm", () => {
  it("stops a session", async () => {
    const onSuccess = vi.fn();
    server.use(
      http.post("/api/me/reading/stop", () =>
        HttpResponse.json({ id: "s1", ended_at: "2026-07-22T10:00:00Z" }),
      ),
    );
    renderWithProviders(<StopSessionForm releaseId="r1" onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
