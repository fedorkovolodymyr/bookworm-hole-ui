import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as aiHooks from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { RecommendationsPanel } from "./recommendations-panel";

vi.mock("@/hooks/useAi");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RecommendationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows coming-soon state on AiFeatureUnavailableError", () => {
    vi.mocked(aiHooks.useRecommendations).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: new AiFeatureUnavailableError("recommend"),
    } as never);
    renderWithIntl(<RecommendationsPanel />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("calls recommend on submit", async () => {
    const mutate = vi.fn();
    vi.mocked(aiHooks.useRecommendations).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<RecommendationsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Get recommendations" }));
    expect(mutate).toHaveBeenCalledWith({ n: 10 });
  });

  it("renders returned book ids", () => {
    vi.mocked(aiHooks.useRecommendations).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: { book_ids: ["b1", "b2"] },
      error: null,
    } as never);
    renderWithIntl(<RecommendationsPanel />);
    expect(screen.getByText("b1")).toBeInTheDocument();
    expect(screen.getByText("b2")).toBeInTheDocument();
  });
});
