# TechChallenge API

API REST construída em Node.js + TypeScript, organizada em camadas (DDD / Clean
Architecture), com injeção de dependência via InversifyJS, persistência com Prisma + PostgreSQL,
validação com Zod e documentação interativa em Swagger UI.

Estado atual:

- `GET /health` — verificação de disponibilidade (não depende do banco).
- `GET /docs` — Swagger UI com o documento OpenAPI 3 gerado a partir dos schemas Zod.
- Um model Prisma de exemplo (`Example`), só para a primeira migration ter conteúdo.

---

## 1. Visão geral

| Item           | Valor                                    |
| -------------- | ---------------------------------------- |
| Runtime        | Node.js 22+ (desenvolvido em v24)        |
| Linguagem      | TypeScript 5.9 (ESM, `"type": "module"`) |
| Framework HTTP | Express 5                                |
| Banco          | PostgreSQL 16                            |
| ORM            | Prisma 6                                 |
| Gerenciador    | pnpm 10.10.0                             |

---

## 2. Ferramentas e por que cada uma

| Ferramenta                                                  | Papel no projeto                     | Por que ela                                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**                                                 | Runtime JavaScript no servidor       | Ecossistema enorme, I/O não bloqueante, ideal para APIs                                                                                                          |
| **TypeScript**                                              | Tipagem estática sobre JavaScript    | Erros aparecem em tempo de compilação; contratos entre camadas viram tipos verificáveis                                                                          |
| **pnpm**                                                    | Gerenciador de pacotes               | `node_modules` por links (rápido e econômico) e estrito: um pacote só é importável se estiver declarado                                                          |
| **Express**                                                 | Framework HTTP                       | Minimalista e onipresente; o modelo de middlewares é excelente para entender o ciclo requisição → resposta                                                       |
| **Prisma**                                                  | ORM + migrations                     | Schema declarativo único, client totalmente tipado e histórico de migrations versionado                                                                          |
| **PostgreSQL**                                              | Banco relacional                     | Padrão de mercado, open source, robusto                                                                                                                          |
| **Zod**                                                     | Validação em runtime                 | TypeScript some ao compilar; Zod garante na execução que o que chega de fora tem o formato esperado. `z.infer` deriva o tipo do schema — uma fonte de verdade só |
| **InversifyJS** + **reflect-metadata**                      | Contêiner de injeção de dependência  | Ver seção 4                                                                                                                                                      |
| **swagger-ui-express** + **@asteasolutions/zod-to-openapi** | Documentação da API                  | O documento OpenAPI é **gerado a partir dos mesmos schemas Zod** usados na validação — a documentação não desatualiza                                            |
| **cors**                                                    | Libera chamadas de outras origens    | Sem isso o navegador bloqueia o front consumindo a API                                                                                                           |
| **helmet**                                                  | Cabeçalhos HTTP de segurança         | Defesas básicas (clickjacking, sniffing, CSP) com uma linha                                                                                                      |
| **tsx**                                                     | Executa TypeScript direto, com watch | Loop de desenvolvimento sem passo de build                                                                                                                       |
| **tsup**                                                    | Bundler de produção (esbuild)        | Gera um `dist/main.js` ESM enxuto em milissegundos                                                                                                               |
| **Vitest** + **supertest**                                  | Testes                               | Vitest entende TypeScript/ESM nativamente; supertest sobe o app em memória e faz requisições HTTP reais sem precisar ocupar uma porta                            |
| **ESLint** + **Prettier**                                   | Qualidade e formatação               | ESLint pega erro de código, Prettier resolve estilo; `eslint-config-prettier` evita que briguem                                                                  |
| **Docker** / **docker compose**                             | Ambiente reproduzível                | Sobe PostgreSQL e API com um comando, sem instalar banco na máquina                                                                                              |

---

## 3. Arquitetura em camadas (DDD)

```
Infrastructure  ──▶  Application  ──▶  Domain
   (detalhes)        (casos de uso)    (regras puras)
```

A **regra de dependência** é o coração do desenho: as setas apontam sempre para dentro.
O que é estável (regra de negócio) nunca depende do que é volátil (banco, framework, HTTP).

### `src/domain` — o núcleo

Regras e conceitos de negócio puros: entidades, objetos de valor e **interfaces** de repositório.

- Não importa Express, Prisma, Inversify ou qualquer biblioteca externa.
- Define _contratos_ (`ExampleRepository`), nunca implementações.
- É a camada que sobrevive a uma troca de banco ou de framework.

### `src/application` — os casos de uso

Orquestra o domínio para realizar uma intenção do usuário ("criar pedido", "consultar saúde").

