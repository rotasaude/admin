import { describe, it, expect } from "vitest";
import { scopeParams, type Scope } from "./scope";

describe("scopeParams", () => {
  it("manda só period: o escopo é a cidade do host, sem municipality_id", () => {
    const scope: Scope = { period: "7d", setPeriod: () => {} };
    expect(scopeParams(scope)).toEqual({ period: "7d" });
  });
});
