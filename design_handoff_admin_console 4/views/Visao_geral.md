# Prompt de implementação — View **Visão geral** (Overview, §4.0)

> Prompt focado para o Claude Code implementar **uma** view: a **Visão geral** do
> Rota Saúde · Admin Console, no projeto `/dashboard`. Pré-requisitos: o shell
> (navbar + escopo + sino) e os primitivos de UI já implementados conforme
> `NAVBAR.md` e `COMPONENTS.md`. Tokens em `DESIGN_TOKENS.md`. Contrato em
> `API_CONTRACTS.md` (endpoint `GET /admin/api/overview`). Referência visual:
> `screenshots/01-overview.png` e `design_reference/` (`OverviewView` em
> `console-modules-a.jsx`).

---

## 1. Objetivo da view

Tela de entrada do console. Responde "o que está acontecendo agora" em **5 KPIs**
no topo e três blocos de **resumo navegável** (atalhos para Filas, Saúde e
Eventos). É **somente leitura**. Cada painel carrega carimbo "dados de …" e cada
métrica um badge **projeção/ao-vivo**.

---

## 2. Dados (fetch)

- Hook `useOverview(period, municipalityId)` → `GET /admin/api/overview?period=…`
  (envelope `{ data, as_of }`). Schema do `data.kpis[]` em `API_CONTRACTS.md`.
- A Visão geral também mostra **resumos** de outros módulos. No protótipo lê de
  um objeto único; na API real, **prefira que `/overview` já devolva esses
  resumos** (campos `queuesSummary`, `projections`, `recentEvents`) para evitar 4
  chamadas. Alternativa aceitável: compor no cliente com
  `useQueues`/`useHealth`/`useEvents` (limit 5). **Decida e anote** — mas o padrão
  recomendado é o backend entregar o resumo pronto (read-side, ADR 0007).
- Estados **loading/erro/vazio** por painel (Skeleton / erro+retry / EmptyState).
  Nunca renderizar `0` como dado carregado.

Campos consumidos:
- `data.kpis[]` → `{ id, label, value, unit, delta, tone, spark[], source }`
- resumo de filas → `queues[]` (p/ `:urgent`, backlog total, nº failed),
  `failedExecutions.length`, `recurring[].delayedMin`
- `health.projections[]` → `{ name, status, driftMin }`
- `events.stream[]` (5 primeiros) → `{ at, name, ref }`

---

## 3. Layout

Container raiz: **coluna**, `display:flex; flex-direction:column; gap:16px`.
Três linhas:

### Linha 1 — faixa de KPIs
- `display:grid; grid-template-columns: repeat(5, 1fr); gap:12px`
- 5× `<Stat>` (`AStat`), na ordem do array `kpis`:
  1. **Triagens concluídas** — `source:"proj"`, tone `ok`, com sparkline
  2. **Conversas ativas agora** — `source:"live"`, tone `info`, sparkline
  3. **Casos priority** — `source:"live"`, tone `warn`, sparkline
  4. **Taxa de conclusão** — `source:"proj"`, unidade `%`, tone `ok`, sparkline
  5. **Jobs falhados abertos** — `source:"live"`, tone `down` se >4 senão `warn`
- Anatomia do `<Stat>` (ver `COMPONENTS.md`): card branco, borda `AT.rule`,
  `border-radius:10px`, `padding:13px 15px`; topo = label (`--sans` 11.5px
  `AT.ink2`) + **SourceBadge**; valor `--mono` 27px weight 600 `AT.ink`
  (`letter-spacing:-0.8`); `delta` à direita na cor do `tone`; sparkline embaixo
  (h≈26px, área 8% + linha 1.4px).

### Linha 2 — `grid-template-columns: 1.5fr 1fr; gap:14px`

**Painel A — "Ingestão & triagem"** (`sub`: "volume diário · §4.1 / §4.4",
`asOf` = projeção, `source:"proj"`). Corpo em coluna `gap:14px`:
- Bloco "inbound (WhatsApp)": linha com `SectionTitle` "inbound (WhatsApp)" à
  esquerda e total `{inboundTotal} msgs` (`--mono` 11px `AT.ink2`) à direita
  (`margin-bottom:8px`); abaixo um **Sparkline** (`color:AT.accent`, `h:42`).
- `<Divider/>`
- **Funnel** dos estados de conversa (`conversations.funnel`:
  awaiting_consent → in_progress → completed). Ver `Funnel` em `COMPONENTS.md`.

