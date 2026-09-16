// Cidades provisionadas (operador). Lista cross-tenant + resumo de atividade,
// com detalhe rico por cidade (recursos + KPIs com sparkline + timeline).
import { useState } from "react";
import { useCities } from "../hooks/useCities";
import { useCityDetail } from "../hooks/useCityDetail";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type Column } from "../components/DataTable";
import { StatusDot } from "../components/StatusDot";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { KpiGrid } from "../components/KpiGrid";
import { StatTile } from "../components/StatTile";
import { Panel } from "../components/Panel";
import { KeyValue } from "../components/KeyValue";
import { fmtNumber, fmtTime } from "../lib/format";
import type { CitySummary, CityDetailData } from "../lib/types";
import type { ModuleId } from "../shell/modules";

interface Props {
  onNavigate?: (id: ModuleId) => void;
}

export function Cities(_props: Props) {
  const [ selectedCityId, setSelectedCityId ] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useCities();

  if (selectedCityId) {
    return <CityDetail id={selectedCityId} onBack={() => setSelectedCityId(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Cidades" sub="cities" />
      {isLoading && <Skeleton rows={6} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}
      {data && data.data.cities.length === 0 && (
        <EmptyState
          title="Nenhuma cidade provisionada"
          sub="use Setup → Provisionar cidade para criar a primeira"
        />
      )}
      {data && data.data.cities.length > 0 && (
        <DataTable<CitySummary>
          cols={COLS}
          rows={data.data.cities}
          rowKey={(c) => c.id}
          onRowClick={(c) => setSelectedCityId(c.id)}
        />
      )}
    </div>
  );
}

const COLS: Column<CitySummary>[] = [
  { label: "Cidade", w: "1.4fr", render: (c) => (
      <span>{c.name}{c.uf ? ` · ${c.uf}` : ""}</span>
    ) },
  { label: "Status", w: "0.8fr", render: (c) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <StatusDot level={c.status === "active" ? "ok" : "warn"} /> {c.status}
      </span>
    ) },
  { label: "Canal", w: "1fr", render: (c) =>
      c.channel ? `${c.channel.active ? "ativo" : "inativo"} · ${c.channel.display_phone_number}` : "—" },
  { label: "Conversas", w: "0.7fr", align: "right", render: (c) => fmtNumber(c.metrics.conversations_active) },
  { label: "Triagens", w: "0.7fr", align: "right", render: (c) => fmtNumber(c.metrics.triages_done) },
  { label: "Mensagens", w: "0.7fr", align: "right", render: (c) => fmtNumber(c.metrics.inbound + c.metrics.outbound) },
  { label: "Eventos", w: "0.7fr", align: "right", render: (c) => fmtNumber(c.metrics.events) },
  { label: "Última atividade", w: "1fr", render: (c) => c.last_activity_at ? fmtTime(c.last_activity_at) : "—" }
];

function CityDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, isError, error, refetch } = useCityDetail(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onBack} style={backBtn}>← Cidades</button>
      {isLoading && <Skeleton rows={8} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}
      {data && <CityDetailBody d={data.data} asOf={data.as_of} />}
    </div>
  );
}

function CityDetailBody({ d, asOf }: { d: CityDetailData; asOf: string }) {
  const { city, resources, kpis, timeline } = d;
  return (
    <>
      <PageHeader title={`${city.name}${city.uf ? ` · ${city.uf}` : ""}`} sub={city.slug} />

      <KpiGrid>
        {kpis.map((k) => (
          <StatTile key={k.id} label={k.label} value={k.value} spark={k.spark} source="live" />
        ))}
      </KpiGrid>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }}>
        <Panel title="Recursos provisionados" asOf={asOf}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <KeyValue k="Status" v={city.status} />
            <KeyValue k="IBGE" v={city.ibge_code ?? "—"} />
            <KeyValue k="Canal" v={resources.channel ? `${resources.channel.display_phone_number} (${resources.channel.active ? "ativo" : "inativo"})` : "—"} />
            <KeyValue k="Termo LGPD" v={resources.consent_term ? `${resources.consent_term.version}` : "—"} />
            <KeyValue k="1º admin" v={resources.first_admin ? `${resources.first_admin.email} (${resources.first_admin.status})` : "—"} />
            <KeyValue k="Alertas" v={resources.alert_recipients.length ? resources.alert_recipients.map((a) => `${a.channel}:${a.destination}`).join(", ") : "—"} />
            <KeyValue k="Protocolos ativos" v={resources.protocols_active.length ? resources.protocols_active.map((p) => `${p.name} v${p.version}`).join(", ") : "—"} />
          </div>
        </Panel>

        <Panel title="Atividade recente" asOf={asOf}>
          {timeline.length === 0 ? (
            <EmptyState title="Sem eventos no histórico" />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {timeline.map((e, i) => (
                <li key={i} style={{ display: "flex", flexDirection: "column", gap: 2, borderBottom: "1px solid var(--rule)", paddingBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>{e.type}</span>
                  <span style={{ fontSize: 12, color: "var(--ink2)" }}>{e.summary}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink3)" }}>{fmtTime(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

const backBtn: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "transparent", color: "var(--ink2)", fontSize: 12, cursor: "pointer", alignSelf: "flex-start"
};
