import { Customer, type CustomerPrimitives } from '../../aggregates/Customer.ts';

export const CUSTOMER_ID = '0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d';

export function makeCustomer(overrides: Partial<CustomerPrimitives> = {}): Customer {
  return Customer.from({
    id: CUSTOMER_ID,
    name: 'Joao da Silva',
    document: '52998224725',
    email: 'joao@email.com',
    phone: '11987654321',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
