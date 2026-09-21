import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { healthResponseSchema } from '../../application/dto/HealthDto.ts';

type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

export function buildOpenApiDocument(): OpenApiDocument {
  const registry = new OpenAPIRegistry();

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
