import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as aiHooks from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { SummaryPanel } from "./summary-panel";

vi.mock("@/hooks/useAi");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SummaryPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables submit until text is entered", () => {
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<SummaryPanel />);
    expect(screen.getByRole("button", { name: "Summarize" })).toBeDisabled();
  });

  it("calls summary mutation with entered text", async () => {
    const mutate = vi.fn();
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<SummaryPanel />);
    await userEvent.type(screen.getByPlaceholderText("Text to summarize"), "some text");
    await userEvent.click(screen.getByRole("button", { name: "Summarize" }));
    expect(mutate).toHaveBeenCalledWith({ text: "some text" });
  });

  it("shows coming-soon state on AiFeatureUnavailableError", () => {
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: new AiFeatureUnavailableError("summary"),
    } as never);
    renderWithIntl(<SummaryPanel />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("renders the returned summary", () => {
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: { summary: "a short summary" },
      error: null,
    } as never);
    renderWithIntl(<SummaryPanel />);
    expect(screen.getByText("a short summary")).toBeInTheDocument();
  });
});
