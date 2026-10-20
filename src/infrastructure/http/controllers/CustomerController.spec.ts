import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { InMemoryCustomerRepository } from '../../../domain/test/mocks/InMemoryCustomerRepository.ts';
import { container } from '../../di/Container.ts';
import { createApp } from '../../server/app.ts';

const UNKNOWN_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

const validCustomer = {
  name: 'Joao da Silva',
  document: '529.982.247-25',
  email: 'joao@email.com',
  phone: '(11) 98765-4321',
};

describe('CustomerController', () => {
  const customerRepository = new InMemoryCustomerRepository();
  let app: Express;
  let attendant: TestAgent;
  let mechanicToken: string;
  let adminToken: string;

  async function signToken(role: UserRole): Promise<string> {
    const tokenProvider = container.get<TokenProvider>(TYPES.TokenProvider);
    const { accessToken } = await tokenProvider.sign({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
      email: `${role.toLowerCase()}@oficina.com`,
      role,
    });

    return accessToken;
  }

  beforeAll(async () => {
    container
      .rebind<CustomerRepository>(TYPES.CustomerRepository)
      .toConstantValue(customerRepository);

    app = createApp(container);

    attendant = request
      .agent(app)
      .set('Authorization', `Bearer ${await signToken(UserRole.ATTENDANT)}`);
    mechanicToken = await signToken(UserRole.MECHANIC);
    adminToken = await signToken(UserRole.ADMIN);
  });

  beforeEach(() => {
    customerRepository.clear();
  });

  async function createCustomer(body: object = validCustomer): Promise<request.Response> {
    return attendant.post('/customers').send(body);
  }

  describe('POST /customers', () => {
    it('responde 201 com o cliente criado e o header Location', async () => {
      const response = await createCustomer();

      expect(response.status).toBe(201);
      expect(response.headers['location']).toBe(`/customers/${response.body.id}`);
      expect(response.body).toMatchObject({
        name: 'Joao da Silva',
        document: '52998224725',
        documentType: 'CPF',
        email: 'joao@email.com',
        phone: '11987654321',
      });
    });

    it('aceita cliente sem e-mail e telefone', async () => {
      const response = await createCustomer({
        name: 'Oficina Parceira',
        document: '11222333000181',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ documentType: 'CNPJ', email: null, phone: null });
    });

    it('responde 400 para CPF invalido', async () => {
      const response = await createCustomer({ ...validCustomer, document: '123.456.789-00' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('responde 400 para payload sem nome', async () => {
      const response = await createCustomer({ document: validCustomer.document });

      expect(response.status).toBe(400);
    });

    it('responde 400 para telefone fora do padrao brasileiro', async () => {
      const response = await createCustomer({ ...validCustomer, phone: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('responde 400 para nome acima de 120 caracteres', async () => {
      const response = await createCustomer({ ...validCustomer, name: 'a'.repeat(121) });

      expect(response.status).toBe(400);
    });

    it('aceita nome com exatamente 120 caracteres', async () => {
      const response = await createCustomer({ ...validCustomer, name: 'a'.repeat(120) });

      expect(response.status).toBe(201);
    });

    it('responde 400 para e-mail acima de 254 caracteres', async () => {
      const email = `${'a'.repeat(250)}@email.com`;

      const response = await createCustomer({ ...validCustomer, email });

      expect(response.status).toBe(400);
    });

    it('normaliza e-mail e telefone recebidos', async () => {
      const response = await createCustomer({
        ...validCustomer,
        email: ' Joao@Email.COM ',
        phone: '+55 (11) 3333-4444',
      });

      expect(response.body).toMatchObject({ email: 'joao@email.com', phone: '1133334444' });
    });

    it('responde 409 para documento ja cadastrado, mesmo com mascara diferente', async () => {
      await createCustomer();

      const response = await createCustomer({ ...validCustomer, document: '52998224725' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET /customers', () => {
    it('lista com paginacao padrao', async () => {
      await createCustomer();
      await createCustomer({ name: 'Empresa X', document: '11222333000181' });

      const response = await attendant.get('/customers');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
      expect(response.body.items).toHaveLength(2);
    });

    it('respeita page e pageSize', async () => {
      await createCustomer();
      await createCustomer({ name: 'Empresa X', document: '11222333000181' });

      const response = await attendant.get('/customers?page=2&pageSize=1');

      expect(response.body).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
      expect(response.body.items).toHaveLength(1);
    });

    it.each(['page=0', 'pageSize=101', 'page=abc'])('responde 400 para %s', async (query) => {
      const response = await attendant.get(`/customers?${query}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /customers/document/:document', () => {
    it('identifica o cliente pelo CPF', async () => {
      const created = await createCustomer();

      const response = await attendant.get('/customers/document/52998224725');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.body.id);
    });

    it('responde 404 para documento valido sem cadastro', async () => {
      const response = await attendant.get('/customers/document/11222333000181');

      expect(response.status).toBe(404);
    });

    it('responde 400 para documento invalido', async () => {
      const response = await attendant.get('/customers/document/12345');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /customers/:id', () => {
    it('detalha o cliente', async () => {
      const created = await createCustomer();

      const response = await attendant.get(`/customers/${created.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created.body);
    });

    it('responde 404 para cliente inexistente', async () => {
      const response = await attendant.get(`/customers/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
    });

    it('responde 400 para id que nao e UUID', async () => {
      const response = await attendant.get('/customers/nao-e-uuid');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /customers/:id', () => {
    it('atualiza parcialmente e limpa campos com null', async () => {
      const created = await createCustomer();

      const response = await attendant
        .patch(`/customers/${created.body.id}`)
        .send({ name: 'Joao Atualizado', email: null });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Joao Atualizado',
        email: null,
        phone: '11987654321',
      });
    });

    it('responde 400 para corpo vazio', async () => {
      const created = await createCustomer();

      const response = await attendant.patch(`/customers/${created.body.id}`).send({});

      expect(response.status).toBe(400);
    });

    it('responde 409 ao trocar para documento de outro cliente', async () => {
      const created = await createCustomer();
      await createCustomer({ name: 'Empresa X', document: '11222333000181' });

      const response = await attendant
        .patch(`/customers/${created.body.id}`)
        .send({ document: '11.222.333/0001-81' });

      expect(response.status).toBe(409);
    });

    it('responde 404 para cliente inexistente', async () => {
      const response = await attendant.patch(`/customers/${UNKNOWN_ID}`).send({ name: 'X' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /customers/:id', () => {
    it('remove o cliente e responde 204', async () => {
      const created = await createCustomer();

      const response = await request(app)
        .delete(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const afterDelete = await attendant.get(`/customers/${created.body.id}`);

      expect(response.status).toBe(204);
      expect(afterDelete.status).toBe(404);
    });

    it('responde 404 para cliente inexistente', async () => {
      const response = await request(app)
        .delete(`/customers/${UNKNOWN_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('responde 403 quando ATTENDANT tenta remover', async () => {
      const created = await createCustomer();

      const response = await attendant.delete(`/customers/${created.body.id}`);

      expect(response.status).toBe(403);
    });
  });

  describe('autenticacao', () => {
    it('responde 401 sem token', async () => {
      const response = await request(app).get('/customers');

      expect(response.status).toBe(401);
    });

    it('responde 401 com token invalido', async () => {
      const response = await request(app)
        .get('/customers')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(401);
    });

    it('responde 403 para usuario MECHANIC', async () => {
      const response = await request(app)
        .post('/customers')
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(validCustomer);

      expect(response.status).toBe(403);
    });

    it('permite que ADMIN acesse as rotas de clientes', async () => {
      const response = await request(app)
        .get('/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
