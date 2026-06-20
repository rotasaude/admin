# COMPONENTS.md — Rota Saúde · Admin Console

Inventário dos componentes do protótipo, suas props e onde aparecem. Recrie cada
um com `packages/ui` / Recharts; nomes sugeridos para o app entre parênteses.
Fonte: `console-ui.jsx` (primitivos), `console-modules-a/b.jsx` (views),
`console-app.jsx` (shell).

## Shell (console-app.jsx)

| Protótipo | App sugerido | Descrição |
|---|---|---|
| `App` | `AdminConsolePage` | Raiz: estado de `period`/`muni` (Tweaks/escopo), módulo ativo, monta navbar + view. |
| `TopNav` | `AppHeader` | Navbar horizontal sticky: logo (símbolo Compass Path), grupos de nav com **dropdown**, seletor de município, segmented de período, **sino de notificações**, relógio "ao vivo · BRT". Largura fluida 100%. |
| `NavGroup` | `NavDropdown` | Grupo da navbar. Item único = botão direto; grupo = botão que abre menu suspenso. Ponto-acento quando contém a view ativa. Fecha em click-fora. |
| `Segmented` | `SegmentedControl` | Seletor `today/7d/30d`. |
| `NotificationsMenu` | `NotificationCenter` | Sino + badge (contagem de alertas ativos, cor da pior severidade). Dropdown com 2 seções: **Alertas ativos** e **Limitações conhecidas**. Cada linha: dot de severidade, título, corpo, link "ir →" que navega ao módulo. |
| `deriveAlerts(D)` | `useAlerts(data)` | Deriva alertas do estado atual: failed_executions, `:urgent` atrasada, retenção LGPD > TTL, projeções derivando, recurring atrasada, quatro-olhos colapsado. + 2 limitações fixas (fila verde ≠ entrega; worker parado = risco LGPD). |

**Navegação (grupos → módulos):** Visão geral · Aquisição (Ingestão, Conversas,
Consentimento) · Triagem (Triagens, Classificação) · Governança (Protocolos,
Eventos & auditoria) · Operação (Filas & jobs, Saúde).

## Primitivos (console-ui.jsx)

| Protótipo | App sugerido | Props principais | Notas |
|---|---|---|---|
| `APanel` | `Panel` | `title, sub, right, source, asOf, children` | Card. Header com título + subtítulo mono + slot direito + **carimbo `AAsOf`**. |
| `AStat` | `StatTile` | `label, value, unit, delta, tone, spark, source` | KPI. Valor 27px mono; badge `ASource`; sparkline opcional. |
| `ASource` | `SourceBadge` | `kind: "live"\|"proj", at, compact` | "ao vivo" (dot pulsante verde) vs "projeção" (ícone relógio + timestamp). **Requisito LGPD/§2.5.** |
| `AAsOf` | `AsOfStamp` | `at, kind` | "dados de \<timestamp\>" + `ASource`. No header de cada painel. |
| `ATag` | `Tag` / `Badge` | `tone, mono, children` | Pílula de status. |
| `ADot` | `StatusDot` | `level, size, pulse` | Bolinha de status; `pulse` = halo "ao vivo". |
| `AStack` | `StackedBar` | `segments[{label,count,tone}], showLegend` | Barra empilhada (tier, ack, mode) + legenda com % . |
| `AFunnel` | `Funnel` | `steps[{label,count,tone}]` | Barras horizontais com retenção % vs topo. |
| `ASpark` | `Sparkline` | `data[], color, h, fill` | Linha + área. (Recharts `AreaChart`.) |
| `ABars` | `BarMini` | `data[], color, h, highlight` | Barras verticais. (Recharts `BarChart`.) |
| `AMeter` | `Meter` | `label, used, max, unit, tone, hint` | Barra linear (ex. idade vs TTL). |
| `ATable` | `DataTable` | `cols[{label,w,align}], rows, render` | Tabela em CSS grid; header mono uppercase. |
| `AKV` | `KeyValue` | `k, v, vc, mono` | Par rótulo/valor empilhado. |
| `ACaveat` | `Callout` | `title, tone, children` | ⚠ Callout. **No protótipo final foi migrado p/ o `NotificationCenter`** — manter o componente, mas as ressalvas vivem no sino. |
| `AEmpty` | `EmptyState` | `icon, title, sub` | Estado vazio (nunca renderizar 0 como dado). |
| `ASkeleton` | `Skeleton` | `rows` | Loading shimmer. |
| `ARule` | `Divider` | `vertical` | Linha divisória. |

## Views de módulo (console-modules-a/b.jsx)

| View | Painéis principais |
|---|---|
| `OverviewView` | 5 KPIs · ingestão+funil · resumo de Filas (`:urgent`) · saúde das projeções · stream de eventos. (links "abrir →") |
| `IngestionView` | KPIs · volume inbound (bars) · distribuição de ack (stack) · **backlog de purga** com `AMeter` idade vs TTL. |
| `ConversationsView` | KPIs · funil FSM · saídas (stack) · vivas agora. |
| `ConsentView` | KPIs · quebra por `consent_version` (tabela) · timeline de revogações (bars). |
| `TriagesView` | KPIs · volume (bars) · quebra por `protocol_version` (tabela + status). |
| `ClassificationView` | KPIs (tiers + priority) · distribuição de tier (stack, + por protocolo) · quebra por mode · **tabela de inspeção → drill-down de trail** (estados internos `trailOf`). |
| `ProtocolsView` | KPIs (inclui quatro-olhos colapsado) · tabela de protocolos & versões → **drill-down de detalhe** (versões + eventos). |
| `QueuesView` | KPIs · tabela de filas (`:urgent` destacado) · `failed_executions` (lista) · recurring tasks. |
| `EventsView` | KPIs · contagem por tipo (barras) · **stream filtrável** (chips) · âncora de replay + retenção. |
| `HealthView` | KPIs (drift) · frescor das projeções (tabela) · recurring tasks. |

### Drill-downs
- **Trail** (`ClassificationView`): clicar "trail →" numa triagem abre a sequência
  `scored/rule_matched/priority_rule/tier_assigned` com regra + referência + saída.
  Badge "sem dado clínico". → `GET /triages/:id/trail`.
- **Protocolo** (`ProtocolsView`): clicar "ver →" abre versões + validação
  (schema/linter/gates) + eventos `protocol.*`. → `GET /protocols/:id`.

## Estados por painel (obrigatório)
Cada painel precisa de **loading** (`ASkeleton`), **erro** (mensagem + retry) e
**vazio** (`AEmpty`). Nunca renderizar `0`/série vazia como se fosse dado
carregado.

## Ícones
Glyphs mono simples na nav (`▦ ↘ ⇄ ✓ ≣ ◔ ❏ ❖ ≋ ◍`); sino do `NotificationCenter`
é SVG simples (2 paths). Logo = símbolo **Compass Path** (círculo + traçado de
"rota"), monocromático. Substitua por ícones do `packages/ui` se houver
equivalentes.
