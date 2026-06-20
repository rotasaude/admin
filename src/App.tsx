// AppShell: estado de escopo (período + município), módulo ativo, e
// montagem da view ativa. useAlerts() consome /queues + /health para
// alimentar o NotificationCenter.

import { useState } from "react";
import { ScopeContext, type PeriodKey } from "./lib/scope";
import { AppHeader } from "./shell/AppHeader";
import type { ModuleId } from "./shell/modules";
import { useAlerts } from "./hooks/useAlerts";
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
import { useAuth } from "./lib/auth";

export function App() {
  const [ period, setPeriod ] = useState<PeriodKey>("7d");
  const { activeMunicipalityId } = useAuth();
  const [ active, setActive ] = useState<ModuleId>("overview");

  // O ScopeContext herdado espera setMunicipality como string | "all".
  // O switch real de cidade agora vive em AuthContext (com headers HTTP).
  // Aqui só refletimos pro shell legado.
  const muniForLegacy = activeMunicipalityId || "default";
  return (
    <ScopeContext.Provider
      value={{
        period,
        municipalityId: muniForLegacy,
        setPeriod,
        setMunicipality: () => { /* gerido pelo AuthContext */ }
      }}
    >
      <ShellInner active={active} setActive={setActive} />
    </ScopeContext.Provider>
  );
}

function ShellInner({ active, setActive }: { active: ModuleId; setActive: (id: ModuleId) => void }) {
  const alerts = useAlerts();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppHeader active={active} onSelect={setActive} alerts={alerts} />
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
  }
}
