import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { createServiceOrderInputSchema } from '../../application/dto/inputs/CreateServiceOrderInput.ts';
import { listServiceOrdersInputSchema } from '../../application/dto/inputs/ListServiceOrdersInput.ts';
import {
  addOrderPartInputSchema,
  addOrderServiceInputSchema,
} from '../../application/dto/inputs/ServiceOrderItemInputs.ts';
import {
  serviceOrderIdParamsSchema,
  serviceOrderItemParamsSchema,
} from '../../application/dto/inputs/ServiceOrderParams.ts';
import { trackServiceOrderQuerySchema } from '../../application/dto/inputs/TrackServiceOrderInput.ts';
import { executionTimeOutputSchema } from '../../application/dto/outputs/ExecutionTimeOutput.ts';
import {
  serviceOrderOutputSchema,
  serviceOrderPageOutputSchema,
} from '../../application/dto/outputs/ServiceOrderOutput.ts';
import { trackingOutputSchema } from '../../application/dto/outputs/TrackingOutput.ts';
import { BEARER_AUTH } from './swagger.ts';

const ORDERS_TAG = 'Service Orders';
const TRACKING_TAG = 'Tracking';
const REPORTS_TAG = 'Reports';

const unauthorized = { description: 'Token ausente, invalido ou expirado' };
const notFound = { description: 'Ordem de Servico nao encontrada' };
const invalidTransition = {
  description: 'Regra de dominio violada (ex.: transicao de status invalida, OS nao editavel)',
};

type OrderCommand = {
  path: string;
  summary: string;
  forbidden: string;
};

function registerOrderCommands(registry: OpenAPIRegistry, order: object): void {
  const commands: OrderCommand[] = [
    {
      path: '/service-orders/{id}/diagnosis',
      summary: 'Inicia o diagnostico: Recebida -> Em diagnostico',
      forbidden: 'Usuario sem papel ADMIN ou MECHANIC',
    },
    {
      path: '/service-orders/{id}/budget/send',
      summary:
        'Gera o orcamento automaticamente (servicos + pecas) e o envia ao cliente: Em diagnostico -> Aguardando aprovacao. Exige ao menos um servico',
      forbidden: 'Usuario sem papel ADMIN ou ATTENDANT',
    },
    {
      path: '/service-orders/{id}/budget/approve',
      summary:
        'Registra a aprovacao do orcamento: inicia a execucao (Aguardando aprovacao -> Em execucao) e reserva as pecas, tudo ou nada na mesma transacao. Sem saldo disponivel, nada muda (422 INSUFFICIENT_STOCK)',
      forbidden: 'Usuario sem papel ADMIN ou ATTENDANT',
    },
    {
      path: '/service-orders/{id}/budget/reject',
      summary:
        'Registra a rejeicao do orcamento: a OS volta a Em diagnostico para revisar servicos e pecas e enviar novo orcamento',
      forbidden: 'Usuario sem papel ADMIN ou ATTENDANT',
    },
    {
      path: '/service-orders/{id}/finish',
      summary:
        'Finaliza o servico: Em execucao -> Finalizada e consome as pecas reservadas, tudo ou nada na mesma transacao',
      forbidden: 'Usuario sem papel ADMIN ou MECHANIC',
    },
    {
      path: '/service-orders/{id}/deliver',
      summary: 'Entrega o veiculo: Finalizada -> Entregue',
      forbidden: 'Usuario sem papel ADMIN ou ATTENDANT',
    },
  ];

  for (const { path, summary, forbidden } of commands) {
    registry.registerPath({
      method: 'post',
      path,
      tags: [ORDERS_TAG],
      security: [{ [BEARER_AUTH]: [] }],
      summary,
      request: { params: serviceOrderIdParamsSchema },
      responses: {
        401: unauthorized,
        403: { description: forbidden },
        200: { description: 'OS atualizada', content: { 'application/json': { schema: order } } },
        400: { description: 'Id invalido' },
        404: notFound,
        422: invalidTransition,
      },
    });
  }
}

