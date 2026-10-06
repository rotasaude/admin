// Produção das cidades (módulo 16, spec §6.5; contratos §4.3) — só leitura.
// Fala com GET /city_production (PlatformConsoleHost, operador): resumo por
// cidade da competência corrente e da anterior (aceitas, recusadas,
// pendentes, falhas, prazo e alerta). Nenhuma ficha nem dado de cidadão chega
// ao console. O aviso de SIGTAP não importada vale para todas as cidades.

import { useQuery } from "@tanstack/react-query";
import { listCityProduction } from "../../lib/api";
import {
  alertView, countAlerts, deadlineDivergence, deadlineText, fmtCompetence, productionRows, sigtapNotice, type ProductionRow
} from "../../lib/cityProduction";
import { recordModeLabel } from "../../lib/recordSettings";
import { fmtNumber } from "../../lib/format";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton } from "../../components/Skeleton";
import { Tag } from "../../components/Tag";

type CountKey = "accepted" | "rejected" | "pending" | "failed";

function sending(r: ProductionRow): string {
  const n = r.competence?.sending;
  return typeof n === "number" ? fmtNumber(n) : "—";
}

function count(r: ProductionRow, key: CountKey): string {
  return r.competence ? fmtNumber(r.competence[key]) : "—";
}

export function CityProduction() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [ "city_production" ],
    queryFn: listCityProduction,
    staleTime: 60_000
  });

  const notice = data ? sigtapNotice(data.terminology) : null;
  const alerts = data ? countAlerts(data) : null;

  const cols: Column<ProductionRow>[] = [
    { label: "Cidade", w: "1.2fr", render: (r) => r.name },
    { label: "Modo", w: "1.1fr", render: (r) => recordModeLabel(r.record_mode) },
    { label: "Competência", w: "0.8fr", render: (r) => (
        r.competence
          ? <span className="mono">{fmtCompetence(r.competence.competence)}</span>
          : (r.city_unreachable ? "cidade inalcançável" : "sem fichas")
      ) },
    { label: "Prazo", w: "1.4fr", render: (r) => {
        if (!r.competence) return "—";
        const divergence = deadlineDivergence(r.competence);
        return (
          <>
            {deadlineText(r.competence)}
            {divergence && (
              <small style={{ display: "block", color: "var(--warn)", whiteSpace: "normal" }}>{divergence}</small>
            )}
          </>
        );
      } },
    { label: "Aceitas", w: "0.6fr", align: "right", render: (r) => count(r, "accepted") },
    { label: "Recusadas", w: "0.7fr", align: "right", render: (r) => count(r, "rejected") },
    { label: "Pendentes", w: "0.7fr", align: "right", render: (r) => count(r, "pending") },
    { label: "Enviando", w: "0.7fr", align: "right", render: (r) => sending(r) },
    { label: "Falhas", w: "0.6fr", align: "right", render: (r) => count(r, "failed") },
    { label: "Alerta", w: "0.8fr", render: (r) => {
        if (!r.competence) return "—";
        const view = alertView(r.competence.alert);
        return <Tag tone={view.tone}>{view.label}</Tag>;
      } }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Produção das cidades" sub="e-SUS APS · competência corrente e anterior" />
      <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
        Fichas enviadas ao PEC de cada cidade. O prazo é o 10º dia útil do mês seguinte à competência.
        Atenção: até 5 dias úteis do prazo com ficha pendente, recusada ou com falha. Crítico: modo Prontuário Rota
        Saúde e nenhuma ficha aceita a até 3 dias úteis do prazo.
      </p>

      {notice && (
        <div
          role={notice.tone === "warn" ? "alert" : "status"}
          style={{
            padding: "8px 10px", borderRadius: 6, fontSize: 12,
            background: notice.tone === "warn" ? "var(--down-bg)" : "var(--sunken)",
            color: notice.tone === "warn" ? "var(--down)" : "var(--ink2)"
          }}
        >
          {notice.text}
        </div>
      )}

      {isLoading && <Skeleton rows={6} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}

      {data && data.cities.length === 0 && <EmptyState title="Nenhuma cidade ativa." />}

      {data && alerts && data.cities.length > 0 && (
        <>
          <p className="mono" style={{ fontSize: 11, color: "var(--ink2)", margin: 0 }}>
            {`${alerts.critical} em alerta crítico · ${alerts.attention} em atenção`}
          </p>
          <DataTable<ProductionRow> cols={cols} rows={productionRows(data)} rowKey={(r) => r.key} />
        </>
      )}
    </div>
  );
}
