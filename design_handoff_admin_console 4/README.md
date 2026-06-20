# Handoff: Rota Saúde · Admin Console (Dashboard administrativo — Fase 1, read-only)

## Overview
Painel administrativo **de leitura** que dá visibilidade operacional sobre os 10
módulos do Rota Saúde (ingestão WhatsApp, conversas/FSM, consentimento, triagens,
classificação/scoring, protocolos, **filas/jobs**, eventos de domínio, saúde das
projeções) para a **equipe da plataforma/SRE** e operação/auditoria da
municipalidade. Fase 1 é **somente visualização** — agregados, distribuições,
séries temporais e listas de inspeção; nenhuma mutação de estado.

Este pacote contém **o prompt de implementação adaptado para o Claude Code** e
**todo o material visual de apoio** para a implementação real (React em
`apps/web/` consumindo a API `Admin::` em `apps/api/`).

## Por onde começar
1. **`00_PROMPT_CLAUDE_CODE.md`** — o prompt de implementação (mesma spec do brief
   original, adaptada para apontar para este material e para os contratos).
2. **`01_PROMPT_EXECUCAO_dashboard.md`** — prompt de execução **fixando frontend
   em `/dashboard` e backend Rails em `/api`** (projetos irmãos na raiz):
   estrutura de pastas dos dois, integração (proxy dev / reverse-proxy prod).
   **Cole este no Claude Code.**
3. **`API_CONTRACTS.md`** — schema JSON de cada endpoint (o que o backend serve e
   o frontend consome), derivado do mock.
4. **`DESIGN_TOKENS.md`** — cores, tipografia, raios, sombras, espaçamento.
5. **`COMPONENTS.md`** — inventário de componentes e onde cada um aparece.
6. **`design_reference/`** — o protótipo navegável + fontes.

## About the Design Files
Os arquivos em `design_reference/` são **referências de design feitas em HTML** —
protótipos que mostram a aparência e o comportamento pretendidos, **não código de
produção para copiar diretamente**. O React-via-Babel e os estilos inline existem
só para prototipar. A tarefa é **recriar estes designs no codebase alvo**
(`apps/web/`, React) usando seus padrões e bibliotecas estabelecidos
(`packages/ui`, Recharts, sistema de i18n, etc.). O backend (`apps/api/`, Rails 8)
serve os agregados conforme `API_CONTRACTS.md`.

## Fidelity
**Hi-fi.** Cores, tipografia, espaçamento, hierarquia, estados e interações são
finais. Recrie a UI **fielmente** com as bibliotecas do codebase. Onde o
`packages/ui` já tiver um equivalente (botão, tabela, card), prefira-o e ajuste
os tokens; onde não tiver, registre os tokens novos de `DESIGN_TOKENS.md`.

## Screens / Views
São **10 módulos navegáveis** + 2 drill-downs. Layout, painéis, métricas e fontes
de cada um estão em `COMPONENTS.md` (tabela "Views de módulo") e
`00_PROMPT_CLAUDE_CODE.md` §4. Resumo:

- **Shell:** navbar horizontal sticky (largura fluida 100%), grupos com dropdown,
  seletor de **município** (inclui cross-tenant "◈ Todos os municípios" p/
  superadmin) e **período** (hoje/7d/30d), **centro de notificações (sino)** e
  relógio "ao vivo · BRT".
- **Visão geral · Ingestão · Conversas · Consentimento · Triagens ·
  Classificação (+ trail) · Protocolos (+ detalhe) · Filas & jobs · Eventos &
  auditoria · Saúde.**
- Cada painel tem **carimbo "dados de \<timestamp\>"** e cada métrica um **badge
  projeção/ao-vivo** (requisito de honestidade sobre consistência eventual).

## Interactions & Behavior
- **Nav dropdowns:** abrem no clique, fecham em click-fora; grupo da view ativa
  ganha ponto-acento.
- **Escopo:** trocar município/período refaz todos os dados (no app: invalida
  queries por `period`+`municipality_id`).
