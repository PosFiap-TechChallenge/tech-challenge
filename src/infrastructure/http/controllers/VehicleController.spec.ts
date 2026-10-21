import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import { InMemoryCustomerRepository } from '../../../domain/test/mocks/InMemoryCustomerRepository.ts';
import { InMemoryVehicleRepository } from '../../../domain/test/mocks/InMemoryVehicleRepository.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

const UNKNOWN_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

const validCustomer = { name: 'Joao da Silva', document: '529.982.247-25' };

describe('VehicleController', () => {
  const customerRepository = new InMemoryCustomerRepository();
  const vehicleRepository = new InMemoryVehicleRepository();
  let app: Express;
  let attendant: TestAgent;
  let mechanicToken: string;
  let adminToken: string;
  let customerId: string;

  async function signToken(role: UserRole): Promise<string> {
    const tokenProvider = container.get<TokenProvider>(TYPES.TokenProvider);
    const { accessToken } = await tokenProvider.sign({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
      email: `${role.toLowerCase()}@oficina.com`,
      role,
    });

    return accessToken;
  }

  function validVehicle(overrides: object = {}): object {
    return { plate: 'ABC1D23', brand: 'Fiat', model: 'Argo', year: 2022, customerId, ...overrides };
  }

  async function createCustomer(body: object = validCustomer): Promise<string> {
    const response = await attendant.post('/customers').send(body);

    return response.body.id as string;
  }

  async function createVehicle(body: object = validVehicle()): Promise<request.Response> {
    return attendant.post('/vehicles').send(body);
  }

  beforeAll(async () => {
    container
      .rebind<CustomerRepository>(TYPES.CustomerRepository)
      .toConstantValue(customerRepository);
    container.rebind<VehicleRepository>(TYPES.VehicleRepository).toConstantValue(vehicleRepository);

    app = createApp(container);

    attendant = request
      .agent(app)
      .set('Authorization', `Bearer ${await signToken(UserRole.ATTENDANT)}`);
    mechanicToken = await signToken(UserRole.MECHANIC);
    adminToken = await signToken(UserRole.ADMIN);
  });

  beforeEach(async () => {
    customerRepository.clear();
    vehicleRepository.clear();
    customerId = await createCustomer();
  });

  describe('POST /vehicles', () => {
    it('responde 201 com o veiculo criado e o header Location', async () => {
      const response = await createVehicle(validVehicle({ plate: 'abc-1d23' }));

      expect(response.status).toBe(201);
      expect(response.headers['location']).toBe(`/vehicles/${response.body.id}`);
      expect(response.body).toMatchObject({
        plate: 'ABC1D23',
        brand: 'Fiat',
        model: 'Argo',
        year: 2022,
        customerId,
      });
    });

    it('aceita placa no padrao antigo', async () => {
      const response = await createVehicle(validVehicle({ plate: 'ABC-1234' }));

      expect(response.status).toBe(201);
      expect(response.body.plate).toBe('ABC1234');
    });

    it.each(['ABC123', 'ABCD123', '', 'ABC-12@4'])(
      'responde 400 para placa invalida: "%s"',
      async (plate) => {
        const response = await createVehicle(validVehicle({ plate }));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      },
    );

    it.each([1899, new Date().getFullYear() + 2, 2022.5, '2022'])(
      'responde 400 para ano invalido: %s',
      async (year) => {
        const response = await createVehicle(validVehicle({ year }));

        expect(response.status).toBe(400);
      },
    );

    it('aceita o ano seguinte ao atual', async () => {
      const response = await createVehicle(validVehicle({ year: new Date().getFullYear() + 1 }));

      expect(response.status).toBe(201);
    });

    it('responde 400 para payload sem marca', async () => {
      const response = await createVehicle({ ...validVehicle(), brand: undefined });

      expect(response.status).toBe(400);
    });

    it('responde 400 para marca acima de 80 e modelo acima de 100 caracteres', async () => {
      const brand = await createVehicle(validVehicle({ brand: 'a'.repeat(81) }));
      const model = await createVehicle(validVehicle({ model: 'a'.repeat(101) }));

      expect(brand.status).toBe(400);
      expect(model.status).toBe(400);
    });

    it('responde 400 para customerId que nao e UUID', async () => {
      const response = await createVehicle(validVehicle({ customerId: 'nao-e-uuid' }));

      expect(response.status).toBe(400);
    });

    it('responde 404 para cliente inexistente', async () => {
      const response = await createVehicle(validVehicle({ customerId: UNKNOWN_ID }));

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('responde 409 para placa ja cadastrada, mesmo com mascara diferente', async () => {
      await createVehicle();

      const response = await createVehicle(validVehicle({ plate: 'abc-1d23' }));

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET /vehicles', () => {
    it('lista com paginacao padrao', async () => {
      await createVehicle();
      await createVehicle(validVehicle({ plate: 'DEF4567' }));

      const response = await attendant.get('/vehicles');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
      expect(response.body.items).toHaveLength(2);
    });

    it('respeita page e pageSize', async () => {
      await createVehicle();
      await createVehicle(validVehicle({ plate: 'DEF4567' }));

      const response = await attendant.get('/vehicles?page=2&pageSize=1');

      expect(response.body).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
      expect(response.body.items).toHaveLength(1);
    });

    it('filtra os veiculos por cliente', async () => {
      const otherCustomerId = await createCustomer({
        name: 'Empresa X',
        document: '11222333000181',
      });
      await createVehicle();
      await createVehicle(validVehicle({ plate: 'DEF4567', customerId: otherCustomerId }));

      const response = await attendant.get(`/vehicles?customerId=${otherCustomerId}`);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0]).toMatchObject({ plate: 'DEF4567' });
    });

    it.each(['page=0', 'pageSize=101', 'page=abc', 'customerId=nao-e-uuid'])(
      'responde 400 para %s',
      async (query) => {
        const response = await attendant.get(`/vehicles?${query}`);

        expect(response.status).toBe(400);
      },
    );
  });

  describe('GET /vehicles/plate/:plate', () => {
    it('identifica o veiculo pela placa, com ou sem mascara', async () => {
      const created = await createVehicle(validVehicle({ plate: 'ABC1234' }));

      const response = await attendant.get('/vehicles/plate/abc-1234');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.body.id);
    });

    it('responde 404 para placa valida sem cadastro', async () => {
      const response = await attendant.get('/vehicles/plate/ABC1D23');

      expect(response.status).toBe(404);
    });

    it('responde 400 para placa invalida', async () => {
      const response = await attendant.get('/vehicles/plate/123');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /vehicles/:id', () => {
    it('detalha o veiculo', async () => {
      const created = await createVehicle();

      const response = await attendant.get(`/vehicles/${created.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created.body);
    });

    it('responde 404 para veiculo inexistente', async () => {
      const response = await attendant.get(`/vehicles/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
    });

    it('responde 400 para id que nao e UUID', async () => {
      const response = await attendant.get('/vehicles/nao-e-uuid');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /vehicles/:id', () => {
    it('atualiza parcialmente mantendo os demais campos', async () => {
      const created = await createVehicle();

      const response = await attendant
        .patch(`/vehicles/${created.body.id}`)
        .send({ model: 'Pulse', year: 2024 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        model: 'Pulse',
        year: 2024,
        brand: 'Fiat',
        plate: 'ABC1D23',
      });
    });

    it('troca a placa mantendo o id', async () => {
      const created = await createVehicle();

      const response = await attendant
        .patch(`/vehicles/${created.body.id}`)
        .send({ plate: 'def-4567' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: created.body.id, plate: 'DEF4567' });
    });

    it('transfere o veiculo para outro cliente', async () => {
      const created = await createVehicle();
      const otherCustomerId = await createCustomer({
        name: 'Empresa X',
        document: '11222333000181',
      });

      const response = await attendant
        .patch(`/vehicles/${created.body.id}`)
        .send({ customerId: otherCustomerId });

      expect(response.status).toBe(200);
      expect(response.body.customerId).toBe(otherCustomerId);
    });

    it('responde 404 ao transferir para cliente inexistente', async () => {
      const created = await createVehicle();

      const response = await attendant
        .patch(`/vehicles/${created.body.id}`)
        .send({ customerId: UNKNOWN_ID });

      expect(response.status).toBe(404);
    });

    it('responde 409 ao trocar para placa de outro veiculo', async () => {
      const created = await createVehicle();
      await createVehicle(validVehicle({ plate: 'DEF4567' }));

      const response = await attendant
        .patch(`/vehicles/${created.body.id}`)
        .send({ plate: 'DEF-4567' });

      expect(response.status).toBe(409);
    });

    it('responde 400 para corpo vazio', async () => {
      const created = await createVehicle();

      const response = await attendant.patch(`/vehicles/${created.body.id}`).send({});

      expect(response.status).toBe(400);
    });

    it('responde 400 para placa invalida', async () => {
      const created = await createVehicle();

      const response = await attendant.patch(`/vehicles/${created.body.id}`).send({ plate: 'X' });

      expect(response.status).toBe(400);
    });

    it('responde 404 para veiculo inexistente', async () => {
      const response = await attendant.patch(`/vehicles/${UNKNOWN_ID}`).send({ brand: 'Fiat' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /vehicles/:id', () => {
    it('remove o veiculo e responde 204', async () => {
      const created = await createVehicle();

      const response = await request(app)
        .delete(`/vehicles/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const afterDelete = await attendant.get(`/vehicles/${created.body.id}`);

      expect(response.status).toBe(204);
      expect(afterDelete.status).toBe(404);
    });

    it('responde 404 para veiculo inexistente', async () => {
      const response = await request(app)
        .delete(`/vehicles/${UNKNOWN_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('responde 403 quando ATTENDANT tenta remover', async () => {
      const created = await createVehicle();

      const response = await attendant.delete(`/vehicles/${created.body.id}`);

      expect(response.status).toBe(403);
    });
  });

  describe('autenticacao', () => {
    it('responde 401 sem token', async () => {
      const response = await request(app).get('/vehicles');

      expect(response.status).toBe(401);
    });

    it('responde 401 com token invalido', async () => {
      const response = await request(app)
        .get('/vehicles')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(401);
    });

    it('responde 403 para usuario MECHANIC', async () => {
      const response = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(validVehicle());

      expect(response.status).toBe(403);
    });

    it('permite que ADMIN acesse as rotas de veiculos', async () => {
      const response = await request(app)
        .get('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
