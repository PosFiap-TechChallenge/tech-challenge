import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import type { PartRepository } from '../../domain/repositories/PartRepository.ts';
import type { CustomerRepository } from '../../domain/repositories/CustomerRepository.ts';
import type { ServiceRepository } from '../../domain/repositories/ServiceRepository.ts';
import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import type { VehicleRepository } from '../../domain/repositories/VehicleRepository.ts';
import { PrismaCustomerRepository } from '../database/repositories/PrismaCustomerRepository.ts';
import { PrismaPartRepository } from '../database/repositories/PrismaPartRepository.ts';
import { PrismaServiceRepository } from '../database/repositories/PrismaServiceRepository.ts';
import { PrismaUserRepository } from '../database/repositories/PrismaUserRepository.ts';
import { PrismaVehicleRepository } from '../database/repositories/PrismaVehicleRepository.ts';

export function configureRepositories(container: Container): void {
  container.bind<UserRepository>(TYPES.UserRepository).to(PrismaUserRepository).inTransientScope();
  container
    .bind<CustomerRepository>(TYPES.CustomerRepository)
    .to(PrismaCustomerRepository)
    .inTransientScope();
  container
    .bind<VehicleRepository>(TYPES.VehicleRepository)
    .to(PrismaVehicleRepository)
    .inTransientScope();
  container.bind<PartRepository>(TYPES.PartRepository).to(PrismaPartRepository).inTransientScope();
  container
    .bind<ServiceRepository>(TYPES.ServiceRepository)
    .to(PrismaServiceRepository)
    .inTransientScope();
}
