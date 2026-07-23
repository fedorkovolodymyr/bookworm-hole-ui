import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as chatHooks from "@/hooks/useChat";
import * as friendsHooks from "@/hooks/useFriends";
import * as meHooks from "@/hooks/useMe";
import ChatThreadsPage from "./page";

vi.mock("@/hooks/useChat");
vi.mock("@/hooks/useFriends");
vi.mock("@/hooks/useMe");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ChatThreadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meHooks.useMe).mockReturnValue({ data: { id: "u1" } } as never);
    vi.mocked(friendsHooks.useFriends).mockReturnValue({
      data: [{ user_id: "u2", username: "bee", display_name: "Bee", avatar_url: null, since: "x" }],
    } as never);
  });

  it("shows empty state when there are no threads", () => {
    vi.mocked(chatHooks.useThreads).mockReturnValue({
      isPending: false,
      isSuccess: true,
      data: [],
    } as never);
    renderWithIntl(<ChatThreadsPage />);
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("renders a thread row resolved against friend data", () => {
    vi.mocked(chatHooks.useThreads).mockReturnValue({
      isPending: false,
      isSuccess: true,
      data: [
        {
          id: "t1",
          user_a_id: "u1",
          user_b_id: "u2",
          last_message_at: "x",
          created_at: "x",
          last_message: null,
        },
      ],
    } as never);
    renderWithIntl(<ChatThreadsPage />);
    expect(screen.getByText("Bee")).toBeInTheDocument();
  });
});
