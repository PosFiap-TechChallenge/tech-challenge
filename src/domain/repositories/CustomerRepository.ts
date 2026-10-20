import type { Customer, CustomerId } from '../aggregates/Customer.ts';
import type { TaxDocument } from '../value-objects/TaxDocument.ts';

export type CustomerListQuery = {
  page: number;
  pageSize: number;
};

export type CustomerPage = {
  items: Customer[];
  total: number;
};

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
  findByDocument(document: TaxDocument): Promise<Customer | null>;
  list(query: CustomerListQuery): Promise<CustomerPage>;
  create(customer: Customer): Promise<void>;
  update(customer: Customer): Promise<void>;
  delete(id: CustomerId): Promise<void>;
}
