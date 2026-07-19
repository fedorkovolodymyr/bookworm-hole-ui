import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  it("submits all fields and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    render(
      <AppQueryProvider>
        <RegisterForm onSuccess={onSuccess} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Display name"), "Alice");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows a form-level error on failed registration", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post("/api/auth/register", () =>
        HttpResponse.json({ detail: "Email already registered" }, { status: 409 }),
      ),
    );

    render(
      <AppQueryProvider>
        <RegisterForm onSuccess={vi.fn()} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Display name"), "Alice");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
  });
});
