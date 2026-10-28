import type { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TYPES } from '../../../application/dto/Types.ts';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { resetDatabase } from '../../database/testing/resetDatabase.ts';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

const prisma = container.get<PrismaClient>(TYPES.PrismaClient);

const CPF = '529.982.247-25';
const OTHER_CNPJ = '11.222.333/0001-81';

const newVehicle = { plate: 'ABC-1D23', brand: 'Fiat', model: 'Argo', year: 2022 };

const oil = {
  code: 'OLEO-5W30',
  name: 'Oleo 5W30',
  type: 'SUPPLY',
  unit: 'L',
  unitPrice: 45.9,
  initialQuantity: 20,
  minimumStock: 4,
};

const filter = {
  code: 'FILTRO-01',
  name: 'Filtro de oleo',
  type: 'PART',
  unit: 'UN',
  unitPrice: 25.9,
  initialQuantity: 3,
  minimumStock: 1,
};

describe('Ordem de Servico (HTTP + PostgreSQL)', () => {
  let app: Express;
  let admin: TestAgent;
  let attendant: TestAgent;
  let mechanic: TestAgent;
  let serviceId: string;
  let oilId: string;
  let filterId: string;

  async function agentFor(role: UserRole): Promise<TestAgent> {
    const { accessToken } = await container.get<TokenProvider>(TYPES.TokenProvider).sign({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
      email: `${role.toLowerCase()}@oficina.com`,
      role,
    });

    return request.agent(app).set('Authorization', `Bearer ${accessToken}`);
  }

  async function created(response: request.Test): Promise<string> {
    const { body } = await response.expect(201);

    return z.uuid().parse(body.id);
  }

  async function openOrder(vehicle: object = newVehicle): Promise<string> {
    return created(attendant.post('/service-orders').send({ customerDocument: CPF, vehicle }));
  }

  /** Monta a OS ate o orcamento enviado: servico, pecas, diagnostico e envio. */
  async function quote(orderId: string, items: Array<[string, number]> = []): Promise<void> {
    await mechanic.post(`/service-orders/${orderId}/services`).send({ serviceId }).expect(201);

    for (const [partId, quantity] of items) {
      await mechanic
        .post(`/service-orders/${orderId}/parts`)
        .send({ partId, quantity })
        .expect(201);
    }

    await mechanic.post(`/service-orders/${orderId}/diagnosis`).expect(200);
    await attendant.post(`/service-orders/${orderId}/budget/send`).expect(200);
  }

  async function part(
    id: string,
  ): Promise<{ quantity: number; reserved: number; available: number }> {
    return (await admin.get(`/parts/${id}`).expect(200)).body;
  }

  beforeAll(async () => {
    app = createApp(container);
    admin = await agentFor(UserRole.ADMIN);
    attendant = await agentFor(UserRole.ATTENDANT);
    mechanic = await agentFor(UserRole.MECHANIC);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    await created(attendant.post('/customers').send({ name: 'Joao da Silva', document: CPF }));
    serviceId = await created(
      admin.post('/services').send({ name: 'Troca de oleo', price: 120, estimatedMinutes: 45 }),
    );
    oilId = await created(admin.post('/parts').send(oil));
    filterId = await created(admin.post('/parts').send(filter));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('fluxo completo: criacao, orcamento, aprovacao com reserva, conclusao com baixa e entrega', async () => {
    const orderId = await openOrder();
    const opened = (await admin.get(`/service-orders/${orderId}`)).body;

    expect(opened).toMatchObject({ status: 'RECEIVED', total: 0, budget: null });
    expect((await attendant.get('/vehicles/plate/ABC1D23').expect(200)).body.id).toBe(
      opened.vehicleId,
    );

    await mechanic.post(`/service-orders/${orderId}/services`).send({ serviceId }).expect(201);
    await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: oilId, quantity: 4.5 })
      .expect(201);
    await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: filterId, quantity: 1 })
      .expect(201);

    expect(await part(oilId)).toMatchObject({ quantity: 20, reserved: 0 });

    await mechanic.post(`/service-orders/${orderId}/diagnosis`).expect(200);
    const sent = (await attendant.post(`/service-orders/${orderId}/budget/send`).expect(200)).body;

    expect(sent).toMatchObject({
      status: 'AWAITING_APPROVAL',
      total: 120 + 206.55 + 25.9,
      budget: { status: 'PENDING', total: 352.45 },
    });

    const approved = (await attendant.post(`/service-orders/${orderId}/budget/approve`).expect(200))
      .body;

    expect(approved).toMatchObject({ status: 'IN_EXECUTION', budget: { status: 'APPROVED' } });
    expect(approved.serviceItems[0].startedAt).not.toBeNull();
    expect(await part(oilId)).toMatchObject({ quantity: 20, reserved: 4.5, available: 15.5 });
    expect(await part(filterId)).toMatchObject({ quantity: 3, reserved: 1, available: 2 });

    const finished = (await mechanic.post(`/service-orders/${orderId}/finish`).expect(200)).body;

    expect(finished.status).toBe('FINISHED');
    expect(finished.serviceItems[0].finishedAt).not.toBeNull();
    expect(await part(oilId)).toMatchObject({ quantity: 15.5, reserved: 0 });
    expect(await part(filterId)).toMatchObject({ quantity: 2, reserved: 0 });

    const delivered = (await attendant.post(`/service-orders/${orderId}/deliver`).expect(200)).body;

    expect(delivered.history.map((change: { status: string }) => change.status)).toEqual([
      'RECEIVED',
      'IN_DIAGNOSIS',
      'AWAITING_APPROVAL',
      'IN_EXECUTION',
      'FINISHED',
      'DELIVERED',
    ]);

    const report = (await admin.get('/reports/execution-time').expect(200)).body;

    expect(report.finishedOrders).toBe(1);
    expect(report.averageExecutionMinutes).toBeGreaterThanOrEqual(0);
    expect(report.byService).toMatchObject([{ name: 'Troca de oleo', finishedCount: 1 }]);
  });

  it('rejeicao devolve a OS ao diagnostico sem reservar nada; apos revisar, o novo orcamento e aprovado', async () => {
    const orderId = await openOrder();
    await quote(orderId, [
      [oilId, 4],
      [filterId, 2],
    ]);

    const rejected = (await attendant.post(`/service-orders/${orderId}/budget/reject`).expect(200))
      .body;

    expect(rejected).toMatchObject({ status: 'IN_DIAGNOSIS', budget: { status: 'REJECTED' } });
    expect(await part(filterId)).toMatchObject({ reserved: 0 });

    const filterItem = rejected.partItems.find(
      (item: { code: string }) => item.code === 'FILTRO-01',
    );
    await mechanic.delete(`/service-orders/${orderId}/parts/${filterItem.id}`).expect(200);
    await attendant.post(`/service-orders/${orderId}/budget/send`).expect(200);
    const approved = (await attendant.post(`/service-orders/${orderId}/budget/approve`).expect(200))
      .body;

    expect(approved).toMatchObject({ status: 'IN_EXECUTION', total: 120 + 183.6 });
    expect(await part(oilId)).toMatchObject({ reserved: 4 });
    expect(await part(filterId)).toMatchObject({ reserved: 0 });
  });

  it('sem saldo na aprovacao a transacao inteira e desfeita: nenhuma peca reservada, OS inalterada', async () => {
    const orderId = await openOrder();
    await quote(orderId, [
      [oilId, 4],
      [filterId, 3],
    ]);
    await admin
      .post(`/parts/${filterId}/adjustments`)
      .send({ quantity: 1, reason: 'Inventario: pecas danificadas' })
      .expect(200);

    const response = await attendant.post(`/service-orders/${orderId}/budget/approve`);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    expect(response.body.error.message).toContain('FILTRO-01');
    expect(await part(oilId)).toMatchObject({ reserved: 0 });
    expect(await part(filterId)).toMatchObject({ reserved: 0 });

    const order = (await admin.get(`/service-orders/${orderId}`)).body;

    expect(order).toMatchObject({ status: 'AWAITING_APPROVAL', budget: { status: 'PENDING' } });
    expect(order.serviceItems[0].startedAt).toBeNull();
  });

  it('duas aprovacoes simultaneas da mesma OS: so uma vale e o estoque e reservado uma unica vez', async () => {
    const orderId = await openOrder();
    await quote(orderId, [[oilId, 5]]);

    const responses = await Promise.all([
      attendant.post(`/service-orders/${orderId}/budget/approve`),
      attendant.post(`/service-orders/${orderId}/budget/approve`),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 422]);
    expect(responses.find((response) => response.status === 422)?.body.error.code).toBe(
      'INVALID_ORDER_TRANSITION',
    );
    expect(await part(oilId)).toMatchObject({ reserved: 5 });
  });

  it('duas OS disputam as ultimas unidades: as reservas nunca passam do saldo', async () => {
    const first = await openOrder();
    const second = await created(
      attendant.post('/service-orders').send({
        customerDocument: CPF,
        vehicle: { ...newVehicle, plate: 'DEF-4567' },
      }),
    );
    await quote(first, [[filterId, 2]]);
    await quote(second, [[filterId, 2]]);

    const responses = await Promise.all([
      attendant.post(`/service-orders/${first}/budget/approve`),
      attendant.post(`/service-orders/${second}/budget/approve`),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 422]);
    expect(responses.find((response) => response.status === 422)?.body.error.code).toBe(
      'INSUFFICIENT_STOCK',
    );
    expect(await part(filterId)).toMatchObject({ quantity: 3, reserved: 2, available: 1 });
  });

  it('inclusoes simultaneas na mesma OS nao se perdem: o conflito de versao e refeito', async () => {
    const orderId = await openOrder();

    const responses = await Promise.all([
      mechanic.post(`/service-orders/${orderId}/parts`).send({ partId: oilId, quantity: 1 }),
      mechanic.post(`/service-orders/${orderId}/parts`).send({ partId: filterId, quantity: 1 }),
      mechanic.post(`/service-orders/${orderId}/services`).send({ serviceId }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201, 201]);

    const order = (await admin.get(`/service-orders/${orderId}`)).body;

    expect(order.partItems).toHaveLength(2);
    expect(order.serviceItems).toHaveLength(1);
    expect(order.total).toBe(45.9 + 25.9 + 120);
  });

  it('bloqueia incluir peca alem do disponivel e somar a mesma peca acima do saldo', async () => {
    const orderId = await openOrder();

    const tooMany = await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: filterId, quantity: 4 });

    expect(tooMany.status).toBe(422);
    expect(tooMany.body.error.code).toBe('INSUFFICIENT_STOCK');

    await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: filterId, quantity: 2 })
      .expect(201);
    const sum = await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: filterId, quantity: 2 });

    expect(sum.status).toBe(422);
    expect((await admin.get(`/service-orders/${orderId}`)).body.partItems[0].quantity).toBe(2);
  });

  it('o preco fica congelado: mudar o catalogo ou o estoque nao altera a OS', async () => {
    const orderId = await openOrder();
    await mechanic.post(`/service-orders/${orderId}/services`).send({ serviceId }).expect(201);
    await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: filterId, quantity: 2 })
      .expect(201);

    await admin.patch(`/services/${serviceId}`).send({ price: 999 }).expect(200);
    await admin.patch(`/parts/${filterId}`).send({ unitPrice: 999 }).expect(200);

    const order = (await admin.get(`/service-orders/${orderId}`)).body;

    expect(order.serviceItems[0].price).toBe(120);
    expect(order.partItems[0].unitPrice).toBe(25.9);
    expect(order.total).toBe(171.8);
  });

  describe('abertura da OS', () => {
    it('reaproveita o veiculo ja cadastrado do cliente e cadastra o novo na mesma operacao', async () => {
      const first = (await attendant.get(`/service-orders/${await openOrder()}`)).body;
      const again = await attendant
        .post('/service-orders')
        .send({ customerDocument: '52998224725', vehicle: { plate: 'abc1d23' } });

      expect(again.status).toBe(201);
      expect(again.body.vehicleId).toBe(first.vehicleId);
      expect((await attendant.get('/vehicles').expect(200)).body.total).toBe(1);
    });

    it('nao deixa veiculo orfao quando a abertura falha', async () => {
      const response = await attendant.post('/service-orders').send({
        customerDocument: OTHER_CNPJ,
        vehicle: { ...newVehicle, plate: 'GHI-7890' },
      });

      expect(response.status).toBe(404);
      expect((await attendant.get('/vehicles').expect(200)).body.total).toBe(0);
    });

    it('rejeita veiculo de outro cliente, veiculo novo sem dados e CPF invalido', async () => {
      await created(attendant.post('/customers').send({ name: 'Empresa X', document: OTHER_CNPJ }));
      await openOrder();

      const foreign = await attendant
        .post('/service-orders')
        .send({ customerDocument: OTHER_CNPJ, vehicle: { plate: 'ABC1D23' } });
      const incomplete = await attendant
        .post('/service-orders')
        .send({ customerDocument: CPF, vehicle: { plate: 'JKL-1234' } });
      const invalidDocument = await attendant
        .post('/service-orders')
        .send({ customerDocument: '111.111.111-11', vehicle: newVehicle });

      expect(foreign.status).toBe(422);
      expect(foreign.body.error.code).toBe('VEHICLE_OWNED_BY_ANOTHER_CUSTOMER');
      expect(incomplete.status).toBe(400);
      expect(invalidDocument.status).toBe(400);
    });
  });

  describe('regras de transicao', () => {
    it.each([
      ['finish', 'RECEIVED'],
      ['deliver', 'RECEIVED'],
      ['budget/send', 'RECEIVED'],
      ['budget/approve', 'RECEIVED'],
      ['budget/reject', 'RECEIVED'],
    ])('POST %s com a OS %s responde 422', async (action) => {
      const orderId = await openOrder();

      const response = await admin.post(`/service-orders/${orderId}/${action}`);

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INVALID_ORDER_TRANSITION');
    });

    it('nao gera orcamento sem servico e nao altera itens depois do envio', async () => {
      const orderId = await openOrder();
      await mechanic.post(`/service-orders/${orderId}/diagnosis`).expect(200);

      const empty = await attendant.post(`/service-orders/${orderId}/budget/send`);

      expect(empty.status).toBe(422);
      expect(empty.body.error.code).toBe('ORDER_WITHOUT_SERVICES');

      await mechanic.post(`/service-orders/${orderId}/services`).send({ serviceId }).expect(201);
      await attendant.post(`/service-orders/${orderId}/budget/send`).expect(200);

      const locked = await mechanic
        .post(`/service-orders/${orderId}/parts`)
        .send({ partId: filterId, quantity: 1 });

      expect(locked.status).toBe(422);
      expect(locked.body.error.code).toBe('ORDER_NOT_EDITABLE');
    });

    it('responde 404 para OS inexistente e 400 para id invalido', async () => {
      const unknown = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

      expect((await admin.get(`/service-orders/${unknown}`)).status).toBe(404);
      expect((await admin.post(`/service-orders/${unknown}/diagnosis`)).status).toBe(404);
      expect((await admin.get('/service-orders/nao-e-uuid')).status).toBe(400);
    });
  });

  describe('acompanhamento pelo cliente', () => {
    it('mostra o andamento sem login, informando o id e o CPF do dono', async () => {
      const orderId = await openOrder();
      await quote(orderId, [[filterId, 1]]);

      const response = await request(app).get(`/tracking/${orderId}`).query({ document: CPF });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: orderId,
        status: 'AWAITING_APPROVAL',
        vehicle: { plate: 'ABC1D23', brand: 'Fiat' },
        total: 145.9,
        budget: { status: 'PENDING' },
      });
      expect(response.body.timeline).toHaveLength(3);
      expect(response.body).not.toHaveProperty('customerId');
    });

    it('acompanha ate a entrega e aceita o documento sem mascara', async () => {
      const orderId = await openOrder();
      await quote(orderId);
      await attendant.post(`/service-orders/${orderId}/budget/approve`).expect(200);
      await mechanic.post(`/service-orders/${orderId}/finish`).expect(200);
      await attendant.post(`/service-orders/${orderId}/deliver`).expect(200);

      const response = await request(app)
        .get(`/tracking/${orderId}`)
        .query({ document: '52998224725' });

      expect(response.body.status).toBe('DELIVERED');
      expect(
        response.body.timeline.map((change: { status: string }) => change.status),
      ).toHaveLength(6);
    });

    it('responde 404 para documento de outro cliente e 400 para documento invalido ou ausente', async () => {
      const orderId = await openOrder();

      const foreign = await request(app)
        .get(`/tracking/${orderId}`)
        .query({ document: OTHER_CNPJ });
      const invalid = await request(app).get(`/tracking/${orderId}`).query({ document: '123' });
      const missing = await request(app).get(`/tracking/${orderId}`);

      expect(foreign.status).toBe(404);
      expect(invalid.status).toBe(400);
      expect(missing.status).toBe(400);
    });
  });

  describe('listagem e protecao', () => {
    it('lista com filtro por status e cliente, e o detalhe e restrito a usuarios autenticados', async () => {
      const first = await openOrder();
      await openOrder({ ...newVehicle, plate: 'DEF-4567' });
      await mechanic.post(`/service-orders/${first}/diagnosis`).expect(200);

      const diagnosing = (await mechanic.get('/service-orders?status=IN_DIAGNOSIS').expect(200))
        .body;
      const all = (await mechanic.get('/service-orders?pageSize=1').expect(200)).body;

      expect(diagnosing.items.map((item: { id: string }) => item.id)).toEqual([first]);
      expect(all).toMatchObject({ total: 2, totalPages: 2, pageSize: 1 });
      expect((await request(app).get('/service-orders')).status).toBe(401);
      expect((await request(app).get(`/service-orders/${first}`)).status).toBe(401);
    });

    it('cada papel so executa os comandos da sua etapa', async () => {
      const orderId = await openOrder();

      expect(
        (
          await mechanic
            .post('/service-orders')
            .send({ customerDocument: CPF, vehicle: newVehicle })
        ).status,
      ).toBe(403);
      expect((await attendant.post(`/service-orders/${orderId}/diagnosis`)).status).toBe(403);
      expect((await mechanic.post(`/service-orders/${orderId}/budget/send`)).status).toBe(403);
      expect((await mechanic.post(`/service-orders/${orderId}/budget/approve`)).status).toBe(403);
      expect((await attendant.post(`/service-orders/${orderId}/finish`)).status).toBe(403);
      expect((await mechanic.post(`/service-orders/${orderId}/deliver`)).status).toBe(403);
      expect((await attendant.get('/reports/execution-time')).status).toBe(403);
      expect((await request(app).get('/reports/execution-time')).status).toBe(401);
    });
  });

  it('peca incluida em uma OS, mesmo sem reserva, nao pode ser removida', async () => {
    const orderId = await openOrder();
    await mechanic
      .post(`/service-orders/${orderId}/parts`)
      .send({ partId: filterId, quantity: 1 })
      .expect(201);

    const response = await admin.delete(`/parts/${filterId}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PART_HAS_STOCK_HISTORY');
    expect(await part(filterId)).toMatchObject({ quantity: 3 });
  });

  it('servico, veiculo e cliente usados em OS respondem 409 ao serem removidos', async () => {
    const orderId = await openOrder();
    await mechanic.post(`/service-orders/${orderId}/services`).send({ serviceId }).expect(201);
    const { vehicleId, customerId } = (await admin.get(`/service-orders/${orderId}`)).body;

    const service = await admin.delete(`/services/${serviceId}`);
    const vehicle = await admin.delete(`/vehicles/${vehicleId}`);
    const customer = await admin.delete(`/customers/${customerId}`);

    expect([service.status, vehicle.status, customer.status]).toEqual([409, 409, 409]);
    expect(service.body.error.code).toBe('SERVICE_IN_USE');
    expect(vehicle.body.error.code).toBe('VEHICLE_HAS_ORDERS');
  });
});
