# API_CONTRACTS.md — Rota Saúde · Admin Console

Schemas JSON de cada endpoint, **derivados de `design_reference/console-data.js`**
(a forma do objeto retornado por `AC.build(period, municipality_id)` é o contrato).

## Convenções

- **Envelope universal:** toda resposta é `{ "data": <object>, "as_of": "<iso8601>" }`.
- **`as_of`** = timestamp do dado mais "ao vivo" do payload. Métricas de projeção
  carregam seu próprio `updated_at` (ver `source` / `updatedAt`).
- **`source`**: `"live"` (consulta ao vivo, indexada) ou `"proj"` (lida de
  projeção `dashboard_metrics`/`report_snapshots`). **Faz parte do contrato** —
  alimenta o badge `ASource` e o carimbo `AAsOf` na UI.
- **Números crus:** na API real, devolva `number` (ex. `1234`, `79.5`), **não**
  strings formatadas. O frontend formata em PT-BR. (O mock pré-formata por
  conveniência de protótipo — não copie isso.)
- **`tone`**: dica semântica opcional p/ a UI (`ok|warn|down|info|neutral`).
  Pode ser derivada no frontend; se vier do backend, é só hint visual.
- **Séries temporais** (`*Series`, `spark`, `priorityTrend`): array de números na
  granularidade do período (`today`→por hora; `7d`/`30d`→por dia).

---

## Envelope de scoping (todos os endpoints)

Query params aceitos:
```
period           today | 7d | 30d            (default 7d)
from, to         ISO date (intervalo custom; bordas em America/Sao_Paulo)
municipality_id  implícito (current_municipality); "all" só p/ superadmin (flag)
```
Bloco `data` inclui, quando útil, o escopo resolvido:
```jsonc
"scope": {
  "municipality": { "id": "curitiba", "name": "Curitiba · PR", "cross_tenant": false },
  "period":       { "key": "7d", "label": "7 dias", "axis": "dia" },
  "tz":           "America/Sao_Paulo"
}
```

---

## GET /admin/api/overview

```jsonc
{
  "data": {
    "kpis": [
      {
        "id": "done",
        "label": "Triagens concluídas",
        "value": 1234,                 // number (mock manda string formatada)
        "unit": "",
        "delta": "+4,1%",              // string p/ exibição, ou null
        "tone": "ok",
        "spark": [/* number[] série do período */],
        "source": "proj"               // "live" | "proj"
      }
      // ids esperados: done, active, priority, completion, failed
    ]
  },
  "as_of": "2026-06-19T14:22:36-03:00"
}
```
KPIs do brief §4.0: triagens concluídas, conversas ativas agora, casos
`priority:true`, taxa de conclusão, jobs falhados abertos.

---

## GET /admin/api/ingestion

```jsonc
{
  "data": {
    "inboundSeries": [/* number[] */],
    "inboundTotal": 41000,
    "ack": [
      { "code": "200", "label": "ack ok",               "count": 40900, "tone": "ok" },
      { "code": "403", "label": "assinatura inválida",   "count": 60,    "tone": "warn" },
      { "code": "5xx", "label": "erro servidor",         "count": 140,   "tone": "down" }
    ],
    "dedup": 380,                       // reentregas detectadas (dedup por wamid)
    "purge": {                          // backlog de purga do raw — sinal LGPD
      "pending": 1300,                  // inbound_messages processed c/ raw não purgado
      "oldestH": 9,                     // idade do mais antigo (horas)
      "ttlH": 24,                       // TTL de retenção
      "overTtl": false                  // oldestH > ttlH
    }
  },
  "as_of": "..."
}
```
**Nunca** inclua `raw`. Fonte: `inbound_messages` metadados (ADR 0010/0011).

---

## GET /admin/api/conversations

```jsonc
{
  "data": {
    "live": 140,                        // ativas agora (awaiting + in_progress)
    "funnel": [
      { "key": "awaiting_consent", "label": "awaiting_consent", "count": 3400, "tone": "neutral" },
      { "key": "in_progress",      "label": "in_progress",      "count": 2800, "tone": "info" },
      { "key": "completed",        "label": "completed",        "count": 2700, "tone": "ok" }
    ],
    "exits": [
      { "key": "declined",  "label": "declined",  "count": 250, "tone": "warn" },
      { "key": "cancelled", "label": "cancelled", "count": 140, "tone": "warn" },
      { "key": "abandoned", "label": "abandoned", "count": 630, "tone": "down" }
    ],
    "abandonRate": 18.5,                // %
    "avgToCompleteMin": 9.4,
    "liveActive": { "awaiting": 46, "inProgress": 94 }
  },
  "as_of": "..."
}
```
Fonte: `conversations` (status, timestamps, `consent_version`, `protocol_version`) — ADR 0012.

