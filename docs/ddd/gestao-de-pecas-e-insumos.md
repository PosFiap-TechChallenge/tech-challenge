# Gestão de Peças e Insumos

Documentação DDD do contexto de estoque: Event Storming, modelo de domínio, regras de negócio e a
relação de cada elemento com o código. Termos em **negrito** estão definidos na
[Linguagem Ubíqua](./linguagem-ubiqua.md#peças-e-insumos).

> O quadro original do Event Storming está no Miro (link no README) e exportado em
> `docs/ddd/event-storming.pdf`. Este documento é a versão textual, mantida junto com o código.

---

## 1. Event Storming

Legenda (cores do Event Storming): 🟨 ator · 🟦 comando · 🟧 evento de domínio · 🟪 política · 🟩 agregado.

Todos os comandos atuam sobre um único agregado: 🟩 **Estoque da Peça** (`Part`).

### 1.1 Fluxos

| Fluxo                | Gatilho                                                    | Comando              | Evento                          |
| -------------------- | ---------------------------------------------------------- | -------------------- | ------------------------------- |
| Cadastro             | 🟨 Administrador                                           | 🟦 Cadastrar Peça    | 🟧 Estoque inicial registrado   |
| Entrada de peças     | 🟨 Administrador                                           | 🟦 Registrar Entrada | 🟧 Entrada de peça registrada   |
| Ajuste manual        | 🟨 Administrador                                           | 🟦 Ajustar Estoque   | 🟧 Ajuste de estoque registrado |
| Reserva na aprovação | 🟪 _Sempre que aprovar orçamento, reservar peças_          | 🟦 Reservar Peças    | 🟧 Peça reservada               |
| Liberação da reserva | 🟪 _Sempre que cancelar/reprovar orçamento, liberar_       | 🟦 Liberar Reservas  | 🟧 Reserva liberada             |
| Consumo na execução  | 🟪 _Sempre que concluir serviço, consumir peças_           | 🟦 Consumir Peças    | 🟧 Peça consumida               |
| Alerta de reposição  | 🟪 _Sempre que o saldo for ≤ mínimo_ (após Peça consumida) | —                    | 🟧 Estoque mínimo atingido      |

Os eventos **Orçamento aprovado**, **Orçamento cancelado** e **Serviço concluído** pertencem ao contexto de
Ordem de Serviço. Para este contexto eles são gatilhos externos: a Ordem de Serviço chama os casos de
uso em lote descritos na [seção 5](#5-contrato-com-a-ordem-de-serviço).

---

## 2. Modelo de domínio

### 2.1 Agregado `Part` (Estoque da Peça)

Raiz de agregado que representa uma **peça** ou um **insumo** e o seu estoque. É a fronteira de
consistência: todo comando passa por ele, e ele garante as invariantes abaixo antes de qualquer gravação.

| Atributo       | Tipo              | Significado                                          |
| -------------- | ----------------- | ---------------------------------------------------- |
| `code`         | texto             | Código interno único, normalizado em maiúsculas      |
| `name`         | texto             | Nome da peça ou insumo                               |
| `type`         | `PartType`        | `PART` (peça) ou `SUPPLY` (insumo)                   |
| `unit`         | `MeasurementUnit` | Unidade de medida; não muda após o cadastro          |
| `unitPrice`    | `Money`           | Preço unitário, usado pelo orçamento                 |
| `quantity`     | `Quantity`        | **Saldo físico**                                     |
| `reserved`     | `Quantity`        | **Reservado** para orçamentos aprovados              |
| `available`    | derivado          | **Disponível** = saldo físico − reservado            |
| `minimumStock` | `Quantity`        | **Estoque mínimo**                                   |
| `version`      | inteiro           | Versão para controle de concorrência (lock otimista) |

### 2.2 Objetos de valor

| Objeto de valor   | Regra                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Quantity`        | Não negativa, até 3 casas decimais e até 1.000.000. Guardada em milésimos inteiros, para que somas e subtrações sejam exatas (0,1 + 0,2 = 0,3). |
| `Money`           | Reais, não negativo, até 2 casas. Guardado em centavos inteiros.                                                                                |
| `MeasurementUnit` | `UN`, `L`, `ML`, `KG`, `G`, `M`. Só `UN` exige quantidades inteiras.                                                                            |
| `PartType`        | `PART` (aplicada ao veículo, ex.: filtro) ou `SUPPLY` (consumido no serviço, ex.: óleo).                                                        |
| `StockMovement`   | Registro imutável de uma operação: tipo, quantidade, saldo e reservado logo após a operação, e motivo (ajustes).                                |

### 2.3 Invariantes (regras de negócio)

1. Saldo físico e reservado nunca ficam negativos, e o reservado nunca passa do saldo físico.
2. **Reserva** só acontece dentro do **disponível**. Sem saldo, a reserva é **bloqueada** (`INSUFFICIENT_STOCK`).
3. **Consumo** e **liberação** só agem sobre o que está reservado (`INSUFFICIENT_RESERVED_STOCK`).
4. Consumir baixa o saldo físico **e** o reservado ao mesmo tempo, por isso o disponível não muda.
5. O **estoque mínimo** é comparado com o saldo físico, depois de cada consumo.
6. O **ajuste** grava a quantidade contada, exige motivo, não pode ficar abaixo do reservado e não pode
   ser igual ao saldo atual.
7. Itens em `UN` não aceitam frações (`FRACTIONAL_QUANTITY_NOT_ALLOWED`).
8. A unidade de medida não é editável, porque mudaria o significado do saldo (4 L virariam 4 ML).
9. Só pode ser excluída a peça cadastrada por engano, que tem apenas o estoque inicial. Peça com qualquer
   outra movimentação é preservada (`PART_HAS_STOCK_HISTORY`).

As invariantes 1 e 9 também são garantidas pelo banco, com `CHECK` constraints e chave estrangeira,
como última barreira.

---

## 3. Transações e concorrência

| Situação                                        | Tratamento                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Saldo e movimentação                            | Gravados na mesma transação: nunca existe saldo alterado sem o registro no histórico.                      |
| Orçamento com várias peças                      | Reserva, liberação e consumo em lote são **tudo ou nada**: se um item falhar, nenhum é gravado.            |
| Duas operações na mesma peça ao mesmo tempo     | **Lock otimista** por `version`: a segunda escrita é recusada em vez de sobrescrever a primeira.           |
| Conflito de versão em reserva/entrada/consumo   | Retentativa automática (até 5, com espera aleatória). As regras são reavaliadas sobre o saldo novo.        |
| Conflito de versão em ajuste                    | **Sem retentativa**: a contagem foi feita sobre o saldo antigo, então o administrador deve recontar (409). |
| Lotes concorrentes                              | Linhas gravadas em ordem de id, para evitar deadlock entre transações.                                     |
| Schemas (validação do agregado e base dos DTOs) | `src/domain/schemas/{Part,StockMovement,Quantity,Money}Schema.ts`                                          |
| Eventos de domínio                              | Publicados **depois** do commit. Falha de um handler é registrada e não desfaz a operação.                 |

---

## 4. API

| Método e rota                 | Quem        | Comando / consulta                           |
| ----------------------------- | ----------- | -------------------------------------------- |
| `POST /parts`                 | ADMIN       | Cadastrar Peça                               |
| `POST /parts/:id/entries`     | ADMIN       | Registrar Entrada                            |
| `POST /parts/:id/adjustments` | ADMIN       | Ajustar Estoque                              |
| `PATCH /parts/:id`            | ADMIN       | Editar código, nome, tipo, preço e mínimo    |
| `DELETE /parts/:id`           | ADMIN       | Excluir peça cadastrada por engano           |
| `GET /parts`                  | autenticado | Listar (`?belowMinimum=true` para reposição) |
| `GET /parts/:id`              | autenticado | Detalhar com saldos                          |
| `GET /parts/:id/movements`    | autenticado | Histórico de movimentações                   |

Reservar, liberar e consumir **não têm rota**: no modelo, são disparados por políticas, não por um ator.

---

## 5. Contrato com a Ordem de Serviço

O contexto de Ordem de Serviço aciona o estoque pelos casos de uso em lote, resolvidos pela injeção de
dependência:

| Evento da OS        | Caso de uso                      | Símbolo (`TYPES`)                      |
| ------------------- | -------------------------------- | -------------------------------------- |
| Orçamento aprovado  | `ReservePartsUseCase`            | `TYPES.ReservePartsUseCase`            |
| Orçamento cancelado | `ReleasePartReservationsUseCase` | `TYPES.ReleasePartReservationsUseCase` |
| Serviço concluído   | `ConsumePartsUseCase`            | `TYPES.ConsumePartsUseCase`            |

```ts
await reserveParts.execute({
  items: [
    { partId: '...', quantity: 4.5 }, // óleo, em litros
    { partId: '...', quantity: 1 }, // filtro, em UN
  ],
});
```

- Cada peça aparece **uma vez** por lote. Quem chama agrega as quantidades antes.
- Em erro de regra, a mensagem identifica a peça: `Peca FILTRO-01: Saldo disponivel insuficiente...`.
- O orçamento deve **copiar** `unitPrice` no momento em que é gerado. O preço da peça pode mudar depois.

---

## 6. Relação com o código

| Elemento                                | Arquivo                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agregado Estoque da Peça                | `src/domain/aggregates/Part.ts`                                                                                                                               |
| Objetos de valor                        | `src/domain/value-objects/{Quantity,Money,MeasurementUnit,PartType,StockMovement}.ts`                                                                         |
| Eventos de domínio                      | `src/domain/events/{InitialStockRegistered,StockEntryRegistered,StockAdjusted,PartReserved,PartReservationReleased,PartConsumed,MinimumStockReached}Event.ts` |
| Repositório (porta)                     | `src/domain/repositories/PartRepository.ts`                                                                                                                   |
| Repositório (Prisma, transações e lock) | `src/infrastructure/database/repositories/PrismaPartRepository.ts`                                                                                            |
| Comandos do administrador               | `src/application/use-cases/parts/{CreatePart,RegisterStockEntry,AdjustStock,UpdatePart,DeletePart}UseCase.ts`                                                 |
| Comandos das políticas (lote)           | `src/application/use-cases/parts/{ReserveParts,ReleasePartReservations,ConsumeParts}UseCase.ts`                                                               |
| Carregar → aplicar → salvar → publicar  | `src/application/use-cases/parts/PartCommandRunner.ts`                                                                                                        |
| Política "Estoque mínimo atingido"      | `src/infrastructure/events/handlers/MinimumStockReachedAlertHandler.ts`                                                                                       |
| Publicação de eventos                   | `src/infrastructure/events/InProcessEventPublisher.ts`                                                                                                        |
| Rotas HTTP                              | `src/infrastructure/http/controllers/PartController.ts`                                                                                                       |
| Schema e migrations                     | `src/infrastructure/database/prisma/` (`Part`, `StockMovement`)                                                                                               |
| Testes unitários                        | `src/**/*.spec.ts` (domínio, casos de uso, HTTP)                                                                                                              |
| Testes de integração (PostgreSQL)       | `src/**/*.integration.spec.ts`                                                                                                                                |
