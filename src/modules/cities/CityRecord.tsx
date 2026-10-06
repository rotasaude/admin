// Ficha da cidade (módulo 16, ADR 0028). Abre de "Cidades" pelo botão
// "Ficha". Lê GET /cities/:id. O cabeçalho usa nome e UF da linha da lista,
// que já está carregada (o show devolve os mesmos campos). Depois de salvar, a ficha passa a mostrar a cidade que
// o PATCH devolveu (inclusive o `features`, que o servidor recalcula) e a
// lista de cidades é recarregada.

import { useQueryClient } from "@tanstack/react-query";
import { cityKey, useCity } from "../../hooks/useCities";
import type { CityDetail, CityRow } from "../../lib/types";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton } from "../../components/Skeleton";
import { CityFeatures } from "./CityFeatures";
import { RecordSettingsForm } from "./RecordSettingsForm";

interface Props {
  city: CityRow;
  onBack: () => void;
}

export function CityRecord({ city, onBack }: Props) {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useCity(city.id);

  function onSaved(updated: CityDetail) {
    qc.setQueryData(cityKey(city.id), updated);
    void qc.invalidateQueries({ queryKey: [ "cities" ] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <button type="button" aria-label="Voltar para Cidades" onClick={onBack} style={backBtn}>
          ← Cidades
        </button>
      </div>
      <PageHeader title={`${city.name}${city.uf ? ` · ${city.uf}` : ""}`} sub="ficha da cidade" />
      {isLoading && <Skeleton rows={4} />}
      {isError && <ErrorState message={(error as Error)?.message || "Erro"} onRetry={() => refetch()} />}
      {data && (
        <>
          <Panel title="Prontuário e e-SUS" sub="modo · código IBGE · endereço do PEC">
            <RecordSettingsForm city={data} onSaved={onSaved} />
          </Panel>
          <Panel title="Interruptores" sub="só leitura · quem liga é o maintenance">
            <CityFeatures features={data.features} />
          </Panel>
        </>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 8, border: "1px solid var(--rule2)",
  background: "var(--panel)", color: "var(--ink)", fontSize: 12, cursor: "pointer"
};
