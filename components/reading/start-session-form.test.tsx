import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { StartSessionForm } from "./start-session-form";

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

describe("StartSessionForm", () => {
  it("starts a session for a preselected releaseId without showing a picker", async () => {
    const onSuccess = vi.fn();
    server.use(
      http.post("/api/me/reading/start", () =>
        HttpResponse.json({ id: "s1", release_id: "r1" }, { status: 201 }),
      ),
    );
    renderWithProviders(<StartSessionForm releaseId="r1" onSuccess={onSuccess} />);
    expect(screen.queryByText("Choose a book from your library")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("shows a form-level error when start fails", async () => {
    server.use(
      http.post("/api/me/reading/start", () =>
        HttpResponse.json({ detail: "Conflict" }, { status: 409 }),
      ),
    );
    renderWithProviders(<StartSessionForm releaseId="r1" onSuccess={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(screen.getByText("Conflict")).toBeInTheDocument());
  });
});
