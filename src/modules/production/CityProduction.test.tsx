import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, listCityProduction: vi.fn() };
});

import { listCityProduction, ApiError, type CityProductionData, type CompetenceSummary } from "../../lib/api";
import { CityProduction } from "./CityProduction";

const mocked = vi.mocked(listCityProduction);

function comp(over: Partial<CompetenceSummary>): CompetenceSummary {
  return {
    competence: "202610", deadline_on: "2026-11-14", business_days_left: 7,
    accepted: 120, rejected: 3, pending: 10, failed: 0, alert: "none", ...over
  };
}

const DATA: CityProductionData = {
  cities: [
    { slug: "maringa", name: "Maringá", record_mode: "integrated",
      competences: [ comp({ alert: "attention", business_days_left: 0 }),
                     comp({ competence: "202609", deadline_on: "2026-10-14", business_days_left: -1, accepted: 1234 }) ] },
    { slug: "curitiba", name: "Curitiba", record_mode: "record",
      competences: [ comp({ alert: "critical", business_days_left: 1, accepted: 0 }) ] },
    { slug: "nova", name: "Nova", record_mode: "off", competences: [] }
  ],
  terminology: { sigtap_current_competence: "202610", sigtap_imported: true, sigtap_alert: false }
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CityProduction /></QueryClientProvider>);
}

function rowsText(): string[] {
  return screen.getAllByRole("row").slice(1).map((r) => r.textContent ?? "");
}

function cellsOf(rowIndex: number): string[] {
  const row = screen.getAllByRole("row").slice(1)[rowIndex];
  return Array.from(row.children).map((c) => c.textContent ?? "");
}

describe("CityProduction", () => {
  beforeEach(() => { mocked.mockReset(); });
  afterEach(() => { cleanup(); });

  it("lists critical first, with mode, competence, counts and alert", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen();

    expect(await screen.findByText("1 em alerta crítico · 1 em atenção")).toBeTruthy();
    const rows = rowsText();
    expect(rows[0]).toContain("Curitiba");
    expect(rows[0]).toContain("Prontuário Rota Saúde");
    expect(rows[0]).toContain("10/2026");
    expect(rows[0]).toContain("crítico");
    expect(rows[1]).toContain("Maringá");
    expect(rows[1]).toContain("atenção");
    expect(rows[2]).toContain("09/2026");
    expect(rows[2]).toContain("1.234");
    for (const label of [ "Aceitas", "Recusadas", "Pendentes", "Enviando", "Falhas", "Prazo", "Alerta" ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("deadline edges and a city without competences", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen();

    await screen.findByText("1 em alerta crítico · 1 em atenção");
    const rows = rowsText();
    expect(rows[0]).toContain("14/11/2026 · 1 dia útil");
    expect(rows[1]).toContain("14/11/2026 · último dia");
    expect(rows[2]).toContain("14/10/2026 · prazo vencido");
    expect(rows[3]).toContain("Nova");
    expect(rows[3]).toContain("Desligado");
    expect(rows[3]).toContain("sem fichas");
  });

  it("explains attention and critical", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen();

    expect(await screen.findByText(/Atenção: até 5 dias úteis do prazo com ficha pendente, recusada ou com falha/)).toBeTruthy();
    expect(screen.getByText(/Crítico: modo Prontuário Rota Saúde e nenhuma ficha aceita a até 3 dias úteis do prazo/)).toBeTruthy();
  });

  it("shows Enviando right after Pendentes, with a dash when absent", async () => {
    mocked.mockResolvedValue({
      ...DATA,
      cities: [
        { slug: "a", name: "Aaa", record_mode: "record", competences: [ comp({ pending: 10, sending: 4 }) ] },
        { slug: "b", name: "Bbb", record_mode: "record", competences: [ comp({ pending: 7 }) ] },
        { slug: "c", name: "Ccc", record_mode: "off", competences: [] }
      ]
    });
    renderScreen();

    await screen.findByText("Aaa");
    const headers = Array.from(screen.getAllByRole("row")[0].children).map((c) => c.textContent);
    const i = headers.indexOf("Enviando");
    expect(headers[i - 1]).toBe("Pendentes");
    expect(cellsOf(0)[i]).toBe("4");
    expect(cellsOf(1)[i]).toBe("—");
    expect(cellsOf(2)[i]).toBe("—");
  });

  it("shows the deadline divergence below the deadline only when present", async () => {
    mocked.mockResolvedValue({
      ...DATA,
      cities: [
        { slug: "a", name: "Aaa", record_mode: "record",
          competences: [ comp({ deadline_on: "2026-11-14", deadline_estimated_on: "2026-11-13" }) ] },
        { slug: "b", name: "Bbb", record_mode: "record", competences: [ comp({}) ] }
      ]
    });
    renderScreen();

    await screen.findByText("Aaa");
    const rows = rowsText();
    expect(rows[0]).toContain("tabela do SIAPS diverge da estimativa por dias úteis (13/11/2026)");
    expect(rows[1]).not.toContain("diverge");
  });

  it("says the city is unreachable instead of 'sem fichas'", async () => {
    mocked.mockResolvedValue({
      ...DATA,
      cities: [
        { slug: "a", name: "Aaa", record_mode: "record", competences: [], city_unreachable: true },
        { slug: "b", name: "Bbb", record_mode: "off", competences: [] }
      ]
    });
    renderScreen();

    await screen.findByText("Aaa");
    const rows = rowsText();
    expect(rows[0]).toContain("cidade inalcançável");
    expect(rows[0]).not.toContain("sem fichas");
    expect(rows[1]).toContain("sem fichas");
    expect(rows[1]).not.toContain("inalcançável");
  });

  it("SIGTAP notice: alert when the api flags it, nothing when imported", async () => {
    mocked.mockResolvedValue({ ...DATA, terminology: { sigtap_current_competence: "202610", sigtap_imported: false, sigtap_alert: true } });
    renderScreen();

    expect((await screen.findByRole("alert")).textContent).toContain("SIGTAP da competência 10/2026 não importada");
    cleanup();

    mocked.mockResolvedValue({ ...DATA, terminology: { sigtap_current_competence: "202610", sigtap_imported: false, sigtap_alert: false } });
    renderScreen();
    expect((await screen.findByRole("status")).textContent).toContain("ainda não importada (vira alerta no dia 5)");
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();

    mocked.mockResolvedValue(DATA);
    renderScreen();
    await screen.findByText("1 em alerta crítico · 1 em atenção");
    expect(screen.queryByText(/SIGTAP/)).toBeNull();
  });

  it("shows the empty state when there is no active city", async () => {
    mocked.mockResolvedValue({ ...DATA, cities: [] });
    renderScreen();

    expect(await screen.findByText("Nenhuma cidade ativa.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the error state when the request fails", async () => {
    mocked.mockRejectedValue(new ApiError(500, "", "500 on /city_production"));
    renderScreen();

    expect(await screen.findByText("Falha ao carregar")).toBeTruthy();
    expect(screen.getByText("500 on /city_production")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
