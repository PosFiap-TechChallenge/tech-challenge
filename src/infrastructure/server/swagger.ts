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
import { createVehicleInputSchema } from '../../application/dto/inputs/CreateVehicleInput.ts';
import { listVehiclesInputSchema } from '../../application/dto/inputs/ListVehiclesInput.ts';
import { updateVehicleInputSchema } from '../../application/dto/inputs/UpdateVehicleInput.ts';
import {
  vehicleIdParamsSchema,
  vehiclePlateParamsSchema,
} from '../../application/dto/inputs/VehicleParams.ts';
import {
  vehicleOutputSchema,
  vehiclePageOutputSchema,
} from '../../application/dto/outputs/VehicleOutput.ts';
import { adjustStockInputSchema } from '../../application/dto/inputs/AdjustStockInput.ts';
import { createPartInputSchema } from '../../application/dto/inputs/CreatePartInput.ts';
import { listPartsInputSchema } from '../../application/dto/inputs/ListPartsInput.ts';
import { listStockMovementsInputSchema } from '../../application/dto/inputs/ListStockMovementsInput.ts';
import { partIdParamsSchema } from '../../application/dto/inputs/PartParams.ts';
import { updatePartInputSchema } from '../../application/dto/inputs/UpdatePartInput.ts';
import { registerStockEntryInputSchema } from '../../application/dto/inputs/RegisterStockEntryInput.ts';
import {
  partOutputSchema,
  partPageOutputSchema,
  stockMovementOutputSchema,
  stockMovementPageOutputSchema,
} from '../../application/dto/outputs/PartOutput.ts';

type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

const BEARER_AUTH = 'bearerAuth';
const CUSTOMERS_TAG = 'Customers';
const VEHICLES_TAG = 'Vehicles';
const PARTS_TAG = 'Parts';

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
      409: { description: 'Cliente possui veiculos vinculados' },
    },
  });
}

