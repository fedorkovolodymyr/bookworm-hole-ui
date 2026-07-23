import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { ReadingTimelineChart } from "./reading-timeline-chart";

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

describe("ReadingTimelineChart", () => {
  it("shows the empty state when every day has zero minutes", async () => {
    server.use(
      http.get("/api/me/reading/timeline", () =>
        HttpResponse.json({
          items: [{ date: "2026-07-01", total_minutes: 0, sessions: 0, pages_read: 0 }],
        }),
      ),
    );
    renderWithProviders(<ReadingTimelineChart fromDate="2026-07-01" toDate="2026-07-01" />);
    await waitFor(() =>
      expect(screen.getByText("No reading activity in this range yet.")).toBeInTheDocument(),
    );
  });

  it("renders one bar per day when there is activity", async () => {
    server.use(
      http.get("/api/me/reading/timeline", () =>
        HttpResponse.json({
          items: [
            { date: "2026-07-01", total_minutes: 30, sessions: 1, pages_read: 5 },
            { date: "2026-07-02", total_minutes: 0, sessions: 0, pages_read: 0 },
          ],
        }),
      ),
    );
    renderWithProviders(<ReadingTimelineChart fromDate="2026-07-01" toDate="2026-07-02" />);
    await waitFor(() => expect(screen.getAllByTestId("timeline-day")).toHaveLength(2));
  });

  it("shows a distinct error state on a 500", async () => {
    server.use(http.get("/api/me/reading/timeline", () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ReadingTimelineChart fromDate="2026-07-01" toDate="2026-07-01" />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load activity right now.")).toBeInTheDocument(),
    );
  });
});
