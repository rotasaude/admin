// Rota Saúde · Admin Console — module views A:
// Overview (4.0), Ingestão (4.1), Conversas (4.2), Consentimento (4.3), Triagens (4.4)
// Each view: function ({ D, go }) reading the built data object D.

// ---- shared table primitive (exported for modules-b) ----
function ATable({ cols, rows, render }) {
  const grid = cols.map((c) => c.w || "1fr").join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: grid, gap: 12, padding: "0 4px 9px", borderBottom: `1px solid ${AT.rule}`, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: AT.ink3 }}>
        {cols.map((c, i) => <span key={i} style={{ textAlign: c.align || "left" }}>{c.label}</span>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "grid", gridTemplateColumns: grid, gap: 12, padding: "10px 4px", borderBottom: `1px solid ${AT.rule}`, alignItems: "center" }}>
          {render(row, cols)}
        </div>
      ))}
    </div>
  );
}
function AKV({ k, v, vc, mono = true }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", color: AT.ink3 }}>{k}</span>
      <span style={{ fontFamily: mono ? "var(--mono)" : "var(--sans)", fontSize: 14, fontWeight: 600, color: vc || AT.ink }}>{v}</span>
    </div>
  );
}
function ASectionTitle({ children }) {
  return <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", color: AT.ink3, marginBottom: 2 }}>{children}</div>;
}
const grid = (cols, gap = 14) => ({ display: "grid", gridTemplateColumns: cols, gap });
const col = (gap = 16) => ({ display: "flex", flexDirection: "column", gap });

// ============ 4.0 OVERVIEW ============
function OverviewView({ D, go }) {
  const q = D.queues;
  const urgent = q.queues.find((x) => x.urgent);
  return (
    <div style={col()}>
      <div style={grid("repeat(5, 1fr)", 12)}>
        {D.overview.kpis.map((k) => <AStat key={k.id} {...k} />)}
      </div>

      <div style={grid("1.5fr 1fr")}>
        <APanel title="Ingestão & triagem" sub="volume diário · §4.1 / §4.4" asOf={D.asOf.projShort} source="proj">
          <div style={col(14)}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <ASectionTitle>inbound (WhatsApp)</ASectionTitle>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink2 }}>{fmt(D.ingestion.inboundTotal)} msgs</span>
              </div>
              <ASpark data={D.ingestion.inboundSeries} color={AT.accent} h={42} />
            </div>
            <ARule />
            <AFunnel steps={D.conversations.funnel} />
          </div>
        </APanel>

        <APanel title="Filas · Solid Queue" sub="resumo operacional · §4.7" right={<button onClick={() => go("queues")} style={linkBtn}>abrir →</button>} asOf={D.asOf.liveShort} source="live">
          <div style={col(12)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 8, background: AT.downBg, border: `1px solid color-mix(in oklch, ${AT.down} 28%, transparent)` }}>
              <ATag tone="urgent">:urgent</ATag>
              <div style={{ display: "flex", gap: 18, flex: 1 }}>
                <AKV k="depth" v={urgent.depth} vc={AT.ink} />
                <AKV k="idade" v={urgent.oldestS + "s"} vc={urgent.oldestS > 60 ? AT.down : AT.ink} />
                <AKV k="failed" v={urgent.failed} vc={AT.down} />
              </div>
            </div>
            <div style={grid("repeat(3,1fr)", 10)}>
              <AKV k="backlog total" v={fmt(q.queues.reduce((a, x) => a + x.depth, 0))} />
              <AKV k="failed (todas)" v={q.failedExecutions.length} vc={AT.down} />
              <AKV k="recurring atrasadas" v={q.recurring.filter((t) => t.delayedMin > 0).length} vc={AT.warn} />
            </div>
          </div>
        </APanel>
      </div>

      <div style={grid("1fr 1.4fr")}>
        <APanel title="Saúde das projeções" sub="frescor & drift · §4.9" right={<button onClick={() => go("health")} style={linkBtn}>abrir →</button>}>
          <div style={col(13)}>
            {D.health.projections.map((p) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <ADot level={p.status} size={7} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink2 }}>{p.name}</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: p.status === "warn" ? AT.warn : AT.ink3, whiteSpace: "nowrap" }}>drift {p.driftMin}min</span>
              </div>
            ))}
          </div>
        </APanel>

        <APanel title="Eventos de domínio" sub="referências apenas · §4.8" right={<button onClick={() => go("events")} style={linkBtn}>abrir →</button>} asOf={D.asOf.liveShort} source="live">
          <div style={col(0)}>
            {D.events.stream.slice(0, 5).map((e, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1.1fr 1.4fr", gap: 10, padding: "8px 2px", borderBottom: i < 4 ? `1px solid ${AT.rule}` : "none", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>{e.at}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.ref}</span>
              </div>
            ))}
          </div>
        </APanel>
      </div>
    </div>
  );
}

