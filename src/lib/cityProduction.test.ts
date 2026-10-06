import { describe, it, expect } from "vitest";
import type { CityProductionData, CompetenceSummary } from "./api";
import {
  alertView, countAlerts, deadlineDivergence, deadlineText, fmtCompetence, fmtDay, productionRows, sigtapNotice
} from "./cityProduction";

function comp(over: Partial<CompetenceSummary>): CompetenceSummary {
  return {
    competence: "202610", deadline_on: "2026-11-14", business_days_left: 7,
    accepted: 0, rejected: 0, pending: 0, failed: 0, alert: "none", ...over
  };
}

const DATA: CityProductionData = {
  cities: [
    { slug: "aurora", name: "Aurora", record_mode: "integrated",
      competences: [ comp({ competence: "202609", deadline_on: "2026-10-14", business_days_left: 6 }), comp({ alert: "attention" }) ] },
    { slug: "maringa", name: "Maringá", record_mode: "off", competences: [] },
    { slug: "curitiba", name: "Curitiba", record_mode: "record",
      competences: [ comp({ alert: "critical", business_days_left: 2 }) ] },
    { slug: "bela", name: "Bela", record_mode: "integrated", competences: [ comp({}) ] }
  ],
  terminology: { sigtap_current_competence: "202610", sigtap_imported: false, sigtap_alert: false }
};

describe("formatting", () => {
  it("competence as MM/AAAA and days by text", () => {
    expect(fmtCompetence("202610")).toBe("10/2026");
    expect(fmtCompetence("2026-10")).toBe("2026-10");
    expect(fmtDay("2026-11-14")).toBe("14/11/2026");
  });
});

describe("deadlineText at the edges", () => {
  it.each([
    [ 7, "14/11/2026 · 7 dias úteis" ],
    [ 1, "14/11/2026 · 1 dia útil" ],
    [ 0, "14/11/2026 · último dia" ],
    [ -1, "14/11/2026 · prazo vencido" ]
  ])("%i business days left → %j", (left, text) => {
    expect(deadlineText(comp({ business_days_left: left }))).toBe(text);
  });
});

describe("deadlineDivergence", () => {
  it("null when the estimate is absent, null, empty or equal", () => {
    expect(deadlineDivergence(comp({}))).toBeNull();
    expect(deadlineDivergence(comp({ deadline_estimated_on: null }))).toBeNull();
    expect(deadlineDivergence(comp({ deadline_estimated_on: "" }))).toBeNull();
    expect(deadlineDivergence(comp({ deadline_estimated_on: "2026-11-14" }))).toBeNull();
  });

  it("notice by text when the estimate differs", () => {
    expect(deadlineDivergence(comp({ deadline_estimated_on: "2026-11-13" }))).toBe(
      "estimativa por dias úteis: 13/11/2026 (vale a tabela do SIAPS)"
    );
  });
});

describe("alertView", () => {
  it("labels and tones, unknown raw", () => {
    expect(alertView("none")).toEqual({ label: "sem alerta", tone: "neutral" });
    expect(alertView("attention")).toEqual({ label: "atenção", tone: "warn" });
    expect(alertView("critical")).toEqual({ label: "crítico", tone: "down" });
    expect(alertView("panic")).toEqual({ label: "panic", tone: "neutral" });
  });
});

describe("productionRows", () => {
  it("puts the worst alert first, then by name, newest competence first", () => {
    expect(productionRows(DATA).map((r) => r.key)).toEqual([
      "curitiba:202610",
      "aurora:202610", "aurora:202609",
      "bela:202610",
      "maringa:none"
    ]);
  });

  it("productionRows keeps a city without competences", () => {
    const row = productionRows(DATA).find((r) => r.slug === "maringa");
    expect(row).toEqual({
      key: "maringa:none", slug: "maringa", name: "Maringá", record_mode: "off",
      city_unreachable: false, competence: null
    });
  });

  it("flags an unreachable city with no competences on its single row", () => {
    const rows = productionRows({
      ...DATA,
      cities: [ { slug: "x", name: "X", record_mode: "off", competences: [], city_unreachable: true } ]
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].city_unreachable).toBe(true);
  });

  it("carries city_unreachable on every row of the city", () => {
    const rows = productionRows({
      ...DATA,
      cities: [ { slug: "x", name: "X", record_mode: "record", city_unreachable: true,
        competences: [ comp({}), comp({ competence: "202609" }) ] } ]
    });
    expect(rows.map((r) => r.city_unreachable)).toEqual([ true, true ]);
    expect(productionRows(DATA).every((r) => r.city_unreachable === false)).toBe(true);
  });

  it("countAlerts counts each city once by its worst competence", () => {
    expect(countAlerts(DATA)).toEqual({ critical: 1, attention: 1 });
  });
});

describe("sigtapNotice follows the api flags", () => {
  const T = DATA.terminology;

  it("nothing when SIGTAP is imported, even with a stale alert flag", () => {
    expect(sigtapNotice({ ...T, sigtap_imported: true, sigtap_alert: true })).toBeNull();
  });

  it("info while the api does not raise the alert", () => {
    const notice = sigtapNotice(T);
    expect(notice?.tone).toBe("info");
    expect(notice?.text).toBe("SIGTAP da competência 10/2026 ainda não importada (vira alerta no dia 5).");
  });

  it("alert when the api says so", () => {
    const notice = sigtapNotice({ ...T, sigtap_alert: true });
    expect(notice?.tone).toBe("warn");
    expect(notice?.text).toBe(
      "SIGTAP da competência 10/2026 não importada. Até a importação, a conferência de procedimentos " +
      "usa a versão anterior. Importe no api com terminology:import."
    );
  });
});
