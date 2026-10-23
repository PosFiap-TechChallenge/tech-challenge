import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import { InMemoryPartRepository } from '../../../domain/test/mocks/InMemoryPartRepository.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

const UNKNOWN_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

const validPart = {
  code: 'flt-oleo-01',
  name: 'Filtro de oleo',
  type: 'PART',
  unit: 'UN',
  unitPrice: 25.9,
  initialQuantity: 10,
  minimumStock: 3,
};

describe('PartController', () => {
  const partRepository = new InMemoryPartRepository();
  let app: Express;
  let admin: TestAgent;
  let mechanic: TestAgent;
  let attendantToken: string;

  async function signToken(role: UserRole): Promise<string> {
    const tokenProvider = container.get<TokenProvider>(TYPES.TokenProvider);
    const { accessToken } = await tokenProvider.sign({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
      email: `${role.toLowerCase()}@oficina.com`,
      role,
    });

    return accessToken;
  }

  async function createPart(body: object = validPart): Promise<string> {
    const response = await admin.post('/parts').send(body);

    return response.body.id as string;
  }

  beforeAll(async () => {
    container.rebind<PartRepository>(TYPES.PartRepository).toConstantValue(partRepository);

    app = createApp(container);

    admin = request.agent(app).set('Authorization', `Bearer ${await signToken(UserRole.ADMIN)}`);
    mechanic = request
      .agent(app)
      .set('Authorization', `Bearer ${await signToken(UserRole.MECHANIC)}`);
    attendantToken = await signToken(UserRole.ATTENDANT);
  });

  beforeEach(() => {
    partRepository.clear();
  });

  describe('POST /parts', () => {
    it('responde 201 com a peca e o estoque inicial', async () => {
      const response = await admin.post('/parts').send(validPart);

      expect(response.status).toBe(201);
      expect(response.headers['location']).toBe(`/parts/${response.body.id}`);
      expect(response.body).toMatchObject({
        code: 'FLT-OLEO-01',
        name: 'Filtro de oleo',
        quantity: 10,
        reserved: 0,
        available: 10,
        minimumStock: 3,
        belowMinimum: false,
      });
    });

    it('responde 409 para codigo repetido, ignorando maiusculas', async () => {
      await createPart();

      const response = await admin.post('/parts').send({ ...validPart, code: 'FLT-OLEO-01' });

      expect(response.status).toBe(409);
    });

    it('responde 400 para payload invalido', async () => {
      const response = await admin.post('/parts').send({ ...validPart, initialQuantity: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('responde 401 sem token e 403 para quem nao e ADMIN', async () => {
      const anonymous = await request(app).post('/parts').send(validPart);
      const attendant = await request(app)
        .post('/parts')
        .set('Authorization', `Bearer ${attendantToken}`)
        .send(validPart);

      expect(anonymous.status).toBe(401);
      expect(attendant.status).toBe(403);
    });
  });

  describe('pecas e insumos com quantidades decimais', () => {
    const oil = {
      code: 'oleo-5w30',
      name: 'Oleo 5W30',
      type: 'SUPPLY',
      unit: 'L',
      unitPrice: 45.9,
      initialQuantity: 20.5,
      minimumStock: 4,
    };

    it('cadastra insumo em litros com preco e movimenta fracoes', async () => {
      const created = await admin.post('/parts').send(oil);
      const entry = await admin.post(`/parts/${created.body.id}/entries`).send({ quantity: 4.75 });

      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        type: 'SUPPLY',
        unit: 'L',
        unitPrice: 45.9,
        quantity: 20.5,
      });
      expect(entry.body.quantity).toBe(25.25);
    });

    it('responde 400 para quantidade com mais de 3 casas ou preco com mais de 2', async () => {
      expect((await admin.post('/parts').send({ ...oil, initialQuantity: 1.2345 })).status).toBe(
        400,
      );
      expect((await admin.post('/parts').send({ ...oil, unitPrice: 9.999 })).status).toBe(400);
      expect((await admin.post('/parts').send({ ...oil, unit: 'LITRO' })).status).toBe(400);
    });

    it('responde 422 para fracao em item contado por unidade', async () => {
      const id = await createPart();

      const response = await admin.post(`/parts/${id}/entries`).send({ quantity: 1.5 });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('FRACTIONAL_QUANTITY_NOT_ALLOWED');
    });

    it('edita preco e tipo, mas ignora tentativa de trocar a unidade', async () => {
      const id = await createPart();

      const response = await admin
        .patch(`/parts/${id}`)
        .send({ unitPrice: 31.5, type: 'SUPPLY', unit: 'L' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ unitPrice: 31.5, type: 'SUPPLY', unit: 'UN' });
    });
  });

  describe('GET /parts e /parts/:id', () => {
    it('qualquer usuario autenticado consulta pecas e saldos', async () => {
      const id = await createPart();

      const list = await mechanic.get('/parts');
      const detail = await mechanic.get(`/parts/${id}`);

      expect(list.status).toBe(200);
      expect(list.body).toMatchObject({ total: 1, page: 1, totalPages: 1 });
      expect(detail.status).toBe(200);
      expect(detail.body.id).toBe(id);
    });

    it('responde 404 para peca inexistente e 400 para id invalido', async () => {
      expect((await mechanic.get(`/parts/${UNKNOWN_ID}`)).status).toBe(404);
      expect((await mechanic.get('/parts/nao-e-uuid')).status).toBe(400);
    });
  });

  describe('POST /parts/:id/entries', () => {
    it('registra a entrada e soma ao saldo', async () => {
      const id = await createPart();

      const response = await admin.post(`/parts/${id}/entries`).send({ quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ quantity: 15, available: 15 });
    });

    it('responde 400 para quantidade zero e 403 para quem nao e ADMIN', async () => {
      const id = await createPart();

      expect((await admin.post(`/parts/${id}/entries`).send({ quantity: 0 })).status).toBe(400);
      expect((await mechanic.post(`/parts/${id}/entries`).send({ quantity: 1 })).status).toBe(403);
    });

    it('responde 404 para peca inexistente', async () => {
      const response = await admin.post(`/parts/${UNKNOWN_ID}/entries`).send({ quantity: 1 });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /parts/:id/adjustments', () => {
    it('ajusta o saldo para a quantidade contada', async () => {
      const id = await createPart();

      const response = await admin
        .post(`/parts/${id}/adjustments`)
        .send({ quantity: 2, reason: 'Inventario: 8 avariadas' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ quantity: 2, belowMinimum: true });
    });

    it('responde 422 quando o ajuste nao altera o saldo', async () => {
      const id = await createPart();

      const response = await admin
        .post(`/parts/${id}/adjustments`)
        .send({ quantity: 10, reason: 'Inventario' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('STOCK_ADJUSTMENT_UNCHANGED');
    });

    it('responde 400 sem motivo', async () => {
      const id = await createPart();

      const response = await admin.post(`/parts/${id}/adjustments`).send({ quantity: 5 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /parts/:id/movements', () => {
    it('lista o historico do mais recente para o mais antigo', async () => {
      const id = await createPart();
      await admin.post(`/parts/${id}/entries`).send({ quantity: 5 });
      await admin.post(`/parts/${id}/adjustments`).send({ quantity: 12, reason: 'Inventario' });

      const response = await mechanic.get(`/parts/${id}/movements`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(response.body.items).toEqual([
        expect.objectContaining({
          type: 'ADJUSTMENT',
          quantity: -3,
          balanceAfter: 12,
          reason: 'Inventario',
        }),
        expect.objectContaining({ type: 'ENTRY', quantity: 5, balanceAfter: 15, reason: null }),
        expect.objectContaining({ type: 'INITIAL', quantity: 10, balanceAfter: 10 }),
      ]);
    });

    it('responde 404 para peca inexistente', async () => {
      expect((await mechanic.get(`/parts/${UNKNOWN_ID}/movements`)).status).toBe(404);
    });
  });

  describe('GET /parts?belowMinimum=true', () => {
    it('lista apenas pecas com saldo menor ou igual ao minimo', async () => {
      await createPart();
      const lowId = await createPart({ ...validPart, code: 'PST-01', initialQuantity: 2 });

      const response = await mechanic.get('/parts?belowMinimum=true');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0]).toMatchObject({ id: lowId, belowMinimum: true });
      expect((await mechanic.get('/parts?belowMinimum=false')).body.total).toBe(2);
    });

    it('responde 400 para valor de filtro invalido', async () => {
      expect((await mechanic.get('/parts?belowMinimum=talvez')).status).toBe(400);
    });
  });

  describe('PATCH /parts/:id', () => {
    it('edita nome e minimo sem alterar saldos', async () => {
      const id = await createPart();

      const response = await admin
        .patch(`/parts/${id}`)
        .send({ name: 'Filtro Tecfil', minimumStock: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Filtro Tecfil',
        minimumStock: 10,
        quantity: 10,
        belowMinimum: true,
      });
    });

    it('responde 409 quando o novo codigo pertence a outra peca', async () => {
      const id = await createPart();
      await createPart({ ...validPart, code: 'PST-01' });

      const response = await admin.patch(`/parts/${id}`).send({ code: 'pst-01' });

      expect(response.status).toBe(409);
    });

    it('responde 400 para payload vazio e 403 para quem nao e ADMIN', async () => {
      const id = await createPart();

      expect((await admin.patch(`/parts/${id}`).send({})).status).toBe(400);
      expect((await mechanic.patch(`/parts/${id}`).send({ name: 'x' })).status).toBe(403);
    });

    it('nao aceita alterar saldo pela edicao', async () => {
      const id = await createPart();

      const response = await admin.patch(`/parts/${id}`).send({ name: 'x', quantity: 999 });

      expect(response.status).toBe(200);
      expect(response.body.quantity).toBe(10);
    });
  });

  describe('DELETE /parts/:id', () => {
    it('remove a peca que so tem o estoque inicial', async () => {
      const id = await createPart();

      expect((await admin.delete(`/parts/${id}`)).status).toBe(204);
      expect((await admin.get(`/parts/${id}`)).status).toBe(404);
    });

    it('responde 409 quando a peca ja teve movimentacoes', async () => {
      const id = await createPart();
      await admin.post(`/parts/${id}/entries`).send({ quantity: 1 });

      const response = await admin.delete(`/parts/${id}`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('PART_HAS_STOCK_HISTORY');
    });

    it('responde 404 para peca inexistente e 403 para quem nao e ADMIN', async () => {
      const id = await createPart();

      expect((await admin.delete(`/parts/${UNKNOWN_ID}`)).status).toBe(404);
      expect((await mechanic.delete(`/parts/${id}`)).status).toBe(403);
    });
  });

  it('nao expoe rotas de reserva, liberacao e consumo: sao disparadas por politicas', async () => {
    const id = await createPart();

    for (const path of ['reservations', 'releases', 'consumptions']) {
      expect((await admin.post(`/parts/${id}/${path}`).send({ quantity: 1 })).status).toBe(404);
    }
  });
});
