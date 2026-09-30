import { describe, it, expect, vi, afterEach } from "vitest";
import { listCityAnalytics, ApiError, type CityAnalyticsData } from "./api";

const DATA: CityAnalyticsData = {
  weeks: [ "2026-09-14", "2026-09-21" ],
  indicators: [ "triages_started", "no_show_pct" ],
  cities: [ {
    id: "c1", slug: "curitiba", name: "Curitiba", uf: "PR",
    last_published_at: "2026-09-30T05:02:12Z",
    values: { triages_started: [ 128, { suppressed: true } ], no_show_pct: [ null, 12.5 ] }
  } ]
};

describe("listCityAnalytics", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /city_analytics without params, with the session cookie, and unwraps data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: DATA }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCityAnalytics()).resolves.toEqual(DATA);
    const [ url, init ] = fetchMock.mock.calls[0];
    expect(url).toBe("/city_analytics");
    expect(init.credentials).toBe("include");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("raises ApiError with the server code on 422", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_range" }), { status: 422 })
    ));

    const err = await listCityAnalytics().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
    expect((err as ApiError).body).toEqual({ error: "invalid_range" });
  });

  it("raises ApiError 401 when the session is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

    const err = await listCityAnalytics().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });
});
