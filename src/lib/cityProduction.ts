// Regras da tela "Produção das cidades" (módulo 16, spec §6.5; contratos
// §4.3). Puras: nenhum React, nenhum fetch, nenhuma data.
//
// O alerta de cada competência vem pronto do api (none | attention |
// critical) e o da SIGTAP também (sigtap_alert: dia ≥ 5 em America/Sao_Paulo,
// calculado no api); a tela só ordena, rotula e conta. As competências já vêm
// com a corrente primeiro; a ordenação aqui é rede de segurança.
//
// deadline_on segue a tabela oficial do SIAPS quando o api a tem; quando a
// estimativa por dias úteis (deadline_estimated_on) diverge dela, a tela
// mostra um aviso (deadlineDivergence), nunca silêncio.

import type {
  CityProductionCity, CityProductionData, CityProductionTerminology, CompetenceSummary
} from "./api";

export function fmtCompetence(c: string): string {
  return /^\d{6}$/.test(c) ? `${c.slice(4, 6)}/${c.slice(0, 4)}` : c;
}

// "YYYY-MM-DD" → "DD/MM/YYYY" por texto: new Date("2026-11-14") é meia-noite
// UTC, que em São Paulo ainda é dia 13.
export function fmtDay(iso: string): string {
  const [ y, m, d ] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function deadlineText(c: CompetenceSummary): string {
  const day = fmtDay(c.deadline_on);
  const left = c.business_days_left;
  if (left < 0) return `${day} · prazo vencido`;
  if (left === 0) return `${day} · último dia`;
  if (left === 1) return `${day} · 1 dia útil`;
  return `${day} · ${left} dias úteis`;
}

export function deadlineDivergence(c: CompetenceSummary): string | null {
  const est = c.deadline_estimated_on;
  if (!est || est === c.deadline_on) return null;
  return `tabela do SIAPS diverge da estimativa por dias úteis (${fmtDay(est)})`;
}

export interface AlertView {
  label: string;
  tone: "neutral" | "warn" | "down";
}

const ALERTS: Record<string, AlertView> = {
  none: { label: "sem alerta", tone: "neutral" },
  attention: { label: "atenção", tone: "warn" },
  critical: { label: "crítico", tone: "down" }
};

export function alertView(alert: string): AlertView {
  return ALERTS[alert] ?? { label: alert, tone: "neutral" };
}

export interface ProductionRow {
  key: string;
  slug: string;
  name: string;
  record_mode: string;
  city_unreachable: boolean;
  competence: CompetenceSummary | null;
}

const RANK: Record<string, number> = { critical: 0, attention: 1, none: 2 };

function worst(city: CityProductionCity): number {
  return Math.min(2, ...city.competences.map((c) => RANK[c.alert] ?? 2));
}

// Cidade com alerta pior primeiro, depois por nome; dentro da cidade, a
// competência mais nova primeiro. Cidade sem competência vira UMA linha
// (competence: null) — nunca some da tabela.
export function productionRows(data: CityProductionData): ProductionRow[] {
  const cities = [ ...data.cities ].sort(
    (a, b) => worst(a) - worst(b) || a.name.localeCompare(b.name, "pt-BR")
  );
  return cities.flatMap((city): ProductionRow[] => {
    const base = {
      slug: city.slug, name: city.name, record_mode: city.record_mode,
      city_unreachable: city.city_unreachable === true
    };
    if (city.competences.length === 0) return [ { key: `${city.slug}:none`, ...base, competence: null } ];
    return [ ...city.competences ]
      .sort((x, y) => y.competence.localeCompare(x.competence))
      .map((c) => ({ key: `${city.slug}:${c.competence}`, ...base, competence: c }));
  });
}

export function countAlerts(data: CityProductionData): { critical: number; attention: number } {
  let critical = 0;
  let attention = 0;
  for (const city of data.cities) {
    const w = worst(city);
    if (w === 0) critical += 1;
    else if (w === 1) attention += 1;
  }
  return { critical, attention };
}

export interface SigtapNotice {
  tone: "warn" | "info";
  text: string;
}

export function sigtapNotice(t: CityProductionTerminology): SigtapNotice | null {
  if (t.sigtap_imported) return null;
  const competence = fmtCompetence(t.sigtap_current_competence);
  if (t.sigtap_alert) {
    return {
      tone: "warn",
      text: `SIGTAP da competência ${competence} não importada. Até a importação, a conferência de ` +
        "procedimentos usa a versão anterior. Importe no api com terminology:import."
    };
  }
  return { tone: "info", text: `SIGTAP da competência ${competence} ainda não importada (vira alerta no dia 5).` };
}