- **Centro de notificações:** badge com contagem de **alertas ativos** (cor da
  pior severidade); dropdown com 2 seções — *Alertas ativos* (derivados do estado;
  cada um navega ao módulo) e *Limitações conhecidas* (ressalvas fixas, incl. a
  ressalva obrigatória do painel de filas — §5 do prompt).
- **Drill-downs:** "trail →" (Classificação) abre a sequência de regras/refs;
  "ver →" (Protocolos) abre versões+validação+eventos. "abrir →" (Visão geral)
  navega ao módulo.
- **Filtros:** stream de eventos filtrável por chips (`triage.*`, `consent.*`…).
- **Estados:** loading (Skeleton), erro (mensagem+retry), vazio (EmptyState) por
  painel. Nunca renderizar `0` como dado carregado.
- Sem realtime na Fase 1 (polling/refresh manual).

## State Management
- `period` (`today|7d|30d` + custom), `municipality_id` (default tenant; "all" só
  superadmin), módulo ativo, estado de drill-down (`trailOf`, protocolo aberto),
  aberto/fechado de dropdowns e do sino.
- **Data fetching:** um hook por endpoint (React Query sugerido), chaveado por
  `period`+`municipality_id`. Contratos em `API_CONTRACTS.md`.
- Alertas derivados do payload no cliente (`deriveAlerts`/`useAlerts`).

## Design Tokens
Ver `DESIGN_TOKENS.md` — paleta neutra fria (branco/cinza) + semânticas
(accent índigo, ok verde, warn âmbar, down vermelho, info azul) em oklch;
tipografia Geist / Geist Mono; **piso de fonte 10.5px**; raios 5–12px; sombras de
dropdown; espaçamento de 14–16px entre painéis.

## Assets
- **Logo:** símbolo *Compass Path* (círculo + traçado), desenhado em SVG inline
  (2 elementos) — monocromático. Pode ser substituído pelo asset oficial da marca.
- **Ícones de nav:** glyphs monospace; **sino:** SVG simples (2 paths). Sem
  imagens raster. Sem assets de marca de terceiros.
- **Fontes:** Geist + Geist Mono (Google Fonts no protótipo).

## Files
```
00_PROMPT_CLAUDE_CODE.md      ← prompt adaptado (cole no Claude Code)
API_CONTRACTS.md              ← schemas JSON por endpoint
DESIGN_TOKENS.md              ← tokens de design
COMPONENTS.md                 ← inventário de componentes + views
design_reference/
  Rota Saúde · Admin Console.html   ← protótipo (precisa dos .jsx ao lado)
  Admin Console (standalone).html   ← protótipo self-contained (abre offline)
  console-data.js                   ← mock data = forma dos contratos
  console-ui.jsx                    ← tokens (AT) + primitivos
  console-modules-a.jsx             ← Overview, Ingestão, Conversas, Consentimento, Triagens
  console-modules-b.jsx             ← Classificação(+trail), Protocolos(+detalhe), Filas, Eventos, Saúde
  console-app.jsx                   ← shell (navbar, dropdowns, notificações, escopo)
  tweaks-panel.jsx                  ← painel de tweaks (escopo/densidade) — só do protótipo
screenshots/                  ← capturas hi-fi das 10 views + 2 drill-downs + notificações
```

> Para apenas **ver** o design rodando, abra `design_reference/Admin Console
> (standalone).html` em qualquer navegador (não precisa de servidor).

## Restrições não-negociáveis (resumo — detalhe no prompt §2)
- **LGPD:** nunca renderizar `inbound_messages.raw` nem conteúdo de respostas
  clínicas. Só agregados e referências. Allowlist nos serializers + teste.
- **Multi-tenancy:** tudo escopado por `municipality_id`; cross-tenant atrás de flag.
- **Read-side:** ler de projeções; nunca recomputar/`evaluate` no request.
- **Auth:** não implementar aqui; assumir `current_user`/`current_municipality` e
  proteger todos os endpoints (bloqueio para prod).
- **Sem escrita:** nenhuma rota `POST/PATCH/DELETE` no namespace `Admin::`.
- **Ressalva do painel de filas:** "fila verde ≠ entrega garantida" deve constar
  (centro de notificações → Limitações conhecidas).
