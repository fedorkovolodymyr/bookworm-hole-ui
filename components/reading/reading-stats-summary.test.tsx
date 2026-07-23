import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { ReadingStatsSummary } from "./reading-stats-summary";

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

describe("ReadingStatsSummary", () => {
  it("shows stat tiles once loaded", async () => {
    server.use(
      http.get("/api/me/reading/stats", () =>
        HttpResponse.json({
          total_minutes: 120,
          total_sessions: 4,
          unique_books: 2,
          total_pages: 80,
        }),
      ),
    );
    renderWithProviders(<ReadingStatsSummary period="month" />);
    await waitFor(() => expect(screen.getByText("120")).toBeInTheDocument());
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows a distinct error state on a 500", async () => {
    server.use(http.get("/api/me/reading/stats", () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ReadingStatsSummary period="month" />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load stats right now.")).toBeInTheDocument(),
    );
  });
});
