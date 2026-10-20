import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { healthResponseSchema } from '../../application/dto/HealthDto.ts';
import { registerUserInputSchema } from '../../application/dto/inputs/RegisterUserInput.ts';
import { signInInputSchema } from '../../application/dto/inputs/SignInInput.ts';
import { authTokenOutputSchema } from '../../application/dto/outputs/AuthTokenOutput.ts';
import { userOutputSchema } from '../../application/dto/outputs/UserOutput.ts';
import { createCustomerInputSchema } from '../../application/dto/inputs/CreateCustomerInput.ts';
import {
  customerDocumentParamsSchema,
  customerIdParamsSchema,
} from '../../application/dto/inputs/CustomerParams.ts';
import { listCustomersInputSchema } from '../../application/dto/inputs/ListCustomersInput.ts';
import { updateCustomerInputSchema } from '../../application/dto/inputs/UpdateCustomerInput.ts';
import {
  customerOutputSchema,
  customerPageOutputSchema,
} from '../../application/dto/outputs/CustomerOutput.ts';

type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

const BEARER_AUTH = 'bearerAuth';
const CUSTOMERS_TAG = 'Customers';

function registerHealthPaths(registry: OpenAPIRegistry): void {
  const healthResponse = registry.register('HealthResponse', healthResponseSchema);

  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Verifica a disponibilidade da API',
    description: 'Nao depende do banco de dados: responde mesmo com o PostgreSQL indisponivel.',
    responses: {
      200: {
        description: 'API disponivel',
        content: { 'application/json': { schema: healthResponse } },
      },
    },
  });
}

function registerAuthPaths(registry: OpenAPIRegistry): void {
  const signInInput = registry.register('SignInInput', signInInputSchema);
  const registerUserInput = registry.register('RegisterUserInput', registerUserInputSchema);
  const authTokenOutput = registry.register('AuthTokenOutput', authTokenOutputSchema);
  const userOutput = registry.register('UserOutput', userOutputSchema);

  registry.registerPath({
    method: 'post',
    path: '/auth/sign-in',
    tags: ['Auth'],
    summary: 'Autentica com e-mail e senha e retorna um JWT',
    request: { body: { content: { 'application/json': { schema: signInInput } } } },
    responses: {
      200: {
        description: 'Autenticado',
        content: { 'application/json': { schema: authTokenOutput } },
      },
      400: { description: 'Payload invalido' },
      401: { description: 'E-mail ou senha invalidos' },
      403: { description: 'Usuario inativo' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['Auth'],
    summary: 'Cadastra um usuario interno (somente ADMIN)',
    security: [{ [BEARER_AUTH]: [] }],
    request: { body: { content: { 'application/json': { schema: registerUserInput } } } },
    responses: {
      201: {
        description: 'Usuario criado',
        content: { 'application/json': { schema: userOutput } },
      },
      400: { description: 'Payload invalido' },
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      409: { description: 'E-mail ja cadastrado' },
      422: { description: 'Regra de dominio violada (ex.: senha fraca)' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['Auth'],
    summary: 'Retorna o usuario autenticado',
    security: [{ [BEARER_AUTH]: [] }],
    responses: {
      200: {
        description: 'Usuario autenticado',
        content: { 'application/json': { schema: userOutput } },
      },
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario inativo' },
    },
  });
}

function registerCustomerPaths(registry: OpenAPIRegistry): void {
  const createCustomerInput = registry.register('CreateCustomerInput', createCustomerInputSchema);
  const updateCustomerInput = registry.register('UpdateCustomerInput', updateCustomerInputSchema);
  const customerOutput = registry.register('CustomerOutput', customerOutputSchema);
  const customerPageOutput = registry.register('CustomerPageOutput', customerPageOutputSchema);

  const customerResponse = { 'application/json': { schema: customerOutput } };

  registry.registerPath({
    method: 'post',
    path: '/customers',
    tags: [CUSTOMERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Cadastra um cliente',
    request: { body: { content: { 'application/json': { schema: createCustomerInput } } } },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      201: { description: 'Cliente cadastrado', content: customerResponse },
      400: { description: 'Payload invalido (inclui CPF/CNPJ invalido)' },
      409: { description: 'CPF/CNPJ ja cadastrado' },
      422: { description: 'Regra de dominio violada (ex.: telefone invalido)' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/customers',
    tags: [CUSTOMERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Lista clientes paginados, do mais recente para o mais antigo',
    request: { query: listCustomersInputSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: {
        description: 'Pagina de clientes',
        content: { 'application/json': { schema: customerPageOutput } },
      },
      400: { description: 'Parametros de paginacao invalidos' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/customers/document/{document}',
    tags: [CUSTOMERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Identifica o cliente pelo CPF ou CNPJ',
    request: { params: customerDocumentParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: { description: 'Cliente encontrado', content: customerResponse },
      400: { description: 'CPF/CNPJ invalido' },
      404: { description: 'Cliente nao encontrado' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/customers/{id}',
    tags: [CUSTOMERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Detalha um cliente',
    request: { params: customerIdParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: { description: 'Cliente encontrado', content: customerResponse },
      400: { description: 'Id invalido' },
      404: { description: 'Cliente nao encontrado' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/customers/{id}',
    tags: [CUSTOMERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Atualiza parcialmente um cliente',
    request: {
      params: customerIdParamsSchema,
      body: { content: { 'application/json': { schema: updateCustomerInput } } },
    },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: { description: 'Cliente atualizado', content: customerResponse },
      400: { description: 'Payload invalido ou vazio' },
      404: { description: 'Cliente nao encontrado' },
      409: { description: 'CPF/CNPJ pertence a outro cliente' },
      422: { description: 'Regra de dominio violada' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/customers/{id}',
    tags: [CUSTOMERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Remove um cliente (somente ADMIN)',
    request: { params: customerIdParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      204: { description: 'Cliente removido' },
      400: { description: 'Id invalido' },
      404: { description: 'Cliente nao encontrado' },
    },
  });
}

export function buildOpenApiDocument(): OpenApiDocument {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', BEARER_AUTH, {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  registerHealthPaths(registry);
  registerAuthPaths(registry);
  registerCustomerPaths(registry);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'TechChallenge API',
      version: '1.0.0',
      description: 'API REST de estudo em Node.js, TypeScript, Express, Prisma, Zod e InversifyJS.',
    },
    servers: [{ url: '/' }],
  });
}
