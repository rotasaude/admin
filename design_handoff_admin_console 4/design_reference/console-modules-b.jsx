// Rota Saúde · Admin Console — module views B:
// Classificação (4.5 + trail), Protocolos (4.6 + detalhe), Filas (4.7), Eventos (4.8), Saúde (4.9)

const colB = (gap = 16) => ({ display: "flex", flexDirection: "column", gap });
const gridB = (cols, gap = 14) => ({ display: "grid", gridTemplateColumns: cols, gap });

// ============ 4.5 CLASSIFICAÇÃO / SCORING (+ trail) ============
function ClassificationView({ D }) {
  const c = D.classification;
  const [trailOf, setTrailOf] = React.useState(null);

  if (trailOf) {
    const tr = c.trail;
    const evTone = { scored: "info", rule_matched: "warn", priority_rule: "down", tier_assigned: "accent" };
    return (
      <div style={colB()}>
        <button onClick={() => setTrailOf(null)} style={{ ...window.linkBtn, alignSelf: "flex-start" }}>← voltar à classificação</button>
        <APanel title={"Trail de scoring · " + tr.triageId} sub={tr.protocol + " · scoring.mode=" + tr.mode} asOf={D.asOf.liveShort} source="live"
          right={<ATag tone="ok">sem dado clínico</ATag>}>
          <div style={colB(14)}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>
              Sequência estruturada de <b>regras</b> e <b>referências</b> (ADR 0017). O trail mostra qual regra disparou sobre qual referência — nunca texto clínico livre nem o conteúdo das respostas.
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tr.steps.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 130px 1.2fr 1fr 0.9fr", gap: 12, padding: "11px 4px", borderBottom: i < tr.steps.length - 1 ? `1px solid ${AT.rule}` : "none", alignItems: "center" }}>
                  <span style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                    <ADot level={evTone[s.ev]} size={8} />
                  </span>
                  <ATag tone={evTone[s.ev]}>{s.ev}</ATag>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{s.rule}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{s.ref}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink2, textAlign: "right" }}>{s.out}</span>
                </div>
              ))}
            </div>
          </div>
        </APanel>
      </div>
    );
  }

  const tierTotal = c.tiers.reduce((a, t) => a + t.count, 0);
  return (
    <div style={colB()}>
      <div style={gridB("repeat(4,1fr)", 12)}>
        {c.tiers.map((t) => <AStat key={t.key} label={"tier · " + t.label} value={fmt(t.count)} unit={`· ${Math.round((t.count / tierTotal) * 100)}%`} source="proj" tone={t.tone} />)}
        <AStat label="priority: true" value={fmt(c.priorityTrue)} source="live" tone="down" spark={c.priorityTrend} />
      </div>
      <div style={gridB("1fr 1fr")}>
        <APanel title="Distribuição de tier" sub="low / medium / high no período · ADR 0015" asOf={D.asOf.projShort} source="proj">
          <div style={colB(16)}>
            <AStack segments={c.tiers} h={16} />
            <ARule />
            <ASectionTitle>por protocolo (%)</ASectionTitle>
            {c.byProtocol.map((p) => (
              <div key={p.protocol} style={colB(6)}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink2 }}>{p.protocol}</span>
                <AStack showLegend={false} h={10} segments={[{ key: "l", label: "low", count: p.low, tone: "ok" }, { key: "m", label: "medium", count: p.medium, tone: "warn" }, { key: "h", label: "high", count: p.high, tone: "down" }]} />
              </div>
            ))}
          </div>
        </APanel>
        <APanel title="Quebra por scoring.mode" sub="weighted vs decision_table · ADR 0017" asOf={D.asOf.projShort} source="proj">
          <div style={colB(14)}>
            <AStack segments={c.byMode.map((m) => ({ ...m, tone: m.mode === "weighted" ? "info" : "accent" }))} h={14} />
            <ARule />
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>O <code style={window.acCode}>scoring.mode</code> é lido do protocolo congelado no snapshot — o painel nunca recomputa o score.</div>
          </div>
        </APanel>
      </div>
      <APanel title="Inspeção de triagens" sub="referências apenas · clique para ver o trail estruturado" asOf={D.asOf.liveShort} source="live">
        <ATable
          cols={[{ label: "triage_id", w: "1.1fr" }, { label: "tier", w: "0.7fr" }, { label: "priority", w: "0.7fr" }, { label: "mode", w: "1fr" }, { label: "protocolo", w: "1.2fr" }, { label: "hora", align: "right", w: "0.6fr" }, { label: "", align: "right", w: "0.8fr" }]}
          rows={c.sampleTriages}
          render={(r) => (<>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{r.id}</span>
            <span><ATag tone={r.tier === "high" ? "down" : r.tier === "medium" ? "warn" : "ok"}>{r.tier}</ATag></span>
            <span>{r.priority ? <ATag tone="down">true</ATag> : <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>false</span>}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink2 }}>{r.mode}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{r.protocol}</span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>{r.at}</span>
            <span style={{ textAlign: "right" }}><button onClick={() => setTrailOf(r.id)} style={window.linkBtn}>trail →</button></span>
          </>)}
        />
      </APanel>
    </div>
  );
}

