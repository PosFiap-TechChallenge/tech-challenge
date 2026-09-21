import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import { HealthController } from '../http/controllers/HealthController.ts';

export function configureControllers(container: Container): void {
  container.bind<HealthController>(TYPES.HealthController).to(HealthController).inSingletonScope();
}