---

## GET /admin/api/consent

```jsonc
{
  "data": {
    "given": 3200, "revoked": 60, "declined": 220,
    "byVersion": [
      { "version": "v3 · 2026.1", "given": 2750, "share": 86 },
      { "version": "v2 · 2025.2", "given": 380,  "share": 12 },
      { "version": "v1 · legado",  "given": 70,   "share": 2 }
    ],
    "revocationsSeries": [/* number[] revogações por bucket */]
  },
  "as_of": "..."
}
```
Fonte: `consents` (append-only) + `consent.*` em `domain_events` — ADR 0012.

---

## GET /admin/api/triages

```jsonc
{
  "data": {
    "series": [/* number[] iniciadas por bucket */],
    "started": 3400, "completed": 2700, "completionRate": 79.4,
    "byProtocol": [
      { "version": "pcap-ms · 2026.1",     "count": 2100, "share": 78, "status": "published" },
      { "version": "pcap-ms · 2025.2",     "count": 510,  "share": 19, "status": "retired" },
      { "version": "pcap-mental · 2026.1", "count": 90,   "share": 3,  "status": "published" }
    ]
  },
  "as_of": "..."
}
```
Detalhe versionado lido de `report_snapshots` congelado — não recompute (ADR 0007).

---

## GET /admin/api/classification

```jsonc
{
  "data": {
    "tiers": [
      { "key": "low",    "label": "low",    "count": 1400, "tone": "ok" },
      { "key": "medium", "label": "medium", "count": 920,  "tone": "warn" },
      { "key": "high",   "label": "high",   "count": 380,  "tone": "down" }
    ],
    "byProtocol": [
      { "protocol": "pcap-ms · 2026.1", "low": 54, "medium": 33, "high": 13 }
    ],
    "priorityTrue": 190,
    "priorityTrend": [/* number[] */],
    "byMode": [
      { "mode": "weighted",       "label": "weighted",       "count": 1900, "share": 71 },
      { "mode": "decision_table", "label": "decision_table", "count": 800,  "share": 29 }
    ],
    "sampleTriages": [               // inspeção — referências apenas
      { "id": "trg_9f3a1e", "tier": "high", "priority": true,
        "mode": "decision_table", "protocol": "pcap-ms · 2026.1", "at": "14:18" }
    ]
  },
  "as_of": "..."
}
```
Distribuição de tier/priority/mode lida do snapshot — sem recompute (ADR 0015/0017).

---

## GET /admin/api/triages/:id/trail

```jsonc
{
  "data": {
    "triageId": "trg_9f3a1e",
    "protocol": "pcap-ms · 2026.1",
    "mode": "decision_table",         // scoring.mode lido do protocolo congelado
    "steps": [
      { "ev": "scored",        "rule": "pillar.cardio.weighted", "ref": "pillar_id=cardio", "out": "score=72",       "at": "14:18:02.114" },
      { "ev": "rule_matched",  "rule": "rule.bp_stage2",         "ref": "rule_id=R-204",    "out": "matched",        "at": "14:18:02.121" },
      { "ev": "priority_rule", "rule": "priority.any_stage2",    "ref": "rule_id=P-12",     "out": "priority=true",  "at": "14:18:02.126" },
      { "ev": "tier_assigned", "rule": "tier.decision_table",    "ref": "table=dt-ms-2026.1","out": "tier=high",      "at": "14:18:02.129" }
    ]
  },
  "as_of": "..."
}
```
`ev` ∈ `scored | rule_matched | priority_rule | tier_assigned` (ADR 0017).
**Só regras e referências — nunca texto clínico livre.** (ADR 0015)

---

## GET /admin/api/protocols

