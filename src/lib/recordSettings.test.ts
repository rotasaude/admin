import { describe, it, expect } from "vitest";
import { ApiError } from "./api";
import {
  FIELD_PROBLEMS, changesMode, describeRecordSettingsError, featureLabel, featureState, formFrom, ibgeLocked,
  missingLabel, modeChangeWarning, pecUrlProblem, recordModeLabel, recordSettingsPatch, validateRecordSettings
} from "./recordSettings";

const CITY = { record_mode: "off" as const, ibge_code: null, pec_url: null };

describe("recordModeLabel", () => {
  it("names the three modes and shows unknown values raw", () => {
    expect(recordModeLabel("off")).toBe("Desligado");
    expect(recordModeLabel("integrated")).toBe("Integrado ao PEC");
    expect(recordModeLabel("record")).toBe("Prontuário Rota Saúde");
    expect(recordModeLabel("hybrid")).toBe("hybrid");
    expect(recordModeLabel(undefined)).toBe("—");
  });
});

describe("modeChangeWarning", () => {
  it("names both modes and the consequence of the target mode", () => {
    const text = modeChangeWarning("off", "record");
    expect(text).toContain("de \"Desligado\" para \"Prontuário Rota Saúde\"");
    expect(text).toContain("o repasse da cidade passa a depender das fichas enviadas");
    expect(text).toContain("auditoria da plataforma");
    expect(modeChangeWarning("record", "off")).toContain("nenhuma ficha sai para o e-SUS");
  });
});

describe("pecUrlProblem refuses http, credentials and garbage", () => {
  it.each([
    [ "", false ],
    [ "https://pec.curitiba.pr.gov.br", false ],
    [ "  https://pec.curitiba.pr.gov.br:8443/  ", false ],
    [ "http://pec.curitiba.pr.gov.br", true ],
    [ "https://admin:segredo@pec.curitiba.pr.gov.br", true ],
    [ "https://admin@pec.curitiba.pr.gov.br", true ],
    [ "pec.curitiba.pr.gov.br", true ],
    [ "ftp://pec.curitiba.pr.gov.br", true ]
  ])("%j → problem=%s", (raw, problem) => {
    expect(pecUrlProblem(raw)).toBe(problem);
  });
});

describe("validateRecordSettings", () => {
  it("accepts empty fields and a 7-digit IBGE code", () => {
    expect(validateRecordSettings({ record_mode: "off", ibge_code: "", pec_url: "" })).toEqual([]);
    expect(validateRecordSettings({ record_mode: "off", ibge_code: " 4106902 ", pec_url: "" })).toEqual([]);
  });

  it("flags a short IBGE code and a bad PEC address", () => {
    expect(validateRecordSettings({ record_mode: "off", ibge_code: "41069", pec_url: "http://x" }))
      .toEqual([ "ibge_code", "pec_url" ]);
  });

  it("has a fixed message per field that never repeats what was typed", () => {
    expect(FIELD_PROBLEMS.ibge_code).toBe("o código IBGE tem 7 dígitos");
    expect(FIELD_PROBLEMS.pec_url).toBe("o endereço do PEC começa com https:// e não leva usuário nem senha");
  });
});

describe("recordSettingsPatch sends only what changed", () => {
  it("returns an empty patch when nothing changed", () => {
    expect(recordSettingsPatch(CITY, formFrom(CITY))).toEqual({});
  });

  it("does not resend the mode when it went back to the original", () => {
    const values = { ...formFrom(CITY), record_mode: "off", ibge_code: "4106902" };
    expect(recordSettingsPatch(CITY, values)).toEqual({ ibge_code: "4106902" });
  });

  it("trims and sends empty as null to clear a field", () => {
    const city = { record_mode: "integrated" as const, ibge_code: "4106902", pec_url: "https://pec.a.gov.br" };
    const values = { record_mode: "integrated", ibge_code: " 4106902 ", pec_url: "  " };
    expect(recordSettingsPatch(city, values)).toEqual({ pec_url: null });
  });

  it("recordSettingsPatch never sends the IBGE code of an unreachable city", () => {
    const city = { record_mode: "off" as const, ibge_code: null, pec_url: null, city_reachable: false };
    expect(ibgeLocked(city)).toBe(true);
    expect(ibgeLocked(CITY)).toBe(false);
    const values = { record_mode: "integrated", ibge_code: "4106902", pec_url: "https://pec.a.gov.br" };
    expect(recordSettingsPatch(city, values)).toEqual({ record_mode: "integrated", pec_url: "https://pec.a.gov.br" });
  });

  it("sends the new mode, and changesMode sees it", () => {
    const patch = recordSettingsPatch(CITY, { ...formFrom(CITY), record_mode: "record" });
    expect(patch).toEqual({ record_mode: "record" });
    expect(changesMode(patch)).toBe(true);
    expect(changesMode({ ibge_code: "4106902" })).toBe(false);
  });
});

