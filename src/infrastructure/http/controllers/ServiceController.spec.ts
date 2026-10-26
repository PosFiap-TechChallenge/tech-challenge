import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import { InMemoryServiceRepository } from '../../../domain/test/mocks/InMemoryServiceRepository.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

const UNKNOWN_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

const validService = { name: 'Troca de oleo', price: 120, estimatedMinutes: 45 };

describe('ServiceController', () => {
  const serviceRepository = new InMemoryServiceRepository();
  let app: Express;
  let admin: TestAgent;
  let attendant: TestAgent;
  let mechanic: TestAgent;

  async function signToken(role: UserRole): Promise<string> {
    const tokenProvider = container.get<TokenProvider>(TYPES.TokenProvider);
    const { accessToken } = await tokenProvider.sign({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
      email: `${role.toLowerCase()}@oficina.com`,
      role,
    });

    return accessToken;
  }

  async function agentFor(role: UserRole): Promise<TestAgent> {
    return request.agent(app).set('Authorization', `Bearer ${await signToken(role)}`);
  }

  async function createService(body: object = validService): Promise<request.Response> {
    return admin.post('/services').send(body);
  }

  beforeAll(async () => {
    container.rebind<ServiceRepository>(TYPES.ServiceRepository).toConstantValue(serviceRepository);

    app = createApp(container);

    admin = await agentFor(UserRole.ADMIN);
    attendant = await agentFor(UserRole.ATTENDANT);
    mechanic = await agentFor(UserRole.MECHANIC);
  });

  beforeEach(() => {
    serviceRepository.clear();
  });

  describe('POST /services', () => {
    it('responde 201 com o servico criado e o header Location', async () => {
      const response = await createService({ ...validService, name: '  Troca de oleo  ' });

      expect(response.status).toBe(201);
      expect(response.headers['location']).toBe(`/services/${response.body.id}`);
      expect(response.body).toMatchObject(validService);
    });

    it('responde 409 para nome ja cadastrado', async () => {
      await createService();

      const response = await createService();

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it.each([
      { name: '' },
      { name: 'a'.repeat(121) },
      { name: undefined },
      { price: -1 },
      { price: 10.123 },
      { price: '120' },
      { price: undefined },
      { estimatedMinutes: 0 },
      { estimatedMinutes: 1.5 },
      { estimatedMinutes: 10_081 },
      { estimatedMinutes: undefined },
    ])('responde 400 para payload invalido: %j', async (override) => {
      const response = await createService({ ...validService, ...override });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /services', () => {
    it('lista com paginacao padrao', async () => {
      await createService();
      await createService({ ...validService, name: 'Alinhamento' });

      const response = await attendant.get('/services');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
      expect(response.body.items).toHaveLength(2);
    });

    it('respeita page e pageSize', async () => {
      await createService();
      await createService({ ...validService, name: 'Alinhamento' });

      const response = await attendant.get('/services?page=2&pageSize=1');

      expect(response.body).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
      expect(response.body.items).toHaveLength(1);
    });

    it.each(['page=0', 'pageSize=101', 'page=abc'])('responde 400 para %s', async (query) => {
      const response = await attendant.get(`/services?${query}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /services/:id', () => {
    it('detalha o servico', async () => {
      const created = await createService();

      const response = await attendant.get(`/services/${created.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created.body);
    });

    it('responde 404 para servico inexistente', async () => {
      const response = await attendant.get(`/services/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
    });

    it('responde 400 para id que nao e UUID', async () => {
      const response = await attendant.get('/services/nao-e-uuid');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /services/:id', () => {
    it('atualiza parcialmente mantendo os demais campos', async () => {
      const created = await createService();

      const response = await admin
        .patch(`/services/${created.body.id}`)
        .send({ price: 150, estimatedMinutes: 50 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        name: 'Troca de oleo',
        price: 150,
        estimatedMinutes: 50,
      });
    });

    it('permite reenviar o proprio nome', async () => {
      const created = await createService();

      const response = await admin
        .patch(`/services/${created.body.id}`)
        .send({ name: 'Troca de oleo' });

      expect(response.status).toBe(200);
    });

    it('responde 409 ao trocar para o nome de outro servico', async () => {
      const created = await createService();
      await createService({ ...validService, name: 'Alinhamento' });

      const response = await admin
        .patch(`/services/${created.body.id}`)
        .send({ name: 'Alinhamento' });

      expect(response.status).toBe(409);
    });

    it('responde 400 para corpo vazio', async () => {
      const created = await createService();

      const response = await admin.patch(`/services/${created.body.id}`).send({});

      expect(response.status).toBe(400);
    });

    it('responde 400 para preco invalido', async () => {
      const created = await createService();

      const response = await admin.patch(`/services/${created.body.id}`).send({ price: -5 });

      expect(response.status).toBe(400);
    });

    it('responde 404 para servico inexistente', async () => {
      const response = await admin.patch(`/services/${UNKNOWN_ID}`).send({ price: 10 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /services/:id', () => {
    it('remove o servico e responde 204', async () => {
      const created = await createService();

      const response = await admin.delete(`/services/${created.body.id}`);
      const afterDelete = await admin.get(`/services/${created.body.id}`);

      expect(response.status).toBe(204);
      expect(afterDelete.status).toBe(404);
    });

    it('responde 404 para servico inexistente', async () => {
      const response = await admin.delete(`/services/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
    });
  });

  describe('autenticacao e autorizacao', () => {
    it('responde 401 sem token', async () => {
      const response = await request(app).get('/services');

      expect(response.status).toBe(401);
    });

    it('responde 401 com token invalido', async () => {
      const response = await request(app)
        .get('/services')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(401);
    });

    it.each([UserRole.ATTENDANT, UserRole.MECHANIC])(
      'permite que %s consulte o catalogo',
      async (role) => {
        const created = await createService();
        const agent = role === UserRole.ATTENDANT ? attendant : mechanic;

        const list = await agent.get('/services');
        const detail = await agent.get(`/services/${created.body.id}`);

        expect(list.status).toBe(200);
        expect(detail.status).toBe(200);
      },
    );

    it.each([UserRole.ATTENDANT, UserRole.MECHANIC])(
      'responde 403 quando %s tenta alterar o catalogo',
      async (role) => {
        const created = await createService();
        const agent = role === UserRole.ATTENDANT ? attendant : mechanic;

        const post = await agent.post('/services').send(validService);
        const patch = await agent.patch(`/services/${created.body.id}`).send({ price: 1 });
        const remove = await agent.delete(`/services/${created.body.id}`);

        expect([post.status, patch.status, remove.status]).toEqual([403, 403, 403]);
      },
    );
  });
});
