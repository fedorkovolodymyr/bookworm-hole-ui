import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as chatHooks from "@/hooks/useChat";
import * as meHooks from "@/hooks/useMe";
import ChatThreadPage from "./page";

vi.mock("@/hooks/useChat");
vi.mock("@/hooks/useMe");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// `use(params)` (React 19) suspends on first render even for an
// already-resolved promise, since it always throws to trigger the Suspense
// protocol before its microtask retry runs. There's no Suspense boundary
// around this route in tests, so the retry must be flushed inside `act`
// before assertions run — see app/(app)/friends/[userId]/page.test.tsx.
async function renderWithIntl(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <NextIntlClientProvider locale="en" messages={en}>
        {ui}
      </NextIntlClientProvider>,
    );
  });
  return result;
}

describe("ChatThreadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meHooks.useMe).mockReturnValue({ data: { id: "u1" } } as never);
    vi.mocked(chatHooks.useMarkThreadRead).mockReturnValue({ mutate: vi.fn() } as never);
    vi.mocked(chatHooks.useSendMessage).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  it("renders messages oldest-first", async () => {
    vi.mocked(chatHooks.useThreadMessages).mockReturnValue({
      isPending: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      data: {
        pages: [
          [
            {
              id: "m2",
              thread_id: "t1",
              sender_id: "u2",
              body: "second",
              attachment_book_id: null,
              attachment_collection_id: null,
              read_at: null,
              created_at: "x",
            },
            {
              id: "m1",
              thread_id: "t1",
              sender_id: "u1",
              body: "first",
              attachment_book_id: null,
              attachment_collection_id: null,
              read_at: null,
              created_at: "x",
            },
          ],
        ],
      },
    } as never);
    await renderWithIntl(<ChatThreadPage params={Promise.resolve({ threadId: "t1" })} />);
    const bodies = screen.getAllByText(/first|second/);
    expect(bodies[0]).toHaveTextContent("first");
    expect(bodies[1]).toHaveTextContent("second");
  });

  it("shows the not-found state on error", async () => {
    vi.mocked(chatHooks.useThreadMessages).mockReturnValue({
      isPending: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      data: undefined,
    } as never);
    await renderWithIntl(<ChatThreadPage params={Promise.resolve({ threadId: "t1" })} />);
    expect(screen.getByText("This conversation is no longer available.")).toBeInTheDocument();
  });
});