// ============ 4.6 PROTOCOLOS / CADASTRO (+ detalhe) ============
function ProtocolsView({ D }) {
  const p = D.protocols;
  const [open, setOpen] = React.useState(null);
  const valTag = (v) => v === "ok" ? <ATag tone="ok">ok</ATag> : v === "warn" ? <ATag tone="warn">warn</ATag> : v === "fail" ? <ATag tone="down">fail</ATag> : v === "pending" ? <ATag tone="info">pendente</ATag> : <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>—</span>;
  const stTag = (s) => <ATag tone={s === "published" ? "ok" : s === "retired" ? "neutral" : s === "in_review" ? "info" : "warn"}>{s}</ATag>;

  if (open) {
    const d = p.detail;
    return (
      <div style={colB()}>
        <button onClick={() => setOpen(null)} style={{ ...window.linkBtn, alignSelf: "flex-start" }}>← voltar aos protocolos</button>
        <div style={gridB("1.3fr 1fr")}>
          <APanel title={d.name + " · " + d.id} sub="versões & validação · ADR 0016" asOf={D.asOf.projShort} source="proj">
            <ATable
              cols={[{ label: "Versão", w: "0.8fr" }, { label: "status", w: "1fr" }, { label: "quatro olhos", w: "1.1fr" }, { label: "schema", align: "right" }, { label: "linter", align: "right" }, { label: "gates", align: "right" }]}
              rows={d.versions}
              render={(r) => (<>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{r.version}</span>
                <span>{stTag(r.status)}</span>
                <span>{r.fourEyes ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{r.createdBy} → {r.publishedBy}</span> : <ATag tone="down">colapsou · {r.createdBy}</ATag>}</span>
                <span style={{ textAlign: "right" }}>{valTag(r.schema)}</span>
                <span style={{ textAlign: "right" }}>{valTag(r.linter)}</span>
                <span style={{ textAlign: "right" }}>{valTag(r.gates)}</span>
              </>)}
            />
          </APanel>
          <APanel title="Eventos do protocolo" sub="protocol.* em domain_events" asOf={D.asOf.projShort} source="proj">
            <div style={colB(0)}>
              {d.events.map((e, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 2px", borderBottom: i < d.events.length - 1 ? `1px solid ${AT.rule}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.accent }}>{e.name}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink4 }}>{e.at}</span>
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{e.actor} · {e.ref}</span>
                </div>
              ))}
            </div>
          </APanel>
        </div>
      </div>
    );
  }

  const collapsed = p.list.filter((x) => x.fourEyes === false).length;
  return (
    <div style={colB()}>
      <div style={gridB("repeat(4,1fr)", 12)}>
        <AStat label="Protocolos" value={new Set(p.list.map((x) => x.id)).size} source="proj" tone="info" />
        <AStat label="Publicados" value={p.list.filter((x) => x.status === "published").length} source="proj" tone="ok" />
        <AStat label="Em revisão / draft" value={p.list.filter((x) => x.status === "in_review" || x.status === "draft").length} source="proj" tone="warn" />
        <AStat label="Quatro olhos colapsou" value={collapsed} source="proj" tone={collapsed ? "down" : "ok"} />
      </div>
      <APanel title="Protocolos & versões" sub="status, autoria e validação · ADR 0013/0016/0017" asOf={D.asOf.projShort} source="proj">
        <ATable
          cols={[{ label: "protocol_id", w: "1fr" }, { label: "versão", w: "0.7fr" }, { label: "status", w: "0.9fr" }, { label: "quatro olhos", w: "1.2fr" }, { label: "validação", w: "1fr" }, { label: "publicado", align: "right", w: "0.9fr" }, { label: "", align: "right", w: "0.6fr" }]}
          rows={p.list}
          render={(r) => (<>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{r.id}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink2 }}>{r.version}</span>
            <span>{stTag(r.status)}</span>
            <span>{r.fourEyes === false ? <ATag tone="down">colapsou · {r.createdBy}</ATag> : r.fourEyes === true ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{r.createdBy} → {r.publishedBy}</span> : <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>— pendente</span>}</span>
            <span style={{ display: "flex", gap: 5 }}>{valTag(r.schema)}{valTag(r.linter)}{valTag(r.gates)}</span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{r.publishedAt || "—"}</span>
            <span style={{ textAlign: "right" }}><button onClick={() => setOpen(r.id)} style={window.linkBtn}>ver →</button></span>
          </>)}
        />
      </APanel>
    </div>
  );
}

