import { ServiceOrder, type ServiceOrderId } from '../../aggregates/ServiceOrder.ts';
import type { ServiceOrderData } from '../../schemas/ServiceOrderSchema.ts';
import type { OrderStatus } from '../../value-objects/OrderStatus.ts';
import { CUSTOMER_ID } from './CustomerMock.ts';
import { VEHICLE_ID } from './VehicleMock.ts';

export const ORDER_ID = '4e5f6a7b-8c9d-4e0f-9a1b-2c3d4e5f6a7b' as ServiceOrderId;

export const SERVICE_SOURCE = {
  id: '5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  name: 'Troca de oleo',
  price: 120,
  estimatedMinutes: 45,
};

export const OTHER_SERVICE_SOURCE = {
  id: '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d',
  name: 'Alinhamento',
  price: 89.9,
  estimatedMinutes: 60,
};

export const FILTER_SOURCE = {
  id: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  code: 'FLT-OLEO-01',
  name: 'Filtro de oleo',
  unit: 'UN',
  unitPrice: 25.9,
} as const;

export const OIL_SOURCE = {
  id: '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b',
  code: 'OLEO-5W30',
  name: 'Oleo 5W30',
  unit: 'L',
  unitPrice: 45.9,
} as const;

export function makeServiceOrder(overrides: Partial<ServiceOrderData> = {}): ServiceOrder {
  return ServiceOrder.from({
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
    vehicleId: VEHICLE_ID,
    status: 'RECEIVED',
    serviceItems: [],
    partItems: [],
    budget: null,
    history: [{ status: 'RECEIVED', occurredAt: new Date('2026-01-01T00:00:00.000Z') }],
    version: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

/** Leva uma OS nova ate o status pedido pelos comandos do dominio, com um servico e uma peca. */
export function makeServiceOrderIn(status: OrderStatus): ServiceOrder {
  const order = makeServiceOrder();
  const steps: ReadonlyArray<[OrderStatus, () => void]> = [
    ['IN_DIAGNOSIS', () => order.startDiagnosis()],
    [
      'AWAITING_APPROVAL',
      () => {
        order.addService(SERVICE_SOURCE);
        order.addPart(FILTER_SOURCE, 2);
        order.sendBudget();
      },
    ],
    ['IN_EXECUTION', () => order.approveBudget()],
    ['FINISHED', () => order.finish()],
    ['DELIVERED', () => order.deliver()],
  ];

  for (const [reached, advance] of steps) {
    if (order.status === status) {
      break;
    }

    advance();

    if (reached === status) {
      break;
    }
  }

  order.clearEvents();

  return order;
}
