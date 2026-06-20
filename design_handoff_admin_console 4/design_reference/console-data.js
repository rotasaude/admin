// Rota Saúde · Admin Console — domain observability mock data (read-only / Fase 1).
// window.AC.build(periodKey, muniId) returns everything the 10 module views render.
// Numbers are aggregates + references only — never raw clinical content (LGPD).

(function () {
  // ---- deterministic pseudo-random so series are stable per (period, muni) ----
  function seeded(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function series(n, mean, variance, rng) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const wave = 1 + 0.18 * Math.sin((i / n) * Math.PI * 2 + 1);
      out.push(Math.max(0, Math.round(mean * wave * (1 + (rng() - 0.5) * variance))));
    }
    return out;
  }
  const r1 = (x) => Math.round(x * 10) / 10;

  const MUNI = [
    { id: "all",       name: "Todos os municípios", short: "Rede",       cross: true,  share: 1.00 },
    { id: "curitiba",  name: "Curitiba · PR",       short: "Curitiba",   cross: false, share: 0.56 },
    { id: "sjp",       name: "São José dos Pinhais · PR", short: "S.J. Pinhais", cross: false, share: 0.30 },
    { id: "pinhais",   name: "Pinhais · PR · piloto", short: "Pinhais",  cross: false, share: 0.14 },
  ];

  const PERIODS = {
    today: { key: "today", label: "Hoje",    short: "24h", days: 1,  factor: 1,    len: 12, axis: "hora" },
    "7d":  { key: "7d",    label: "7 dias",  short: "7d",  days: 7,  factor: 6.6,  len: 7,  axis: "dia"  },
    "30d": { key: "30d",   label: "30 dias", short: "30d", days: 30, factor: 27.5, len: 30, axis: "dia"  },
  };

  // base = per-day totals for the whole network ("all")
  const BASE = {
    inbound: 6200, triagesStarted: 520, triagesDone: 412, consentGiven: 486,
    consentRevoked: 9, consentDeclined: 34, priority: 28,
  };

  function build(periodKey, muniId) {
    const P = PERIODS[periodKey] || PERIODS["7d"];
    const M = MUNI.find((m) => m.id === muniId) || MUNI[0];
    const rng = seeded(periodKey + "|" + muniId);
    const f = P.factor * M.share;                 // cumulative scaler
    const cum = (perDay) => Math.round(perDay * f);
    const inst = (perDay) => Math.max(1, Math.round(perDay * M.share)); // live "agora" snapshot

    // as-of: live = now; projection lags by drift (worse when reconcile delayed)
    const reconcileDelay = M.id === "pinhais" ? 19 : 12;
    const asOf = {
      live: "19/06/2026 · 14:22:36",
      liveShort: "14:22:36",
      proj: "19/06/2026 · 14:08",
      projShort: "14:08",
      driftMin: reconcileDelay,
      tz: "America/São_Paulo · BRT",
    };

    const inbound = cum(BASE.inbound);
    const started = cum(BASE.triagesStarted);
    const done = cum(BASE.triagesDone);
    const completion = started ? r1((done / started) * 100) : 0;

    // ---------- 4.0 Overview ----------
    const failedOpen = M.id === "pinhais" ? 6 : M.id === "all" ? 9 : M.id === "curitiba" ? 5 : 2;
    const overview = {
      kpis: [
        { id: "done",     label: "Triagens concluídas", value: done.toLocaleString("pt-BR"), unit: "", delta: "+4,1%", tone: "ok",   spark: series(P.len, done / P.len, 0.5, rng), source: "proj" },
        { id: "active",   label: "Conversas ativas agora", value: inst(140).toString(), unit: "", delta: null, tone: "info", spark: series(12, inst(140), 0.4, rng), source: "live" },
        { id: "priority", label: "Casos priority", value: cum(BASE.priority).toLocaleString("pt-BR"), unit: "", delta: "+11%", tone: "warn", spark: series(P.len, cum(BASE.priority) / P.len, 0.7, rng), source: "live" },
        { id: "completion", label: "Taxa de conclusão", value: completion.toFixed(1).replace(".", ","), unit: "%", delta: "-0,9 pp", tone: "ok", spark: series(P.len, 79, 0.06, rng), source: "proj" },
        { id: "failed",   label: "Jobs falhados abertos", value: failedOpen.toString(), unit: "", delta: null, tone: failedOpen > 4 ? "down" : "warn", spark: series(P.len, failedOpen, 0.6, rng), source: "live" },
      ],
    };

    // ---------- 4.1 Ingestão (WhatsApp) ----------
    const inboundSeries = series(P.len, inbound / P.len, 0.4, rng);
    const ack5xx = Math.max(0, cum(14));
    const ack403 = Math.max(0, cum(6));
    const ack200 = inbound - ack5xx - ack403;
    const purgePending = M.id === "pinhais" ? 4820 : Math.round(inst(1300));
    const ttlH = 24;
    const oldestPurgeH = M.id === "pinhais" ? 31 : 9;
    const ingestion = {
      inboundSeries, inboundTotal: inbound,
      ack: [
        { code: "200", label: "ack ok", count: ack200, tone: "ok" },
        { code: "403", label: "assinatura inválida", count: ack403, tone: "warn" },
        { code: "5xx", label: "erro servidor", count: ack5xx, tone: "down" },
      ],
      dedup: cum(58),       // reentregas detectadas (dedup por wamid)
      purge: { pending: purgePending, oldestH: oldestPurgeH, ttlH, overTtl: oldestPurgeH > ttlH },
    };

    // ---------- 4.2 Conversas / FSM ----------
    const cAwaiting = inst(46), cInProgress = inst(94), cCompleted = done;
    const exitsDeclined = cum(38), exitsCancelled = cum(21), exitsAbandoned = cum(96);
    const conversations = {
      live: cAwaiting + cInProgress,
      funnel: [
        { key: "awaiting_consent", label: "awaiting_consent", count: started, tone: "neutral" },
        { key: "in_progress",      label: "in_progress",      count: Math.round(started * 0.82), tone: "info" },
        { key: "completed",        label: "completed",        count: done, tone: "ok" },
      ],
      exits: [
        { key: "declined",  label: "declined",  count: exitsDeclined, tone: "warn" },
        { key: "cancelled", label: "cancelled", count: exitsCancelled, tone: "warn" },
        { key: "abandoned", label: "abandoned", count: exitsAbandoned, tone: "down" },
      ],
      abandonRate: started ? r1((exitsAbandoned / started) * 100) : 0,
      avgToCompleteMin: 9.4,
      liveActive: { awaiting: cAwaiting, inProgress: cInProgress },
    };

    // ---------- 4.3 Consentimento ----------
    const cgGiven = cum(BASE.consentGiven), cgRevoked = cum(BASE.consentRevoked), cgDeclined = cum(BASE.consentDeclined);
    const consent = {
      given: cgGiven, revoked: cgRevoked, declined: cgDeclined,
      byVersion: [
        { version: "v3 · 2026.1", given: Math.round(cgGiven * 0.86), share: 86 },
        { version: "v2 · 2025.2", given: Math.round(cgGiven * 0.12), share: 12 },
        { version: "v1 · legado",  given: Math.round(cgGiven * 0.02), share: 2 },
      ],
      revocationsSeries: series(P.len, Math.max(1, cgRevoked / P.len), 0.8, rng),
    };

    // ---------- 4.4 Triagens ----------
    const triages = {
      series: series(P.len, started / P.len, 0.45, rng),
      started, completed: done, completionRate: completion,
      byProtocol: [
        { version: "pcap-ms · 2026.1", count: Math.round(done * 0.78), share: 78, status: "published" },
        { version: "pcap-ms · 2025.2", count: Math.round(done * 0.19), share: 19, status: "retired" },
        { version: "pcap-mental · 2026.1", count: Math.round(done * 0.03), share: 3, status: "published" },
      ],
    };

    // ---------- 4.5 Classificação / Scoring ----------
    const tLow = Math.round(done * 0.52), tMed = Math.round(done * 0.34), tHigh = done - tLow - tMed;
    const classification = {
      tiers: [
        { key: "low",    label: "low",    count: tLow,  tone: "ok"   },
        { key: "medium", label: "medium", count: tMed,  tone: "warn" },
        { key: "high",   label: "high",   count: tHigh, tone: "down" },
      ],
      byProtocol: [
        { protocol: "pcap-ms · 2026.1", low: 54, medium: 33, high: 13 },
        { protocol: "pcap-ms · 2025.2", low: 49, medium: 36, high: 15 },
      ],
      priorityTrue: cum(BASE.priority),
      priorityTrend: series(P.len, cum(BASE.priority) / P.len, 0.6, rng),
      byMode: [
        { mode: "weighted",       label: "weighted",       count: Math.round(done * 0.71), share: 71 },
        { mode: "decision_table", label: "decision_table", count: Math.round(done * 0.29), share: 29 },
      ],
      sampleTriages: [
        { id: "trg_9f3a1e", tier: "high",   priority: true,  mode: "decision_table", protocol: "pcap-ms · 2026.1", at: "14:18" },
        { id: "trg_7c21b0", tier: "medium", priority: false, mode: "weighted",       protocol: "pcap-ms · 2026.1", at: "14:11" },
        { id: "trg_4d88aa", tier: "low",    priority: false, mode: "weighted",       protocol: "pcap-ms · 2026.1", at: "14:04" },
        { id: "trg_2a90c4", tier: "high",   priority: true,  mode: "decision_table", protocol: "pcap-ms · 2025.2", at: "13:52" },
        { id: "trg_1b77de", tier: "medium", priority: false, mode: "weighted",       protocol: "pcap-mental · 2026.1", at: "13:40" },
      ],
      // trail (4.5) — rules + references only, NO free clinical text
      trail: {
        triageId: "trg_9f3a1e", protocol: "pcap-ms · 2026.1", mode: "decision_table",
        steps: [
          { ev: "scored",        rule: "pillar.cardio.weighted",   ref: "pillar_id=cardio",       out: "score=72", at: "14:18:02.114" },
          { ev: "scored",        rule: "pillar.metabolic.weighted", ref: "pillar_id=metabolic",   out: "score=64", at: "14:18:02.118" },
          { ev: "rule_matched",  rule: "rule.bp_stage2",           ref: "rule_id=R-204",          out: "matched",  at: "14:18:02.121" },
          { ev: "rule_matched",  rule: "rule.glucose_high",        ref: "rule_id=R-118",          out: "matched",  at: "14:18:02.123" },
          { ev: "priority_rule", rule: "priority.any_stage2",      ref: "rule_id=P-12",           out: "priority=true", at: "14:18:02.126" },
          { ev: "tier_assigned", rule: "tier.decision_table",      ref: "table=dt-ms-2026.1",     out: "tier=high", at: "14:18:02.129" },
        ],
      },
    };

    // ---------- 4.6 Protocolos / Cadastro ----------
    const protocols = {
      list: [
        { id: "pcap-ms",     name: "Cardio-metabólico", version: "2026.1", status: "published", createdBy: "a.lima",   publishedBy: "r.souza",  fourEyes: true,  publishedAt: "12/02/2026", retiredAt: null, schema: "ok", linter: "ok", gates: "ok" },
        { id: "pcap-ms",     name: "Cardio-metabólico", version: "2025.2", status: "retired",   createdBy: "a.lima",   publishedBy: "r.souza",  fourEyes: true,  publishedAt: "03/09/2025", retiredAt: "12/02/2026", schema: "ok", linter: "ok", gates: "ok" },
        { id: "pcap-mental", name: "Saúde mental",      version: "2026.1", status: "published", createdBy: "c.dias",   publishedBy: "c.dias",   fourEyes: false, publishedAt: "28/04/2026", retiredAt: null, schema: "ok", linter: "warn", gates: "ok" },
        { id: "pcap-resp",   name: "Respiratório",      version: "2026.1", status: "in_review", createdBy: "m.alves",  publishedBy: null,       fourEyes: null,  publishedAt: null, retiredAt: null, schema: "ok", linter: "ok", gates: "pending" },
        { id: "pcap-idoso",  name: "Idoso · fragilidade", version: "2026.0", status: "draft",   createdBy: "m.alves",  publishedBy: null,       fourEyes: null,  publishedAt: null, retiredAt: null, schema: "fail", linter: "—", gates: "—" },
      ],
      detail: {
        id: "pcap-mental", name: "Saúde mental",
        versions: [
          { version: "2026.1", status: "published", createdBy: "c.dias", publishedBy: "c.dias", fourEyes: false, at: "28/04/2026", schema: "ok", linter: "warn", gates: "ok" },
          { version: "2025.1", status: "retired",   createdBy: "c.dias", publishedBy: "r.souza", fourEyes: true,  at: "14/01/2025", schema: "ok", linter: "ok", gates: "ok" },
        ],
        events: [
          { at: "28/04/2026 09:12", name: "protocol.published",  actor: "c.dias", ref: "version=2026.1" },
          { at: "28/04/2026 09:10", name: "protocol.validated",  actor: "sistema", ref: "linter=warn (1 nó órfão)" },
          { at: "27/04/2026 18:40", name: "protocol.submitted",  actor: "c.dias", ref: "version=2026.1" },
        ],
      },
    };

    // ---------- 4.7 Filas / Jobs (Solid Queue) — hero ----------
    const urgentFailed = M.id === "pinhais" ? 4 : M.id === "all" ? 5 : 3;
    const queues = {
      queues: [
        { name: "urgent",    urgent: true,  depth: M.id === "pinhais" ? 12 : 3, oldestS: M.id === "pinhais" ? 184 : 22, running: 2, scheduled: 1, failed: urgentFailed, tone: M.id === "pinhais" ? "down" : "warn" },
        { name: "ingestion", urgent: false, depth: 41, oldestS: 38, running: 4, scheduled: 0, failed: 0, tone: "ok" },
        { name: "scoring",   urgent: false, depth: 6,  oldestS: 12, running: 3, scheduled: 0, failed: 1, tone: "ok" },
        { name: "default",   urgent: false, depth: 18, oldestS: 64, running: 2, scheduled: 7, failed: 1, tone: "ok" },
        { name: "reports",   urgent: false, depth: 2,  oldestS: 8,  running: 1, scheduled: 0, failed: 0, tone: "ok" },
      ],
      oldestPendingS: M.id === "pinhais" ? 184 : 64,
      failedExecutions: [
        { jobClass: "PriorityNotifyJob", queue: "urgent", error: "Net::OpenTimeout: execution expired", attempts: 3, at: "14:02", ref: "triage_id=trg_2a90c4" },
        { jobClass: "PriorityNotifyJob", queue: "urgent", error: "Faraday::TimeoutError", attempts: 3, at: "13:21", ref: "triage_id=trg_88f1aa" },
        { jobClass: "ReportRenderJob",   queue: "default", error: "ActiveStorage::FileNotFound", attempts: 5, at: "11:48", ref: "report_id=rep_77c2" },
        { jobClass: "ScoringJob",        queue: "scoring", error: "Protocol::VersionMismatch", attempts: 2, at: "10:33", ref: "triage_id=trg_41ab09" },
      ].slice(0, urgentFailed + 1),
      recurring: [
        { key: "purge_raw",     name: "Purga de inbound_messages.raw", schedule: "*/15 * * * *",  lastAgo: "há 6 min",  delayedMin: 0,  status: "ok",   adr: "ADR 0011" },
        { key: "purge_events",  name: "Purga de domain_events (TTL 12m)", schedule: "0 3 * * *",  lastAgo: "há 11 h",   delayedMin: 0,  status: "ok",   adr: "ADR 0009" },
        { key: "timeout_sweep", name: "Varredura de timeout de conversa", schedule: "*/5 * * * *", lastAgo: "há 2 min",  delayedMin: 0,  status: "ok",   adr: "ADR 0012" },
        { key: "reconcile",     name: "Reconciliação de projeções", schedule: "*/10 * * * *", lastAgo: "há " + reconcileDelay + " min", delayedMin: reconcileDelay - 10, status: reconcileDelay > 15 ? "warn" : "ok", adr: "ADR 0007" },
      ],
    };

    // ---------- 4.8 Eventos de domínio / Auditoria ----------
    const events = {
      total: cum(2400),
      retentionMonths: 12,
      replayAnchor: { seq: "evt_seq=18 442 901", at: "01/07/2025 00:00" },
      byType: [
        { name: "triage.completed",    count: done },
        { name: "consent.given",       count: cgGiven },
        { name: "conversation.started", count: started },
        { name: "priority.flagged",    count: cum(BASE.priority) },
        { name: "consent.revoked",     count: cgRevoked },
        { name: "protocol.published",  count: M.id === "all" ? 3 : 1 },
      ],
      stream: [
        { at: "14:22:31", name: "triage.completed",     actor: "sistema",   ref: "triage_id=trg_9f3a1e · tier=high", muni: "Curitiba" },
        { at: "14:22:18", name: "priority.flagged",     actor: "sistema",   ref: "triage_id=trg_9f3a1e · rule=P-12", muni: "Curitiba" },
        { at: "14:21:55", name: "consent.given",        actor: "cidadão",   ref: "consent_id=cns_44a1 · v3", muni: "S.J. Pinhais" },
        { at: "14:21:40", name: "conversation.started", actor: "cidadão",   ref: "conversation_id=cnv_7781", muni: "Curitiba" },
        { at: "14:20:12", name: "consent.revoked",      actor: "cidadão",   ref: "consent_id=cns_2290 · v2", muni: "Pinhais" },
        { at: "14:19:03", name: "protocol.published",   actor: "c.dias",    ref: "protocol=pcap-mental · 2026.1", muni: "Rede" },
        { at: "14:18:47", name: "triage.completed",     actor: "sistema",   ref: "triage_id=trg_7c21b0 · tier=medium", muni: "Curitiba" },
        { at: "14:17:29", name: "report.viewed",        actor: "h.marques", ref: "report_id=rep_55ab (referência)", muni: "Curitiba" },
      ],
      filters: ["todos", "triage.*", "consent.*", "conversation.*", "protocol.*", "priority.*"],
    };

    // ---------- 4.9 Saúde / Operacional ----------
    const health = {
      projections: [
        { name: "dashboard_metrics", updatedAt: asOf.projShort, driftMin: reconcileDelay, status: reconcileDelay > 15 ? "warn" : "ok", thresholdMin: 15 },
        { name: "report_snapshots",  updatedAt: "14:20", driftMin: 2, status: "ok", thresholdMin: 15 },
        { name: "tier_distribution", updatedAt: asOf.projShort, driftMin: reconcileDelay, status: reconcileDelay > 15 ? "warn" : "ok", thresholdMin: 15 },
      ],
      recurring: queues.recurring,
      driftOverall: reconcileDelay,
    };

    return { asOf, period: P, muni: M, periods: PERIODS, municipalities: MUNI,
      overview, ingestion, conversations, consent, triages, classification, protocols, queues, events, health };
  }

  window.AC = { build, MUNI, PERIODS };
})();