- Depende **apenas** de `domain`.
- Fala com o mundo externo através das interfaces declaradas no domínio — nunca do Prisma direto.
- Também guarda os DTOs (schemas Zod de entrada/saída) e os símbolos `TYPES` do contêiner de DI.

### `src/infrastructure` — os detalhes

Tudo que é substituível: HTTP, banco, configuração, documentação, DI.

- Implementa as interfaces do domínio (ex.: um `PrismaExampleRepository`).
- Conhece Express, Prisma, Zod, Swagger e o contêiner.
- Pode importar `application` e `domain`; o contrário nunca acontece.

### Árvore de pastas

```
src/
├── application/
│   ├── dto/
│   │   ├── HealthDto.ts        # schema Zod + tipo da resposta de /health
│   │   ├── Types.ts            # símbolos (Symbol) que identificam dependências no DI
│   │   └── Zod.ts              # instância de Zod estendida com suporte a OpenAPI
│   └── use-cases/
│       └── GetHealthUseCase.ts
├── domain/
│   ├── entities/               # (vazio) entidades e agregados
│   ├── repositories/           # (vazio) interfaces de repositório
│   └── value-objects/          # (vazio) objetos de valor
└── infrastructure/
    ├── database/
    │   ├── PrismaClient.ts     # factory do PrismaClient
    │   └── prisma/
    │       ├── schema.prisma   # datasource + generator + models
    │       └── migrations/     # migrations versionadas
    ├── di/
    │   ├── Container.ts        # composition root
    │   ├── Controllers.ts
    │   ├── Repositories.ts
    │   └── UseCases.ts
    ├── env/
    │   └── Env.ts              # process.env validado com Zod
    ├── http/
    │   ├── controllers/
    │   │   ├── HealthController.ts
    │   │   └── HealthController.spec.ts
    │   ├── errors/
    │   │   └── AppError.ts     # AppError, NotFoundError, BadRequestError
    │   └── middlewares/
    │       ├── errorHandler.ts # handler global de erros
    │       └── validate.ts     # validação Zod de body/params/query
    ├── logger/
    │   └── Logger.ts           # log estruturado em JSON
    └── server/
        ├── app.ts              # createApp(container)
        ├── main.ts             # ponto de entrada da aplicação
        └── swagger.ts          # documento OpenAPI 3
```

---

## 4. InversifyJS: injeção de dependência

### O que é injeção de dependência

Uma classe quase nunca trabalha sozinha: o controller precisa do caso de uso, o caso de uso precisa
do repositório, o repositório precisa do client do banco. Existem duas formas de obter essas peças.

**Sem injeção** — a classe constrói as próprias dependências:

```ts
class HealthController {
  private readonly useCase = new GetHealthUseCase(new PrismaExampleRepository(new PrismaClient()));
}
```

O controller passa a _conhecer_ Prisma. Para testá-lo você precisa de um banco. Para trocar de ORM
você edita o controller. O acoplamento é total.

**Com injeção** — a classe apenas declara o que precisa, e alguém entrega:

```ts
@injectable()
export class HealthController {
  constructor(
    @inject(TYPES.GetHealthUseCase)
    private readonly getHealthUseCase: GetHealthUseCase,
  ) {}
}
```

O controller não sabe como o caso de uso é construído. Quem resolve isso é o **contêiner** (Inversify).

### Por que usar

| Benefício                      | Explicação                                                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desacoplamento**             | Cada camada depende de abstrações, não de implementações concretas                                                                                                                                                         |
| **Inversão de dependência**    | O domínio declara a interface `ExampleRepository`; a infraestrutura fornece o `PrismaExampleRepository`. A dependência aponta para dentro — é exatamente o "D" do SOLID e a regra de dependência do DDD/Clean Architecture |
| **Testabilidade**              | No teste você entrega um mock no lugar da implementação real: sem banco, sem rede, testes rápidos e determinísticos                                                                                                        |
| **Ciclo de vida centralizado** | `inSingletonScope()` cria uma instância só (pool do banco, configuração); `inTransientScope()` cria uma nova a cada resolução (casos de uso, que não devem guardar estado entre requisições)                               |
| **Troca de implementação**     | Sair de Prisma para outro acesso a dados é mudar **uma linha de binding**, não os consumidores                                                                                                                             |

### `reflect-metadata` e o cuidado com esbuild

`reflect-metadata` é o polyfill que habilita a API de metadados de decorators. Ele é importado
**uma única vez**, no topo de `main.ts` e de `Container.ts`.

Um detalhe que gera bugs silenciosos: `tsx` e `tsup` usam **esbuild**, que **não emite**
`design:paramtypes` mesmo com `emitDecoratorMetadata: true` no `tsconfig.json` (o build exibe o
aviso `You have emitDecoratorMetadata enabled but @swc/core was not installed`). Por isso, neste
projeto **todo construtor injetado usa `@inject(TYPES.X)` explícito** — nunca inferência pelo tipo
do parâmetro. Escrever `constructor(private readonly x: Foo) {}` sem `@inject` quebraria em runtime.