// ============ 4.7 FILAS / JOBS (Solid Queue) — hero ============
function QueuesView({ D }) {
  const q = D.queues;
  const totalFailed = q.failedExecutions.length;
  return (
    <div style={colB()}>
      <div style={gridB("repeat(4,1fr)", 12)}>
        <AStat label="Backlog total" value={fmt(q.queues.reduce((a, x) => a + x.depth, 0))} source="live" tone="warn" />
        <AStat label="Pendente mais antigo" value={q.oldestPendingS} unit="s" source="live" tone={q.oldestPendingS > 120 ? "down" : "ok"} />
        <AStat label="failed_executions" value={totalFailed} source="live" tone={totalFailed ? "down" : "ok"} />
        <AStat label="Recurring atrasadas" value={q.recurring.filter((t) => t.delayedMin > 0).length} source="live" tone={q.recurring.some((t) => t.delayedMin > 0) ? "warn" : "ok"} />
      </div>

      <APanel title="Filas" sub="Solid Queue · profundidade, idade e execução por fila — :urgent em destaque" asOf={D.asOf.liveShort} source="live">
        <ATable
          cols={[{ label: "fila", w: "1.4fr" }, { label: "depth", align: "right" }, { label: "mais antigo", align: "right" }, { label: "running", align: "right" }, { label: "scheduled", align: "right" }, { label: "failed", align: "right" }]}
          rows={q.queues}
          render={(r) => (<>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <ADot level={r.tone} size={7} />
              {r.urgent ? <ATag tone="urgent">{r.name}</ATag> : <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: AT.ink, fontWeight: 600 }}>{r.name}</span>}
            </span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: r.depth > 10 ? AT.warn : AT.ink2 }}>{r.depth}</span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: r.oldestS > 120 ? AT.down : r.oldestS > 60 ? AT.warn : AT.ink2 }}>{r.oldestS}s</span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: AT.ink2 }}>{r.running}</span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: AT.ink2 }}>{r.scheduled}</span>
            <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: r.failed ? AT.down : AT.ink4 }}>{r.failed || "—"}</span>
          </>)}
        />
      </APanel>

      <div style={gridB("1.3fr 1fr")}>
        <APanel title="failed_executions" sub="jobs falhados com classe, erro e tentativas" asOf={D.asOf.liveShort} source="live" right={<ATag tone={totalFailed ? "down" : "ok"}>{totalFailed} abertos</ATag>}>
          {totalFailed === 0
            ? <AEmpty title="Nenhuma execução falhada" sub="Nada em failed_executions agora — lembrando que no-ops silenciosos não aparecem aqui (ver ressalva)." />
            : <div style={colB(0)}>
                {q.failedExecutions.map((f, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "11px 2px", borderBottom: i < totalFailed - 1 ? `1px solid ${AT.rule}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink, fontWeight: 600 }}>{f.jobClass}</span>
                      {f.queue === "urgent" ? <ATag tone="urgent">urgent</ATag> : <ATag tone="neutral">{f.queue}</ATag>}
                      <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>{f.attempts} tentativas · {f.at}</span>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.down }}>{f.error}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3 }}>{f.ref}</span>
                  </div>
                ))}
              </div>}
        </APanel>
        <APanel title="Recurring tasks" sub="purga, varredura de timeout, reconciliação" asOf={D.asOf.liveShort} source="live">
          <div style={colB(0)}>
            {q.recurring.map((t, i) => (
              <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 2px", borderBottom: i < q.recurring.length - 1 ? `1px solid ${AT.rule}` : "none" }}>
                <ADot level={t.status} size={7} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: AT.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink4 }}>{t.schedule} · {t.adr}</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: t.delayedMin > 0 ? AT.warn : AT.ink3, textAlign: "right", whiteSpace: "nowrap" }}>{t.lastAgo}{t.delayedMin > 0 ? ` · +${t.delayedMin}min` : ""}</span>
              </div>
            ))}
          </div>
        </APanel>
      </div>
    </div>
  );
}

// ============ 4.8 EVENTOS DE DOMÍNIO / AUDITORIA ============
function EventsView({ D }) {
  const e = D.events;
  const [filter, setFilter] = React.useState("todos");
  const maxC = Math.max(...e.byType.map((x) => x.count));
  const match = (name) => filter === "todos" || name.startsWith(filter.replace(".*", ""));
  const shown = e.stream.filter((s) => match(s.name));
  return (
    <div style={colB()}>
      <div style={gridB("repeat(3,1fr)", 12)}>
        <AStat label="Eventos no período" value={fmt(e.total)} source="proj" tone="info" />
        <AStat label="Retenção (TTL)" value={e.retentionMonths} unit="meses" source="proj" tone="ok" />
        <AStat label="Tipos de evento" value={e.byType.length} source="proj" tone="neutral" />
      </div>
      <div style={gridB("1fr 1.4fr")}>
        <APanel title="Contagem por tipo" sub="domain_events · ADR 0003" asOf={D.asOf.projShort} source="proj">
          <div style={colB(11)}>
            {e.byType.map((b) => (
              <div key={b.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.accent }}>{b.name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink, fontWeight: 600 }}>{fmt(b.count)}</span>
                </div>
                <div style={{ height: 5, background: AT.sunken2, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${(b.count / maxC) * 100}%`, height: "100%", background: AT.accent, opacity: 0.55, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </APanel>
        <APanel title="Stream de eventos" sub="payload é só referência — nunca dado clínico (ADR 0009)" asOf={D.asOf.liveShort} source="live"
          right={<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{e.filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ appearance: "none", cursor: "pointer", border: `1px solid ${filter === f ? AT.accent : AT.rule2}`, background: filter === f ? AT.accentBg : "transparent", color: filter === f ? AT.accent : AT.ink3, borderRadius: 6, padding: "3px 8px", fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600 }}>{f}</button>
          ))}</div>}>
          {shown.length === 0
            ? <AEmpty title="Sem eventos para este filtro" />
            : <div style={colB(0)}>
                {shown.map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1.1fr 1.5fr 0.7fr", gap: 10, padding: "9px 2px", borderBottom: i < shown.length - 1 ? `1px solid ${AT.rule}` : "none", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>{s.at}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AT.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.ref}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink4, textAlign: "right" }}>{s.actor}</span>
                  </div>
                ))}
              </div>}
        </APanel>
      </div>
      <APanel title="Âncora de replay & retenção" sub="ADR 0009 · TTL 12 meses">
        <div style={gridB("repeat(3,1fr)", 14)}>
          <AKV k="âncora de replay" v={e.replayAnchor.seq} vc={AT.ink} />
          <AKV k="desde" v={e.replayAnchor.at} />
          <AKV k="janela de retenção" v={e.retentionMonths + " meses"} />
        </div>
      </APanel>
    </div>
  );
}

