// Números desconhecidos (só leitura) — phone_number_ids que bateram no webhook
// do WhatsApp sem canal registrado. Fala com GET /unknown_channels
// (PlatformConsoleHost, operador). Serve para achar o número que falta passar
// por "Registrar canal" ou uma WABA apontando o webhook para o lugar errado.

import { useQuery } from "@tanstack/react-query";
import { listUnknownChannels, type UnknownChannel } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton } from "../../components/Skeleton";
import { fmtDateTime, fmtNumber } from "../../lib/format";

const cols: Column<UnknownChannel>[] = [
  { label: "Phone number ID", w: "1.3fr", render: (r) => <span className="mono">{r.phone_number_id}</span> },
  { label: "Número exibido", w: "1.1fr", render: (r) => <span className="mono">{r.display_phone_number ?? "—"}</span> },
  { label: "Mensagens", w: "0.6fr", align: "right", render: (r) => <span className="mono">{fmtNumber(r.hits)}</span> },
  { label: "Primeira vez", w: "1fr", render: (r) => fmtDateTime(r.first_seen_at) },
  { label: "Última vez", w: "1fr", render: (r) => fmtDateTime(r.last_seen_at) }
];

export function UnknownChannels() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [ "unknown_channels" ],
    queryFn: listUnknownChannels,
    staleTime: 30_000
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Números desconhecidos" sub="setup" />
      <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
        Números (phone_number_id) que chegaram ao webhook do WhatsApp sem canal registrado.
        Em geral é um número ainda não cadastrado em “Registrar canal” ou uma WABA mal configurada.
      </p>
      {isLoading && <Skeleton rows={6} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="Nenhum número desconhecido recebido." />
      )}
      {data && data.length > 0 && (
        <DataTable<UnknownChannel> cols={cols} rows={data} rowKey={(r) => r.phone_number_id} />
      )}
    </div>
  );
}
