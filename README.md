# Rota Saúde — Admin Console (dashboard)

Vite + React + TypeScript + React Query + Recharts. Consome `/admin/api/*`
do Rails (repo `rotasaude/api`).

## Estado atual — Fase 1 (vertical slice)

- ✅ Scaffold Vite/React/TS, tokens, AppShell (navbar + dropdowns + escopo + sino).
- ✅ Centro de notificações com "Limitações conhecidas" (§5 do brief, sempre visível).
- ✅ View **Visão geral** ligada a `GET /admin/api/overview` com estados loading/erro/vazio.
- ⏸ Outras 9 views: entradas existem no menu, mostram placeholder honesto.

## Como rodar em dev

### 1. Backend de pé

Suba o `api` a partir do repo separado `rotasaude/api` (ver o README de lá);
ele expõe o Rails em `http://localhost:3030`. Crie um Author para autenticar
(stub atual), rodando no diretório do `rotasaude/api`:

```bash
docker compose exec api bin/rails runner \
  'Author.first_or_create!(email: "dev@local", token: "dev-token-1", name: "Dev")'
```

### 2. Frontend (este repo)

```bash
cp .env.example .env       # token "dev-token-1" combinando com o passo acima
npm install
npm run dev                # abre em http://localhost:5173/admin/
```

O Vite proxa `/admin/api/*` para `http://localhost:3030` (container do Rails).

### Variáveis

| Var | Default | Uso |
|---|---|---|
| `VITE_ADMIN_API_BASE` | `/admin/api` | base path da API (combina com o proxy) |
| `VITE_ADMIN_API_TOKEN` | — | header `Authorization: Bearer <token>` |
| `VITE_API_PROXY_TARGET` | `http://localhost:3030` | alvo do proxy em dev |

## Estrutura

```
src/
├── main.tsx                 ← QueryClient + render
├── App.tsx                  ← AppShell, escopo, módulo ativo
├── theme/
│   ├── tokens.ts            ← cores oklch, tipografia, raios (DESIGN_TOKENS.md)
│   └── global.css           ← CSS vars + reset mínimo
├── lib/
│   ├── api.ts               ← fetch + envelope { data, as_of }
│   ├── scope.ts             ← período/município + Context
│   ├── format.ts            ← Intl PT-BR + America/Sao_Paulo
│   └── alerts.ts            ← deriveAlerts + Limitações fixas
├── components/              ← primitivos (Panel, StatTile, badges, Spark...)
├── shell/                   ← AppHeader, NavDropdown, ScopePicker, NotificationCenter
├── hooks/                   ← um hook por endpoint
└── modules/                 ← uma página por módulo (Overview ligado)
```

## Padrão para adicionar uma view

1. `hooks/useFoo.ts` — `useQuery` com key `[ "foo", period, municipalityId ]`,
   chama `adminFetch<FooData>("/foo", scopeParams(scope))`.
2. `modules/Foo.tsx` — header de página + painéis (`Panel`), com **estados
   loading/erro/vazio** obrigatórios.
3. Ligar em `App.tsx` adicionando o case do `ModuleId` na switch.

## Princípios

- **Nenhuma rota de mutação** consumida — só `GET`. Crítico de aceite.
- **Nenhum campo clínico** renderizado — só agregados/refs (validado no backend).
- **Source por métrica** (`live` vs `proj`) — badge `SourceBadge` em todo lugar.
- **Estados loading/erro/vazio** explícitos — nunca renderize `0` como dado.
- **`Limitações conhecidas`** sempre visíveis no sino (§5: "fila verde ≠ entrega").

## Verificação local

- Backend de pé em :3030, Author criado, `.env` com token → `npm run dev` →
  http://localhost:5173/admin/ deve mostrar 5 KPIs com valores reais
  (zerados em dev limpo) e o sino com a seção "Limitações conhecidas" sempre lá.

## Próximos passos (fora do slice atual)

Conectar as 9 views restantes (ingestion, conversations, consent, triages,
classification, protocols, queues, events, health) seguindo o mesmo padrão.
