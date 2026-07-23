import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ChatComposer } from "./chat-composer";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ChatComposer", () => {
  it("calls onSend with the trimmed message and clears the input", async () => {
    const onSend = vi.fn();
    renderWithIntl(<ChatComposer onSend={onSend} isSending={false} />);
    const textarea = screen.getByPlaceholderText("Write a message...");
    await userEvent.type(textarea, "  hello  ");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("hello");
    expect(textarea).toHaveValue("");
  });

  it("does not call onSend for a blank message", async () => {
    const onSend = vi.fn();
    renderWithIntl(<ChatComposer onSend={onSend} isSending={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the input and button while sending", () => {
    renderWithIntl(<ChatComposer onSend={() => {}} isSending={true} />);
    expect(screen.getByPlaceholderText("Write a message...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
  });
});
