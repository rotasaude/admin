import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// O ResponsiveContainer do Recharts não roda no jsdom (sem ResizeObserver).
// O dublê expõe os pontos que a célula passou.
vi.mock("../../components/Sparkline", () => ({
  Sparkline: ({ data }: { data: (number | null)[] }) => (
    <span data-testid="spark" data-points={JSON.stringify(data)} />
  )
}));

import { IndicatorCell } from "./IndicatorCell";

afterEach(cleanup);

describe("IndicatorCell", () => {
  it("shows the value of the chosen week", () => {
    render(<IndicatorCell indicator="triages_started" values={[ 100, 128 ]} weekIndex={0} weeks={2} />);
    expect(screen.getByText("100").getAttribute("data-kind")).toBe("value");
    expect(screen.queryByText("128")).toBeNull();
  });

  it("oculto e sem dado têm textos e marcas diferentes", () => {
    render(
      <>
        <IndicatorCell indicator="triages_started" values={[ { suppressed: true } ]} weekIndex={0} weeks={1} />
        <IndicatorCell indicator="triages_started" values={[ null ]} weekIndex={0} weeks={1} />
      </>
    );
    expect(screen.getByText("oculto").getAttribute("data-kind")).toBe("hidden");
    expect(screen.getByText("sem dado").getAttribute("data-kind")).toBe("missing");
    expect(screen.getByText("oculto").getAttribute("title")).toMatch(/1 a 4/);
  });

  it("rates show one decimal", () => {
    render(<IndicatorCell indicator="no_show_pct" values={[ 12 ]} weekIndex={0} weeks={1} />);
    expect(screen.getByText("12,0%")).toBeTruthy();
  });

  it("the trend covers every week, with gaps for oculto and sem dado", () => {
    render(
      <IndicatorCell indicator="triages_started" values={[ 90, { suppressed: true }, null, 0 ]} weekIndex={3} weeks={4} />
    );
    expect(screen.getByTestId("spark").getAttribute("data-points")).toBe("[90,null,null,0]");
  });

  it("no chosen week (weekIndex -1) is sem dado, not a crash", () => {
    render(<IndicatorCell indicator="triages_started" values={undefined} weekIndex={-1} weeks={0} />);
    expect(screen.getByText("sem dado")).toBeTruthy();
  });
});