function registerOrderItems(registry: OpenAPIRegistry, order: object): void {
  const addServiceInput = registry.register('AddOrderServiceInput', addOrderServiceInputSchema);
  const addPartInput = registry.register('AddOrderPartInput', addOrderPartInputSchema);
  const orderResponse = { 'application/json': { schema: order } };

  registry.registerPath({
    method: 'post',
    path: '/service-orders/{id}/services',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary:
      'Inclui um servico do catalogo; nome, preco e tempo estimado ficam congelados na inclusao. So antes do envio do orcamento',
    request: {
      params: serviceOrderIdParamsSchema,
      body: { content: { 'application/json': { schema: addServiceInput } } },
    },
    responses: {
      401: unauthorized,
      201: { description: 'OS com o servico incluido', content: orderResponse },
      400: { description: 'Payload ou id invalido' },
      404: { description: 'OS ou servico nao encontrado' },
      422: invalidTransition,
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/service-orders/{id}/services/{itemId}',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Remove um item de servico da OS (so antes do envio do orcamento)',
    request: { params: serviceOrderItemParamsSchema },
    responses: {
      401: unauthorized,
      200: { description: 'OS sem o servico', content: orderResponse },
      400: { description: 'Id invalido' },
      404: notFound,
      422: invalidTransition,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/service-orders/{id}/parts',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary:
      'Inclui peca ou insumo, apos conferir o estoque disponivel (nao reserva). Peca ja presente tem a quantidade somada; o preco unitario fica congelado na primeira inclusao',
    request: {
      params: serviceOrderIdParamsSchema,
      body: { content: { 'application/json': { schema: addPartInput } } },
    },
    responses: {
      401: unauthorized,
      201: { description: 'OS com a peca incluida', content: orderResponse },
      400: { description: 'Payload ou id invalido' },
      404: { description: 'OS ou peca nao encontrada' },
      422: { description: 'Estoque insuficiente, quantidade invalida ou OS nao editavel' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/service-orders/{id}/parts/{itemId}',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Remove um item de peca da OS (so antes do envio do orcamento)',
    request: { params: serviceOrderItemParamsSchema },
    responses: {
      401: unauthorized,
      200: { description: 'OS sem a peca', content: orderResponse },
      400: { description: 'Id invalido' },
      404: notFound,
      422: invalidTransition,
    },
  });
}

function registerOrderBasics(registry: OpenAPIRegistry, order: object): void {
  const createInput = registry.register('CreateServiceOrderInput', createServiceOrderInputSchema);
  const page = registry.register('ServiceOrderPageOutput', serviceOrderPageOutputSchema);
  const orderResponse = { 'application/json': { schema: order } };

  registry.registerPath({
    method: 'post',
    path: '/service-orders',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary:
      'Abre a OS (status Recebida). Identifica o cliente por CPF/CNPJ e o veiculo pela placa; veiculo novo e cadastrado na mesma transacao',
    request: { body: { content: { 'application/json': { schema: createInput } } } },
    responses: {
      401: unauthorized,
      403: { description: 'Usuario sem papel ADMIN ou ATTENDANT' },
      201: { description: 'OS aberta', content: orderResponse },
      400: {
        description: 'Payload invalido, CPF/CNPJ ou placa invalidos, ou veiculo novo sem dados',
      },
      404: { description: 'Cliente nao encontrado' },
      422: { description: 'Veiculo pertence a outro cliente' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/service-orders',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Lista as OS com paginacao e filtros por status e cliente',
    request: { query: listServiceOrdersInputSchema },
    responses: {
      401: unauthorized,
      200: { description: 'Pagina de OS', content: { 'application/json': { schema: page } } },
      400: { description: 'Parametros invalidos' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/service-orders/{id}',
    tags: [ORDERS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary: 'Detalha a OS: itens, orcamento, total e historico de status',
    request: { params: serviceOrderIdParamsSchema },
    responses: {
      401: unauthorized,
      200: { description: 'OS encontrada', content: orderResponse },
      400: { description: 'Id invalido' },
      404: notFound,
    },
  });
}

function registerTrackingAndReports(registry: OpenAPIRegistry): void {
  const tracking = registry.register('TrackingOutput', trackingOutputSchema);
  const executionTime = registry.register('ExecutionTimeOutput', executionTimeOutputSchema);

  registry.registerPath({
    method: 'get',
    path: '/tracking/{id}',
    tags: [TRACKING_TAG],
    summary:
      'Acompanhamento pelo cliente, sem login: informe o id da OS e o CPF/CNPJ do dono. Mostra status, itens, orcamento e linha do tempo',
    request: { params: serviceOrderIdParamsSchema, query: trackServiceOrderQuerySchema },
    responses: {
      200: {
        description: 'Andamento da OS',
        content: { 'application/json': { schema: tracking } },
      },
      400: { description: 'Id ou documento invalido' },
      404: { description: 'OS nao encontrada para este documento' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/reports/execution-time',
    tags: [REPORTS_TAG],
    security: [{ [BEARER_AUTH]: [] }],
    summary:
      'Tempo medio de execucao dos servicos concluidos (inicio ate conclusao), geral e por servico',
    responses: {
      401: unauthorized,
      403: { description: 'Usuario sem papel ADMIN' },
      200: {
        description: 'Tempo medio em minutos',
        content: { 'application/json': { schema: executionTime } },
      },
    },
  });
}

export function registerServiceOrderPaths(registry: OpenAPIRegistry): void {
  const order = registry.register('ServiceOrderOutput', serviceOrderOutputSchema);

  registerOrderBasics(registry, order);
  registerOrderItems(registry, order);
  registerOrderCommands(registry, order);
  registerTrackingAndReports(registry);
}
