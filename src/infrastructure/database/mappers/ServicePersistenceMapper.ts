import { Prisma, type Service as ServiceRecord } from '@prisma/client';
import { Service } from '../../../domain/aggregates/Service.ts';

/** `price` e NUMERIC no banco: chega como `Prisma.Decimal` e o dominio o revalida como `number`. */
export class ServicePersistenceMapper {
  static toDomain(record: ServiceRecord): Service {
    return Service.from({ ...record, price: record.price.toNumber() });
  }

  static toPersistence(service: Service): ServiceRecord {
    const data = service.toData();

    return { ...data, price: new Prisma.Decimal(data.price) };
  }
}
