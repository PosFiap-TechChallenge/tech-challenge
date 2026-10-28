# Catálogo de Serviços

Documentação DDD do catálogo de serviços da oficina. Termos em **negrito** estão definidos na
[Linguagem Ubíqua](./linguagem-ubiqua.md#termos-gerais).

## 1. Event Storming

| Fluxo    | Ator                                  | Comando                       | Evento                    |
| -------- | ------------------------------------- | ----------------------------- | ------------------------- |
| Cadastro | 🟨 Administrador                      | 🟦 Cadastrar Serviço          | 🟧 Serviço registrado     |
| Edição   | 🟨 Administrador                      | 🟦 Atualizar Serviço          | — (sem evento de domínio) |
| Remoção  | 🟨 Administrador                      | 🟦 Remover Serviço            | —                         |
| Consulta | 🟨 Atendente, Mecânico, Administrador | 🟦 Listar / Detalhar Serviços | —                         |

Política 🟪: _sempre que um **Serviço** é incluído em uma OS, copiar preço e tempo para o **Item de Serviço**_
(`ServiceOrder.addService`, no contexto da [Ordem de Serviço](./ordem-de-servico.md)).

## 2. Modelo de domínio

Agregado 🟩 `Service` (`src/domain/aggregates/Service.ts`).

| Atributo           | Tipo    | Significado                                |
| ------------------ | ------- | ------------------------------------------ |
| `name`             | texto   | Nome único no catálogo, até 120 caracteres |
| `price`            | `Money` | Preço em reais, de 0 a 1.000.000, 2 casas  |
| `estimatedMinutes` | inteiro | Tempo estimado de execução, de 1 a 10.080  |

### Regras de negócio

1. O agregado nunca existe inválido: `create`, `from` e `update` validam com `serviceSchema`.
2. O nome é único (`ConflictError`, HTTP 409; garantido também pelo índice único do banco).
3. `update` valida todos os campos antes de aplicar; uma falha não altera o agregado.
4. Preço e tempo são **congelados** no Item de Serviço da OS; editar o catálogo não muda orçamentos existentes.
5. Somente `ADMIN` altera o catálogo; qualquer usuário autenticado consulta.
6. Serviço que consta em alguma OS não pode ser removido (`SERVICE_IN_USE`, HTTP 409): o histórico da OS depende dele.

## 3. Relação com o código

| Conceito                  | Código                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Agregado, objeto de valor | `domain/aggregates/Service.ts`, `domain/value-objects/Money.ts`         |
| Schema de domínio         | `domain/schemas/ServiceSchema.ts`                                       |
| Evento                    | `domain/events/ServiceRegisteredEvent.ts`                               |
| Casos de uso              | `application/use-cases/services/`                                       |
| Repositório               | `domain/repositories/ServiceRepository.ts` → `PrismaServiceRepository`  |
| API                       | `infrastructure/http/controllers/ServiceController.ts`, Swagger `/docs` |