```jsonc
{
  "data": {
    "list": [
      {
        "id": "pcap-ms", "name": "Cardio-metabólico", "version": "2026.1",
        "status": "published",           // draft | in_review | published | retired
        "createdBy": "a.lima", "publishedBy": "r.souza",
        "fourEyes": true,                // false = colapsou (created==published); null = n/a
        "publishedAt": "12/02/2026", "retiredAt": null,
        "schema": "ok", "linter": "ok", "gates": "ok"   // ok | warn | fail | pending | "—"
      }
    ]
  },
  "as_of": "..."
}
```
Auditoria: `fourEyes:false` torna visível quando "quatro olhos" colapsou (§7.1).
Fonte: `protocols` + `protocol.*` em `domain_events` (ADR 0016).

---

## GET /admin/api/protocols/:id

```jsonc
{
  "data": {
    "id": "pcap-mental", "name": "Saúde mental",
    "versions": [
      { "version": "2026.1", "status": "published", "createdBy": "c.dias",
        "publishedBy": "c.dias", "fourEyes": false, "at": "28/04/2026",
        "schema": "ok", "linter": "warn", "gates": "ok" }
    ],
    "events": [
      { "at": "28/04/2026 09:12", "name": "protocol.published", "actor": "c.dias", "ref": "version=2026.1" }
    ]
  },
  "as_of": "..."
}
```

---

## GET /admin/api/queues   (painel de maior valor — §5)

```jsonc
{
  "data": {
    "queues": [
      { "name": "urgent", "urgent": true, "depth": 3, "oldestS": 22,
        "running": 2, "scheduled": 1, "failed": 3, "tone": "warn" }
      // + ingestion, scoring, default, reports...
    ],
    "oldestPendingS": 64,               // job pendente mais antigo (todas as filas)
    "failedExecutions": [
      { "jobClass": "PriorityNotifyJob", "queue": "urgent",
        "error": "Net::OpenTimeout: execution expired", "attempts": 3,
        "at": "14:02", "ref": "triage_id=trg_2a90c4" }
    ],
    "recurring": [
      { "key": "purge_raw", "name": "Purga de inbound_messages.raw",
        "schedule": "*/15 * * * *", "lastAgo": "há 6 min",
        "delayedMin": 0, "status": "ok", "adr": "ADR 0011" }
      // + purge_events, timeout_sweep, reconcile
    ]
  },
  "as_of": "..."
}
```
**Confira os nomes reais das tabelas/relations do Solid Queue** da versão em uso
(`ready/scheduled/failed/recurring`). Inclua a ressalva do §5 (no-op silencioso
não aparece em `failed_executions`).

---

## GET /admin/api/events

```jsonc
{
  "data": {
    "total": 16000,
    "retentionMonths": 12,
    "replayAnchor": { "seq": "evt_seq=18 442 901", "at": "01/07/2025 00:00" },
    "byType": [
      { "name": "triage.completed", "count": 2700 }
    ],
    "stream": [                          // payload é só referência (ADR 0009)
      { "at": "14:22:31", "name": "triage.completed", "actor": "sistema",
        "ref": "triage_id=trg_9f3a1e · tier=high", "muni": "Curitiba" }
    ],
    "filters": ["todos", "triage.*", "consent.*", "conversation.*", "protocol.*", "priority.*"]
  },
  "as_of": "..."
}
```
Query: `?name=&from=&to=` (filtro por nome/janela/actor — referências apenas).

---

## GET /admin/api/health

```jsonc
{
  "data": {
    "projections": [
      { "name": "dashboard_metrics", "updatedAt": "14:08",
        "driftMin": 12, "status": "ok", "thresholdMin": 15 }
      // + report_snapshots, tier_distribution
    ],
    "recurring": [ /* mesma forma de queues.recurring */ ],
    "driftOverall": 12
  },
  "as_of": "..."
}
```
`status: "warn"` quando `driftMin > thresholdMin` (projeção derivando).
Cruza com `/queues` para recurring (worker parado = retenção LGPD violada,
timeouts não disparados, projeções derivando — §7.5).

---

## Catálogo de municípios (para o seletor de escopo)

Exposto via `/health` ou endpoint próprio `GET /admin/api/municipalities` (só
lista os que o usuário pode ver; "all" apenas p/ superadmin):
```jsonc
[
  { "id": "all",      "name": "Todos os municípios", "cross_tenant": true },
  { "id": "curitiba", "name": "Curitiba · PR",       "cross_tenant": false }
]
```
