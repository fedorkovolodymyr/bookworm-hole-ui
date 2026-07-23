import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { ReadingStreakBadge } from "./reading-streak-badge";

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

describe("ReadingStreakBadge", () => {
  it("shows current and longest streak", async () => {
    server.use(
      http.get("/api/me/reading/streak", () =>
        HttpResponse.json({ current_streak_days: 3, longest_streak_days: 7 }),
      ),
    );
    renderWithProviders(<ReadingStreakBadge />);
    await waitFor(() => expect(screen.getByText("3 days")).toBeInTheDocument());
    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("shows a distinct error state on a 500", async () => {
    server.use(http.get("/api/me/reading/streak", () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ReadingStreakBadge />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load streak right now.")).toBeInTheDocument(),
    );
  });
});
