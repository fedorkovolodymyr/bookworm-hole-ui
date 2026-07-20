import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { AppQueryProvider } from "@/lib/query-client";
import { ProfileForm } from "./profile-form";
import enMessages from "@/messages/en.json";

const profile = {
  id: "1",
  email: "a@b.com",
  username: "alice",
  display_name: "Alice",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

describe("ProfileForm", () => {
  it("pre-fills fields from the current profile", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AppQueryProvider>
          <ProfileForm profile={profile} />
        </AppQueryProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText("Display name")).toHaveValue("Alice");
  });

  it("submits updated display name and shows a saved confirmation", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AppQueryProvider>
          <ProfileForm profile={profile} />
        </AppQueryProvider>
      </NextIntlClientProvider>,
    );
    const displayNameInput = screen.getByLabelText("Display name");
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, "New Name");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument();
  });
});
