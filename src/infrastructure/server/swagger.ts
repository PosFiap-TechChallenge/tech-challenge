import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { healthResponseSchema } from '../../application/dto/HealthDto.ts';
import { registerUserInputSchema } from '../../application/dto/inputs/RegisterUserInput.ts';
import { signInInputSchema } from '../../application/dto/inputs/SignInInput.ts';
import { authTokenOutputSchema } from '../../application/dto/outputs/AuthTokenOutput.ts';
import { userOutputSchema } from '../../application/dto/outputs/UserOutput.ts';

type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

const BEARER_AUTH = 'bearerAuth';

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

export function buildOpenApiDocument(): OpenApiDocument {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', BEARER_AUTH, {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  registerHealthPaths(registry);
  registerAuthPaths(registry);

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
