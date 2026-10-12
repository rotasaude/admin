// AppShell: estado de escopo (período) e rota do shell.
//
// O console abre no Início (cards dos grupos; spec do subprojeto 2 do ciclo
// de interface). As telas city-scoped (Visão geral, Filas, Saúde…) seguem no
// switch, mas 404 em admin.* e não estão no menu nem são alcançáveis pelo
// hash. useAlerts() (city-scoped) não roda aqui: o sino recebe listas vazias.

import { useCallback, useMemo, useState } from "react";
import { ScopeContext, PERIOD_OPTIONS, useScope, type PeriodKey } from "./lib/scope";
import { useAuth } from "./lib/auth";
import { NAV_GROUPS, type ModuleId } from "./shell/modules";
import { Shell } from "./shell/Shell";
import { ContextStrip } from "./shell/ContextStrip";
import { LiveClock } from "./shell/LiveClock";
import { ContaMenu } from "./shell/ContaMenu";
import { HomeCards, GroupCards } from "./shell/Cards";
import { A11yPage } from "./shell/A11yPage";
import { SegmentedControl } from "./shell/SegmentedControl";
import { NotificationCenter } from "./shell/NotificationCenter";
import { CATALOG } from "./shell/catalog";
import { slugOf, useHashRoute, type Route } from "./shell/router";
import type { ShellGroup } from "./shell/types";
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
import { MfaEnroll } from "./modules/setup/MfaEnroll";
import { Cities } from "./modules/Cities";
import { ProvisionCity } from "./modules/setup/ProvisionCity";
import { RegisterChannel } from "./modules/setup/RegisterChannel";
import { UnknownChannels } from "./modules/setup/UnknownChannels";
import { CityAnalytics } from "./modules/analytics/CityAnalytics";
import { CityProduction } from "./modules/production/CityProduction";

// Pelo endereço, só as telas do menu. setup_mfa fica de fora: MfaEnroll não
// funciona em admin.* (ver o arquivo) e nada navega até ele.
export const ROUTABLE_IDS: ReadonlySet<string> = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)));
const ALL_SLUGS: ReadonlySet<string> = new Set(NAV_GROUPS.map((g) => slugOf(g.label)));

// Mesmo filtro do AppHeader antigo: item com `visible` exige usuário.
export function shellGroupsFor(user: { operator: boolean; memberships: { role: string }[] } | null): ShellGroup[] {
  return NAV_GROUPS.map((g) => ({
    label: g.label,
    slug: slugOf(g.label),
    items: g.items
      .filter((it) => !it.visible || (user ? it.visible({ operator: user.operator, memberships: user.memberships }) : false))
      .map((it) => ({ id: it.id, label: it.label }))
  })).filter((g) => g.items.length > 0);
}

export function App() {
  const [ period, setPeriod ] = useState<PeriodKey>("7d");
  // O console não tem noção de cidade ativa; o switch real de cidade é o
  // grant de 60s, não um estado de sessão.
  return (
    <ScopeContext.Provider value={{ period, setPeriod }}>
      <ShellInner />
    </ScopeContext.Provider>
  );
}

function ShellInner() {
  const auth = useAuth();
  const scope = useScope();
  const groups = useMemo(() => shellGroupsFor(auth.user), [ auth.user ]);
  const isAllowed = useCallback((r: Route<ModuleId>) => {
    if (r.kind === "home" || r.kind === "a11y") return true;
    if (r.kind === "group") return groups.some((g) => g.slug === r.slug);
    return groups.some((g) => g.items.some((i) => i.id === r.id));
  }, [ groups ]);
  const { route, go } = useHashRoute<ModuleId>({ ids: ROUTABLE_IDS, slugs: ALL_SLUGS, isAllowed });
  const navigate = useCallback((id: ModuleId) => go({ kind: "screen", id }), [ go ]);
  // As peças do shell só produzem ids vindos dos próprios grupos (ModuleId).
  const goShell = go as (r: Route) => void;
  const titleFor = (id: string) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id;

  let content;
  if (route.kind === "home") content = <HomeCards groups={groups} catalog={CATALOG} go={goShell} />;
  else if (route.kind === "a11y") content = <A11yPage contact="Fale com a equipe da plataforma." />;
  else if (route.kind === "group") {
    const group = groups.find((g) => g.slug === route.slug);
    content = group ? <GroupCards group={group} catalog={CATALOG} go={goShell} /> : null;
  } else content = renderModule(route.id, navigate);

  return (
    <Shell product="Admin Console" groups={groups} catalog={CATALOG} route={route} go={goShell} titleFor={titleFor}
      context={<ContextStrip
        left={<SegmentedControl options={PERIOD_OPTIONS} value={scope.period} onChange={scope.setPeriod} />}
        right={<LiveClock />} />}
      notifications={<NotificationCenter active={[]} limitations={[]} onNavigate={navigate} />}
      account={auth.user ? <ContaMenu email={auth.user.email_address} onLogout={() => { void auth.logout(); }} /> : null}>
      {content}
    </Shell>
  );
}

export function renderModule(id: ModuleId, onNavigate: (id: ModuleId) => void) {
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
    // Sem item de navegação: MfaEnroll não funciona no admin.* (ver o arquivo).
    case "setup_mfa":       return <MfaEnroll />;
    case "cities": return <Cities />;
    case "provision_city": return <ProvisionCity onNavigate={onNavigate} />;
    case "register_channel": return <RegisterChannel />;
    case "unknown_channels": return <UnknownChannels />;
    case "city_analytics": return <CityAnalytics />;
    case "city_production": return <CityProduction />;
  }
}
