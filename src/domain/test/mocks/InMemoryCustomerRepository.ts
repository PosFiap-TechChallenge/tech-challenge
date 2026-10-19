import { Customer, type CustomerId } from '../../aggregates/Customer.ts';
import type {
  CustomerListQuery,
  CustomerPage,
  CustomerRepository,
} from '../../repositories/CustomerRepository.ts';
import type { TaxDocument } from '../../value-objects/TaxDocument.ts';

function snapshot(customer: Customer): Customer {
  return Customer.from({
    id: customer.id,
    name: customer.name,
    document: customer.document.value,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  });
}

/** Fake para testes HTTP: guarda copias para que mutacoes nao persistidas nao vazem. */
export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, Customer>();

  async findById(id: CustomerId): Promise<Customer | null> {
    const customer = this.customers.get(id);

    return customer ? snapshot(customer) : null;
  }

  async findByDocument(document: TaxDocument): Promise<Customer | null> {
    const customer = [...this.customers.values()].find((candidate) =>
      candidate.document.equals(document),
    );

    return customer ? snapshot(customer) : null;
  }

  async list({ page, pageSize }: CustomerListQuery): Promise<CustomerPage> {
    const ordered = [...this.customers.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const start = (page - 1) * pageSize;

    return { items: ordered.slice(start, start + pageSize).map(snapshot), total: ordered.length };
  }

  async create(customer: Customer): Promise<void> {
    this.customers.set(customer.id, snapshot(customer));
  }

  async update(customer: Customer): Promise<void> {
    this.customers.set(customer.id, snapshot(customer));
  }

  async delete(id: CustomerId): Promise<void> {
    this.customers.delete(id);
  }

  clear(): void {
    this.customers.clear();
  }
}
