// AppShell: estado de escopo (período + município) e módulo ativo.
//
// Plano 6 (fix wave, Important #1): o console (admin.*) não abre mais em
// "Visão geral" (city-scoped, 404 em admin.*) — abre em "Cidades", o único
// módulo que responde nesse host. useAlerts() (que consumia /queues e
// /health, ambos city-scoped) também saiu daqui; ver AppHeader (prop
// `alerts` agora opcional).

import { useState } from "react";
import { ScopeContext, type PeriodKey } from "./lib/scope";
import { AppHeader } from "./shell/AppHeader";
import type { ModuleId } from "./shell/modules";
import { Overview } from "./modules/Overview";
import { Ingestion } from "./modules/Ingestion";
import { Conversations } from "./modules/Conversations";
import { Consent } from "./modules/Consent";
import { Triages } from "./modules/Triages";
import { Classification } from "./modules/Classification";
import { Protocols } from "./modules/Protocols";
import { Queues } from "./modules/Queues";
import { Events } from "./modules/Events";
import { Health } from "./modules/Health";
import { ProvisionMunicipality } from "./modules/setup/ProvisionMunicipality";
import { Members } from "./modules/setup/Members";
import { MfaEnroll } from "./modules/setup/MfaEnroll";
import { Cities } from "./modules/Cities";

export function App() {
  const [ period, setPeriod ] = useState<PeriodKey>("7d");
  const [ active, setActive ] = useState<ModuleId>("cities");

  // O ScopeContext herdado espera setMunicipality como string | "all".
  // O console não tem mais noção de município ativo (era plumbing inerte,
  // Plano 6 fix wave); o switch real de cidade é o grant de 60s, não um
  // estado de sessão. Aqui só refletimos pro shell legado.
  return (
    <ScopeContext.Provider
      value={{
        period,
        municipalityId: "default",
        setPeriod,
        setMunicipality: () => { /* console não tem município ativo */ }
      }}
    >
      <ShellInner active={active} setActive={setActive} />
    </ScopeContext.Provider>
  );
}

function ShellInner({ active, setActive }: { active: ModuleId; setActive: (id: ModuleId) => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppHeader active={active} onSelect={setActive} />
      <main style={{ padding: "22px 24px 48px", flex: 1, width: "100%" }}>
        {renderModule(active, setActive)}
      </main>
    </div>
  );
}

function renderModule(id: ModuleId, onNavigate: (id: ModuleId) => void) {
  switch (id) {
    case "overview":       return <Overview onNavigate={onNavigate} />;
    case "ingestion":      return <Ingestion />;
    case "conversations":  return <Conversations />;
    case "consent":        return <Consent />;
    case "triages":        return <Triages />;
    case "classification": return <Classification />;
    case "protocols":      return <Protocols />;
    case "queues":         return <Queues />;
    case "events":         return <Events />;
    case "health":         return <Health />;
    case "setup_provision": return <ProvisionMunicipality />;
    case "setup_members":   return <Members />;
    case "setup_mfa":       return <MfaEnroll />;
    case "cities": return <Cities />;
  }
}
