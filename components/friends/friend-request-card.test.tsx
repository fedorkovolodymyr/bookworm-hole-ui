import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { FriendRequestCard } from "./friend-request-card";
import type { FriendRequestResponse } from "@/lib/api/types";

const request: FriendRequestResponse = {
  id: "f1",
  requester_id: "u1",
  addressee_id: "u2",
  status: "pending",
  created_at: "2026-01-01T00:00:00Z",
  responded_at: null,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FriendRequestCard", () => {
  it("shows Accept/Decline for incoming requests and calls the callbacks with the friendship id", async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    renderWithIntl(
      <FriendRequestCard
        request={request}
        direction="incoming"
        requesterLabel="bob"
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    );
    expect(screen.getByText("bob")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("shows a pending badge with no actions for outgoing requests", () => {
    renderWithIntl(
      <FriendRequestCard request={request} direction="outgoing" requesterLabel="carol" />,
    );
    expect(screen.getByText("carol")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });
});
