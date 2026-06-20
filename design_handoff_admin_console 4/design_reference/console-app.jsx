// Rota Saúde · Admin Console — shell: sidebar nav, topbar, routing, tweaks, mount.

const NAV = [
  { group: "Visão geral", items: [
    { id: "overview", icon: "▦", label: "Visão geral" },
  ]},
  { group: "Aquisição", items: [
    { id: "ingestion",     icon: "↘", label: "Ingestão" },
    { id: "conversations", icon: "⇄", label: "Conversas" },
    { id: "consent",       icon: "✓", label: "Consentimento" },
  ]},
  { group: "Triagem", items: [
    { id: "triages",        icon: "≣", label: "Triagens" },
    { id: "classification", icon: "◔", label: "Classificação" },
  ]},
  { group: "Governança", items: [
    { id: "protocols", icon: "❏", label: "Protocolos" },
    { id: "events",    icon: "❖", label: "Eventos & auditoria" },
  ]},
  { group: "Operação", items: [
    { id: "queues", icon: "≋", label: "Filas & jobs" },
    { id: "health", icon: "◍", label: "Saúde" },
  ]},
];
const ALL_ITEMS = NAV.flatMap((s) => s.items);

const VIEWS = {
  overview: OverviewView, ingestion: IngestionView, conversations: ConversationsView,
  consent: ConsentView, triages: TriagesView, classification: ClassificationView,
  protocols: ProtocolsView, events: EventsView, queues: QueuesView, health: HealthView,
};
// subtitle per module (the §x.x reference)
const MODSUB = {
  overview: "§4.0 · KPIs por município e período", ingestion: "§4.1 · WhatsApp · ADR 0010/0011",
  conversations: "§4.2 · máquina de estados · ADR 0012", consent: "§4.3 · LGPD · ADR 0012",
  triages: "§4.4 · ADR 0006/0007/0013", classification: "§4.5 · scoring & trail · ADR 0015/0017",
  protocols: "§4.6 · cadastro & quatro olhos · ADR 0016", events: "§4.8 · domain_events · ADR 0003/0009",
  queues: "§4.7 · Solid Queue · ADR 0001/0008", health: "§4.9 · frescor & drift · ADR 0007",
};