describe("describeRecordSettingsError", () => {
  it.each([
    [ new ApiError(422, { error: "invalid_record_mode" }, "422"), "modo de prontuário inválido" ],
    [ new ApiError(422, { error: "invalid_ibge_code" }, "422"), "o código IBGE tem 7 dígitos" ],
    [ new ApiError(422, { error: "invalid_pec_url" }, "422"), "o endereço do PEC começa com https:// e não leva usuário nem senha" ],
    [ new ApiError(422, { error: "invalid_city" }, "422"), "o cadastro da cidade tem outro dado inválido; nada foi gravado" ],
    [ new ApiError(503, { error: "city_unreachable" }, "503"), "o banco da cidade não respondeu; o código IBGE não foi gravado — tente de novo" ],
    [ new Error("503 on /cities/c-cwb/record_settings"), "503 on /cities/c-cwb/record_settings" ],
    [ new ApiError(422, { error: "something_new" }, "422"), "dados inválidos" ],
    [ new ApiError(404, { error: "not_found" }, "404"), "cidade não encontrada" ],
    [ new Error("network down"), "network down" ]
  ])("%#: maps to %j", (err, message) => {
    expect(describeRecordSettingsError(err)).toBe(message);
  });
});

describe("switches", () => {
  it("names the known switches and shows unknown keys raw", () => {
    expect(featureLabel("ledi_export")).toBe("Exportação para o e-SUS (LEDI)");
    expect(featureLabel("cadsus_lookup")).toBe("Consulta ao CADSUS");
    expect(featureLabel("rnds_export")).toBe("rnds_export");
  });

  it("says who fixes each missing prerequisite and shows unknown codes raw", () => {
    expect(missingLabel("record_mode_off")).toBe("modo de prontuário desligado (aqui)");
    expect(missingLabel("pec_url_missing")).toBe("endereço do PEC (aqui)");
    expect(missingLabel("ibge_code_missing")).toBe("código IBGE (aqui)");
    expect(missingLabel("credential_missing:ledi")).toBe("credencial do PEC (a cidade cadastra em Integrações)");
    expect(missingLabel("credential_unauthorized:ledi")).toBe("credencial do PEC recusada (a cidade troca em Integrações)");
    expect(missingLabel("credential_missing:cadsus")).toBe("credencial do CADSUS (a cidade cadastra em Integrações)");
    expect(missingLabel("credential_unauthorized:cadsus")).toBe("credencial do CADSUS recusada (a cidade troca em Integrações)");
    expect(missingLabel("city_unreachable")).toBe("banco da cidade inalcançável ou cidade não ativa");
    expect(missingLabel("something_new")).toBe("something_new");
  });

  it("tells off, usable and enabled-but-blocked apart", () => {
    expect(featureState({ key: "k", enabled: false, usable: false, missing: [] }))
      .toEqual({ kind: "off", text: "desligado", tone: "neutral" });
    expect(featureState({ key: "k", enabled: true, usable: true, missing: [] }))
      .toEqual({ kind: "usable", text: "ligado · utilizável", tone: "ok" });
    expect(featureState({ key: "k", enabled: true, usable: false, missing: [ "pec_url_missing" ] }))
      .toEqual({ kind: "blocked", text: "ligado · não utilizável", tone: "warn" });
  });
});
