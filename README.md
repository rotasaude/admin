# Rota Saúde — Console de plataforma (admin)

Frontend do **operador da plataforma** (a equipe do Rota Saúde). Vive no host
reservado `admin.*` (`admin.rotasaude.app` em produção) e administra o conjunto
de cidades **por fora**: não enxerga dado de dentro de nenhuma cidade.

Vite + React + TypeScript + React Query. Consome o `api` (Rails, repo
`rotasaude/api`). Decisões arquiteturais em `rotasaude/docs` (ADRs 0011, 0012,
0013 e a spec do banco por cidade).

## Papel no ecossistema

| App | Quem usa | Alcance |
|---|---|---|
| **admin** (este) | Operador da plataforma | Catálogo de cidades, provisionamento, entrada nas cidades |
| `dashboard` | Equipe da prefeitura | Uma cidade (`<cidade>.rotasaude.app/dashboard/`) |
| `maintenance` | Mantenedor (superusuário) | Todas as cidades, só em development/staging |
| `wpda` | Cidadão | Uma cidade (`<cidade>.rotasaude.app/wpda/`) |

Com um banco por cidade, o console **perdeu os painéis que cruzavam cidades**.
O que ele faz hoje:

- **Cidades**: lista o catálogo e oferece **Entrar** em cada cidade. O console
  pede um grant assinado de 60 s (`POST /city_grants`) e manda o navegador para
  o host da cidade, que consome o grant e abre uma sessão marcada como
  origem-plataforma. A entrada fica auditada nos dois lados (`platform_events`
  e `domain_events` da cidade).
- **Provisionar cidade**: `POST /cities`, assíncrono (202 + worker). O convite
  do 1º admin municipal vai por e-mail; o token nunca volta para o console.
- **Registrar canal**: `POST /cities/:id/channel`, canal WhatsApp de uma cidade
  ativa. O `access_token` é segredo e nunca volta na resposta.

Gestão de membros e papéis **não** é feita aqui: é operação dentro da cidade
(entre pela cidade, via grant, e use o dashboard).

### Módulos legados

`src/modules/` ainda tem as telas city-scoped da primeira versão (Visão geral,
Ingestão, Conversas, Consentimento, Triagens, Classificação, Protocolos,
Eventos, Filas, Saúde). Elas estão **fora da navegação**: as rotas
`/admin/api/*` respondem 404 no host `admin.*`. Os arquivos continuam no repo e
o `NAV_GROUPS` em `src/shell/modules.ts` é a fonte da verdade do que aparece.

## Autenticação

Sessão por cookie HttpOnly, host-only (sem `domain:`), contra a tabela
`Operator`, e não contra `User`, que é da cidade. **MFA (TOTP) é obrigatório em
todo login.** Fluxo em `src/main.tsx`:

- `?invite=<token>` → aceitar convite (`POST /setup/accept_invitation`)
- sem sessão → Login (`POST /session`)
- senha ok → desafio TOTP → sessão completa
- 401 em qualquer query → volta ao estado de sessão

## Como rodar em dev

O app roda como o serviço `admin` do `docker-compose.yml` da raiz do monorepo:

```bash
docker compose up -d api admin
docker compose exec api bin/rails db:seed
```

Abra em **http://admin.localhost:5174/admin/**. Use o host `admin.localhost`,
não `localhost`: é o host que diz ao Rails que a requisição é do console
(`PlatformConsoleHost`). Em outro host, `/session` cai no controller da cidade.

A semente cria o operador **dev@local / dev-password** com TOTP de segredo fixo
(`DEV_OPERATOR_OTP_SECRET`), que sobrevive a resets do banco. O mantenedor do
`maintenance` e o admin municipal usam o mesmo e-mail e a mesma senha, mas são
contas de outras tabelas, com TOTP próprio.

Fora do Docker:

```bash
cp .env.example .env
npm install
npm run dev        # porta 5173; o compose publica em 5174
```

O Vite proxa `/admin/api`, `/session`, `/mfa`, `/setup`, `/cities` e
`/city_grants` para `VITE_API_PROXY_TARGET` **sem reescrever o Host**
(`changeOrigin: false`).

### Variáveis

| Var | Default | Uso |
|---|---|---|
| `VITE_ADMIN_API_BASE` | `/admin/api` | base das leituras (módulos legados) |
| `VITE_SESSION_BASE` | `/session` | login, desafio TOTP, logout |
| `VITE_API_PROXY_TARGET` | `http://localhost:3030` (`http://api:3000` no compose) | alvo do proxy em dev |

## Estrutura

```
src/
├── main.tsx         ← AuthProvider + roteamento por estado de sessão
├── App.tsx          ← AppShell; abre em "Cidades"
├── shell/           ← AppHeader, NavDropdown, NotificationCenter, modules.ts (navegação)
├── lib/
│   ├── api.ts       ← fetch, sessão, MFA, /cities, /city_grants
│   ├── auth.tsx     ← AuthContext (loading/anonymous/mfa_required/authenticated)
│   ├── cities.ts    ← ordenação do catálogo + enterCity (grant → redirect)
│   ├── provisioning.ts, channels.ts ← validação dos formulários de setup
│   └── format.ts, scope.ts, alerts.ts, types.ts
├── modules/
│   ├── Cities.tsx, Login.tsx
│   ├── setup/       ← ProvisionCity, RegisterChannel, MfaChallenge, MfaEnroll, AcceptInvitation
│   └── (legados city-scoped, fora da navegação)
├── hooks/           ← um hook de React Query por endpoint
├── components/      ← primitivos (Panel, DataTable, StatTile, badges…)
└── theme/           ← tokens e CSS global
```

## Testes e CI

```bash
npm run typecheck
npm test           # vitest: lib/{cities,provisioning,channels,protocols}
npm run build
```

A CI (`.github/workflows/ci.yml`) roda os três em todo push para `main` e em
todo PR.

## Build de produção

`Dockerfile` gera a SPA e a serve com nginx sob `/admin/` (`nginx.conf`):
assets com hash ficam em cache imutável, `index.html` sem cache, `/up` responde
200 para health check e qualquer caminho fora de `/admin/` responde 404.

## Princípios

- **Nenhum dado de cidade no console.** O operador entra na cidade via grant;
  não há visão agregada entre cidades.
- **`/admin/api` é só leitura.** Escrita do console mora em `/cities`,
  `/city_grants` e `/setup`, todas atrás de sessão de operador com MFA.
- **Segredo nunca volta ao frontend** (token de convite, `access_token` do canal).
- **Estados de carregando, erro e vazio sempre explícitos.** Nunca exiba `0`
  como se fosse dado.
