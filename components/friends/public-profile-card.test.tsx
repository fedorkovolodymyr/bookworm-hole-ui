import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicProfileCard } from "./public-profile-card";
import type { PublicUserProfileResponse } from "@/lib/api/types";

const profile: PublicUserProfileResponse = {
  username: "bob",
  display_name: "Bob Reader",
  bio: "I read a lot.",
  avatar_url: null,
  collections: { items: [], total: 0, limit: 20, offset: 0 },
};

describe("PublicProfileCard", () => {
  it("shows display name, username, and bio", () => {
    render(<PublicProfileCard profile={profile} />);
    expect(screen.getByText("Bob Reader")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("I read a lot.")).toBeInTheDocument();
  });

  it("renders the action slot when provided", () => {
    render(<PublicProfileCard profile={profile} action={<button>Send friend request</button>} />);
    expect(screen.getByRole("button", { name: "Send friend request" })).toBeInTheDocument();
  });
});
