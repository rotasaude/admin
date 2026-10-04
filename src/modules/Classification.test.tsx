import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

vi.mock("../hooks/useClassification", () => ({ useClassification: vi.fn() }));
vi.mock("../hooks/useTriageTrail", () => ({ useTriageTrail: vi.fn(() => ({})) }));
vi.mock("../components/Sparkline", () => ({
  Sparkline: ({ data }: { data: number[] }) => <span data-testid="spark" data-points={JSON.stringify(data)} />
}));

import { useClassification } from "../hooks/useClassification";
import { Classification } from "./Classification";
import type { ClassificationData } from "../lib/types";

const mocked = vi.mocked(useClassification);

// Contrato novo de GET /admin/api/classification (módulo 05, api bd706e5):
// tiers são vocabulário livre do protocolo, a urgência é priority ≤ N.
const DATA: ClassificationData = {
  tiers: [
    { key: "alta", label: "alta", count: 7, tone: "down" },
    { key: "baixa", label: "baixa", count: 12, tone: "info" },
    { key: "sem tier", label: "sem tier", count: 1, tone: "neutral" }
  ],
  tierKeys: [ "alta", "baixa", "sem tier" ],
  urgent: 5,
  urgentMaxPriority: 2,
  urgentTrend: [ 1, 0, 4 ],
  byProtocol: [
    { protocol: "dor-toracica · 3", counts: { alta: 7, baixa: 9 } },
    { protocol: "febre · 1", counts: { baixa: 3, "sem tier": 1 } }
  ],
  byMode: [ { mode: "weighted", label: "weighted", count: 20, share: 100 } ],
  sampleTriages: [
    { id: "aaaaaaaaaaaa-1", tier: "alta", priority: 1, urgent: true, mode: "weighted", protocol: "dor-toracica · 3", at: "10:00" },
    { id: "bbbbbbbbbbbb-2", tier: "baixa", priority: 4, urgent: false, mode: "weighted", protocol: "febre · 1", at: "09:00" },
    { id: "cccccccccccc-3", tier: null, priority: null, urgent: false, mode: null, protocol: "febre · 1", at: null }
  ]
};

function stub(data: ClassificationData) {
  mocked.mockReturnValue({
    data: { data, as_of: "2026-10-04T10:00:00Z" },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useClassification>);
}

function rowOf(text: string) {
  return screen.getAllByRole("row").find((r) => r.textContent?.includes(text))!;
}

describe("Classification", () => {
  beforeEach(() => { mocked.mockReset(); });
  afterEach(() => { cleanup(); });

  it("shows the urgent KPI with the urgency ceiling and its trend", () => {
    stub(DATA);
    render(<Classification />);
    const label = screen.getByText("Casos urgentes (priority ≤ 2)");
    const tile = label.parentElement!.parentElement!;
    expect(tile.textContent).toContain("5");
    expect(within(tile).getByTestId("spark").dataset.points).toBe("[1,0,4]");
    expect(screen.queryByText("Casos priority")).toBeNull();
  });

  it("pivots tier by protocol on the tierKeys, not on low/medium/high", () => {
    stub(DATA);
    render(<Classification />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining([ "alta", "baixa", "sem tier" ]));
    for (const legacy of [ "Low", "Medium", "High" ]) expect(headers).not.toContain(legacy);

    const cells = (text: string) => Array.from(rowOf(text).children).map((c) => c.textContent);
    expect(cells("dor-toracica · 3")).toEqual([ "dor-toracica · 3", "7", "9", "0" ]);
    expect(cells("febre · 1")).toEqual([ "febre · 1", "0", "3", "1" ]);
  });

  it("shows the integer priority in the sample and marks the urgent ones", () => {
    stub(DATA);
    render(<Classification />);
    expect(rowOf("aaaaaaaaaaaa").textContent).toContain("1 · urgente");
    const notUrgent = rowOf("bbbbbbbbbbbb").textContent!;
    expect(notUrgent).toContain("4");
    expect(notUrgent).not.toContain("urgente");
    expect(rowOf("cccccccccccc").textContent).not.toContain("urgente");
  });

  it("says the sample is hidden when the api suppresses it", () => {
    stub({ ...DATA, sampleTriages: null });
    render(<Classification />);
    expect(screen.getByText("amostra oculta")).toBeTruthy();
  });
});
