import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./api", () => ({ listCities: vi.fn(), createCityGrant: vi.fn() }));

import { enterCity, sortedForDisplay } from "./cities";
import * as api from "./api";

beforeEach(() => vi.clearAllMocks());

describe("enterCity", () => {
  it("redirects the browser to the grant URL the console received", async () => {
    (api.createCityGrant as ReturnType<typeof vi.fn>).mockResolvedValue({
      redirect_url: "http://curitiba.localhost:5175/dashboard/?grant=tok", expires_in: 60
    });
    const go = vi.fn();

    await enterCity("curitiba", go);

    expect(api.createCityGrant).toHaveBeenCalledWith("curitiba");
    expect(go).toHaveBeenCalledWith("http://curitiba.localhost:5175/dashboard/?grant=tok");
  });
});

describe("sortedForDisplay", () => {
  it("puts cities that need attention first, then the rest by name", () => {
    const rows = [
      { id: "1", slug: "b", name: "Bela", uf: "PR", status: "active", schema_version: "1", created_at: "" },
      { id: "2", slug: "a", name: "Aurora", uf: "PR", status: "provisioning", schema_version: null, created_at: "" },
      { id: "3", slug: "c", name: "Cascavel", uf: "PR", status: "suspended", schema_version: "1", created_at: "" }
    ];
    expect(sortedForDisplay(rows).map((c) => c.slug)).toEqual([ "a", "c", "b" ]);
  });
});
