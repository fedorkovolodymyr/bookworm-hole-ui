import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import AiPage from "./page";

vi.mock("@/hooks/useAi", () => ({
  useRecommendations: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
  useSummary: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
  useTagSuggestions: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
}));
vi.mock("@/hooks/useMe", () => ({ useMe: () => ({ data: { id: "u1" } }) }));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={en}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AiPage", () => {
  it("renders all three panels", () => {
    renderWithProviders(<AiPage />);
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Tag suggestions")).toBeInTheDocument();
  });
});
