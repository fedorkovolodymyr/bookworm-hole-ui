import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { UserTable } from "./user-table";
import type { AdminUserResponse } from "@/lib/api/types";

vi.mock("@/hooks/useAdminUsers", () => ({
  useActivateUser: () => ({ mutate: vi.fn(), isPending: false }),
  useDeactivateUser: () => ({ mutate: vi.fn(), isPending: false }),
  usePromoteUser: () => ({ mutate: vi.fn(), isPending: false }),
  useDemoteUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

const users: AdminUserResponse[] = [
  {
    id: "u1",
    email: "a@b.com",
    username: "alice",
    display_name: "Alice",
    is_active: true,
    is_admin: false,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("UserTable", () => {
  it("renders a row per user", () => {
    renderWithIntl(<UserTable users={users} onResetPassword={vi.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", () => {
    renderWithIntl(<UserTable users={[]} onResetPassword={vi.fn()} />);
    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("calls onResetPassword when the reset password action is clicked", () => {
    const onResetPassword = vi.fn();
    renderWithIntl(<UserTable users={users} onResetPassword={onResetPassword} />);

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.click(screen.getByText("Reset password"));

    expect(onResetPassword).toHaveBeenCalledWith("u1");
  });
});