function NavGroup({ sec, active, go, open, setOpen }) {
  const containsActive = sec.items.some((it) => it.id === active);
  const single = sec.items.length === 1;
  const isOpen = open === sec.group;

  if (single) {
    const it = sec.items[0];
    const on = active === it.id;
    return (
      <button onClick={() => { go(it.id); setOpen(null); }} style={{
        appearance: "none", cursor: "pointer", border: "none", borderRadius: 7, padding: "7px 12px",
        background: on ? AT.accentBg : "transparent", color: on ? AT.accent : AT.ink2,
        display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: on ? 600 : 500, whiteSpace: "nowrap",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: on ? AT.accent : AT.ink4 }}>{it.icon}</span>
        {it.label}
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(isOpen ? null : sec.group)} style={{
        appearance: "none", cursor: "pointer", border: "none", borderRadius: 7, padding: "7px 12px",
        background: isOpen ? AT.sunken : "transparent", color: containsActive ? AT.accent : AT.ink2,
        display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: containsActive ? 600 : 500, whiteSpace: "nowrap",
      }}>
        {sec.group}
        {containsActive && <span style={{ width: 5, height: 5, borderRadius: 999, background: AT.accent }} />}
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: AT.ink4, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}>▾</span>
      </button>
      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, minWidth: 208,
          background: AT.panel, border: `1px solid ${AT.rule2}`, borderRadius: 10, padding: 6,
          boxShadow: "0 8px 28px -8px rgba(20,20,40,0.22), 0 2px 6px rgba(20,20,40,0.06)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {sec.items.map((it) => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => { go(it.id); setOpen(null); }} style={{
                appearance: "none", cursor: "pointer", textAlign: "left", border: "none", borderRadius: 7, padding: "8px 10px",
                background: on ? AT.accentBg : "transparent", color: on ? AT.accent : AT.ink2,
                display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: on ? 600 : 500, whiteSpace: "nowrap",
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: on ? AT.accent : AT.ink4, width: 14, textAlign: "center" }}>{it.icon}</span>
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function deriveAlerts(D) {
  const a = [];
  const urgent = D.queues.queues.find((q) => q.urgent);
  const nFailed = D.queues.failedExecutions.length;
  if (nFailed) a.push({ id: "failed", sev: "down", kind: "alerta", module: "queues", title: `${nFailed} execuções falhadas`, body: `failed_executions abertas${urgent && urgent.failed ? ` — ${urgent.failed} na fila :urgent` : ""}. Requer inspeção.`, at: D.asOf.liveShort });
  if (urgent && urgent.oldestS > 120) a.push({ id: "urgent-age", sev: "down", kind: "alerta", module: "queues", title: `Fila :urgent atrasada (${urgent.oldestS}s)`, body: `O job mais antigo na fila urgente espera há ${urgent.oldestS}s, acima do alvo operacional.`, at: D.asOf.liveShort });
  if (D.ingestion.purge.overTtl) a.push({ id: "purge", sev: "down", kind: "alerta", module: "ingestion", title: "Retenção LGPD violada", body: `raw cifrado retido há ${D.ingestion.purge.oldestH}h, acima do TTL de ${D.ingestion.purge.ttlH}h. Purga atrasada (ADR 0011).`, at: D.asOf.liveShort });
  const drifting = D.health.projections.filter((p) => p.status !== "ok");
  if (drifting.length) a.push({ id: "drift", sev: "warn", kind: "alerta", module: "health", title: `Projeções derivando (${D.health.driftOverall}min)`, body: `${drifting.map((p) => p.name).join(", ")} acima do limiar de drift.`, at: D.asOf.liveShort });
  const delayed = D.queues.recurring.filter((tk) => tk.delayedMin > 0);
  if (delayed.length) a.push({ id: "recurring", sev: "warn", kind: "alerta", module: "health", title: "Recurring task atrasada", body: `${delayed.map((tk) => tk.name).join(", ")} — atraso detectado.`, at: D.asOf.liveShort });
  const collapsed = D.protocols.list.filter((x) => x.fourEyes === false).length;
  if (collapsed) a.push({ id: "foureyes", sev: "down", kind: "alerta", module: "protocols", title: "Quatro olhos colapsou", body: `${collapsed} versão(ões) com created_by e published_by iguais — segregação de funções não observada (§7.1).`, at: "auditoria" });

  a.push({ id: "lim-queue", sev: "warn", kind: "limitação", module: "queues", title: "Fila verde ≠ entrega garantida", body: "Bug de idempotência (§1.2/§6.1): processed_events gravado antes do efeito produz no-op silencioso que não chega a failed_executions. O painel não cobre a pior classe de falha do caminho urgente." });
  a.push({ id: "lim-worker", sev: "warn", kind: "limitação", module: "health", title: "Worker parado é risco LGPD", body: "Se as recurring tasks param: a purga de raw não roda (retenção violada), timeouts não disparam e as projeções derivam — os números deste console ficam silenciosamente velhos." });
  return a;
}

