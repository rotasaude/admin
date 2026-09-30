import { describe, it, expect } from "vitest";
import { isolatedPoints } from "./Sparkline";

describe("isolatedPoints", () => {
  it("marks every number surrounded by gaps", () => {
    expect(isolatedPoints([5, null, 7, null, 9])).toEqual([true, false, true, false, true]);
  });
  it("marks only the lone point at the edge", () => {
    expect(isolatedPoints([1, 2, null, 3])).toEqual([false, false, false, true]);
  });
  it("marks nothing in an all-null series", () => {
    expect(isolatedPoints([null, null])).toEqual([false, false]);
  });
  it("a single number is isolated", () => {
    expect(isolatedPoints([4])).toEqual([true]);
  });
  it("a continuous run has no isolated point", () => {
    expect(isolatedPoints([1, 2, 3])).toEqual([false, false, false]);
  });
  it("empty series is empty", () => {
    expect(isolatedPoints([])).toEqual([]);
  });
});
