import { describe, it, expect, vi, afterEach } from "vitest";
import { listUnknownChannels, ApiError } from "./api";

describe("listUnknownChannels", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /unknown_channels with the session cookie and unwraps the list", async () => {
    const row = {
      phone_number_id: "1", display_phone_number: null, hits: 1,
      first_seen_at: "2026-09-27T00:00:00Z", last_seen_at: "2026-09-27T00:00:00Z"
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ unknown_channels: [ row ] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listUnknownChannels()).resolves.toEqual([ row ]);
    const [ url, init ] = fetchMock.mock.calls[0];
    expect(url).toBe("/unknown_channels");
    expect(init.credentials).toBe("include");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("raises ApiError 401 when the session is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

    const err = await listUnknownChannels().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });
});