**Painel B — "Filas · Solid Queue"** (`sub`: "resumo operacional · §4.7",
`right`: botão **"abrir →"** que navega para `queues`; `asOf` = live,
`source:"live"`). Corpo em coluna `gap:12px`:
- **Faixa de destaque `:urgent`**: `display:flex; align-items:center; gap:12px;
  padding:11px 13px; border-radius:8px; background:AT.downBg; border:1px solid
  color-mix(in oklch, AT.down 28%, transparent)`. Contém:
  - `<Tag tone="urgent">:urgent</Tag>`
  - três `<KeyValue>` (`gap:18px`): **depth** (`urgent.depth`), **idade**
    (`urgent.oldestS + "s"`, cor `AT.down` se >60 senão `AT.ink`), **failed**
    (`urgent.failed`, cor `AT.down`).
- Grade de 3 `<KeyValue>` (`grid repeat(3,1fr); gap:10px`): **backlog total**
  (soma dos `depth`), **failed (todas)** (`failedExecutions.length`, cor down),
  **recurring atrasadas** (nº com `delayedMin>0`, cor warn).
- `<KeyValue>` (`AKV`): label `--mono` 10.5px uppercase `AT.ink3` em cima; valor
  `--mono` 14px weight 600 embaixo (cor custom via `vc`).

### Linha 3 — `grid-template-columns: 1fr 1.4fr; gap:14px`

**Painel C — "Saúde das projeções"** (`sub`: "frescor & drift · §4.9", `right`:
"abrir →" → `health`; **sem** asOf). Corpo coluna `gap:13px`: para cada
`health.projections[]`, uma linha `space-between`:
- esquerda: `<StatusDot level={status} size=7>` + nome da projeção (`--mono` 12px
  `AT.ink2`)
- direita: `drift {driftMin}min` (`--mono` 11px; `AT.warn` se `status==="warn"`
  senão `AT.ink3`; `white-space:nowrap`)

**Painel D — "Eventos de domínio"** (`sub`: "referências apenas · §4.8", `right`:
"abrir →" → `events`; `asOf` = live, `source:"live"`). Corpo coluna `gap:0`:
primeiros **5** de `events.stream`, cada um numa grade
`grid-template-columns: 60px 1.1fr 1.4fr; gap:10px; padding:8px 2px;
align-items:center`, com `border-bottom:1px solid AT.rule` exceto no último:
- `at` (`--mono` 11px `AT.ink4`)
- `name` (`--mono` 11px `AT.accent`, truncado com ellipsis)
- `ref` (`--mono` 11px `AT.ink3`, truncado com ellipsis)

---

## 4. Botão "abrir →" (atalho de painel)
- Texto-link: `--mono` 11px weight 600 `color:AT.accent`, `background:transparent;
  border:none; padding:0; cursor:pointer`. Navega para o módulo alvo.

## 5. Cabeçalho de painel (`<Panel>`)
Cada painel é um card branco (`AT.panel`, borda `AT.rule`, `border-radius:10px`)
com header (`padding:13px 16px`, `border-bottom:1px solid AT.rule`): título
(`--sans` 13.5px weight 600 `AT.ink`) + subtítulo (`--mono` 12px `AT.ink3`); à
direita o slot `right` (botão "abrir →") e o **AsOfStamp** ("dados de \<HH:MM\>" +
SourceBadge), quando aplicável. Corpo com `padding:16px`.

---

## 6. Privacidade & honestidade (não violar)
- Só **agregados e referências** — nenhum `raw`/resposta clínica (a stream de
  eventos mostra só `ref`).
- KPIs e painéis mantêm o badge **`source`** (projeção vs ao vivo) e o carimbo
  **as-of** — requisito de consistência eventual (§2.5 do brief).
- A faixa `:urgent` é só leitura; **não** adicionar ações (retry/descarte são
  Fase 2). A ressalva "fila verde ≠ entrega garantida" vive no **sino** (centro
  de notificações), não neste painel.

---

## 7. Aceite da view
- [ ] 5 KPIs corretos, com `source` e sparkline onde aplicável.
- [ ] Painéis Ingestão&triagem, Filas, Saúde e Eventos com layout e proporções
      (`1.5fr/1fr` e `1fr/1.4fr`) fiéis a `01-overview.png`.
- [ ] "abrir →" navega para queues/health/events.
- [ ] AsOfStamp + badges projeção/ao-vivo presentes.
- [ ] Loading/erro/vazio por painel; nunca `0` como dado carregado.
- [ ] Nenhuma ação de escrita; nenhum dado clínico.
