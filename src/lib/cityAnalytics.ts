// Regras de exibição da tela "Analytics das cidades" (módulo 14, F-14.8).
// Puras: nenhum React, nenhum fetch. O formato dos dados é o de
// GET /city_analytics (contratos §2).
//
// Três estados por célula, e eles NUNCA se confundem:
//   - valor  → número (0 incluído: zero faltas é um dado);
//   - oculto → { suppressed: true }: contagem de 1 a 4 que a cidade não deixa
//              sair (ADR 0025); o número real nunca chega aqui;
//   - sem dado → null ou ausente: a cidade não publicou o indicador naquela
//              semana (ou a taxa não tinha denominador).
// Na tendência, oculto e sem dado viram LACUNA (null), nunca zero: um zero
// desenharia uma queda que não aconteceu.

import type { CityAnalyticsData, IndicatorValue } from "./api";
import { fmtNumber } from "./format";

export const INDICATOR_LABELS: Record<string, string> = {
  triages_started: "Triagens iniciadas",
  triages_completed: "Triagens concluídas",
  attendances_closed: "Atendimentos encerrados",
  wait_within_30_pct: "Espera até 30 min",
  no_show_pct: "Faltas",
  left_pct: "Saiu sem atendimento"
};

export function indicatorLabel(indicator: string): string {
  return INDICATOR_LABELS[indicator] ?? indicator;
}

export function isRate(indicator: string): boolean {
  return indicator.endsWith("_pct");
}

export type CellKind = "value" | "hidden" | "missing";

export interface CellView {
  kind: CellKind;
  text: string;
}

// Sempre 1 casa (12,0%), diferente do fmtPercent de format.ts, que corta o
// zero à direita (12%).
const rateFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function isSuppressed(v: IndicatorValue | undefined): v is { suppressed: true } {
  return typeof v === "object" && v !== null && v.suppressed === true;
}

export function cellView(indicator: string, v: IndicatorValue | undefined): CellView {
  if (isSuppressed(v)) return { kind: "hidden", text: "oculto" };
  if (typeof v !== "number" || Number.isNaN(v)) return { kind: "missing", text: "sem dado" };
  return { kind: "value", text: isRate(indicator) ? `${rateFmt.format(v)}%` : fmtNumber(v) };
}

export function trendPoints(values: IndicatorValue[] | undefined, length: number): (number | null)[] {
  return Array.from({ length }, (_, i) => {
    const v = values?.[i];
    return typeof v === "number" && !Number.isNaN(v) ? v : null;
  });
}

// "YYYY-MM-DD" → "DD/MM/YYYY" por texto. new Date("2026-07-06") é meia-noite
// UTC, que em São Paulo ainda é 05/07.
export function fmtWeek(weekStart: string): string {
  const [ y, m, d ] = weekStart.split("-");
  return `${d}/${m}/${y}`;
}

export function hasAnyPublication(data: CityAnalyticsData): boolean {
  return data.cities.some((c) => c.last_published_at !== null);
}
