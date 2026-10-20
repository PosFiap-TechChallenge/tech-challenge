import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { createCustomerInputSchema } from '../../../application/dto/inputs/CreateCustomerInput.ts';
import {
  customerDocumentParamsSchema,
  customerIdParamsSchema,
} from '../../../application/dto/inputs/CustomerParams.ts';
import { listCustomersInputSchema } from '../../../application/dto/inputs/ListCustomersInput.ts';
import { updateCustomerInputSchema } from '../../../application/dto/inputs/UpdateCustomerInput.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { CreateCustomerUseCase } from '../../../application/use-cases/customers/CreateCustomerUseCase.ts';
import type { DeleteCustomerUseCase } from '../../../application/use-cases/customers/DeleteCustomerUseCase.ts';
import type { GetCustomerByDocumentUseCase } from '../../../application/use-cases/customers/GetCustomerByDocumentUseCase.ts';
import type { GetCustomerByIdUseCase } from '../../../application/use-cases/customers/GetCustomerByIdUseCase.ts';
import type { ListCustomersUseCase } from '../../../application/use-cases/customers/ListCustomersUseCase.ts';
import type { UpdateCustomerUseCase } from '../../../application/use-cases/customers/UpdateCustomerUseCase.ts';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';

function parseCustomerId(req: Request): CustomerId {
  return customerIdParamsSchema.parse(req.params).id as CustomerId;
}

@injectable()
@Auth(UserRole.ADMIN, UserRole.ATTENDANT)
export class CustomerController {
  constructor(
    @inject(TYPES.CreateCustomerUseCase)
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    @inject(TYPES.GetCustomerByIdUseCase)
    private readonly getCustomerByIdUseCase: GetCustomerByIdUseCase,
    @inject(TYPES.GetCustomerByDocumentUseCase)
    private readonly getCustomerByDocumentUseCase: GetCustomerByDocumentUseCase,
    @inject(TYPES.ListCustomersUseCase)
    private readonly listCustomersUseCase: ListCustomersUseCase,
    @inject(TYPES.UpdateCustomerUseCase)
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    @inject(TYPES.DeleteCustomerUseCase)
    private readonly deleteCustomerUseCase: DeleteCustomerUseCase,
  ) {}

  @Route('post', '/customers')
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = createCustomerInputSchema.parse(req.body);

    const output = await this.createCustomerUseCase.execute(input);

    res.status(201).location(`/customers/${output.id}`).json(output);
  }

  @Route('get', '/customers')
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = listCustomersInputSchema.parse(req.query);

    const output = await this.listCustomersUseCase.execute(input);

    res.status(200).json(output);
  }

  @Route('get', '/customers/document/:document')
  async getByDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { document } = customerDocumentParamsSchema.parse(req.params);

    const output = await this.getCustomerByDocumentUseCase.execute(document);

    res.status(200).json(output);
  }

  @Route('get', '/customers/:id')
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getCustomerByIdUseCase.execute(parseCustomerId(req));

    res.status(200).json(output);
  }

  @Route('patch', '/customers/:id')
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parseCustomerId(req);
    const input = updateCustomerInputSchema.parse(req.body);

    const output = await this.updateCustomerUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Auth(UserRole.ADMIN)
  @Route('delete', '/customers/:id')
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.deleteCustomerUseCase.execute(parseCustomerId(req));

    res.status(204).send();
  }
}