// ============ 4.9 SAÚDE / OPERACIONAL ============
function HealthView({ D }) {
  const h = D.health;
  const worst = Math.max(...h.projections.map((p) => p.driftMin));
  return (
    <div style={colB()}>
      <div style={gridB("repeat(3,1fr)", 12)}>
        <AStat label="Drift máx. de projeção" value={worst} unit="min" source="live" tone={worst > 15 ? "warn" : "ok"} />
        <AStat label="Projeções derivando" value={h.projections.filter((p) => p.status !== "ok").length} source="live" tone={h.projections.some((p) => p.status !== "ok") ? "warn" : "ok"} />
        <AStat label="Recurring atrasadas" value={h.recurring.filter((t) => t.delayedMin > 0).length} source="live" tone={h.recurring.some((t) => t.delayedMin > 0) ? "warn" : "ok"} />
      </div>

      <div style={gridB("1.2fr 1fr")}>
        <APanel title="Frescor das projeções" sub="dashboard_metrics.updated_at vs limiar de drift · ADR 0007" asOf={D.asOf.liveShort} source="live">
          <ATable
            cols={[{ label: "projeção", w: "1.4fr" }, { label: "updated_at", align: "right" }, { label: "drift", align: "right" }, { label: "limiar", align: "right" }, { label: "status", align: "right" }]}
            rows={h.projections}
            render={(r) => (<>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: AT.ink }}>{r.name}</span>
              <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11.5, color: AT.ink2 }}>{r.updatedAt}</span>
              <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11.5, color: r.status === "warn" ? AT.warn : AT.ink2 }}>{r.driftMin}min</span>
              <span style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11, color: AT.ink4 }}>{r.thresholdMin}min</span>
              <span style={{ textAlign: "right" }}><ATag tone={r.status}>{r.status === "ok" ? "fresco" : "derivando"}</ATag></span>
            </>)}
          />
        </APanel>
        <APanel title="Recurring tasks" sub="cruzamento com Filas · §4.7" asOf={D.asOf.liveShort} source="live">
          <div style={colB(0)}>
            {h.recurring.map((t, i) => (
              <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 2px", borderBottom: i < h.recurring.length - 1 ? `1px solid ${AT.rule}` : "none" }}>
                <ADot level={t.status} size={7} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: AT.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: AT.ink4 }}>{t.adr}</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: t.delayedMin > 0 ? AT.warn : AT.ink3, whiteSpace: "nowrap" }}>{t.lastAgo}</span>
              </div>
            ))}
          </div>
        </APanel>
      </div>
    </div>
  );
}

Object.assign(window, { ClassificationView, ProtocolsView, QueuesView, EventsView, HealthView });
