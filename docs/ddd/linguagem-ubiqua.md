# Linguagem Ubíqua

Termos do domínio da oficina, usados igualmente na conversa, na documentação e no código. Cada contexto
mantém sua seção. A coluna **No código** mostra o nome usado na implementação.

---

## Termos gerais

Vocabulário compartilhado por todos os contextos da oficina.

| Termo                 | Definição                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Ordem de Serviço (OS) | Registro que reúne um veículo, os serviços contratados, as peças aplicadas e o orçamento.     |
| Cliente               | Pessoa física ou jurídica identificada por CPF ou CNPJ, dona de um ou mais veículos.          |
| Veículo               | Automóvel identificado pela placa, sempre vinculado a um cliente.                             |
| Serviço               | Item do catálogo da oficina com preço e tempo estimado, por exemplo troca de óleo.            |
| Item de Serviço       | Serviço efetivamente incluído em uma OS, com preço congelado no momento da inclusão.          |
| Peça                  | Item de estoque com quantidade disponível, reservada e mínima.                                |
| Item de Peça          | Peça incluída em uma OS, com quantidade e preço congelado.                                    |
| Orçamento             | Valor total calculado a partir dos itens de serviço e de peça, submetido ao cliente.          |
| Reserva               | Quantidade de uma peça comprometida com uma OS aprovada, ainda não baixada do físico.         |
| Consumo               | Baixa definitiva da peça no estoque, que ocorre na conclusão do serviço.                      |
| Estoque mínimo        | Quantidade a partir da qual a peça precisa de ressuprimento (saldo menor ou igual ao mínimo). |
| Tempo de execução     | Intervalo entre o início e a conclusão de um item de serviço.                                 |

---

## Peças e insumos

Detalhes do modelo em [Gestão de Peças e Insumos](./gestao-de-pecas-e-insumos.md).

| Termo                   | Definição                                                                                    | No código                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Peça                    | Item aplicado ao veículo e contado por unidade (ex.: filtro, pastilha).                      | `Part`, `type = PART`                      |
| Insumo                  | Material consumido durante o serviço, em geral fracionado (ex.: óleo, graxa).                | `Part`, `type = SUPPLY`                    |
| Estoque da peça         | A peça ou o insumo junto com seus saldos. É o agregado do contexto.                          | `Part`                                     |
| Código                  | Identificação interna única da peça, em maiúsculas.                                          | `code`                                     |
| Unidade de medida       | Como a quantidade é contada: UN, L, ML, KG, G ou M. Itens em UN não são fracionados.         | `MeasurementUnit`, `unit`                  |
| Preço unitário          | Valor em reais de uma unidade, usado para gerar o orçamento.                                 | `Money`, `unitPrice`                       |
| Saldo físico            | Quantidade que está fisicamente na oficina.                                                  | `quantity`                                 |
| Reservado               | Parte do saldo físico comprometida com orçamentos aprovados.                                 | `reserved`                                 |
| Disponível              | O que ainda pode ser reservado: saldo físico menos o reservado.                              | `available`                                |
| Estoque mínimo          | Saldo físico a partir do qual a peça precisa de reposição.                                   | `minimumStock`                             |
| Estoque inicial         | Saldo informado no cadastro da peça.                                                         | `initialQuantity`, `INITIAL`               |
| Entrada                 | Recebimento de peças, somado ao saldo físico.                                                | `registerEntry`, `ENTRY`                   |
| Ajuste                  | Correção do saldo físico para a quantidade contada (inventário), sempre com motivo.          | `adjust`, `ADJUSTMENT`                     |
| Reserva                 | Separação de peças para um orçamento aprovado. Tira do disponível sem tirar do saldo físico. | `reserve`, `RESERVATION`                   |
| Liberação de reserva    | Devolução ao disponível de peças reservadas que não serão usadas (orçamento cancelado).      | `release`, `RELEASE`                       |
| Consumo                 | Baixa das peças reservadas ao concluir o serviço. Sai do saldo físico e do reservado.        | `consume`, `CONSUMPTION`                   |
| Movimentação de estoque | Registro imutável de cada operação acima, com o saldo resultante. Forma o histórico da peça. | `StockMovement`                            |
| Estoque mínimo atingido | Situação em que o saldo físico fica menor ou igual ao estoque mínimo após um consumo.        | `MinimumStockReachedEvent`, `belowMinimum` |
| Lote                    | Conjunto de itens de um orçamento processados juntos: todos são gravados ou nenhum é.        | `StockItemsInput`                          |

Um **Item de Peça** da OS vira um item do lote (`{ partId, quantity }`) ao reservar, liberar ou consumir,
e copia o `unitPrice` da peça no momento em que é incluído na OS.
