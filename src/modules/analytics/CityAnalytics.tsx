// Analytics das cidades (módulo 14, F-14.8) — só leitura. Fala com
// GET /city_analytics (PlatformConsoleHost, operador). Mostra os seis
// indicadores semanais que cada cidade publica na plataforma, da cidade
// inteira, já suprimidos na origem (ADR 0025): o console nunca vê bairro,
// unidade, protocolo ou pergunta, e o número de 1 a 4 nunca chega aqui.
//
// Sem from/to: o servidor devolve as 12 semanas que terminam na semana
// anterior à atual. O seletor escolhe entre elas (a mais recente por
// padrão); cada célula mostra a semana escolhida e a tendência de todas.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCityAnalytics, type CityAnalyticsCity } from "../../lib/api";
import { fmtWeek, hasAnyPublication, indicatorLabel } from "../../lib/cityAnalytics";
import { fmtDateTime } from "../../lib/format";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton } from "../../components/Skeleton";
import { IndicatorCell } from "./IndicatorCell";

export function CityAnalytics() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [ "city_analytics" ],
    queryFn: listCityAnalytics,
    staleTime: 60_000
  });
  const [ picked, setPicked ] = useState<string | null>(null);

  const weeks = data?.weeks ?? [];
  const week = picked !== null && weeks.includes(picked) ? picked : weeks[weeks.length - 1];
  const weekIndex = week === undefined ? -1 : weeks.indexOf(week);

  const cols: Column<CityAnalyticsCity>[] = [
    { label: "Cidade", w: "1.2fr", render: (c) => <span>{c.name}{c.uf ? ` · ${c.uf}` : ""}</span> },
    ...(data?.indicators ?? []).map((indicator): Column<CityAnalyticsCity> => ({
      label: indicatorLabel(indicator),
      w: "1fr",
      render: (c) => (
        <IndicatorCell indicator={indicator} values={c.values[indicator]} weekIndex={weekIndex} weeks={weeks.length} />
      )
    })),
    {
      label: "Publicado em",
      w: "1fr",
      render: (c) => (c.last_published_at ? fmtDateTime(c.last_published_at) : "nunca publicou")
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Analytics das cidades" sub="indicadores publicados · semanal" />
      <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
        Seis indicadores da cidade inteira, publicados uma vez por dia por cada cidade, com dados até
        o dia anterior. O console não vê bairro, unidade, protocolo nem resposta de triagem.
      </p>

      {isLoading && <Skeleton rows={6} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}

      {data && data.cities.length === 0 && <EmptyState title="Nenhuma cidade ativa." />}

      {data && data.cities.length > 0 && !hasAnyPublication(data) && (
        <EmptyState
          title="Nenhuma cidade publicou indicadores ainda."
          sub="a consolidação roda todo dia às 2h (America/Sao_Paulo); no primeiro deploy, rode city:analytics:rebuild:all"
        />
      )}

      {data && data.cities.length > 0 && hasAnyPublication(data) && (
        <>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
            <span aria-hidden="true">Semana</span>
            <select
              aria-label="Semana"
              value={week ?? ""}
              onChange={(e) => setPicked(e.target.value)}
              className="mono"
              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--rule2)", background: "var(--panel)", color: "var(--ink)" }}
            >
              {[ ...weeks ].reverse().map((w) => (
                <option key={w} value={w}>{`semana de ${fmtWeek(w)}`}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink3)", margin: 0 }}>
            "oculto": contagem de 1 a 4, suprimida na cidade antes de sair dela. "sem dado": a cidade não publicou o indicador naquela semana, ou a taxa não tinha denominador. Na tendência, os dois aparecem como lacuna.
          </p>
          <DataTable<CityAnalyticsCity> cols={cols} rows={data.cities} rowKey={(c) => c.id} />
        </>
      )}
    </div>
  );
}
