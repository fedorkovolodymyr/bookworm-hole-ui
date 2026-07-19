import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("submits email and password and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    render(
      <AppQueryProvider>
        <LoginForm onSuccess={onSuccess} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows a form-level error on failed login", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );

    render(
      <AppQueryProvider>
        <LoginForm onSuccess={vi.fn()} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
