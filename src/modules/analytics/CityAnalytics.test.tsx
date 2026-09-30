import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, listCityAnalytics: vi.fn() };
});

vi.mock("../../components/Sparkline", () => ({
  Sparkline: ({ data }: { data: (number | null)[] }) => (
    <span data-testid="spark" data-points={JSON.stringify(data)} />
  )
}));

import { listCityAnalytics, ApiError, type CityAnalyticsData } from "../../lib/api";
import { CityAnalytics } from "./CityAnalytics";
import { fmtDateTime } from "../../lib/format";

const mocked = vi.mocked(listCityAnalytics);

function renderScreen(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const INDICATORS = [
  "triages_started", "triages_completed", "attendances_closed",
  "wait_within_30_pct", "no_show_pct", "left_pct"
];

const DATA: CityAnalyticsData = {
  weeks: [ "2026-09-14", "2026-09-21" ],
  indicators: INDICATORS,
  cities: [
    {
      id: "c1", slug: "curitiba", name: "Curitiba", uf: "PR",
      last_published_at: "2026-09-30T05:02:12Z",
      values: {
        triages_started: [ 100, 128 ],
        triages_completed: [ 90, { suppressed: true } ],
        attendances_closed: [ 80, null ],
        wait_within_30_pct: [ 50, 12.5 ],
        no_show_pct: [ 7, 0 ],
        left_pct: [ null, null ]
      }
    },
    { id: "c2", slug: "maringa", name: "Maringá", uf: "PR", last_published_at: null, values: {} }
  ]
};

describe("CityAnalytics", () => {
  beforeEach(() => { mocked.mockReset(); });
  afterEach(() => { cleanup(); });

  it("lists every city with the six indicator columns and the last publication", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    expect(await screen.findByText("Curitiba · PR")).toBeTruthy();
    expect(screen.getByText("Maringá · PR")).toBeTruthy();
    for (const label of [
      "Triagens iniciadas", "Triagens concluídas", "Atendimentos encerrados",
      "Espera até 30 min", "Faltas", "Saiu sem atendimento", "Publicado em"
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText(fmtDateTime("2026-09-30T05:02:12Z"))).toBeTruthy();
    expect(fmtDateTime("2026-09-30T05:02:12Z")).toBe("30/09/2026, 02:02");
  });

  it("opens on the most recent week", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    expect(await screen.findByText("128")).toBeTruthy();
    expect(screen.queryByText("100")).toBeNull();
    expect((screen.getByLabelText("Semana") as HTMLSelectElement).value).toBe("2026-09-21");
  });

  it("lists the weeks newest first, formatted without time zone shift", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    const select = (await screen.findByLabelText("Semana")) as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual([ "semana de 21/09/2026", "semana de 14/09/2026" ]);
  });

  it("switching the week shows that week's values", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    const select = await screen.findByLabelText("Semana");
    fireEvent.change(select, { target: { value: "2026-09-14" } });

    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("90")).toBeTruthy();
    expect(screen.getByText("50,0%")).toBeTruthy();
    expect(screen.getByText("7,0%")).toBeTruthy();
    expect(screen.queryByText("128")).toBeNull();
  });

  it("oculto e sem dado aparecem distintos; 0,0% aparece como valor", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    await screen.findByText("128");
    expect(screen.getAllByText("oculto")).toHaveLength(1);
    // Curitiba: attendances_closed e left_pct; Maringá: as seis.
    expect(screen.getAllByText("sem dado")).toHaveLength(8);
    expect(screen.getByText("12,5%")).toBeTruthy();
    expect(screen.getByText("0,0%")).toBeTruthy();
  });

  it("explains oculto and sem dado in a legend", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    await screen.findByText("128");
    expect(screen.getByText(/contagem de 1 a 4, suprimida na cidade/)).toBeTruthy();
    expect(screen.getByText(/não publicou o indicador naquela semana/)).toBeTruthy();
  });

  it("tendência leva null nas semanas ocultas e sem dado", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    await screen.findByText("128");
    const points = screen.getAllByTestId("spark").map((s) => s.getAttribute("data-points"));
    // Linha de Curitiba, na ordem de data.indicators.
    expect(points.slice(0, 6)).toEqual([
      "[100,128]", "[90,null]", "[80,null]", "[50,12.5]", "[7,0]", "[null,null]"
    ]);
  });

  it("cidade sem publicação: nunca publicou e sem dado, sem quebrar", async () => {
    mocked.mockResolvedValue(DATA);
    renderScreen(<CityAnalytics />);

    expect(await screen.findByText("nunca publicou")).toBeTruthy();
    const points = screen.getAllByTestId("spark").map((s) => s.getAttribute("data-points"));
    expect(points.slice(6)).toEqual(Array(6).fill("[null,null]"));
  });

  it("ninguém publicou: estado vazio explicado, sem tabela", async () => {
    mocked.mockResolvedValue({
      ...DATA,
      cities: DATA.cities.map((c) => ({ ...c, last_published_at: null, values: {} }))
    });
    renderScreen(<CityAnalytics />);

    expect(await screen.findByText("Nenhuma cidade publicou indicadores ainda.")).toBeTruthy();
    expect(screen.getByText(/consolidação roda todo dia às 2h30 \(America\/Sao_Paulo\)/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Semana")).toBeNull();
  });

  it("shows the empty state when there is no active city", async () => {
    mocked.mockResolvedValue({ ...DATA, cities: [] });
    renderScreen(<CityAnalytics />);

    expect(await screen.findByText("Nenhuma cidade ativa.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the error state when the request fails", async () => {
    mocked.mockRejectedValue(new ApiError(500, "", "500 on /city_analytics"));
    renderScreen(<CityAnalytics />);

    expect(await screen.findByText("Falha ao carregar")).toBeTruthy();
    expect(screen.getByText("500 on /city_analytics")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
