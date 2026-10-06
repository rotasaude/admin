import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getCity, updateCityRecordSettings, listCityProduction, ApiError, type CityProductionData
} from "./api";
import type { CityDetail } from "./types";

const DETAIL: CityDetail = {
  id: "c-cwb", slug: "curitiba", name: "Curitiba", uf: "PR", status: "active", schema_version: "1",
  time_zone: "America/Sao_Paulo", created_at: "2026-09-01T00:00:00Z",
  record_mode: "integrated", ibge_code: "4106902", pec_url: "https://pec.curitiba.pr.gov.br", city_reachable: true,
  features: [ { key: "ledi_export", enabled: true, usable: false, missing: [ "credential_missing:ledi" ] } ]
};

const PRODUCTION: CityProductionData = {
  cities: [ {
    slug: "curitiba", name: "Curitiba", record_mode: "record",
    competences: [ {
      competence: "202610", deadline_on: "2026-11-14", business_days_left: 7,
      accepted: 120, rejected: 3, pending: 10, failed: 0, alert: "none"
    } ]
  } ],
  terminology: { sigtap_current_competence: "202610", sigtap_imported: true, sigtap_alert: false }
};

const PRODUCTION_WITH_OPTIONALS: CityProductionData = {
  cities: [ {
    slug: "maringa", name: "Maringá", record_mode: "integrated", city_unreachable: true,
    competences: [ {
      competence: "202610", deadline_on: "2026-11-14", business_days_left: 4,
      accepted: 0, rejected: 1, pending: 2, sending: 5, failed: 1, alert: "attention",
      deadline_estimated_on: "2026-11-13"
    } ]
  } ],
  terminology: { sigtap_current_competence: "202610", sigtap_imported: false, sigtap_alert: true }
};

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("module 16 console client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("getCity GETs /cities/:id with the session cookie and returns the bare object", async () => {
    const fetchMock = respond(DETAIL);
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCity("c-cwb")).resolves.toEqual(DETAIL);
    const [ url, init ] = fetchMock.mock.calls[0];
    expect(url).toBe("/cities/c-cwb");
    expect(init.credentials).toBe("include");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("updateCityRecordSettings PATCHes only the given fields and unwraps city", async () => {
    const fetchMock = respond({ city: DETAIL });
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateCityRecordSettings("c-cwb", { ibge_code: "4106902", pec_url: null })).resolves.toEqual(DETAIL);
    const [ url, init ] = fetchMock.mock.calls[0];
    expect(url).toBe("/cities/c-cwb/record_settings");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ ibge_code: "4106902", pec_url: null });
    expect(init.headers[ "Content-Type" ]).toBe("application/json");
    expect(init.credentials).toBe("include");
  });

  it("updateCityRecordSettings raises ApiError 404 not_found for an unknown city", async () => {
    vi.stubGlobal("fetch", respond({ error: "not_found" }, 404));

    const err = await updateCityRecordSettings("nope", { pec_url: null }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).body).toEqual({ error: "not_found" });
  });

  it("updateCityRecordSettings raises ApiError with the server code on 422", async () => {
    vi.stubGlobal("fetch", respond({ error: "invalid_ibge_code" }, 422));

    const err = await updateCityRecordSettings("c-cwb", { ibge_code: "4106902" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
    expect((err as ApiError).body).toEqual({ error: "invalid_ibge_code" });
  });

  it("listCityProduction GETs /city_production and unwraps data", async () => {
    const fetchMock = respond({ data: PRODUCTION });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCityProduction()).resolves.toEqual(PRODUCTION);
    const [ url, init ] = fetchMock.mock.calls[0];
    expect(url).toBe("/city_production");
    expect(init.credentials).toBe("include");
  });

  it("listCityProduction passes the optional exporter fields through unchanged", async () => {
    vi.stubGlobal("fetch", respond({ data: PRODUCTION_WITH_OPTIONALS }));

    const data = await listCityProduction();
    expect(data).toEqual(PRODUCTION_WITH_OPTIONALS);
    expect(data.cities[0].city_unreachable).toBe(true);
    expect(data.cities[0].competences[0].sending).toBe(5);
    expect(data.cities[0].competences[0].deadline_estimated_on).toBe("2026-11-13");
  });

  it("listCityProduction raises ApiError 401 when the session is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

    const err = await listCityProduction().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });
});
