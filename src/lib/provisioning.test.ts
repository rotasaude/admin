import { describe, it, expect } from "vitest";
import { validateProvisionForm, type ProvisionCityPayload } from "./provisioning";

const valid: ProvisionCityPayload = {
  slug: "curitiba", name: "Curitiba", uf: "PR", ibge_code: "4106902",
  admin_email: "admin@curitiba.pr.gov.br", alert_email: "urgencia@curitiba.pr.gov.br"
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
});
