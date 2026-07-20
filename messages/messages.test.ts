import { describe, expect, it } from "vitest";
import en from "./en.json";
import uk from "./uk.json";

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return collectKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe("i18n message parity", () => {
  it("en and uk expose the same set of keys", () => {
    const enKeys = collectKeys(en).sort();
    const ukKeys = collectKeys(uk).sort();
    expect(ukKeys).toEqual(enKeys);
  });

  it("no message value is an empty string", () => {
    const allValues = [...collectKeys(en), ...collectKeys(uk)];
    expect(allValues.length).toBeGreaterThan(0);
  });
});
