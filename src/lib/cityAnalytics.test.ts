import { describe, it, expect } from "vitest";
import {
  cellView, fmtWeek, hasAnyPublication, indicatorLabel, isRate, trendPoints
} from "./cityAnalytics";
import type { CityAnalyticsData } from "./api";

describe("indicatorLabel", () => {
  it("names the six indicators of the fixed set", () => {
    expect(indicatorLabel("triages_started")).toBe("Triagens iniciadas");
    expect(indicatorLabel("triages_completed")).toBe("Triagens concluídas");
    expect(indicatorLabel("attendances_closed")).toBe("Atendimentos encerrados");
    expect(indicatorLabel("wait_within_30_pct")).toBe("Espera até 30 min");
    expect(indicatorLabel("no_show_pct")).toBe("Faltas");
    expect(indicatorLabel("left_pct")).toBe("Saiu sem atendimento");
  });

  it("falls back to the raw key for an indicator the console does not know yet", () => {
    expect(indicatorLabel("new_indicator")).toBe("new_indicator");
  });
});

describe("isRate", () => {
  it("treats the _pct indicators as rates", () => {
    expect(isRate("no_show_pct")).toBe(true);
    expect(isRate("triages_started")).toBe(false);
  });
});

describe("cellView", () => {
  it("formats counts as integers with thousands separator", () => {
    expect(cellView("triages_started", 1234)).toEqual({ kind: "value", text: "1.234" });
  });

  it("formats rates with exactly one decimal and a percent sign", () => {
    expect(cellView("no_show_pct", 12.5)).toEqual({ kind: "value", text: "12,5%" });
    expect(cellView("no_show_pct", 12)).toEqual({ kind: "value", text: "12,0%" });
  });

  it("zero is a value, not sem dado", () => {
    expect(cellView("triages_started", 0)).toEqual({ kind: "value", text: "0" });
    expect(cellView("left_pct", 0)).toEqual({ kind: "value", text: "0,0%" });
  });

  it("suppressed is oculto", () => {
    expect(cellView("triages_started", { suppressed: true })).toEqual({ kind: "hidden", text: "oculto" });
    expect(cellView("no_show_pct", { suppressed: true })).toEqual({ kind: "hidden", text: "oculto" });
  });

  it("null and missing are sem dado", () => {
    expect(cellView("triages_started", null)).toEqual({ kind: "missing", text: "sem dado" });
    expect(cellView("triages_started", undefined)).toEqual({ kind: "missing", text: "sem dado" });
  });
});

describe("trendPoints", () => {
  it("suprimido e sem dado viram lacuna na tendência, nunca zero", () => {
    expect(trendPoints([ 128, { suppressed: true }, null, 0 ], 4)).toEqual([ 128, null, null, 0 ]);
  });

  it("array curto ou ausente é completado com lacunas até o número de semanas", () => {
    expect(trendPoints([ 5 ], 3)).toEqual([ 5, null, null ]);
    expect(trendPoints(undefined, 2)).toEqual([ null, null ]);
  });
});

describe("fmtWeek", () => {
  it("semana formatada por texto, sem fuso", () => {
    expect(fmtWeek("2026-07-06")).toBe("06/07/2026");
    expect(fmtWeek("2026-01-05")).toBe("05/01/2026");
  });
});

describe("hasAnyPublication", () => {
  const base: CityAnalyticsData = { weeks: [], indicators: [], cities: [] };
  const city = { id: "c", slug: "c", name: "C", uf: null, values: {} };

  it("is false when no city has ever published", () => {
    expect(hasAnyPublication({ ...base, cities: [ { ...city, last_published_at: null } ] })).toBe(false);
    expect(hasAnyPublication(base)).toBe(false);
  });

  it("is true when at least one city published", () => {
    expect(hasAnyPublication({
      ...base,
      cities: [ { ...city, last_published_at: null }, { ...city, id: "d", last_published_at: "2026-09-30T05:02:12Z" } ]
    })).toBe(true);
  });
});
