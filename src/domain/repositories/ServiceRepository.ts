import type { Service, ServiceId } from '../aggregates/Service.ts';

export type ServiceListQuery = {
  page: number;
  pageSize: number;
};

export type ServicePage = {
  items: Service[];
  total: number;
};

export interface ServiceRepository {
  findById(id: ServiceId): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  list(query: ServiceListQuery): Promise<ServicePage>;
  create(service: Service): Promise<void>;
  update(service: Service): Promise<void>;
  delete(id: ServiceId): Promise<void>;
}
