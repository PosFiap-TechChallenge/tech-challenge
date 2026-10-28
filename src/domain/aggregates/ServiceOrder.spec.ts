import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { CUSTOMER_ID } from '../test/mocks/CustomerMock.ts';
import { required } from '../test/mocks/required.ts';
import {
  FILTER_SOURCE,
  makeServiceOrder,
  makeServiceOrderIn,
  OIL_SOURCE,
  ORDER_ID,
  OTHER_SERVICE_SOURCE,
  SERVICE_SOURCE,
} from '../test/mocks/ServiceOrderMock.ts';
import { VEHICLE_ID } from '../test/mocks/VehicleMock.ts';
import { ORDER_STATUSES, type OrderStatus } from '../value-objects/OrderStatus.ts';
import { ServiceOrder } from './ServiceOrder.ts';

function eventNames(order: ServiceOrder): string[] {
  return order.raisedEvents.map((event) => event.name);
}

function statusesFrom(order: ServiceOrder): OrderStatus[] {
  return order.history.map((change) => change.status);
}

describe('ServiceOrder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('abre a OS como Recebida, com o primeiro registro no historico', () => {
      const order = ServiceOrder.create({ customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID });

      expect(order.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(order.status).toBe('RECEIVED');
      expect(order.customerId).toBe(CUSTOMER_ID);
      expect(order.vehicleId).toBe(VEHICLE_ID);
      expect(order.serviceItems).toHaveLength(0);
      expect(order.partItems).toHaveLength(0);
      expect(order.budget).toBeNull();
      expect(order.history).toEqual([
        { status: 'RECEIVED', occurredAt: new Date('2026-02-01T10:00:00.000Z') },
      ]);
    });

    it('registra o evento ServiceOrderCreatedEvent', () => {
      const order = ServiceOrder.create({ customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID });

      expect(eventNames(order)).toEqual(['ServiceOrderCreatedEvent']);
      expect(order.raisedEvents[0]?.payload).toEqual({
        orderId: order.id,
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
    });

    it.each([
      { customerId: 'nao-e-uuid', vehicleId: VEHICLE_ID },
      { customerId: CUSTOMER_ID, vehicleId: '' },
    ])('rejeita identificadores invalidos: %j', (input) => {
      expect(() => ServiceOrder.create(input)).toThrow(DomainError);
    });
  });

  describe('from', () => {
    it('reconstroi a OS sem registrar eventos', () => {
      const order = makeServiceOrder();

      expect(order.raisedEvents).toHaveLength(0);
      expect(order.version).toBe(0);
    });

    it('reconstroi uma OS completa a partir dos dados persistidos', () => {
      const order = makeServiceOrderIn('IN_EXECUTION');

      expect(ServiceOrder.from(order.toData()).toData()).toEqual(order.toData());
    });

    it('rejeita status desconhecido e historico vazio', () => {
      expect(() => makeServiceOrder({ status: 'CANCELED' as OrderStatus })).toThrow(DomainError);
      expect(() => makeServiceOrder({ history: [] })).toThrow(DomainError);
    });

    it('rejeita servico ou peca repetidos', () => {
      const order = makeServiceOrderIn('IN_DIAGNOSIS');
      order.addService(SERVICE_SOURCE);
      order.addPart(FILTER_SOURCE, 1);
      const { serviceItems, partItems } = order.toData();

      expect(() => makeServiceOrder({ serviceItems: [...serviceItems, ...serviceItems] })).toThrow(
        DomainError,
      );
      expect(() => makeServiceOrder({ partItems: [...partItems, ...partItems] })).toThrow(
        DomainError,
      );
    });
  });

  describe('addService', () => {
    it('inclui o servico com o preco congelado e registra o evento', () => {
      const order = makeServiceOrder();

      order.addService(SERVICE_SOURCE);

      const [item] = order.serviceItems;

      expect(item).toMatchObject({
        serviceId: SERVICE_SOURCE.id,
        name: 'Troca de oleo',
        estimatedMinutes: 45,
      });
      expect(item?.price.value).toBe(120);
      expect(eventNames(order)).toEqual(['ServiceAddedEvent']);
      expect(order.raisedEvents[0]?.payload).toEqual({
        orderId: ORDER_ID,
        serviceId: SERVICE_SOURCE.id,
        price: 120,
      });
    });

    it('nao inclui o mesmo servico duas vezes', () => {
      const order = makeServiceOrder();
      order.addService(SERVICE_SOURCE);

      expect(() => order.addService(SERVICE_SOURCE)).toThrow(/ja esta na OS/);
      expect(order.serviceItems).toHaveLength(1);
    });

    it('nao altera a OS quando o servico e invalido', () => {
      const order = makeServiceOrder();

      expect(() => order.addService({ ...SERVICE_SOURCE, price: -1 })).toThrow(DomainError);
      expect(order.serviceItems).toHaveLength(0);
      expect(order.raisedEvents).toHaveLength(0);
    });

    it.each(ORDER_STATUSES.filter((status) => !['RECEIVED', 'IN_DIAGNOSIS'].includes(status)))(
      'bloqueia a inclusao com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.addService(OTHER_SERVICE_SOURCE)).toThrow(
          expect.objectContaining({ code: 'ORDER_NOT_EDITABLE' }),
        );
      },
    );

    it('permite incluir ja na OS Recebida e depois do diagnostico iniciado', () => {
      const order = makeServiceOrder();
      order.addService(SERVICE_SOURCE);
      order.startDiagnosis();

      expect(() => order.addService(OTHER_SERVICE_SOURCE)).not.toThrow();
    });
  });

  describe('addPart', () => {
    it('inclui a peca com o preco congelado e registra o evento', () => {
      const order = makeServiceOrder();

      order.addPart(FILTER_SOURCE, 2);

      const [item] = order.partItems;

      expect(item).toMatchObject({ partId: FILTER_SOURCE.id, code: 'FLT-OLEO-01' });
      expect(item?.quantity.value).toBe(2);
      expect(item?.unitPrice.value).toBe(25.9);
      expect(eventNames(order)).toEqual(['PartAddedEvent']);
      expect(order.raisedEvents[0]?.payload).toEqual({
        orderId: ORDER_ID,
        partId: FILTER_SOURCE.id,
        quantity: 2,
      });
    });

    it('soma a quantidade quando a mesma peca ja esta na OS, mantendo o preco original', () => {
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);

      order.addPart({ ...FILTER_SOURCE, unitPrice: 99 }, 3);

      expect(order.partItems).toHaveLength(1);
      expect(order.partItems[0]?.quantity.value).toBe(5);
      expect(order.partItems[0]?.unitPrice.value).toBe(25.9);
      expect(order.requestedQuantity(FILTER_SOURCE.id)).toBe(5);
    });

    it('informa 0 para peca que nao esta na OS', () => {
      expect(makeServiceOrder().requestedQuantity(OIL_SOURCE.id)).toBe(0);
    });

    it('aceita fracao em litros e rejeita fracao em unidades', () => {
      const order = makeServiceOrder();

      order.addPart(OIL_SOURCE, 4.5);

      expect(order.partItems[0]?.quantity.value).toBe(4.5);
      expect(() => order.addPart(FILTER_SOURCE, 1.5)).toThrow(DomainError);
    });

    it('nao altera a OS quando a quantidade e invalida', () => {
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);
      order.clearEvents();

      expect(() => order.addPart(FILTER_SOURCE, 0)).toThrow(DomainError);
      expect(order.partItems[0]?.quantity.value).toBe(2);
      expect(order.raisedEvents).toHaveLength(0);
    });

    it('bloqueia a inclusao depois do envio do orcamento', () => {
      const order = makeServiceOrderIn('AWAITING_APPROVAL');

      expect(() => order.addPart(OIL_SOURCE, 1)).toThrow(
        expect.objectContaining({ code: 'ORDER_NOT_EDITABLE' }),
      );
    });
  });

  describe('removeService e removePart', () => {
    it('remove o item pelo id', () => {
      const order = makeServiceOrder();
      order.addService(SERVICE_SOURCE);
      order.addPart(FILTER_SOURCE, 1);

      order.removeService(required(order.serviceItems[0]).id);
      order.removePart(required(order.partItems[0]).id);

      expect(order.serviceItems).toHaveLength(0);
      expect(order.partItems).toHaveLength(0);
    });

    it('rejeita item inexistente', () => {
      const order = makeServiceOrder();

      expect(() => order.removeService(ORDER_ID)).toThrow(
        expect.objectContaining({ code: 'ORDER_ITEM_NOT_FOUND' }),
      );
      expect(() => order.removePart(ORDER_ID)).toThrow(
        expect.objectContaining({ code: 'ORDER_ITEM_NOT_FOUND' }),
      );
    });

    it('bloqueia a remocao depois do envio do orcamento', () => {
      const order = makeServiceOrderIn('AWAITING_APPROVAL');

      expect(() => order.removeService(required(order.serviceItems[0]).id)).toThrow(
        expect.objectContaining({ code: 'ORDER_NOT_EDITABLE' }),
      );
      expect(() => order.removePart(required(order.partItems[0]).id)).toThrow(
        expect.objectContaining({ code: 'ORDER_NOT_EDITABLE' }),
      );
    });
  });

  describe('budgetTotal', () => {
    it('e zero para OS sem itens', () => {
      expect(makeServiceOrder().budgetTotal.value).toBe(0);
    });

    it('soma servicos e pecas, com a quantidade fracionada arredondada ao centavo', () => {
      const order = makeServiceOrder();
      order.addService(SERVICE_SOURCE);
      order.addService(OTHER_SERVICE_SOURCE);
      order.addPart(FILTER_SOURCE, 2);
      order.addPart(OIL_SOURCE, 4.5);

      expect(order.budgetTotal.value).toBe(120 + 89.9 + 51.8 + 206.55);
    });

    it('recusa incluir item que leva o total acima do limite monetario, sem alterar a OS', () => {
      const order = makeServiceOrder();
      order.addService({ ...SERVICE_SOURCE, price: 999_999 });

      expect(() => order.addService({ ...OTHER_SERVICE_SOURCE, price: 999_999 })).toThrow(
        DomainError,
      );
      expect(() => order.addPart({ ...FILTER_SOURCE, unitPrice: 5 }, 400_000)).toThrow(DomainError);
      expect(order.serviceItems).toHaveLength(1);
      expect(order.partItems).toHaveLength(0);
      expect(order.budgetTotal.value).toBe(999_999);
    });

    it('recusa somar quantidade a peca existente quando o total passa do limite', () => {
      const order = makeServiceOrder();
      order.addPart({ ...FILTER_SOURCE, unitPrice: 2 }, 300_000);

      expect(() => order.addPart(FILTER_SOURCE, 300_000)).toThrow(DomainError);
      expect(order.partItems[0]?.quantity.value).toBe(300_000);
    });
  });

  describe('startDiagnosis', () => {
    it('move a OS para Em diagnostico e registra o evento', () => {
      const order = makeServiceOrder();

      order.startDiagnosis();

      expect(order.status).toBe('IN_DIAGNOSIS');
      expect(statusesFrom(order)).toEqual(['RECEIVED', 'IN_DIAGNOSIS']);
      expect(eventNames(order)).toEqual(['DiagnosisStartedEvent']);
    });

    it.each(ORDER_STATUSES.filter((status) => status !== 'RECEIVED'))(
      'bloqueia com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.startDiagnosis()).toThrow(
          expect.objectContaining({ code: 'INVALID_ORDER_TRANSITION' }),
        );
      },
    );
  });

  describe('sendBudget', () => {
    it('gera o orcamento com o total congelado e envia para aprovacao', () => {
      const order = makeServiceOrderIn('IN_DIAGNOSIS');
      order.addService(SERVICE_SOURCE);
      order.addPart(FILTER_SOURCE, 2);

      order.sendBudget();

      expect(order.status).toBe('AWAITING_APPROVAL');
      expect(order.budget?.toData()).toEqual({
        status: 'PENDING',
        total: 171.8,
        sentAt: new Date('2026-02-01T10:00:00.000Z'),
        decidedAt: null,
      });
      expect(eventNames(order)).toEqual([
        'ServiceAddedEvent',
        'PartAddedEvent',
        'BudgetGeneratedEvent',
        'BudgetSentEvent',
      ]);
    });

    it('exige ao menos um servico e nao altera nada ao falhar', () => {
      const order = makeServiceOrderIn('IN_DIAGNOSIS');
      order.addPart(FILTER_SOURCE, 1);
      order.clearEvents();

      expect(() => order.sendBudget()).toThrow(
        expect.objectContaining({ code: 'ORDER_WITHOUT_SERVICES' }),
      );
      expect(order.status).toBe('IN_DIAGNOSIS');
      expect(order.budget).toBeNull();
      expect(order.raisedEvents).toHaveLength(0);
    });

    it.each(ORDER_STATUSES.filter((status) => status !== 'IN_DIAGNOSIS'))(
      'bloqueia com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.sendBudget()).toThrow(
          expect.objectContaining({ code: 'INVALID_ORDER_TRANSITION' }),
        );
      },
    );
  });

  describe('approveBudget', () => {
    it('aprova o orcamento e inicia a execucao automaticamente', () => {
      const order = makeServiceOrderIn('AWAITING_APPROVAL');

      order.approveBudget();

      expect(order.status).toBe('IN_EXECUTION');
      expect(order.budget?.status).toBe('APPROVED');
      expect(order.budget?.decidedAt).toEqual(new Date('2026-02-01T10:00:00.000Z'));
      expect(order.serviceItems.map((item) => item.startedAt)).toEqual([
        new Date('2026-02-01T10:00:00.000Z'),
      ]);
      expect(eventNames(order)).toEqual(['BudgetApprovedEvent', 'ExecutionStartedEvent']);
      expect(statusesFrom(order)).toEqual([
        'RECEIVED',
        'IN_DIAGNOSIS',
        'AWAITING_APPROVAL',
        'IN_EXECUTION',
      ]);
    });

    it.each(ORDER_STATUSES.filter((status) => status !== 'AWAITING_APPROVAL'))(
      'bloqueia com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.approveBudget()).toThrow(
          expect.objectContaining({ code: 'INVALID_ORDER_TRANSITION' }),
        );
      },
    );
  });

  describe('rejectBudget', () => {
    it('registra a rejeicao e devolve a OS ao diagnostico', () => {
      const order = makeServiceOrderIn('AWAITING_APPROVAL');

      order.rejectBudget();

      expect(order.status).toBe('IN_DIAGNOSIS');
      expect(order.budget?.status).toBe('REJECTED');
      expect(eventNames(order)).toEqual(['BudgetRejectedEvent']);
    });

    it('permite revisar os itens e enviar um novo orcamento', () => {
      const order = makeServiceOrderIn('AWAITING_APPROVAL');
      order.rejectBudget();

      order.removePart(required(order.partItems[0]).id);
      order.sendBudget();

      expect(order.status).toBe('AWAITING_APPROVAL');
      expect(order.budget?.toData()).toMatchObject({ status: 'PENDING', total: 120 });
    });

    it.each(ORDER_STATUSES.filter((status) => status !== 'AWAITING_APPROVAL'))(
      'bloqueia com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.rejectBudget()).toThrow(
          expect.objectContaining({ code: 'INVALID_ORDER_TRANSITION' }),
        );
      },
    );
  });

  describe('finish', () => {
    it('finaliza a OS e conclui os itens de servico com o tempo de execucao', () => {
      const order = makeServiceOrderIn('IN_EXECUTION');
      vi.setSystemTime(new Date('2026-02-01T10:50:00.000Z'));

      order.finish();

      expect(order.status).toBe('FINISHED');
      expect(order.serviceItems[0]?.executionMinutes).toBe(50);
      expect(eventNames(order)).toEqual(['ServiceOrderFinishedEvent']);
      expect(order.raisedEvents[0]?.payload).toEqual({ orderId: ORDER_ID, executionMinutes: 50 });
    });

    it.each(ORDER_STATUSES.filter((status) => status !== 'IN_EXECUTION'))(
      'bloqueia com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.finish()).toThrow(
          expect.objectContaining({ code: 'INVALID_ORDER_TRANSITION' }),
        );
      },
    );
  });

  describe('deliver', () => {
    it('entrega o veiculo e registra o evento', () => {
      const order = makeServiceOrderIn('FINISHED');

      order.deliver();

      expect(order.status).toBe('DELIVERED');
      expect(eventNames(order)).toEqual(['VehicleDeliveredEvent']);
    });

    it.each(ORDER_STATUSES.filter((status) => status !== 'FINISHED'))(
      'bloqueia com a OS em %s',
      (status) => {
        const order = makeServiceOrderIn(status);

        expect(() => order.deliver()).toThrow(
          expect.objectContaining({ code: 'INVALID_ORDER_TRANSITION' }),
        );
      },
    );
  });

  describe('stockItems', () => {
    it('lista as pecas com a quantidade total a reservar ou consumir', () => {
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);
      order.addPart(OIL_SOURCE, 4.5);
      order.addPart(FILTER_SOURCE, 1);

      expect(order.stockItems).toEqual([
        { partId: FILTER_SOURCE.id, quantity: 3 },
        { partId: OIL_SOURCE.id, quantity: 4.5 },
      ]);
    });
  });

  it('percorre o fluxo completo registrando cada status no historico', () => {
    const order = makeServiceOrderIn('DELIVERED');

    expect(statusesFrom(order)).toEqual(ORDER_STATUSES);
  });

  it('atualiza updatedAt a cada comando', () => {
    const order = makeServiceOrder();

    order.startDiagnosis();

    expect(order.updatedAt).toEqual(new Date('2026-02-01T10:00:00.000Z'));
  });

  it('compara OS pelo id', () => {
    expect(makeServiceOrder().equals(makeServiceOrderIn('IN_EXECUTION'))).toBe(true);
  });
});