// ============ 4.1 INGESTÃO ============
function IngestionView({ D }) {
  const g = D.ingestion;
  return (
    <div style={col()}>
      <div style={grid("repeat(4,1fr)", 12)}>
        <AStat label="Inbound no período" value={fmt(g.inboundTotal)} source="proj" tone="ok" spark={g.inboundSeries} />
        <AStat label="ack 200" value={fmt(g.ack[0].count)} source="live" tone="ok" />
        <AStat label="Reentregas (dedup wamid)" value={fmt(g.dedup)} source="proj" tone="info" />
        <AStat label="Backlog de purga · raw" value={fmt(g.purge.pending)} source="live" tone={g.purge.overTtl ? "down" : "warn"} />
      </div>

      <div style={grid("1.3fr 1fr")}>
        <APanel title="Volume de inbound" sub="mensagens recebidas por período · ADR 0010/0011" asOf={D.asOf.projShort} source="proj">
          <ABars data={g.inboundSeries} color={AT.accent} h={140} />
        </APanel>
        <APanel title="Distribuição de ack" sub="resposta do webhook ao Meta" asOf={D.asOf.liveShort} source="live">
          <AStack segments={g.ack} h={14} />
        </APanel>
      </div>

      <APanel title="Backlog de purga do raw" sub="inbound_messages.processed com raw não purgado · saúde LGPD (ADR 0011)" asOf={D.asOf.liveShort} source="live"
        right={g.purge.overTtl ? <ATag tone="down">acima do TTL</ATag> : <ATag tone="ok">dentro do TTL</ATag>}>
        <div style={col(14)}>
          <div style={grid("repeat(3,1fr)", 14)}>
            <AKV k="pendentes" v={fmt(g.purge.pending)} vc={AT.ink} />
            <AKV k="mais antigo" v={g.purge.oldestH + "h"} vc={g.purge.overTtl ? AT.down : AT.ink} />
            <AKV k="TTL de retenção" v={g.purge.ttlH + "h"} />
          </div>
          <AMeter label="Idade do mais antigo vs TTL" used={g.purge.oldestH} max={g.purge.ttlH} unit="h" tone={g.purge.overTtl ? "down" : "ok"} />
          {g.purge.overTtl
            ? <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.down }}>raw cifrado retido além do TTL de {g.purge.ttlH}h — risco LGPD. Ver alertas (sino) e Saúde/Filas.</div>
            : <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>A purga roda a cada 15 min (ADR 0011). O painel nunca renderiza o conteúdo de <code style={code}>raw</code> — apenas metadados e contagens.</div>}
        </div>
      </APanel>
    </div>
  );
}

// ============ 4.2 CONVERSAS / FSM ============
function ConversationsView({ D }) {
  const c = D.conversations;
  return (
    <div style={col()}>
      <div style={grid("repeat(4,1fr)", 12)}>
        <AStat label="Conversas ativas agora" value={fmt(c.live)} source="live" tone="info" />
        <AStat label="Taxa de abandono" value={c.abandonRate.toFixed(1).replace(".", ",")} unit="%" source="proj" tone="warn" />
        <AStat label="Tempo médio até conclusão" value={c.avgToCompleteMin.toFixed(1).replace(".", ",")} unit="min" source="proj" tone="ok" />
        <AStat label="Concluídas no período" value={fmt(c.funnel[2].count)} source="proj" tone="ok" />
      </div>
      <div style={grid("1.2fr 1fr")}>
        <APanel title="Funil de estados" sub="awaiting_consent → in_progress → completed · ADR 0012" asOf={D.asOf.projShort} source="proj">
          <AFunnel steps={c.funnel} />
        </APanel>
        <APanel title="Saídas" sub="estados terminais não-conclusivos" asOf={D.asOf.projShort} source="proj">
          <div style={col(14)}>
            <AStack segments={c.exits} h={14} />
            <ARule />
            <div style={grid("repeat(2,1fr)", 12)}>
              <AKV k="vivas · awaiting" v={fmt(c.liveActive.awaiting)} vc={AT.ink2} />
              <AKV k="vivas · in_progress" v={fmt(c.liveActive.inProgress)} vc={AT.ink2} />
            </div>
          </div>
        </APanel>
      </div>
    </div>
  );
}

