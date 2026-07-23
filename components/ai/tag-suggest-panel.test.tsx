import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as aiHooks from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { TagSuggestPanel } from "./tag-suggest-panel";

vi.mock("@/hooks/useAi");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TagSuggestPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables submit when no book is selected", () => {
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<TagSuggestPanel bookId={null} bookLabel={null} />);
    expect(screen.getByRole("button", { name: "Suggest tags" })).toBeDisabled();
  });

  it("calls the mutation with the selected book id", async () => {
    const mutate = vi.fn();
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<TagSuggestPanel bookId="b1" bookLabel="Dune" />);
    await userEvent.click(screen.getByRole("button", { name: "Suggest tags" }));
    expect(mutate).toHaveBeenCalledWith({ book_id: "b1" });
  });

  it("shows coming-soon state on AiFeatureUnavailableError", () => {
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: new AiFeatureUnavailableError("tag-suggest"),
    } as never);
    renderWithIntl(<TagSuggestPanel bookId="b1" bookLabel="Dune" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("renders returned tags as badges", () => {
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: { tags: ["scifi", "classic"] },
      error: null,
    } as never);
    renderWithIntl(<TagSuggestPanel bookId="b1" bookLabel="Dune" />);
    expect(screen.getByText("scifi")).toBeInTheDocument();
    expect(screen.getByText("classic")).toBeInTheDocument();
  });
});
