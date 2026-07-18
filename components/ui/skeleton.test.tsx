import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a div element", () => {
    const { container } = render(<Skeleton data-testid="skeleton" />);
    expect(container.querySelector('[data-testid="skeleton"]')).toBeInTheDocument();
  });
});
