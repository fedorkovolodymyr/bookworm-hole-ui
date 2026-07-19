import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppQueryProvider } from "./query-client";

describe("AppQueryProvider", () => {
  it("renders children", () => {
    render(
      <AppQueryProvider>
        <div>child content</div>
      </AppQueryProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
