# TechChallenge API — Sistema Integrado de Atendimento e Execução de Serviços

[![CI](https://github.com/PosFiap-TechChallenge/tech-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/PosFiap-TechChallenge/tech-challenge/actions/workflows/ci.yml)

Back-end (MVP) de uma oficina mecânica de médio porte: gestão de clientes, veículos, serviços, peças
e insumos, e o ciclo completo da **Ordem de Serviço** — do recebimento do veículo à entrega, com
orçamento, aprovação pelo cliente e acompanhamento via API.

Projeto da **Fase 1 do Tech Challenge — SOAT (Software Architecture), Pós-Tech FIAP**.

> Marcadores `🔗 pendente` indicam links e conteúdos que serão preenchidos até a entrega final.
> Procure por `TODO` no arquivo para encontrá-los.

---

## Sumário

1. [Objetivo do projeto](#1-objetivo-do-projeto)
2. [Visão geral da solução](#2-visão-geral-da-solução)
3. [Links da entrega](#3-links-da-entrega)
4. [Tecnologias](#4-tecnologias)
5. [Banco de dados: decisão e justificativa](#5-banco-de-dados-decisão-e-justificativa)
6. [Arquitetura](#6-arquitetura)
7. [Documentação DDD](#7-documentação-ddd)
8. [Como rodar](#8-como-rodar)
9. [Autenticação e credenciais de demonstração](#9-autenticação-e-credenciais-de-demonstração)
10. [Endpoints e documentação da API (Swagger)](#10-endpoints-e-documentação-da-api-swagger)
11. [Testes e cobertura](#11-testes-e-cobertura)
12. [Segurança e análise de vulnerabilidades](#12-segurança-e-análise-de-vulnerabilidades)
13. [Scripts disponíveis](#13-scripts-disponíveis)
14. [Docker](#14-docker)
15. [Detalhes técnicos](#15-detalhes-técnicos)
16. [Equipe](#16-equipe)

---

## 1. Objetivo do projeto

Uma oficina mecânica de médio porte hoje controla atendimento, diagnóstico, execução e entrega dos
veículos com anotações manuais e planilhas. Isso gera erros na priorização dos atendimentos, falhas
no controle de peças e insumos, dificuldade em acompanhar o status dos serviços, perda do histórico
de clientes e veículos e um fluxo de orçamentos e autorizações ineficiente.

O objetivo deste projeto é entregar a **primeira versão (MVP) do back-end** de um sistema que:

- **organize o atendimento** em torno da Ordem de Serviço, com status bem definidos e regras de
  transição aplicadas pelo próprio sistema;
- **gere orçamentos automaticamente** a partir dos serviços e das peças incluídos, e registre a
  aprovação ou rejeição do cliente;
- **controle o estoque** de peças e insumos, reservando o que foi aprovado e baixando o que foi usado;
- **mantenha o histórico** de clientes e veículos;
- **permita ao cliente acompanhar** o andamento do serviço via API;
- **meça o tempo médio de execução** dos serviços para apoiar a gestão;
- aplique **Domain-Driven Design** e boas práticas de **qualidade de software e segurança**.

---

## 2. Visão geral da solução

Um **monólito em camadas** (Domain, Application, Infrastructure) exposto como **API REST**, com
APIs administrativas protegidas por **JWT**, validação de dados sensíveis (CPF/CNPJ e placa) e
documentação **OpenAPI/Swagger** gerada a partir dos mesmos schemas que validam as requisições.

### Funcionalidades

| Módulo                  | Escopo                                                                              | Status                |
| ----------------------- | ----------------------------------------------------------------------------------- | --------------------- |
| Autenticação            | Login com JWT, cadastro de usuários internos, papéis `ADMIN`/`ATTENDANT`/`MECHANIC` | ✅ Implementado       |
| Clientes                | CRUD; identificação por CPF ou CNPJ (inclusive CNPJ alfanumérico) com validação     | ✅ Implementado       |
| Veículos                | CRUD; placa no padrão antigo ou Mercosul, marca, modelo e ano, vínculo com cliente  | ✅ Implementado       |
| Peças e insumos         | CRUD com controle de estoque (entrada, ajuste, reserva e liberação)                 | 🚧 Em desenvolvimento |
| Serviços                | CRUD do catálogo de serviços (ex.: troca de óleo, alinhamento)                      | ✅ Implementado       |
| Ordem de Serviço        | Criação, inclusão de serviços e peças, listagem e detalhamento                      | 🚧 Em desenvolvimento |
| Orçamento               | Geração automática, envio para aprovação, registro de aprovação ou rejeição         | 🚧 Em desenvolvimento |
| Acompanhamento da OS    | Status e regras de transição; consulta do andamento pelo cliente via API            | 🚧 Em desenvolvimento |
| Tempo médio de execução | Cálculo do tempo médio de execução dos serviços                                     | 🚧 Em desenvolvimento |
| Qualidade               | CI com typecheck e testes; cobertura mínima de 80% nos domínios críticos            | ✅ Implementado       |

<!-- TODO: atualizar a coluna "Status" conforme os módulos forem mergeados na main. -->

### Status da Ordem de Serviço

```
Recebida ──▶ Em diagnóstico ──▶ Aguardando aprovação ──▶ Em execução ──▶ Finalizada ──▶ Entregue
```

<!-- TODO: incluir aqui o diagrama de estados final, com o caminho de rejeição do orçamento, quando a OS for implementada. -->

### Stack resumida

| Item           | Valor                                    |
| -------------- | ---------------------------------------- |
| Runtime        | Node.js 22+ (desenvolvido em v24)        |
| Linguagem      | TypeScript 5.9 (ESM, `"type": "module"`) |
| Framework HTTP | Express 5                                |
| Banco          | PostgreSQL 16                            |
| ORM            | Prisma 6                                 |
| Gerenciador    | pnpm 10.10.0                             |

---

## 3. Links da entrega

| Item                                      | Link                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório                               | https://github.com/PosFiap-TechChallenge/tech-challenge                                                                               |
| Branch e commit da entrega final          | 🔗 pendente <!-- TODO: branch e hash do commit avaliado -->                                                                           |
| Vídeo da entrega (YouTube, público)       | 🔗 pendente <!-- TODO: link do vídeo -->                                                                                              |
| Documentação DDD (Miro)                   | 🔗 pendente <!-- TODO: link público do board no Miro -->                                                                              |
| Documentação DDD exportada no repositório | [`docs/ddd/`](docs/ddd/) — ver [seção 7](#7-documentação-ddd)                                                                         |
| Relatório de análise de vulnerabilidades  | 🔗 pendente <!-- TODO: docs/security/vulnerability-report.md -->                                                                      |
| Documentação da API (Swagger)             | `http://localhost:3000/docs` com a aplicação rodando ([seção 10](#10-endpoints-e-documentação-da-api-swagger))                        |
| Evidência de cobertura de testes          | Artefato `coverage-report` em cada execução do [CI](https://github.com/PosFiap-TechChallenge/tech-challenge/actions/workflows/ci.yml) |

---

## 4. Tecnologias

| Ferramenta                                                  | Papel no projeto                     | Por que ela                                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**                                                 | Runtime JavaScript no servidor       | Ecossistema enorme, I/O não bloqueante, ideal para APIs                                                                                                          |
| **TypeScript**                                              | Tipagem estática sobre JavaScript    | Erros aparecem em tempo de compilação; contratos entre camadas viram tipos verificáveis                                                                          |
| **pnpm**                                                    | Gerenciador de pacotes               | `node_modules` por links (rápido e econômico) e estrito: um pacote só é importável se estiver declarado                                                          |
| **Express**                                                 | Framework HTTP                       | Minimalista e onipresente; o modelo de middlewares é excelente para entender o ciclo requisição → resposta                                                       |
| **Prisma**                                                  | ORM + migrations                     | Schema declarativo único, client totalmente tipado, queries parametrizadas e histórico de migrations versionado                                                  |
| **PostgreSQL**                                              | Banco relacional                     | Integridade relacional e transações ACID para o fluxo de OS, orçamento e estoque — ver [seção 5](#5-banco-de-dados-decisão-e-justificativa)                      |
| **Zod**                                                     | Validação em runtime                 | TypeScript some ao compilar; Zod garante na execução que o que chega de fora tem o formato esperado. `z.infer` deriva o tipo do schema — uma fonte de verdade só |
| **InversifyJS** + **reflect-metadata**                      | Contêiner de injeção de dependência  | Ver [seção 15](#151-injeção-de-dependência-com-inversifyjs)                                                                                                      |
| **jose** + **scrypt** (`node:crypto`)                       | Autenticação                         | JWT HS256 com validação de emissor, audiência e expiração; senhas com hash `scrypt` e salt por usuário                                                           |
| **swagger-ui-express** + **@asteasolutions/zod-to-openapi** | Documentação da API                  | O documento OpenAPI é **gerado a partir dos mesmos schemas Zod** usados na validação — a documentação não desatualiza                                            |
| **cors**                                                    | Libera chamadas de outras origens    | Sem isso o navegador bloqueia o front consumindo a API                                                                                                           |
| **helmet**                                                  | Cabeçalhos HTTP de segurança         | Defesas básicas (clickjacking, sniffing, CSP) com uma linha                                                                                                      |
| **tsx**                                                     | Executa TypeScript direto, com watch | Loop de desenvolvimento sem passo de build                                                                                                                       |
| **tsup**                                                    | Bundler de produção (esbuild)        | Gera um `dist/main.js` ESM enxuto em milissegundos                                                                                                               |
| **Vitest** + **supertest** + **@vitest/coverage-v8**        | Testes e cobertura                   | Vitest entende TypeScript/ESM nativamente; supertest faz requisições HTTP reais ao app em memória; o provider V8 mede a cobertura                                |
| **ESLint** + **Prettier**                                   | Qualidade e formatação               | ESLint pega erro de código, Prettier resolve estilo; `eslint-config-prettier` evita que briguem                                                                  |
| **Docker** / **docker compose**                             | Ambiente reproduzível                | Sobe PostgreSQL e API com um comando, sem instalar banco na máquina                                                                                              |
| **GitHub Actions**                                          | Integração contínua                  | Typecheck e testes com cobertura mínima em todo pull request                                                                                                     |

---

## 5. Banco de dados: decisão e justificativa

**Escolha: PostgreSQL 16**, acessado via Prisma.

O domínio da oficina é **essencialmente relacional e transacional**: clientes possuem veículos, uma
Ordem de Serviço pertence a um cliente e a um veículo e é composta por serviços e peças, e a aprovação
de um orçamento precisa reservar estoque de forma consistente. Os critérios que guiaram a escolha:

| Necessidade do domínio                                                                                   | Como o PostgreSQL atende                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Relacionamentos fortes** (cliente → veículos → ordens de serviço → itens)                              | Chaves estrangeiras com integridade referencial. Ex.: um cliente com veículos não pode ser removido (`ON DELETE RESTRICT`), preservando o histórico |
| **Unicidade de dados sensíveis** (CPF/CNPJ, placa, e-mail de usuário)                                    | Constraints `UNIQUE` garantidas pelo banco, mesmo sob requisições concorrentes — a aplicação traduz a violação em `409 Conflict`                    |
| **Transações nos fluxos principais** (aprovar orçamento + reservar peças, finalizar OS + baixar estoque) | Transações **ACID**: ou tudo é gravado, ou nada é. Requisito explícito do desafio ("tratamento adequado das transações")                            |
| **Concorrência no estoque** (duas OS disputando a mesma peça)                                            | Controle de concorrência (MVCC) e bloqueio de linha, evitando que o saldo fique negativo                                                            |
| **Valores monetários e quantidades exatas** (orçamento, estoque fracionado de insumos)                   | Tipos numéricos exatos (`NUMERIC`), sem erro de arredondamento de ponto flutuante                                                                   |
| **Métricas de gestão** (tempo médio de execução)                                                         | Agregações (`AVG`, `GROUP BY`) e aritmética de datas nativas sobre o histórico de status da OS                                                      |
| **Ambiente simples e gratuito**                                                                          | Open source, imagem oficial (`postgres:16-alpine`) subindo via `docker compose`, suporte de primeira classe no Prisma                               |

**Alternativas consideradas**

- **MongoDB (documentos):** flexível, mas o modelo é altamente relacional. Integridade entre cliente,
  veículo, OS e estoque ficaria a cargo da aplicação, e transações envolvendo vários documentos são
  menos naturais que no modelo relacional.
- **MySQL:** também atenderia. O PostgreSQL foi preferido pela aderência mais estrita ao padrão SQL,
  pelos recursos de integridade (constraints, enums nativos, `CHECK`) e pela familiaridade do time.

---

## 6. Arquitetura

### Monólito em camadas (DDD / Clean Architecture)

```
Infrastructure  ──▶  Application  ──▶  Domain
   (detalhes)        (casos de uso)    (regras puras)
```

A **regra de dependência** é o coração do desenho: as setas apontam sempre para dentro. O que é
estável (regra de negócio) nunca depende do que é volátil (banco, framework, HTTP).

<!-- TODO: incluir o diagrama de arquitetura (ex.: docs/arquitetura.png) se o time produzir um. -->

#### `src/domain` — o núcleo

Regras e conceitos de negócio puros.

- **Agregados** (`Customer`, `Vehicle`, `User`) com factory `create`/`from` e o padrão
  _always-valid_: um agregado nunca existe em estado inválido.
- **Schemas de domínio** (`domain/schemas`): a fonte única do formato de cada agregado, espelhando a
  tabela no banco. A camada de aplicação deriva deles seus DTOs de entrada e saída.
- **Objetos de valor** (`TaxDocument` para CPF/CNPJ, `LicensePlate`, `UserRole`).
- **Eventos de domínio** (`CustomerCreatedEvent`, `VehicleRegisteredEvent`, `UserCreatedEvent`).
- **Interfaces** de repositório e de providers — contratos, nunca implementações.
- Não importa Express, Prisma ou Inversify; a única biblioteca usada é o Zod, para os schemas.

#### `src/application` — os casos de uso

Orquestra o domínio para realizar uma intenção do usuário ("cadastrar cliente", "transferir veículo").

- Depende **apenas** de `domain`.
- Fala com o mundo externo através das interfaces declaradas no domínio — nunca do Prisma direto.
- Guarda os DTOs de entrada e saída (derivados dos schemas do domínio com `pick`/`omit`/`partial`),
  os mappers de resposta, as exceções de aplicação e os símbolos `TYPES` do contêiner de DI.

#### `src/infrastructure` — os detalhes

Tudo que é substituível: HTTP, banco, segurança, configuração, documentação, DI.

- Implementa as interfaces do domínio (ex.: `PrismaCustomerRepository`, `JoseTokenProvider`).
- Conhece Express, Prisma, Swagger e o contêiner.
- Pode importar `application` e `domain`; o contrário nunca acontece.

### Estrutura de diretórios

```
src/
├── domain/
│   ├── aggregates/         # Customer, Vehicle, User, Service, Part (+ testes)
│   ├── schemas/            # schemas Zod de cada agregado e campos (email, telefone, CPF/CNPJ, placa, senha)
│   ├── value-objects/      # TaxDocument, LicensePlate, UserRole
│   ├── events/             # eventos de domínio
│   ├── repositories/       # interfaces de repositório
│   ├── providers/          # interfaces de serviços externos (token, hash de senha)
│   ├── errors/             # DomainError
│   ├── shared/             # AggregateRoot, Entity, Brand, Changes, parseSchema
│   └── test/mocks/         # mocks e repositórios em memória para os testes
├── application/
│   ├── dto/
│   │   ├── inputs/         # DTOs de entrada (derivados dos schemas do domínio)
│   │   ├── outputs/        # DTOs de saída
│   │   ├── Types.ts        # símbolos de injeção de dependência
│   │   └── Zod.ts          # Zod estendido com suporte a OpenAPI
│   ├── use-cases/          # auth/, customers/, vehicles/, services/, parts/
│   ├── mappers/            # agregado → resposta da API
│   └── exceptions/         # AppError, NotFoundError, ConflictError...
└── infrastructure/
    ├── database/
    │   ├── prisma/         # schema.prisma + migrations versionadas
    │   ├── repositories/   # implementações Prisma dos repositórios
    │   ├── mappers/        # registro do banco ↔ agregado
    │   └── seed/           # criação do usuário ADMIN inicial
    ├── http/
    │   ├── controllers/    # Auth, Customer, Vehicle, Service, Part, Health (+ testes HTTP)
    │   ├── middlewares/    # AuthMiddleware, errorHandler
    │   └── routing/        # decorators @Route e @Auth
    ├── providers/          # JoseTokenProvider (JWT), ScryptPasswordHasher
    ├── di/                 # composition root (Container.ts) e bindings por categoria
    ├── env/                # variáveis de ambiente validadas com Zod
    ├── logger/             # log estruturado em JSON
    └── server/             # app.ts, main.ts, swagger.ts
```

<!-- TODO: atualizar a árvore quando os módulos de peças, serviços e ordem de serviço forem mergeados. -->

---

## 7. Documentação DDD

Board completo no Miro: 🔗 pendente <!-- TODO: link público do Miro (acessível sem pedido de permissão) -->

Versões exportadas ficam em [`docs/ddd/`](docs/ddd/):

| Artefato                                                      | Arquivo                                                        | Status      |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| Event Storming — criação da Ordem de Serviço                  | [`docs/ddd/event-storming.pdf`](docs/ddd/event-storming.pdf)   | 🔗 pendente |
| Event Storming — acompanhamento da Ordem de Serviço           | [`docs/ddd/event-storming.pdf`](docs/ddd/event-storming.pdf)   | 🔗 pendente |
| Event Storming — gestão de peças e insumos                    | [`docs/ddd/event-storming.pdf`](docs/ddd/event-storming.pdf)   | 🔗 pendente |
| Diagramas (agregados, entidades, objetos de valor, contextos) | [`docs/ddd/diagramas.pdf`](docs/ddd/diagramas.pdf)             | 🔗 pendente |
| Linguagem ubíqua e glossário                                  | [`docs/ddd/linguagem-ubiqua.md`](docs/ddd/linguagem-ubiqua.md) | 🔗 pendente |

<!-- TODO: marcar cada artefato como concluído quando o arquivo estiver em docs/ddd/. -->

A documentação cobre: eventos de domínio, comandos, políticas e regras de negócio, atores, agregados,
entidades, objetos de valor, bounded contexts e a linguagem ubíqua.

### Relação entre a documentação e o código

| Conceito DDD              | Onde está no código                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Agregado Cliente          | [`src/domain/aggregates/Customer.ts`](src/domain/aggregates/Customer.ts)                     |
| Agregado Veículo          | [`src/domain/aggregates/Vehicle.ts`](src/domain/aggregates/Vehicle.ts)                       |
| Agregado Usuário          | [`src/domain/aggregates/User.ts`](src/domain/aggregates/User.ts)                             |
| Objeto de valor CPF/CNPJ  | [`src/domain/value-objects/TaxDocument.ts`](src/domain/value-objects/TaxDocument.ts)         |
| Objeto de valor Placa     | [`src/domain/value-objects/LicensePlate.ts`](src/domain/value-objects/LicensePlate.ts)       |
| Evento Cliente cadastrado | [`src/domain/events/CustomerCreatedEvent.ts`](src/domain/events/CustomerCreatedEvent.ts)     |
| Evento Veículo registrado | [`src/domain/events/VehicleRegisteredEvent.ts`](src/domain/events/VehicleRegisteredEvent.ts) |
| Repositórios (contratos)  | [`src/domain/repositories/`](src/domain/repositories/)                                       |
| Agregado Ordem de Serviço | 🔗 pendente <!-- TODO -->                                                                    |
| Agregado Peça / Insumo    | 🔗 pendente <!-- TODO -->                                                                    |
| Agregado Serviço          | [`src/domain/aggregates/Service.ts`](src/domain/aggregates/Service.ts)                       |
| Evento Serviço registrado | [`src/domain/events/ServiceRegisteredEvent.ts`](src/domain/events/ServiceRegisteredEvent.ts) |

---

## 8. Como rodar

### Pré-requisitos

- Node.js 22+ (o projeto foi desenvolvido em v24)
- pnpm 10.10.0 (`corepack enable` já resolve — o campo `packageManager` do `package.json` fixa a versão)
- Docker + Docker Compose (para o PostgreSQL)

### Passo a passo

```bash
# 1. Variáveis de ambiente
cp .env.example .env

# 2. Dependências
pnpm install

# 3. Banco de dados
docker compose up -d database        # só o PostgreSQL (recomendado em dev)
# ou
pnpm docker:up                       # PostgreSQL + API, ambos em container

# 4. Migrations (cria as tabelas)
pnpm migrate:deploy

# 5. Usuário ADMIN inicial (usa ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD do .env; idempotente)
pnpm seed:admin

# 6. API em modo desenvolvimento (hot reload)
pnpm dev
```

> Ao alterar o `schema.prisma` durante o desenvolvimento, use `pnpm migrate` para criar uma nova
> migration.

### URLs

| Recurso      | URL                          |
| ------------ | ---------------------------- |
| Health check | http://localhost:3000/health |
| Swagger UI   | http://localhost:3000/docs   |

> `GET /health` responde **mesmo sem o PostgreSQL no ar**: o Prisma abre conexão de forma preguiçosa,
> só na primeira query. Isso é intencional — um health check que morre junto com o banco não ajuda a
> diagnosticar nada.

### Rodando o build de produção localmente

```bash
pnpm build     # gera dist/main.js
pnpm start     # node --env-file=.env dist/main.js
```

---

## 9. Autenticação e credenciais de demonstração

As APIs administrativas exigem um **JWT** no header `Authorization: Bearer <token>`.

### Credenciais de demonstração

O comando `pnpm seed:admin` cria o usuário `ADMIN` inicial a partir do `.env`. Com os valores do
`.env.example`:

| Papel   | E-mail              | Senha                |
| ------- | ------------------- | -------------------- |
| `ADMIN` | `admin@oficina.com` | `TroqueEssaSenha123` |

> Use essas credenciais **apenas em ambiente local**. Em qualquer outro ambiente, defina
> `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `JWT_SECRET` próprios.

### Obtendo um token

```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@oficina.com", "password": "TroqueEssaSenha123"}'
```

No Swagger (`/docs`), clique em **Authorize** e cole o `accessToken` retornado. Com o `ADMIN`
autenticado, outros usuários (`ATTENDANT`, `MECHANIC`) são criados em `POST /auth/register`.

### Como a proteção funciona

Usuários internos da oficina (`ADMIN`, `ATTENDANT`, `MECHANIC`) recebem um JWT HS256 assinado com
`JWT_SECRET` (biblioteca `jose`). As senhas são guardadas com `scrypt` nativo do Node, com salt
aleatório por usuário.

Controllers declaram rotas com `@Route` e exigem autenticação com `@Auth`. O `registerControllers`
lê esses metadados e coloca o `AuthMiddleware` na frente do handler.

```ts
@injectable()
@Auth(UserRole.ADMIN, UserRole.ATTENDANT) // vale para todas as rotas da classe
export class CustomerController {
  @Route('get', '/customers')
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    // req.auth = { sub, email, role }
  }

  @Auth(UserRole.ADMIN) // o decorator do método tem precedência sobre o da classe
  @Route('delete', '/customers/:id')
  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {}
}
```

- `@Auth()` sem argumentos aceita qualquer usuário autenticado.
- Rotas sem `@Auth` (no método ou na classe) são públicas.
- Novo controller: ligue-o em `TYPES.Controller` em `infrastructure/di/Controllers.ts`.

| Situação                                               | Resposta            |
| ------------------------------------------------------ | ------------------- |
| Header ausente ou esquema diferente de Bearer          | `401 MISSING_TOKEN` |
| Token adulterado, de outro emissor ou fora do contrato | `401 INVALID_TOKEN` |
| Token expirado                                         | `401 TOKEN_EXPIRED` |
| Papel do usuário fora dos permitidos                   | `403 FORBIDDEN`     |

<!-- TODO: documentar como o cliente acompanha a OS sem login (rota pública) quando ela for implementada. -->

---

## 10. Endpoints e documentação da API (Swagger)

A documentação interativa fica em **http://localhost:3000/docs** (Swagger UI, OpenAPI 3), gerada a
partir dos mesmos schemas Zod que validam as requisições.

### Saúde e autenticação

| Método | Rota             | Acesso  | Descrição                         |
| ------ | ---------------- | ------- | --------------------------------- |
| GET    | `/health`        | pública | Disponibilidade da API            |
| POST   | `/auth/sign-in`  | pública | Retorna `accessToken` e o usuário |
| POST   | `/auth/register` | `ADMIN` | Cadastra um usuário interno       |
| GET    | `/auth/me`       | logado  | Dados do usuário do token         |

### Clientes

| Método | Rota                            | Acesso              | Descrição                             |
| ------ | ------------------------------- | ------------------- | ------------------------------------- |
| POST   | `/customers`                    | `ADMIN`/`ATTENDANT` | Cadastra cliente (CPF ou CNPJ)        |
| GET    | `/customers`                    | `ADMIN`/`ATTENDANT` | Lista paginada                        |
| GET    | `/customers/document/:document` | `ADMIN`/`ATTENDANT` | Identifica o cliente pelo CPF ou CNPJ |
| GET    | `/customers/:id`                | `ADMIN`/`ATTENDANT` | Detalha um cliente                    |
| PATCH  | `/customers/:id`                | `ADMIN`/`ATTENDANT` | Atualiza parcialmente                 |
| DELETE | `/customers/:id`                | `ADMIN`             | Remove (bloqueado se houver veículos) |

### Veículos

| Método | Rota                     | Acesso              | Descrição                                |
| ------ | ------------------------ | ------------------- | ---------------------------------------- |
| POST   | `/vehicles`              | `ADMIN`/`ATTENDANT` | Cadastra veículo vinculado a um cliente  |
| GET    | `/vehicles`              | `ADMIN`/`ATTENDANT` | Lista paginada, com filtro por cliente   |
| GET    | `/vehicles/plate/:plate` | `ADMIN`/`ATTENDANT` | Identifica o veículo pela placa          |
| GET    | `/vehicles/:id`          | `ADMIN`/`ATTENDANT` | Detalha um veículo                       |
| PATCH  | `/vehicles/:id`          | `ADMIN`/`ATTENDANT` | Atualiza ou transfere para outro cliente |
| DELETE | `/vehicles/:id`          | `ADMIN`             | Remove                                   |

### Serviços (catálogo)

| Método | Rota            | Acesso                       | Descrição                          |
| ------ | --------------- | ---------------------------- | ---------------------------------- |
| POST   | `/services`     | `ADMIN`                      | Cadastra serviço com preço e tempo |
| GET    | `/services`     | qualquer usuário autenticado | Lista paginada do catálogo         |
| GET    | `/services/:id` | qualquer usuário autenticado | Detalha um serviço                 |
| PATCH  | `/services/:id` | `ADMIN`                      | Atualiza parcialmente              |
| DELETE | `/services/:id` | `ADMIN`                      | Remove                             |

O nome do serviço é único. O preço (reais, até 2 casas) e o tempo estimado (minutos) são copiados para o
Item de Serviço da OS ao incluí-lo, então editar o catálogo não altera orçamentos já gerados. Detalhes em
[Catálogo de Serviços](docs/ddd/catalogo-de-servicos.md).

### Em desenvolvimento

| Módulo                       | Endpoints                 |
| ---------------------------- | ------------------------- |
| Peças e insumos / estoque    | 🔗 pendente <!-- TODO --> |
| Ordem de Serviço e orçamento | 🔗 pendente <!-- TODO --> |
| Acompanhamento pelo cliente  | 🔗 pendente <!-- TODO --> |
| Tempo médio de execução      | 🔗 pendente <!-- TODO --> |

### Padrão de erros

Todas as respostas de erro seguem o formato `{ "error": { "code", "message", "details?" } }`.

| Situação                                | Status | `code`                                              |
| --------------------------------------- | ------ | --------------------------------------------------- |
| Dados de entrada inválidos (Zod)        | 400    | `VALIDATION_ERROR`                                  |
| Sem token / token inválido ou expirado  | 401    | `MISSING_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED` |
| Papel sem permissão                     | 403    | `FORBIDDEN`                                         |
| Recurso não encontrado                  | 404    | `NOT_FOUND`                                         |
| Duplicidade (CPF/CNPJ, placa, e-mail)   | 409    | `CONFLICT`                                          |
| Remover cliente que ainda tem veículos  | 409    | `CUSTOMER_HAS_VEHICLES`                             |
| Regra de domínio violada                | 422    | código específico (ex.: `INVALID_PHONE`)            |
| Erro inesperado (sem detalhes internos) | 500    | `INTERNAL_SERVER_ERROR`                             |

---

## 11. Testes e cobertura

O desafio exige testes automatizados com **cobertura mínima de 80% nos domínios críticos**. Essa
regra é aplicada automaticamente no CI.

```bash
pnpm test            # suíte completa
pnpm test:coverage   # suíte + cobertura, com o mínimo de 80% aplicado
pnpm test:integration  # integração contra PostgreSQL real (exige o banco no ar)
```

| Tipo de teste          | O que cobre                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| Unitários de domínio   | Agregados, objetos de valor e schemas (CPF/CNPJ, placa, e-mail, telefone)    |
| Unitários de aplicação | Casos de uso com repositórios e providers mockados, incluindo casos de borda |
| HTTP (supertest)       | Fluxo completo rota → validação → caso de uso → erro, com JWT real           |
| Integração com banco   | Repositórios Prisma contra PostgreSQL real (banco `techchallenge_test`)      |

### Cobertura

- Usa o provider V8 do Vitest (`@vitest/coverage-v8`), configurado em `vitest.config.ts`.
- **Domínios críticos** = `src/domain/**` e `src/application/**`, onde mora a regra de negócio.
  Se statements, branches, funções ou linhas ficarem abaixo de **80%** em qualquer um deles, o
  comando falha e o CI fica vermelho.
- A infraestrutura entra no relatório, mas não bloqueia: controllers são cobertos pelos testes
  HTTP, e repositórios Prisma pedem testes de integração com banco real.
- Ficam fora da medição o bootstrap (`server/main.ts`), o seed e o schema/migrations do Prisma.
- O relatório navegável é gerado em `coverage/index.html`.

<!-- TODO: incluir o resumo/print da cobertura da versão de entrega (ex.: docs/evidencias/cobertura.png). -->

### Testes de integração

```bash
pnpm test:integration
```

- Rodam contra PostgreSQL real (`*.integration.spec.ts`, configurados em `vitest.integration.config.ts`)
  e ficam fora do `pnpm test`, porque precisam de um banco no ar (localmente, o do compose).
- Usam o banco `techchallenge_test` (ou `TEST_DATABASE_URL`), que recebe as migrations antes da suíte.
  Por segurança, a suíte só roda em banco cujo nome termina em `_test`.

### Pipeline de CI (`.github/workflows/ci.yml`)

Roda em todo pull request e em todo push na `main`:

1. Instala dependências (`pnpm install --frozen-lockfile`) e gera o Prisma Client.
2. `pnpm typecheck`.
3. `pnpm test:coverage`, aplicando o mínimo de 80%.
4. Publica o relatório de cobertura como artefato `coverage-report` (fica 30 dias na execução),
   que serve de evidência da cobertura exigida na entrega.

Em paralelo, o job `integration` sobe um PostgreSQL 16 como serviço e roda `pnpm test:integration`
contra o banco `techchallenge_test`.

Toda mudança na `main` chega por pull request, com o CI verde como requisito para o merge.

<!-- TODO: ativar a proteção da main no GitHub (Settings > Branches: PR obrigatório + status check "Typecheck e testes"). -->

---

## 12. Segurança e análise de vulnerabilidades

Relatório completo da análise de vulnerabilidades: 🔗 pendente
<!-- TODO: link para docs/security/vulnerability-report.md -->

Controles já aplicados na aplicação:

| Controle                     | Como                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação e autorização   | JWT nas APIs administrativas, com papéis por rota (`@Auth`)                                                                                     |
| Senhas                       | Hash `scrypt` com salt aleatório e comparação em tempo constante                                                                                |
| Validação de dados sensíveis | CPF/CNPJ com dígito verificador, placa (antiga e Mercosul), e-mail e telefone validados no domínio e na entrada                                 |
| SQL injection                | Todo acesso ao banco via Prisma Client (queries parametrizadas, sem SQL concatenado); entradas validadas com Zod antes de chegar ao repositório |
| Mass assignment              | Campos não previstos no DTO (ex.: `id`, `createdAt`) são descartados                                                                            |
| Vazamento de informação      | Erros inesperados retornam mensagem genérica, sem stack trace ou detalhes do banco                                                              |
| Cabeçalhos HTTP              | `helmet`                                                                                                                                        |
| Segredos                     | `.env` fora do versionamento; `JWT_SECRET` com no mínimo 32 caracteres, validado na inicialização                                               |
| Container                    | Imagem final roda com usuário sem privilégios (`node`)                                                                                          |

---

## 13. Scripts disponíveis

| Script             | Comando                                                       | Descrição                                                                                                |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `dev`              | `tsx watch --env-file=.env src/infrastructure/server/main.ts` | Servidor em desenvolvimento com hot reload                                                               |
| `build`            | `tsup ... --format esm --out-dir dist --clean`                | Bundle ESM de produção em `dist/main.js`                                                                 |
| `start`            | `node --env-file=.env dist/main.js`                           | Executa o bundle gerado                                                                                  |
| `typecheck`        | `tsc --noEmit`                                                | Verificação de tipos sem emitir arquivos                                                                 |
| `lint`             | `eslint .`                                                    | Analisa o código                                                                                         |
| `lint:fix`         | `eslint . --fix`                                              | Corrige automaticamente o que dá                                                                         |
| `format`           | `prettier --write .`                                          | Formata o projeto                                                                                        |
| `format:check`     | `prettier --check .`                                          | Falha se algo estiver fora do formato                                                                    |
| `test`             | `vitest --run`                                                | Roda a suíte de testes uma vez                                                                           |
| `test:coverage`    | `vitest --run --coverage`                                     | Testes + cobertura; falha abaixo de 80% em domain/application                                            |
| `test:integration` | `vitest --run --config vitest.integration.config.ts`          | Testes de integração contra PostgreSQL real (banco `techchallenge_test`; exige o banco do compose no ar) |
| `test:watch`       | `vitest`                                                      | Testes em modo watch                                                                                     |
| `prisma:generate`  | `prisma generate --schema ...`                                | Gera o Prisma Client                                                                                     |
| `migrate`          | `prisma migrate dev --schema ...`                             | Cria/aplica migration em dev                                                                             |
| `migrate:deploy`   | `prisma migrate deploy --schema ...`                          | Aplica migrations pendentes                                                                              |
| `seed:admin`       | `tsx --env-file=.env .../seed/seedAdmin.ts`                   | Cria o usuário ADMIN inicial (idempotente)                                                               |
| `studio`           | `prisma studio --schema ...`                                  | Interface visual do banco                                                                                |
| `docker:up`        | `docker compose up -d --build --wait`                         | Sobe banco + API e espera ficarem saudáveis                                                              |
| `docker:down`      | `docker compose down --remove-orphans`                        | Derruba os containers                                                                                    |
| `docker:clean`     | `docker compose down -v --remove-orphans`                     | Derruba tudo **e apaga o volume do banco**                                                               |

---

## 14. Docker

### Dockerfile (multi-stage)

Um build multi-stage separa _o que é necessário para compilar_ de _o que é necessário para executar_.
Compiladores, tipos e ferramentas de teste ficam nos estágios intermediários e são descartados; a
imagem final leva apenas o bundle e as dependências de produção.

| Estágio     | Papel                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `base`      | `node:24-alpine` + pnpm habilitado via `corepack` (respeita o `packageManager` do `package.json`)                            |
| `deps`      | `pnpm install --frozen-lockfile` com **todas** as dependências (inclusive dev)                                               |
| `build`     | `prisma generate` e depois `pnpm run build` (tsup) → `dist/main.js`                                                          |
| `prod-deps` | `pnpm install --prod --frozen-lockfile` + `prisma generate`, gerando um `node_modules` só com o necessário em runtime        |
| `runner`    | Imagem final: copia `node_modules` de `prod-deps`, `dist` de `build`, roda como usuário `node` e executa `node dist/main.js` |

Três detalhes importantes:

- A pasta `src/infrastructure/database/prisma` é copiada para a imagem final. Sem ela o comando
  `pnpm migrate:deploy` não teria schema nem migrations para aplicar dentro do container.
- O pacote `prisma` (a CLI) está em `dependencies`, não em `devDependencies`, justamente para que
  `migrate:deploy` funcione na imagem de produção.
- Há um `HEALTHCHECK` batendo em `/health`, o que faz o `--wait` do `pnpm docker:up` esperar a API
  ficar de fato pronta, e não apenas "em execução".

### docker-compose.yml

| Serviço    | Descrição                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database` | `postgres:16-alpine`, credenciais vindas do `.env`, volume nomeado `techchallenge-postgres-data` para os dados sobreviverem a um `down`, e `healthcheck` com `pg_isready` |
| `api`      | Construída a partir do `Dockerfile`, lê o `.env` via `env_file` e só inicia quando o banco está saudável (`depends_on` com `condition: service_healthy`)                  |

Dentro da rede do compose o host do banco **não** é `localhost`, e sim o nome do serviço. Por isso o
serviço `api` sobrescreve `DATABASE_URL` e `DB_HOST` apontando para `database`.

```bash
pnpm docker:up      # sobe tudo e espera ficar saudável
pnpm docker:down    # derruba, preservando os dados
pnpm docker:clean   # derruba e apaga o volume
```

---

## 15. Detalhes técnicos

### 15.1 Injeção de dependência com InversifyJS

Uma classe quase nunca trabalha sozinha: o controller precisa do caso de uso, o caso de uso precisa
do repositório, o repositório precisa do client do banco. Existem duas formas de obter essas peças.

**Sem injeção** — a classe constrói as próprias dependências:

```ts
class CustomerController {
  private readonly useCase = new CreateCustomerUseCase(
    new PrismaCustomerRepository(new PrismaClient()),
  );
}
```

O controller passa a _conhecer_ Prisma. Para testá-lo você precisa de um banco. Para trocar de ORM
você edita o controller. O acoplamento é total.

**Com injeção** — a classe apenas declara o que precisa, e alguém entrega:

```ts
@injectable()
export class CreateCustomerUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}
}
```

O caso de uso conhece só a **interface** `CustomerRepository`, declarada no domínio. Quem entrega a
implementação concreta (`PrismaCustomerRepository`) é o **contêiner** (Inversify).

| Benefício                      | Explicação                                                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desacoplamento**             | Cada camada depende de abstrações, não de implementações concretas                                                                                                                                                           |
| **Inversão de dependência**    | O domínio declara a interface `CustomerRepository`; a infraestrutura fornece o `PrismaCustomerRepository`. A dependência aponta para dentro — é exatamente o "D" do SOLID e a regra de dependência do DDD/Clean Architecture |
| **Testabilidade**              | No teste você entrega um mock ou um repositório em memória no lugar da implementação real: sem banco, sem rede, testes rápidos e determinísticos                                                                             |
| **Ciclo de vida centralizado** | `inSingletonScope()` cria uma instância só (pool do banco, configuração); `inTransientScope()` cria uma nova a cada resolução (casos de uso, que não devem guardar estado entre requisições)                                 |
| **Troca de implementação**     | Sair de Prisma para outro acesso a dados é mudar **uma linha de binding**, não os consumidores                                                                                                                               |

#### `reflect-metadata` e o cuidado com esbuild

`reflect-metadata` é o polyfill que habilita a API de metadados de decorators. Ele é importado
**uma única vez**, no topo de `main.ts` e de `Container.ts`.

Um detalhe que gera bugs silenciosos: `tsx` e `tsup` usam **esbuild**, que **não emite**
`design:paramtypes` mesmo com `emitDecoratorMetadata: true` no `tsconfig.json` (o build exibe o
aviso `You have emitDecoratorMetadata enabled but @swc/core was not installed`). Por isso, neste
projeto **todo construtor injetado usa `@inject(TYPES.X)` explícito** — nunca inferência pelo tipo
do parâmetro. Escrever `constructor(private readonly x: Foo) {}` sem `@inject` quebraria em runtime.

### 15.2 `infrastructure/di/Container.ts`: a composition root

`Container.ts` é o único ponto do sistema que conhece, ao mesmo tempo, **todas as abstrações e todas
as implementações concretas**. Essa concentração é proposital: se o "quem implementa o quê"
estivesse espalhado, cada `new` dentro de um controller ou caso de uso reintroduziria o acoplamento
que a arquitetura tenta eliminar.

Responsabilidades do arquivo:

1. **Criar o contêiner** — `export const container = new Container();`
2. **Registrar infraestrutura como singleton** — o `PrismaClient` é caro (pool de conexões): uma
   instância só, compartilhada por toda a aplicação.
3. **Validar variáveis de ambiente no momento do bind** — o helper `bindRequiredEnv` falha com uma
   mensagem clara em vez de deixar um `undefined` explodir mais tarde, sem contexto.
4. **Delegar por categoria** — `configureProviders`, `configureRepositories`, `configureUseCases` e
   `configureControllers`, cada um em seu arquivo, mantendo os módulos pequenos e óbvios.

```ts
export const container = new Container();

bindRequiredEnv(TYPES.DatabaseUrl, 'DATABASE_URL');

container
  .bind<PrismaClient>(TYPES.PrismaClient)
  .toDynamicValue(() => createPrismaClient(env.DATABASE_URL))
  .inSingletonScope();

configureProviders(container);
configureRepositories(container);
configureUseCases(container);
configureControllers(container);
```

#### Os `TYPES` como símbolos

```ts
export const TYPES = {
  PrismaClient: Symbol.for('PrismaClient'),
  CustomerRepository: Symbol.for('CustomerRepository'),
  CreateCustomerUseCase: Symbol.for('CreateCustomerUseCase'),
  Controller: Symbol.for('Controller'),
  // ...
} as const;
```

Um binding precisa de uma **chave**. Existem três candidatos, e dois são ruins:

- **A classe concreta** (`container.get(PrismaCustomerRepository)`) — o consumidor volta a importar a
  implementação. Acoplamento de novo.
- **Uma string** (`container.get('CustomerRepository')`) — um typo compila normalmente e só falha em
  runtime; e duas strings iguais em módulos diferentes colidem sem aviso.
- **Um `Symbol`** — identidade única e garantida, agrupada num objeto exportado. Um typo em
  `TYPES.CustomerRepositry` vira erro de compilação imediato.

Por isso os símbolos moram em `application/dto/Types.ts`: eles representam **contratos da
aplicação**, e permitem que qualquer camada peça uma dependência sem importar a classe que a
implementa. Todos os controllers são ligados ao mesmo símbolo `TYPES.Controller`, e o `app.ts`
registra as rotas de todos com `container.getAll`.

### 15.3 Prisma e migrations

```
src/infrastructure/database/prisma/
├── schema.prisma
└── migrations/
```

O caminho não é decorativo. Persistência é **detalhe de infraestrutura**: o domínio define _o que_
precisa ser guardado (a interface do repositório), a infraestrutura decide _como_ (PostgreSQL, via
Prisma). Manter `schema.prisma` na raiz do projeto sugeriria que o banco é o centro do sistema —
exatamente a inversão que a arquitetura em camadas evita.

A configuração tem duas peças, uma redundante de propósito:

1. **`package.json`** — a chave `prisma.schema` diz à CLI onde procurar o schema **e**, por
   consequência, onde criar e ler a pasta `migrations`:

   ```json
   "prisma": {
     "schema": "src/infrastructure/database/prisma/schema.prisma"
   }
   ```

2. **Flag `--schema` nos scripts** — todos os scripts Prisma repetem o caminho explicitamente, para
   funcionarem mesmo fora do contexto do `package.json` (dentro do container, por exemplo).

> **Nota de versão:** esta configuração via `package.json#prisma` está **deprecada a partir do
> Prisma 7** (a CLI já emite o aviso). Por isso o projeto está fixado em **Prisma 6.x**. Ao migrar
> para a 7+, o caminho do schema passa a viver num arquivo `prisma.config.ts`.

| Comando                | O que faz                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `pnpm prisma:generate` | Gera o Prisma Client tipado a partir do schema                |
| `pnpm migrate`         | Cria e aplica uma migration em desenvolvimento (pede um nome) |
| `pnpm migrate:deploy`  | Aplica migrations pendentes sem criar novas (produção/CI)     |
| `pnpm studio`          | Abre o Prisma Studio para navegar pelos dados                 |

Models atuais: `User`, `Customer`, `Vehicle`, `Part`, `StockMovement` e `Service`, com uma migration versionada para cada um.

---

## 16. Equipe

<!-- TODO: preencher com os dados de todos os integrantes (também exigidos na primeira página do PDF de entrega). -->

| Nome        | RM          | Usuário no Discord |
| ----------- | ----------- | ------------------ |
| 🔗 pendente | 🔗 pendente | 🔗 pendente        |

**Grupo:** 🔗 pendente · **Curso:** SOAT — Software Architecture · **Fase:** 1
