// Escopo do painel: período. Estado local da AppShell, propagado
// para todos os hooks via React Query key.

import { createContext, useContext } from "react";

export type PeriodKey = "today" | "7d" | "30d";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d",    label: "7 dias" },
  { key: "30d",   label: "30 dias" }
];

export interface Scope {
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
}

export const ScopeContext = createContext<Scope | null>(null);

export function useScope(): Scope {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope precisa estar dentro de <ScopeContext.Provider>");
  return ctx;
}

// Helper para query params consistentes em todos os hooks. O escopo é a
// cidade do host: não há cidade (nem município) a mandar.
export function scopeParams(scope: Scope): Record<string, string> {
  return { period: scope.period };
}