---

## 5. `infrastructure/di/Container.ts`: por que este arquivo existe

`Container.ts` é a **composition root** da aplicação: o único ponto do sistema que conhece, ao mesmo
tempo, **todas as abstrações e todas as implementações concretas**.

Essa concentração é proposital. Se o "quem implementa o quê" estivesse espalhado, cada `new` dentro
de um controller ou caso de uso reintroduziria o acoplamento que a arquitetura tenta eliminar.
Isolando tudo em um arquivo, o resto do código fica livre para depender só de interfaces.

Responsabilidades do arquivo:

1. **Criar o contêiner** — `export const container = new Container();`
2. **Registrar infraestrutura como singleton** — o `PrismaClient` é caro (pool de conexões): uma
   instância só, compartilhada por toda a aplicação.
3. **Validar variáveis de ambiente no momento do bind** — o helper `bindRequiredEnv` falha com uma
   mensagem clara (`DATABASE_URL is not defined in environment variables`) em vez de deixar um
   `undefined` circular e explodir mais tarde, num ponto do código sem contexto nenhum.
4. **Delegar por categoria** — `configureRepositories`, `configureUseCases` e `configureControllers`.
   Uma aplicação real tem dezenas de bindings; concentrar tudo num arquivo só o transformaria num
   monólito ilegível. Quebrar por categoria mantém cada módulo pequeno e óbvio.

```ts
export const container = new Container();

const bindRequiredEnv = (symbol: symbol, key: keyof typeof env): void => {
  container
    .bind<string>(symbol)
    .toDynamicValue(() => {
      const value = env[key] as unknown;

      if (!value) {
        throw new Error(`${String(key)} is not defined in environment variables`);
      }

      return String(value);
    })
    .inSingletonScope();
};

bindRequiredEnv(TYPES.DatabaseUrl, 'DATABASE_URL');

container
  .bind<PrismaClient>(TYPES.PrismaClient)
  .toDynamicValue(() => createPrismaClient(env.DATABASE_URL))
  .inSingletonScope();

configureRepositories(container);
configureUseCases(container);
configureControllers(container);
```

### Os `TYPES` como símbolos

```ts
export const TYPES = {
  PrismaClient: Symbol.for('PrismaClient'),
  DatabaseUrl: Symbol.for('DatabaseUrl'),
  GetHealthUseCase: Symbol.for('GetHealthUseCase'),
  HealthController: Symbol.for('HealthController'),
} as const;
```

Um binding precisa de uma **chave**. Existem três candidatos, e dois são ruins:

- **A classe concreta** (`container.get(PrismaExampleRepository)`) — o consumidor volta a importar a
  implementação. Acoplamento de novo.
- **Uma string** (`container.get('ExampleRepository')`) — um typo (`'ExemploRepository'`) compila
  normalmente e só falha em runtime; e duas strings iguais em módulos diferentes colidem sem aviso.
- **Um `Symbol`** — identidade única e garantida, agrupada num objeto exportado. Um typo em
  `TYPES.ExempleRepository` vira erro de compilação imediato.

Por isso os símbolos moram em `application/dto/Types.ts`: eles representam **contratos da
aplicação**, e permitem que qualquer camada peça uma dependência sem importar a classe que a
implementa.

---

## 6. Prisma e migrations

### Onde o schema mora e por quê

```
src/infrastructure/database/prisma/
├── schema.prisma
└── migrations/
```

O caminho não é decorativo. Persistência é **detalhe de infraestrutura**: o domínio define _o que_
precisa ser guardado (a interface do repositório), a infraestrutura decide _como_ (PostgreSQL, via
Prisma). Manter `schema.prisma` na raiz do projeto sugeriria que o banco é o centro do sistema —
exatamente a inversão que a arquitetura em camadas evita. Dentro de `infrastructure/database`, a
pasta declara sua natureza: é um detalhe substituível.

### Como isso é configurado

Duas peças, uma redundante de propósito:

1. **`package.json`** — a chave `prisma.schema` diz à CLI onde procurar o schema **e**, por
   consequência, onde criar e ler a pasta `migrations`:

   ```json
   "prisma": {
     "schema": "src/infrastructure/database/prisma/schema.prisma"
   }
   ```

2. **Flag `--schema` nos scripts** — todos os scripts Prisma repetem o caminho explicitamente. Assim
   os comandos funcionam mesmo se invocados fora do contexto do `package.json` (dentro do container,
   por exemplo) e a intenção fica visível para quem lê.

