// Cidades do catálogo (operador). Sem métricas cross-tenant: o console mostra
// estado de provisionamento e leva o operador para dentro da cidade (Plano 6,
// spec §5). Módulo 16: "Ficha" abre a ficha da cidade (modo de prontuário,
// IBGE, PEC e interruptores), por estado local — o console não tem roteador.
import { useState } from "react";
import { useCities } from "../hooks/useCities";
import { enterCity, sortedForDisplay } from "../lib/cities";
import { recordModeLabel } from "../lib/recordSettings";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type Column } from "../components/DataTable";
import { StatusDot } from "../components/StatusDot";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { fmtTime } from "../lib/format";
import type { CityRow } from "../lib/types";
import { CityRecord } from "./cities/CityRecord";

export function Cities() {
  const { data, isLoading, isError, error, refetch } = useCities();
  const [ busySlug, setBusySlug ] = useState<string | null>(null);
  const [ failure, setFailure ] = useState<string | null>(null);
  const [ openId, setOpenId ] = useState<string | null>(null);

  // Pelo id: quando a lista recarrega, a ficha aberta recebe a linha nova.
  const open = openId ? data?.find((c) => c.id === openId) : undefined;
  if (open) return <CityRecord city={open} onBack={() => setOpenId(null)} />;

  async function onEnter(city: CityRow) {
    setBusySlug(city.slug);
    setFailure(null);
    try {
      await enterCity(city.slug, (url) => { window.location.href = url; });
    } catch {
      setFailure(`Não foi possível entrar em ${city.name}. O grant vale 60 s — tente de novo.`);
    } finally {
      setBusySlug(null);
    }
  }

  const cols: Column<CityRow>[] = [
    { label: "Cidade", w: "1.4fr", render: (c) => <span>{c.name}{c.uf ? ` · ${c.uf}` : ""}</span> },
    { label: "Slug", w: "1fr", render: (c) => <span className="mono">{c.slug}</span> },
    { label: "Status", w: "0.9fr", render: (c) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatusDot level={c.status === "active" ? "ok" : "warn"} /> {c.status}
        </span>
      ) },
    { label: "Prontuário", w: "1.1fr", render: (c) => recordModeLabel(c.record_mode) },
    { label: "Schema", w: "0.7fr", render: (c) => <span className="mono">{c.schema_version ?? "—"}</span> },
    { label: "Fuso", w: "1fr", render: (c) => <span className="mono">{c.time_zone ?? "—"}</span> },
    { label: "Criada", w: "1fr", render: (c) => c.created_at ? fmtTime(c.created_at) : "—" },
    { label: "", w: "1.2fr", align: "right", render: (c) => (
        <span style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            aria-label={`Ficha de ${c.name}`}
            onClick={() => setOpenId(c.id)}
            style={enterBtn}
          >
            Ficha
          </button>
          <button
            type="button"
            disabled={c.status !== "active" || busySlug === c.slug}
            onClick={() => { void onEnter(c); }}
            style={enterBtn}
          >
            {busySlug === c.slug ? "Entrando…" : "Entrar"}
          </button>
        </span>
      ) }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Cidades" sub="catálogo da plataforma" />
      {isLoading && <Skeleton rows={6} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}
      {failure && <p role="alert" style={{ color: "var(--down)", fontSize: 12, margin: 0 }}>{failure}</p>}
      {data && data.length === 0 && (
        <EmptyState title="Nenhuma cidade provisionada" sub="use Setup → Provisionar cidade para criar a primeira" />
      )}
      {data && data.length > 0 && (
        <DataTable<CityRow> cols={cols} rows={sortedForDisplay(data)} rowKey={(c) => c.id} />
      )}
    </div>
  );
}

const enterBtn: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "var(--panel)", color: "var(--ink)", fontSize: 12, cursor: "pointer"
};
