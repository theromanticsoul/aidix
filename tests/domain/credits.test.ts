import { describe, expect, test } from "bun:test";
import { calculateGenerationCost } from "@/server/core/credits";

describe("generation credits", () => {
  test("charges one credit per requested variant", () => {
    expect(calculateGenerationCost(1)).toBe(1);
    expect(calculateGenerationCost(4)).toBe(4);
  });

  test("rejects variant counts outside the MVP range", () => {
    expect(() => calculateGenerationCost(0)).toThrow(RangeError);
    expect(() => calculateGenerationCost(5)).toThrow(RangeError);
  });
});