> **Nota de versão:** esta configuração via `package.json#prisma` está **deprecada a partir do
> Prisma 7** (a CLI já emite o aviso). Por isso o projeto está fixado em **Prisma 6.x**. Ao migrar
> para a 7+, o caminho do schema passa a viver num arquivo `prisma.config.ts`.

### Comandos

| Comando                | O que faz                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `pnpm prisma:generate` | Gera o Prisma Client tipado a partir do schema                |
| `pnpm migrate`         | Cria e aplica uma migration em desenvolvimento (pede um nome) |
| `pnpm migrate:deploy`  | Aplica migrations pendentes sem criar novas (produção/CI)     |
| `pnpm studio`          | Abre o Prisma Studio para navegar pelos dados                 |

O schema traz um model `Example` apenas para que a **primeira migration tenha conteúdo**.
Substitua-o pelos models reais do seu domínio; a cada mudança de schema, rode `pnpm migrate`.

> A pasta `migrations/` ainda está vazia: nenhuma migration foi criada porque isso exige um
> PostgreSQL no ar. Rode `pnpm migrate` depois de subir o banco.

---

## 7. Como rodar

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
pnpm migrate

# 5. Usuario ADMIN inicial (usa ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD do .env; idempotente)
pnpm seed:admin

# 6. API em modo desenvolvimento (hot reload)
pnpm dev
```

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

## 8. Scripts disponíveis

| Script             | Comando                                                       | Descrição                                                                                                               |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dev`              | `tsx watch --env-file=.env src/infrastructure/server/main.ts` | Servidor em desenvolvimento com hot reload                                                                              |
| `build`            | `tsup ... --format esm --out-dir dist --clean`                | Bundle ESM de produção em `dist/main.js`                                                                                |
| `start`            | `node --env-file=.env dist/main.js`                           | Executa o bundle gerado                                                                                                 |
| `typecheck`        | `tsc --noEmit`                                                | Verificação de tipos sem emitir arquivos                                                                                |
| `lint`             | `eslint .`                                                    | Analisa o código                                                                                                        |
| `lint:fix`         | `eslint . --fix`                                              | Corrige automaticamente o que dá                                                                                        |
| `format`           | `prettier --write .`                                          | Formata o projeto                                                                                                       |
| `format:check`     | `prettier --check .`                                          | Falha se algo estiver fora do formato                                                                                   |
| `test`             | `vitest --run`                                                | Roda a suíte de testes uma vez                                                                                          |
| `test:watch`       | `vitest`                                                      | Testes em modo watch                                                                                                    |
| `test:integration` | `vitest --run --config vitest.integration.config.ts`          | Integração contra PostgreSQL real (banco `techchallenge_test`, criado pelas migrations; exige o banco do compose no ar) |
| `test:coverage`    | `vitest --run --coverage`                                     | Unitários com cobertura de `domain` e `application`; falha abaixo de 80% (relatório em `coverage/index.html`)           |
| `prisma:generate`  | `prisma generate --schema ...`                                | Gera o Prisma Client                                                                                                    |
| `migrate`          | `prisma migrate dev --schema ...`                             | Cria/aplica migration em dev                                                                                            |
| `migrate:deploy`   | `prisma migrate deploy --schema ...`                          | Aplica migrations pendentes                                                                                             |
| `seed:admin`       | `tsx --env-file=.env .../seed/seedAdmin.ts`                   | Cria o usuario ADMIN inicial (idempotente)                                                                              |
| `studio`           | `prisma studio --schema ...`                                  | Interface visual do banco                                                                                               |
| `docker:up`        | `docker compose up -d --build --wait`                         | Sobe banco + API e espera ficarem saudáveis                                                                             |
| `docker:down`      | `docker compose down --remove-orphans`                        | Derruba os containers                                                                                                   |
| `docker:clean`     | `docker compose down -v --remove-orphans`                     | Derruba tudo **e apaga o volume do banco**                                                                              |

---

## 9. Docker

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

## 10. Autenticação (JWT) e `@Auth`

Usuários internos da oficina (`ADMIN`, `ATTENDANT`, `MECHANIC`) fazem login com e-mail e senha e
recebem um JWT HS256 assinado com `JWT_SECRET` (biblioteca `jose`). As senhas são guardadas com
`scrypt` nativo do Node, com salt aleatório por usuário.

| Método | Rota             | Proteção       | Descrição                         |
| ------ | ---------------- | -------------- | --------------------------------- |
| POST   | `/auth/sign-in`  | pública        | Retorna `accessToken` e o usuário |
| POST   | `/auth/register` | `@Auth(ADMIN)` | Cadastra um usuário interno       |
| GET    | `/auth/me`       | `@Auth()`      | Dados do usuário do token         |

### Protegendo rotas

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
