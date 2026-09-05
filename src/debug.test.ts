import { describe, expect, it } from "vitest";
import { parseDebugOptions } from "./debug";

describe("debug mode", () => {
  it("enables debug mode with supported query values", () => {
    expect(parseDebugOptions("?debug=1", 28)).toEqual({
      enabled: true,
      levelId: null
    });
    expect(parseDebugOptions("?debug=true&level=19", 28)).toEqual({
      enabled: true,
      levelId: 19
    });
  });

  it("ignores direct level selection outside debug mode", () => {
    expect(parseDebugOptions("?level=28", 28)).toEqual({
      enabled: false,
      levelId: null
    });
  });

  it("rejects an invalid level number", () => {
    expect(parseDebugOptions("?debug=1&level=99", 28).levelId).toBeNull();
    expect(parseDebugOptions("?debug=1&level=2.5", 28).levelId).toBeNull();
  });
});
