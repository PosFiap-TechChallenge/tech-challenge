import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import { AuthController } from '../http/controllers/AuthController.ts';
import { CustomerController } from '../http/controllers/CustomerController.ts';
import { HealthController } from '../http/controllers/HealthController.ts';
import { PartController } from '../http/controllers/PartController.ts';
import { VehicleController } from '../http/controllers/VehicleController.ts';

/**
 * Todo controller e ligado ao mesmo simbolo `TYPES.Controller`; o app resolve a
 * lista com `getAll` e registra as rotas declaradas via `@Route`/`@Auth`.
 */
export function configureControllers(container: Container): void {
  container.bind<object>(TYPES.Controller).to(HealthController).inSingletonScope();
  container.bind<object>(TYPES.Controller).to(AuthController).inSingletonScope();
  container.bind<object>(TYPES.Controller).to(CustomerController).inSingletonScope();
  container.bind<object>(TYPES.Controller).to(VehicleController).inSingletonScope();
  container.bind<object>(TYPES.Controller).to(PartController).inSingletonScope();
}
