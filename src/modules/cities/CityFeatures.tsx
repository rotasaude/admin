// Interruptores da cidade (módulo 16, ADR 0028) — SÓ LEITURA. Quem liga e
// desliga é o mantenedor, no maintenance (única porta de escrita). Aqui o
// operador vê o estado e o que falta, e resolve o que é dele na própria ficha
// (modo, IBGE, PEC). O `missing` vem do servidor.

import type { CityFeatureState } from "../../lib/types";
import { featureLabel, featureState, missingLabel } from "../../lib/recordSettings";
import { Tag } from "../../components/Tag";
import { EmptyState } from "../../components/EmptyState";

export function CityFeatures({ features }: { features: CityFeatureState[] | undefined }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, color: "var(--ink3)", margin: 0 }}>
        Quem liga e desliga os interruptores é o mantenedor, no maintenance. O console só mostra o
        estado e o que falta para cada funcionalidade funcionar.
      </p>
      {!features || features.length === 0 ? (
        <EmptyState title="Nenhum interruptor informado." sub="o api não devolveu interruptores para esta cidade" />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {features.map((f) => {
            const state = featureState(f);
            const missing = f.missing ?? [];
            return (
              <li
                key={f.key}
                aria-label={featureLabel(f.key)}
                style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{featureLabel(f.key)}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink3)" }}>{f.key}</span>
                  <Tag tone={state.tone}>{state.text}</Tag>
                </div>
                {missing.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                    {`falta: ${missing.map(missingLabel).join("; ")}`}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
