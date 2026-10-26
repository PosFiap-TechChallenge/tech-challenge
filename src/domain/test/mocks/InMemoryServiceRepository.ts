import { Service, type ServiceId } from '../../aggregates/Service.ts';
import type {
  ServiceListQuery,
  ServicePage,
  ServiceRepository,
} from '../../repositories/ServiceRepository.ts';

function snapshot(service: Service): Service {
  return Service.from(service.toData());
}

/** Fake para testes HTTP: guarda copias para que mutacoes nao persistidas nao vazem. */
export class InMemoryServiceRepository implements ServiceRepository {
  private readonly services = new Map<string, Service>();

  async findById(id: ServiceId): Promise<Service | null> {
    const service = this.services.get(id);

    return service ? snapshot(service) : null;
  }

  async findByName(name: string): Promise<Service | null> {
    const service = [...this.services.values()].find((candidate) => candidate.name === name);

    return service ? snapshot(service) : null;
  }

  async list({ page, pageSize }: ServiceListQuery): Promise<ServicePage> {
    const ordered = [...this.services.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const start = (page - 1) * pageSize;

    return { items: ordered.slice(start, start + pageSize).map(snapshot), total: ordered.length };
  }

  async create(service: Service): Promise<void> {
    this.services.set(service.id, snapshot(service));
  }

  async update(service: Service): Promise<void> {
    this.services.set(service.id, snapshot(service));
  }

  async delete(id: ServiceId): Promise<void> {
    this.services.delete(id);
  }

  clear(): void {
    this.services.clear();
  }
}
