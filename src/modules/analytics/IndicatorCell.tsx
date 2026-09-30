// Célula da tabela "Analytics das cidades": o valor da semana escolhida em
// cima e a tendência das semanas que vieram (12 por padrão) embaixo.
// "oculto" e "sem dado" têm texto, cor e título próprios — nunca "0".

import type { IndicatorValue } from "../../lib/api";
import { cellView, trendPoints, type CellKind } from "../../lib/cityAnalytics";
import { Sparkline } from "../../components/Sparkline";

interface Props {
  indicator: string;
  values: IndicatorValue[] | undefined;
  weekIndex: number;
  weeks: number;
}

const TITLES: Record<CellKind, string | undefined> = {
  value: undefined,
  hidden: "contagem de 1 a 4, suprimida na cidade antes de sair dela",
  missing: "a cidade não publicou este indicador nesta semana"
};

const COLORS: Record<CellKind, string> = {
  value: "var(--ink)",
  hidden: "var(--ink3)",
  missing: "var(--ink4)"
};

export function IndicatorCell({ indicator, values, weekIndex, weeks }: Props) {
  const view = cellView(indicator, weekIndex >= 0 ? values?.[weekIndex] : undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span
        data-kind={view.kind}
        title={TITLES[view.kind]}
        className="mono"
        style={{
          fontSize: view.kind === "value" ? 12.5 : 11,
          fontStyle: view.kind === "hidden" ? "italic" : undefined,
          color: COLORS[view.kind]
        }}
      >
        {view.text}
      </span>
      <Sparkline data={trendPoints(values, weeks)} h={22} />
    </div>
  );
}