// ============ 4.3 CONSENTIMENTO ============
function ConsentView({ D }) {
  const c = D.consent;
  return (
    <div style={col()}>
      <div style={grid("repeat(3,1fr)", 12)}>
        <AStat label="given" value={fmt(c.given)} source="proj" tone="ok" />
        <AStat label="declined" value={fmt(c.declined)} source="proj" tone="warn" />
        <AStat label="revoked" value={fmt(c.revoked)} source="proj" tone="down" spark={c.revocationsSeries} />
      </div>
      <div style={grid("1fr 1.2fr")}>
        <APanel title="Quebra por consent_version" sub="versão do termo aceita · ADR 0012" asOf={D.asOf.projShort} source="proj">
          <ATable
            cols={[{ label: "Versão", w: "1.4fr" }, { label: "given", align: "right", w: "0.8fr" }, { label: "share", align: "right", w: "0.7fr" }]}
            rows={c.byVersion}
            render={(r) => (<>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{r.version}</span>
              <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: AT.ink2 }}>{fmt(r.given)}</span>
              <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: AT.ink3 }}>{r.share}%</span>
            </>)}
          />
        </APanel>
        <APanel title="Linha do tempo de revogações" sub="consent.revoked — ato jurídico distinto de abandono" asOf={D.asOf.projShort} source="proj">
          <div style={col(12)}>
            <ABars data={c.revocationsSeries} color={AT.down} h={120} />
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>Revogação é registrada como evento append-only em <code style={code}>domain_events</code> e nunca apagada da trilha de auditoria.</div>
          </div>
        </APanel>
      </div>
    </div>
  );
}

// ============ 4.4 TRIAGENS ============
function TriagesView({ D }) {
  const t = D.triages;
  return (
    <div style={col()}>
      <div style={grid("repeat(3,1fr)", 12)}>
        <AStat label="Iniciadas" value={fmt(t.started)} source="proj" tone="info" spark={t.series} />
        <AStat label="Concluídas" value={fmt(t.completed)} source="proj" tone="ok" />
        <AStat label="Taxa de conclusão" value={t.completionRate.toFixed(1).replace(".", ",")} unit="%" source="proj" tone="ok" />
      </div>
      <div style={grid("1.3fr 1fr")}>
        <APanel title="Volume por período" sub="triagens iniciadas · ADR 0006/0013" asOf={D.asOf.projShort} source="proj">
          <ABars data={t.series} color={AT.accent} h={150} />
        </APanel>
        <APanel title="Quebra por protocol_version" sub="detalhe versionado lido do report_snapshot · ADR 0007" asOf={D.asOf.projShort} source="proj">
          <ATable
            cols={[{ label: "Protocolo", w: "1.5fr" }, { label: "triagens", align: "right", w: "0.8fr" }, { label: "status", align: "right", w: "0.9fr" }]}
            rows={t.byProtocol}
            render={(r) => (<>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{r.version}</span>
              <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: AT.ink2 }}>{fmt(r.count)} <span style={{ color: AT.ink4 }}>· {r.share}%</span></span>
              <span style={{ textAlign: "right" }}><ATag tone={r.status === "published" ? "ok" : "neutral"}>{r.status}</ATag></span>
            </>)}
          />
        </APanel>
      </div>
    </div>
  );
}

const linkBtn = { appearance: "none", border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: AT.accent, padding: 0 };
const code = { fontFamily: "var(--mono)", fontSize: 11, background: AT.sunken, padding: "0 4px", borderRadius: 4 };

Object.assign(window, { ATable, AKV, ASectionTitle, OverviewView, IngestionView, ConversationsView, ConsentView, TriagesView, linkBtn, acCode: code });