function NotificationsMenu({ alerts, go }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!e.target.closest("[data-notifroot]")) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const sev = { down: 0, warn: 1, info: 2 };
  const active = alerts.filter((a) => a.kind === "alerta").sort((a, b) => sev[a.sev] - sev[b.sev]);
  const limits = alerts.filter((a) => a.kind === "limitação");
  const count = active.length;
  const worst = active.some((a) => a.sev === "down") ? "down" : active.length ? "warn" : "ok";
  const modLabel = (id) => ALL_ITEMS.find((i) => i.id === id)?.label || id;

  const Row = ({ a }) => (
    <button onClick={() => { go(a.module); setOpen(false); }} style={{
      appearance: "none", cursor: "pointer", textAlign: "left", border: "none", background: "transparent",
      borderRadius: 8, padding: "10px 11px", display: "flex", gap: 10, width: "100%", alignItems: "flex-start",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.background = AT.sunken)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <span style={{ marginTop: 3 }}><ADot level={a.sev} size={8} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 600, color: AT.ink, lineHeight: 1.3 }}>{a.title}</span>
          {a.at && <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink4, flexShrink: 0 }}>{a.at}</span>}
        </div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 11.5, lineHeight: 1.5, color: AT.ink2, marginTop: 4, textWrap: "pretty" }}>{a.body}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600, color: AT.accent, marginTop: 5 }}>{modLabel(a.module)} →</div>
      </div>
    </button>
  );
  const SecLabel = ({ children }) => (
    <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", color: AT.ink4, padding: "4px 11px 6px" }}>{children}</div>
  );

  return (
    <div data-notifroot style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} title="Alertas & limitações" style={{
        appearance: "none", cursor: "pointer", position: "relative", width: 34, height: 34, borderRadius: 8,
        background: open ? AT.sunken : "transparent", border: `1px solid ${open ? AT.rule2 : "transparent"}`,
        color: AT.ink2, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span style={{ position: "absolute", top: 1, right: 1, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: toneColor(worst), color: "#fff", fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${AT.panel}` }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 30, width: 384, maxHeight: "78vh", overflowY: "auto",
          background: AT.panel, border: `1px solid ${AT.rule2}`, borderRadius: 12, padding: 6,
          boxShadow: "0 14px 40px -10px rgba(20,20,40,0.26), 0 3px 8px rgba(20,20,40,0.07)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 11px 10px", borderBottom: `1px solid ${AT.rule}`, marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: AT.ink }}>Notificações</span>
            <ATag tone={worst === "ok" ? "ok" : worst}>{count} ativo(s)</ATag>
          </div>
          <SecLabel>Alertas ativos</SecLabel>
          {active.length ? active.map((a) => <Row key={a.id} a={a} />) : (
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 11px" }}>
              <ADot level="ok" size={8} />
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: AT.ink2 }}>Nenhum alerta ativo neste escopo.</span>
            </div>
          )}
          <div style={{ height: 1, background: AT.rule, margin: "6px 4px" }} />
          <SecLabel>Limitações conhecidas</SecLabel>
          {limits.map((a) => <Row key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}

function TopNav({ active, go, t, setTweak, D }) {
  const [open, setOpen] = React.useState(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!e.target.closest("[data-navroot]")) setOpen(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <header style={{ flexShrink: 0, background: AT.panel, borderBottom: `1px solid ${AT.rule}`, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: 7, background: AT.ink, color: AT.panel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3" />
              <path d="M8 24 H 16 L 19 18 L 24 30 L 29 18 L 32 24 H 40" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div style={{ lineHeight: 1.12 }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 700, color: AT.ink }}>Rota Saúde</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: 0.8, color: AT.ink3, textTransform: "uppercase", marginTop: 1 }}>Admin Console</div>
          </div>
        </div>

        <div style={{ width: 1, height: 26, background: AT.rule, flexShrink: 0 }} />

        <nav data-navroot style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
          {NAV.map((sec) => <NavGroup key={sec.group} sec={sec} active={active} go={go} open={open} setOpen={setOpen} />)}
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <select value={t.muni} onChange={(e) => setTweak("muni", e.target.value)} style={{
            appearance: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 600,
            color: AT.ink, background: AT.sunken, border: `1px solid ${AT.rule2}`, borderRadius: 8, padding: "6px 26px 6px 10px",
            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23999' d='M0 0h10L5 6z'/></svg>\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center",
          }}>
            {window.AC.MUNI.map((m) => <option key={m.id} value={m.id}>{m.cross ? "◈ " : ""}{m.name}</option>)}
          </select>
          <Segmented value={t.period} onChange={(v) => setTweak("period", v)} options={[{ v: "today", label: "Hoje" }, { v: "7d", label: "7d" }, { v: "30d", label: "30d" }]} />
          <div style={{ width: 1, height: 22, background: AT.rule, flexShrink: 0 }} />
          <NotificationsMenu alerts={deriveAlerts(D)} go={go} />
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3, padding: "5px 10px", background: AT.sunken, borderRadius: 8, border: `1px solid ${AT.rule}` }}>
            <ADot level="ok" size={6} pulse />
            {D.asOf.liveShort}
            <span style={{ color: AT.ink4 }}>BRT</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 2, background: AT.sunken, borderRadius: 8, border: `1px solid ${AT.rule}` }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            appearance: "none", cursor: "pointer", border: "none", borderRadius: 6, padding: "4px 11px",
            background: on ? AT.panel : "transparent", color: on ? AT.ink : AT.ink3,
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
            boxShadow: on ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function TopBar({ active, t, setTweak, D }) {
  const label = ALL_ITEMS.find((i) => i.id === active)?.label || "";
  return (
    <header style={{ padding: "11px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", background: AT.panel, borderBottom: `1px solid ${AT.rule}`, flexShrink: 0, position: "sticky", top: 0, zIndex: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink3 }}>
        <span>console</span><span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: AT.ink, fontWeight: 600 }}>{label}</span>
        <ATag tone="neutral" style={{ marginLeft: 6 }}>somente leitura · Fase 1</ATag>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <select value={t.muni} onChange={(e) => setTweak("muni", e.target.value)} style={{
          appearance: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 600,
          color: AT.ink, background: AT.sunken, border: `1px solid ${AT.rule2}`, borderRadius: 8, padding: "6px 26px 6px 10px",
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23999' d='M0 0h10L5 6z'/></svg>\")",
          backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center",
        }}>
          {window.AC.MUNI.map((m) => <option key={m.id} value={m.id}>{m.cross ? "◈ " : ""}{m.name}</option>)}
        </select>
        <Segmented value={t.period} onChange={(v) => setTweak("period", v)} options={[{ v: "today", label: "Hoje" }, { v: "7d", label: "7d" }, { v: "30d", label: "30d" }]} />
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3, padding: "5px 10px", background: AT.sunken, borderRadius: 8, border: `1px solid ${AT.rule}` }}>
          <ADot level="ok" size={6} pulse />
          {D.asOf.liveShort}
          <span style={{ color: AT.ink4 }}>BRT</span>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [active, setActive] = React.useState("overview");
  const D = React.useMemo(() => window.AC.build(t.period, t.muni), [t.period, t.muni]);
  const View = VIEWS[active] || OverviewView;
  const den = t.density === "compacta";

  // reset drill-down state on nav by remounting via key
  return (
    <div style={{ position: "fixed", inset: 0, background: AT.bg, display: "flex", flexDirection: "column", fontFamily: "var(--sans)", color: AT.ink }}>
      <TopNav active={active} go={setActive} t={t} setTweak={setTweak} D={D} />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ width: "100%", padding: den ? "18px 26px 40px" : "22px 32px 48px", zoom: den ? 0.94 : 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3, marginBottom: 7 }}>
                <span>console</span><span style={{ opacity: 0.4 }}>/</span>
                <span style={{ color: AT.ink2, fontWeight: 600 }}>{ALL_ITEMS.find((i) => i.id === active)?.label}</span>
                <ATag tone="neutral" style={{ marginLeft: 2 }}>somente leitura · Fase 1</ATag>
              </div>
              <h1 style={{ margin: 0, fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: AT.ink }}>{ALL_ITEMS.find((i) => i.id === active)?.label}</h1>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3, marginTop: 4, letterSpacing: 0.2 }}>{MODSUB[active]}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>
              <span>{D.muni.cross ? "◈ cross-tenant" : "município " + D.muni.short}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{D.period.label}</span>
            </div>
          </div>
          <div key={active}>
            <View D={D} go={setActive} />
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Escopo" />
        <TweakRadio label="Período" value={t.period} options={["today", "7d", "30d"]} onChange={(v) => setTweak("period", v)} />
        <TweakSelect label="Município" value={t.muni} options={window.AC.MUNI.map((m) => ({ value: m.id, label: m.name }))} onChange={(v) => setTweak("muni", v)} />
        <TweakSection label="Apresentação" />
        <TweakRadio label="Densidade" value={t.density} options={["confortável", "compacta"]} onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
