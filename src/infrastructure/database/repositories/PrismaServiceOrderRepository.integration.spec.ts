import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import { ConcurrentUpdateError, NotFoundError } from '../../../application/exceptions/AppError.ts';
import { Customer } from '../../../domain/aggregates/Customer.ts';
import { Part } from '../../../domain/aggregates/Part.ts';
import { Service } from '../../../domain/aggregates/Service.ts';
import { ServiceOrder, type ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import { Vehicle } from '../../../domain/aggregates/Vehicle.ts';
import type { UnitOfWork } from '../../../domain/providers/UnitOfWork.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { ServiceOrderRepository } from '../../../domain/repositories/ServiceOrderRepository.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import { container } from '../../di/Container.ts';
import { required } from '../../../domain/test/mocks/required.ts';
import { resetDatabase } from '../testing/resetDatabase.ts';

const prisma = container.get<PrismaClient>(TYPES.PrismaClient);
const repository = container.get<ServiceOrderRepository>(TYPES.ServiceOrderRepository);
const unitOfWork = container.get<UnitOfWork>(TYPES.UnitOfWork);
const customers = container.get<CustomerRepository>(TYPES.CustomerRepository);
const vehicles = container.get<VehicleRepository>(TYPES.VehicleRepository);
const services = container.get<ServiceRepository>(TYPES.ServiceRepository);
const parts = container.get<PartRepository>(TYPES.PartRepository);

type Fixture = { customer: Customer; vehicle: Vehicle; service: Service; part: Part };

async function seed(): Promise<Fixture> {
  const customer = Customer.create({
    name: 'Joao da Silva',
    document: '52998224725',
    email: null,
    phone: null,
  });
  await customers.create(customer);

  const vehicle = Vehicle.create({
    plate: 'ABC1D23',
    brand: 'Fiat',
    model: 'Argo',
    year: 2022,
    customerId: customer.id,
  });
  await vehicles.create(vehicle);

  const service = Service.create({ name: 'Troca de oleo', price: 120, estimatedMinutes: 45 });
  await services.create(service);

  const part = Part.create({
    code: 'FLT-01',
    name: 'Filtro de oleo',
    type: 'PART',
    unit: 'UN',
    unitPrice: 25.9,
    initialQuantity: 10,
    minimumStock: 2,
  });
  await parts.create(part);

  return { customer, vehicle, service, part };
}

async function newOrder({ customer, vehicle }: Fixture): Promise<ServiceOrder> {
  const order = ServiceOrder.create({ customerId: customer.id, vehicleId: vehicle.id });
  await repository.create(order);

  return required(await repository.findById(order.id), 'OS');
}

async function reload(order: ServiceOrder): Promise<ServiceOrder> {
  return required(await repository.findById(order.id), 'OS');
}

async function loadPart(part: Part): Promise<Part> {
  return required(await parts.findById(part.id), 'peca');
}

describe('PrismaServiceOrderRepository (PostgreSQL)', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    await resetDatabase(prisma);
    fixture = await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create e leitura', () => {
    it('persiste a OS nova com o historico e devolve igual ao que foi gravado', async () => {
      const order = ServiceOrder.create({
        customerId: fixture.customer.id,
        vehicleId: fixture.vehicle.id,
      });

      await repository.create(order);

      const found = await reload(order);

      expect(found.toData()).toEqual(order.toData());
      expect(found.status).toBe('RECEIVED');
      expect(found.version).toBe(0);
    });

    it('rejeita OS de cliente ou veiculo inexistente (chave estrangeira)', async () => {
      const order = ServiceOrder.create({
        customerId: fixture.customer.id,
        vehicleId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      });

      await expect(repository.create(order)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retorna null para OS inexistente', async () => {
      expect(
        await repository.findById('9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d' as ServiceOrderId),
      ).toBeNull();
    });
  });

  describe('update', () => {
    it('grava itens, orcamento e historico, preservando decimais e a ordem', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      order.addPart(fixture.part.toData(), 3);
      order.startDiagnosis();
      order.sendBudget();

      await repository.update(order);

      const found = await reload(order);

      expect(found.version).toBe(1);
      expect(found.toData()).toEqual({ ...order.toData(), version: 1 });
      expect(found.budget?.toData()).toMatchObject({ status: 'PENDING', total: 197.7 });
      expect(found.history.map((change) => change.status)).toEqual([
        'RECEIVED',
        'IN_DIAGNOSIS',
        'AWAITING_APPROVAL',
      ]);
    });

    it('regrava os filhos: item removido some e o historico nao duplica', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      await repository.update(order);

      const current = await reload(order);
      current.removeService(required(current.serviceItems[0]).id);
      current.startDiagnosis();
      await repository.update(current);

      const found = await reload(order);

      expect(found.serviceItems).toHaveLength(0);
      expect(found.history.map((change) => change.status)).toEqual(['RECEIVED', 'IN_DIAGNOSIS']);
      expect(await prisma.orderStatusChange.count({ where: { orderId: order.id } })).toBe(2);
    });

    it('rejeita escrita sobre versao desatualizada e nao altera nada', async () => {
      const order = await newOrder(fixture);
      const stale = await reload(order);

      order.startDiagnosis();
      await repository.update(order);

      stale.addService(fixture.service.toData());

      await expect(repository.update(stale)).rejects.toBeInstanceOf(ConcurrentUpdateError);

      const found = await reload(order);

      expect(found.status).toBe('IN_DIAGNOSIS');
      expect(found.serviceItems).toHaveLength(0);
      expect(found.version).toBe(1);
    });

    it('rejeita atualizar OS inexistente com NotFoundError', async () => {
      const order = ServiceOrder.create({
        customerId: fixture.customer.id,
        vehicleId: fixture.vehicle.id,
      });

      await expect(repository.update(order)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('list', () => {
    it('pagina, filtra por status e por cliente e informa o total', async () => {
      const first = await newOrder(fixture);
      await newOrder(fixture);
      await newOrder(fixture);
      first.startDiagnosis();
      await repository.update(first);

      const page = await repository.list({ page: 2, pageSize: 2 });
      const diagnosing = await repository.list({ page: 1, pageSize: 10, status: 'IN_DIAGNOSIS' });
      const ofCustomer = await repository.list({
        page: 1,
        pageSize: 10,
        customerId: fixture.customer.id,
      });
      const ofOther = await repository.list({
        page: 1,
        pageSize: 10,
        customerId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      });

      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(1);
      expect(diagnosing.items.map((order) => order.id)).toEqual([first.id]);
      expect(ofCustomer.total).toBe(3);
      expect(ofOther.total).toBe(0);
    });
  });

  describe('invariantes garantidas pelo banco', () => {
    it('CHECK impede orcamento pela metade, mesmo fora da aplicacao', async () => {
      const order = await newOrder(fixture);

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE service_orders SET budget_status = 'PENDING' WHERE id = '${order.id}'::uuid`,
        ),
      ).rejects.toThrow();
    });

    it('CHECK impede item concluido sem inicio e quantidade nao positiva', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      order.addPart(fixture.part.toData(), 1);
      await repository.update(order);

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE order_service_items SET finished_at = now() WHERE order_id = '${order.id}'::uuid`,
        ),
      ).rejects.toThrow();
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE order_part_items SET quantity = 0 WHERE order_id = '${order.id}'::uuid`,
        ),
      ).rejects.toThrow();
    });

    it('mesmo servico ou peca nao entra duas vezes na OS (indice unico)', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      await repository.update(order);

      await expect(
        prisma.orderServiceItem.create({
          data: {
            ...(await prisma.orderServiceItem.findFirstOrThrow({ where: { orderId: order.id } })),
            id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
          },
        }),
      ).rejects.toThrow();
    });

    it('servico, veiculo e cliente usados em OS nao podem ser removidos', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      await repository.update(order);

      await expect(services.delete(fixture.service.id)).rejects.toMatchObject({
        code: 'SERVICE_IN_USE',
        statusCode: 409,
      });
      await expect(vehicles.delete(fixture.vehicle.id)).rejects.toMatchObject({
        code: 'VEHICLE_HAS_ORDERS',
        statusCode: 409,
      });
      await expect(customers.delete(fixture.customer.id)).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('unidade de trabalho', () => {
    it('desfaz a OS criada quando o trabalho falha depois', async () => {
      const order = ServiceOrder.create({
        customerId: fixture.customer.id,
        vehicleId: fixture.vehicle.id,
      });

      await expect(
        unitOfWork.run(async () => {
          await repository.create(order);

          throw new Error('falha depois de gravar');
        }),
      ).rejects.toThrow('falha depois de gravar');

      expect(await repository.findById(order.id)).toBeNull();
      expect(await prisma.orderStatusChange.count()).toBe(0);
    });

    it('grava OS e estoque juntos: confirma os dois ou desfaz os dois', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      order.addPart(fixture.part.toData(), 3);
      order.startDiagnosis();
      await repository.update(order);

      const current = await reload(order);
      const part = await loadPart(fixture.part);

      await expect(
        unitOfWork.run(async () => {
          part.reserve(3);
          await parts.updateAll([part]);

          current.sendBudget();
          await repository.update(current);

          throw new Error('falha antes do commit');
        }),
      ).rejects.toThrow('falha antes do commit');

      const afterRollback = await loadPart(fixture.part);

      expect(afterRollback.reserved).toBe(0);
      expect(afterRollback.version).toBe(0);
      expect((await reload(order)).status).toBe('IN_DIAGNOSIS');

      const retry = await loadPart(fixture.part);
      const retryOrder = await reload(order);

      await unitOfWork.run(async () => {
        retry.reserve(3);
        await parts.updateAll([retry]);

        retryOrder.sendBudget();
        await repository.update(retryOrder);
      });

      expect((await loadPart(fixture.part)).reserved).toBe(3);
      expect((await reload(order)).status).toBe('AWAITING_APPROVAL');
    });

    it('carregar a OS dentro da unidade de trabalho a trava ate o fim da transacao', async () => {
      const order = await newOrder(fixture);
      const events: string[] = [];
      let release = (): void => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });

      const first = unitOfWork.run(async () => {
        await repository.findById(order.id);
        events.push('primeira travou');

        await held;
        events.push('primeira terminou');
      });
      await vi.waitFor(() => expect(events).toEqual(['primeira travou']));

      const second = unitOfWork.run(async () => {
        await repository.findById(order.id);
        events.push('segunda leu');
      });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(events).toEqual(['primeira travou']);

      release();
      await Promise.all([first, second]);

      expect(events).toEqual(['primeira travou', 'primeira terminou', 'segunda leu']);
    });

    it('fora da unidade de trabalho a leitura nao trava a OS', async () => {
      const order = await newOrder(fixture);
      let release = (): void => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });

      const reading = unitOfWork.run(async () => {
        await repository.findById(order.id);
        await held;
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(repository.findById(order.id)).resolves.not.toBeNull();

      release();
      await reading;
    });

    it('conflito de versao do estoque desfaz tambem a gravacao da OS', async () => {
      const order = await newOrder(fixture);
      order.startDiagnosis();
      await repository.update(order);

      const current = await reload(order);
      const stale = await loadPart(fixture.part);
      const winner = await loadPart(fixture.part);
      winner.reserve(1);
      await parts.updateAll([winner]);

      stale.reserve(1);

      await expect(
        unitOfWork.run(async () => {
          current.addService(fixture.service.toData());
          current.sendBudget();
          await repository.update(current);

          await parts.updateAll([stale]);
        }),
      ).rejects.toBeInstanceOf(ConcurrentUpdateError);

      expect((await reload(order)).status).toBe('IN_DIAGNOSIS');
      expect((await reload(order)).serviceItems).toHaveLength(0);
    });
  });

  describe('executionTimeStats', () => {
    async function finishedOrder(minutes: number, service: Service): Promise<void> {
      const startedAt = new Date('2026-03-01T10:00:00.000Z');
      const finishedAt = new Date(startedAt.getTime() + minutes * 60_000);
      const base = ServiceOrder.create({
        customerId: fixture.customer.id,
        vehicleId: fixture.vehicle.id,
      });
      base.addService(service.toData());
      const data = base.toData();

      await repository.create(
        ServiceOrder.from({
          ...data,
          status: 'FINISHED',
          serviceItems: data.serviceItems.map((item) => ({ ...item, startedAt, finishedAt })),
        }),
      );
    }

    it('devolve media nula e lista vazia sem OS concluida', async () => {
      const order = await newOrder(fixture);
      order.addService(fixture.service.toData());
      await repository.update(order);

      expect(await repository.executionTimeStats()).toEqual({
        finishedOrders: 0,
        averageExecutionMinutes: null,
        byService: [],
      });
    });

    it('calcula a media geral e por servico so das OS concluidas', async () => {
      const alignment = Service.create({ name: 'Alinhamento', price: 90, estimatedMinutes: 60 });
      await services.create(alignment);
      await finishedOrder(30, fixture.service);
      await finishedOrder(60, fixture.service);
      await finishedOrder(90, alignment);

      const stats = await repository.executionTimeStats();

      expect(stats.finishedOrders).toBe(3);
      expect(stats.averageExecutionMinutes).toBe(60);
      expect(stats.byService).toEqual([
        {
          serviceId: alignment.id,
          name: 'Alinhamento',
          finishedCount: 1,
          averageEstimatedMinutes: 60,
          averageExecutionMinutes: 90,
        },
        {
          serviceId: fixture.service.id,
          name: 'Troca de oleo',
          finishedCount: 2,
          averageEstimatedMinutes: 45,
          averageExecutionMinutes: 45,
        },
      ]);
    });
  });
});