function registerVehiclePaths(registry: OpenAPIRegistry): void {
  const createVehicleInput = registry.register('CreateVehicleInput', createVehicleInputSchema);
  const updateVehicleInput = registry.register('UpdateVehicleInput', updateVehicleInputSchema);
  const vehicleOutput = registry.register('VehicleOutput', vehicleOutputSchema);
  const vehiclePageOutput = registry.register('VehiclePageOutput', vehiclePageOutputSchema);

  const vehicleResponse = { 'application/json': { schema: vehicleOutput } };

  registry.registerPath({
    method: 'post',
    path: '/vehicles',
    tags: [VEHICLES_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Cadastra um veiculo vinculado a um cliente',
    request: { body: { content: { 'application/json': { schema: createVehicleInput } } } },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      201: { description: 'Veiculo cadastrado', content: vehicleResponse },
      400: { description: 'Payload invalido (inclui placa ou ano invalido)' },
      404: { description: 'Cliente nao encontrado' },
      409: { description: 'Placa ja cadastrada' },
      422: { description: 'Regra de dominio violada' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/vehicles',
    tags: [VEHICLES_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Lista veiculos paginados, do mais recente para o mais antigo',
    request: { query: listVehiclesInputSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: {
        description: 'Pagina de veiculos',
        content: { 'application/json': { schema: vehiclePageOutput } },
      },
      400: { description: 'Parametros de paginacao ou filtro invalidos' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/vehicles/plate/{plate}',
    tags: [VEHICLES_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Identifica o veiculo pela placa',
    request: { params: vehiclePlateParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: { description: 'Veiculo encontrado', content: vehicleResponse },
      400: { description: 'Placa invalida' },
      404: { description: 'Veiculo nao encontrado' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/vehicles/{id}',
    tags: [VEHICLES_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Detalha um veiculo',
    request: { params: vehicleIdParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: { description: 'Veiculo encontrado', content: vehicleResponse },
      400: { description: 'Id invalido' },
      404: { description: 'Veiculo nao encontrado' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/vehicles/{id}',
    tags: [VEHICLES_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Atualiza parcialmente um veiculo (inclui troca de placa e de proprietario)',
    request: {
      params: vehicleIdParamsSchema,
      body: { content: { 'application/json': { schema: updateVehicleInput } } },
    },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      200: { description: 'Veiculo atualizado', content: vehicleResponse },
      400: { description: 'Payload invalido ou vazio' },
      404: { description: 'Veiculo ou novo cliente nao encontrado' },
      409: { description: 'Placa pertence a outro veiculo' },
      422: { description: 'Regra de dominio violada' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/vehicles/{id}',
    tags: [VEHICLES_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Remove um veiculo (somente ADMIN)',
    request: { params: vehicleIdParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      204: { description: 'Veiculo removido' },
      400: { description: 'Id invalido' },
      404: { description: 'Veiculo nao encontrado' },
    },
  });
}

function registerPartPaths(registry: OpenAPIRegistry): void {
  const createPartInput = registry.register('CreatePartInput', createPartInputSchema);
  const registerStockEntryInput = registry.register(
    'RegisterStockEntryInput',
    registerStockEntryInputSchema,
  );
  const adjustStockInput = registry.register('AdjustStockInput', adjustStockInputSchema);
  const updatePartInput = registry.register('UpdatePartInput', updatePartInputSchema);
  const partOutput = registry.register('PartOutput', partOutputSchema);
  const partPageOutput = registry.register('PartPageOutput', partPageOutputSchema);
  registry.register('StockMovementOutput', stockMovementOutputSchema);
  const stockMovementPageOutput = registry.register(
    'StockMovementPageOutput',
    stockMovementPageOutputSchema,
  );

  const partResponse = { 'application/json': { schema: partOutput } };

  registry.registerPath({
    method: 'post',
    path: '/parts',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Cadastra uma peca com o estoque inicial (somente ADMIN)',
    request: { body: { content: { 'application/json': { schema: createPartInput } } } },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      201: { description: 'Peca cadastrada e estoque inicial registrado', content: partResponse },
      400: { description: 'Payload invalido' },
      409: { description: 'Codigo ja cadastrado' },
      422: { description: 'Regra de dominio violada' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/parts',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Lista pecas paginadas com seus saldos, da mais recente para a mais antiga',
    request: { query: listPartsInputSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      200: {
        description: 'Pagina de pecas',
        content: { 'application/json': { schema: partPageOutput } },
      },
      400: { description: 'Parametros de paginacao ou filtro invalidos' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/parts/{id}',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Detalha uma peca e seus saldos',
    request: { params: partIdParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      200: { description: 'Peca encontrada', content: partResponse },
      400: { description: 'Id invalido' },
      404: { description: 'Peca nao encontrada' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/parts/{id}/movements',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Lista o historico de movimentacoes de estoque da peca',
    request: { params: partIdParamsSchema, query: listStockMovementsInputSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      200: {
        description: 'Pagina de movimentacoes, da mais recente para a mais antiga',
        content: { 'application/json': { schema: stockMovementPageOutput } },
      },
      400: { description: 'Id ou paginacao invalidos' },
      404: { description: 'Peca nao encontrada' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/parts/{id}/entries',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Registra entrada de pecas no estoque (somente ADMIN)',
    request: {
      params: partIdParamsSchema,
      body: { content: { 'application/json': { schema: registerStockEntryInput } } },
    },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      200: { description: 'Entrada registrada', content: partResponse },
      400: { description: 'Payload invalido' },
      404: { description: 'Peca nao encontrada' },
      409: { description: 'Peca alterada por operacoes simultaneas (apos retentativas)' },
      422: { description: 'Regra de dominio violada (ex.: saldo acima do limite)' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/parts/{id}/adjustments',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Ajusta manualmente o saldo fisico para a quantidade contada (somente ADMIN)',
    request: {
      params: partIdParamsSchema,
      body: { content: { 'application/json': { schema: adjustStockInput } } },
    },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      200: { description: 'Ajuste registrado', content: partResponse },
      400: { description: 'Payload invalido' },
      404: { description: 'Peca nao encontrada' },
      409: { description: 'Saldo alterado desde a leitura; reconte e ajuste novamente' },
      422: { description: 'Ajuste igual ao saldo atual ou abaixo do reservado' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/parts/{id}',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Edita codigo, nome ou estoque minimo (somente ADMIN); saldos nao mudam',
    request: {
      params: partIdParamsSchema,
      body: { content: { 'application/json': { schema: updatePartInput } } },
    },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      200: { description: 'Peca atualizada', content: partResponse },
      400: { description: 'Payload invalido ou vazio' },
      404: { description: 'Peca nao encontrada' },
      409: { description: 'Codigo pertence a outra peca' },
      422: { description: 'Regra de dominio violada' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/parts/{id}',
    tags: [PARTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Remove uma peca cadastrada por engano (somente ADMIN)',
    description:
      'So e permitido enquanto a peca tiver apenas o estoque inicial; com qualquer outra movimentacao responde 409.',
    request: { params: partIdParamsSchema },
    responses: {
      401: { description: 'Token ausente, invalido ou expirado' },
      403: { description: 'Usuario sem papel ADMIN' },
      204: { description: 'Peca removida' },
      400: { description: 'Id invalido' },
      404: { description: 'Peca nao encontrada' },
      409: { description: 'Peca possui movimentacoes de estoque' },
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
  registerVehiclePaths(registry);
  registerPartPaths(registry);

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
