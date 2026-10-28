import type { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import type { ConsumePartsUseCase } from '../../../application/use-cases/parts/ConsumePartsUseCase.ts';
import type { ReleasePartReservationsUseCase } from '../../../application/use-cases/parts/ReleasePartReservationsUseCase.ts';
import type { ReservePartsUseCase } from '../../../application/use-cases/parts/ReservePartsUseCase.ts';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

const prisma = container.get<PrismaClient>(TYPES.PrismaClient);

const oil = {
  code: 'oleo-5w30',
  name: 'Oleo 5W30',
  type: 'SUPPLY',
  unit: 'L',
  unitPrice: 45.9,
  initialQuantity: 20.5,
  minimumStock: 4,
};

const filter = {
  code: 'filtro-01',
  name: 'Filtro de oleo',
  type: 'PART',
  unit: 'UN',
  unitPrice: 25.9,
  initialQuantity: 3,
  minimumStock: 2,
};

describe('Gestao de pecas e insumos (HTTP + PostgreSQL)', () => {
  let app: Express;
  let admin: TestAgent;
  let mechanic: TestAgent;

  async function signToken(role: UserRole): Promise<string> {
    const { accessToken } = await container.get<TokenProvider>(TYPES.TokenProvider).sign({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
      email: `${role.toLowerCase()}@oficina.com`,
      role,
    });

    return accessToken;
  }

  async function create(body: object): Promise<string> {
    const response = await admin.post('/parts').send(body);
    expect(response.status).toBe(201);

    return response.body.id as string;
  }

  beforeAll(async () => {
    app = createApp(container);
    admin = request.agent(app).set('Authorization', `Bearer ${await signToken(UserRole.ADMIN)}`);
    mechanic = request
      .agent(app)
      .set('Authorization', `Bearer ${await signToken(UserRole.MECHANIC)}`);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE stock_movements, parts CASCADE');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('fluxo administrativo: cadastro, entrada, ajuste, edicao e historico', async () => {
    const id = await create(oil);

    await admin.post(`/parts/${id}/entries`).send({ quantity: 4.75 }).expect(200);
    await admin
      .post(`/parts/${id}/adjustments`)
      .send({ quantity: 24.5, reason: 'Inventario: vazamento' })
      .expect(200);
    const edited = await admin.patch(`/parts/${id}`).send({ unitPrice: 49.9 }).expect(200);
    const movements = await mechanic.get(`/parts/${id}/movements`).expect(200);

    expect(edited.body).toMatchObject({ unitPrice: 49.9, quantity: 24.5, unit: 'L' });
    expect(
      movements.body.items.map((movement: { type: string; quantity: number }) => [
        movement.type,
        movement.quantity,
      ]),
    ).toEqual([
      ['ADJUSTMENT', -0.75],
      ['ENTRY', 4.75],
      ['INITIAL', 20.5],
    ]);
  });

  it('politicas do orcamento: reserva em lote tudo ou nada, liberacao e consumo', async () => {
    const reserve = container.get<ReservePartsUseCase>(TYPES.ReservePartsUseCase);
    const release = container.get<ReleasePartReservationsUseCase>(
      TYPES.ReleasePartReservationsUseCase,
    );
    const consume = container.get<ConsumePartsUseCase>(TYPES.ConsumePartsUseCase);
    const oilId = await create(oil);
    const filterId = await create(filter);

    // Orcamento pede mais filtros do que ha: nada e reservado, nem o oleo.
    await expect(
      reserve.execute({
        items: [
          { partId: oilId, quantity: 4.5 },
          { partId: filterId, quantity: 5 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    expect((await mechanic.get(`/parts/${oilId}`)).body.reserved).toBe(0);

    // Orcamento aprovado com quantidades possiveis.
    await reserve.execute({
      items: [
        { partId: oilId, quantity: 4.5 },
        { partId: filterId, quantity: 2 },
      ],
    });
    // Cliente recusa um adicional: devolve 1 filtro.
    await release.execute({ items: [{ partId: filterId, quantity: 1 }] });
    // Servico concluido: consome o que ficou reservado.
    await consume.execute({
      items: [
        { partId: oilId, quantity: 4.5 },
        { partId: filterId, quantity: 1 },
      ],
    });

    const oilAfter = (await mechanic.get(`/parts/${oilId}`)).body;
    const filterAfter = (await mechanic.get(`/parts/${filterId}`)).body;
    const lowStock = (await mechanic.get('/parts?belowMinimum=true')).body;

    expect(oilAfter).toMatchObject({ quantity: 16, reserved: 0, belowMinimum: false });
    expect(filterAfter).toMatchObject({ quantity: 2, reserved: 0, belowMinimum: true });
    expect(lowStock.items.map((part: { id: string }) => part.id)).toEqual([filterId]);
  });

  it('exclusao: so peca sem historico pode ser removida', async () => {
    const untouched = await create(filter);
    const moved = await create(oil);
    await admin.post(`/parts/${moved}/entries`).send({ quantity: 1 }).expect(200);

    await admin.delete(`/parts/${untouched}`).expect(204);
    const blocked = await admin.delete(`/parts/${moved}`).expect(409);

    expect(blocked.body.error.code).toBe('PART_HAS_STOCK_HISTORY');
    await admin.get(`/parts/${untouched}`).expect(404);
    await admin.get(`/parts/${moved}`).expect(200);
  });

  it('rotas de escrita exigem ADMIN e leitura exige autenticacao', async () => {
    const id = await create(filter);

    await mechanic.post('/parts').send(oil).expect(403);
    await mechanic.post(`/parts/${id}/entries`).send({ quantity: 1 }).expect(403);
    await request(app).get('/parts').expect(401);
  });
});
