import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const REQUIRED_TOKENS = [
  "--background",
  "--foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
];

describe("design tokens", () => {
  const css = readFileSync("app/globals.css", "utf-8");

  it("defines every required token in :root", () => {
    const rootBlockMatch = css.match(/:root\s*{([^}]*)}/s);
    expect(rootBlockMatch).not.toBeNull();
    const rootBlock = rootBlockMatch![1];
    for (const token of REQUIRED_TOKENS) {
      expect(rootBlock).toContain(token);
    }
  });

  it("defines every color token override in .dark", () => {
    const darkBlockMatch = css.match(/\.dark\s*{([^}]*)}/s);
    expect(darkBlockMatch).not.toBeNull();
    const darkBlock = darkBlockMatch![1];
    for (const token of REQUIRED_TOKENS.filter((t) => t !== "--radius")) {
      expect(darkBlock).toContain(token);
    }
  });
});
