import { describe, it, expect } from "vitest";
import { TIME_ZONES, suggestedTimeZone, validateProvisionForm, type ProvisionCityPayload } from "./provisioning";

const valid: ProvisionCityPayload = {
  slug: "curitiba", name: "Curitiba", uf: "PR", ibge_code: "4106902",
  admin_email: "admin@curitiba.pr.gov.br", alert_email: "urgencia@curitiba.pr.gov.br", time_zone: "America/Sao_Paulo"
};

describe("validateProvisionForm", () => {
  it("accepts a payload the API would accept", () => {
    expect(validateProvisionForm(valid)).toEqual([]);
  });

  // Espelha ProvisionCity#validation_errors e CityDatabase.valid_slug? — o
  // objetivo é o operador ver o erro ANTES do 422, não duplicar a autoridade:
  // a API continua validando.
  it("rejects a slug that is not a DNS label", () => {
    expect(validateProvisionForm({ ...valid, slug: "Curitiba_PR" })).toContain("slug");
  });

  it("rejects a reserved slug", () => {
    expect(validateProvisionForm({ ...valid, slug: "admin" })).toContain("slug");
  });

  it("rejects UF that is not two uppercase letters", () => {
    expect(validateProvisionForm({ ...valid, uf: "pr" })).toContain("uf");
  });

  it("rejects an IBGE code that is not 7 digits", () => {
    expect(validateProvisionForm({ ...valid, ibge_code: "12345" })).toContain("ibge_code");
  });

  it("rejects a malformed e-mail in either field", () => {
    expect(validateProvisionForm({ ...valid, admin_email: "sem-arroba" })).toContain("admin_email");
    expect(validateProvisionForm({ ...valid, alert_email: "sem-arroba" })).toContain("alert_email");
  });

  it("rejects a time zone outside the Brazilian list (api#27)", () => {
    expect(validateProvisionForm({ ...valid, time_zone: "Europe/Lisbon" })).toContain("time_zone");
    expect(validateProvisionForm({ ...valid, time_zone: "America/Rio_Branco" })).toEqual([]);
  });
});

describe("TIME_ZONES e suggestedTimeZone (api#27)", () => {
  it("lists the 16 Brazilian IANA zones the API accepts", () => {
    expect(TIME_ZONES).toHaveLength(16);
    expect(new Set(TIME_ZONES.map((z) => z.id)).size).toBe(16);
  });

  it("suggests the zone by state and falls back to Brasília", () => {
    expect(suggestedTimeZone("AC")).toBe("America/Rio_Branco");
    expect(suggestedTimeZone("am")).toBe("America/Manaus");
    expect(suggestedTimeZone("MS")).toBe("America/Campo_Grande");
    expect(suggestedTimeZone("PR")).toBe("America/Sao_Paulo");
    expect(suggestedTimeZone("")).toBe("America/Sao_Paulo");
  });
});
