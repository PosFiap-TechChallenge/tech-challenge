import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import { GetAuthenticatedUserUseCase } from '../../application/use-cases/auth/GetAuthenticatedUserUseCase.ts';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase.ts';
import { SignInUseCase } from '../../application/use-cases/auth/SignInUseCase.ts';
import { CreateCustomerUseCase } from '../../application/use-cases/customers/CreateCustomerUseCase.ts';
import { DeleteCustomerUseCase } from '../../application/use-cases/customers/DeleteCustomerUseCase.ts';
import { GetCustomerByDocumentUseCase } from '../../application/use-cases/customers/GetCustomerByDocumentUseCase.ts';
import { GetCustomerByIdUseCase } from '../../application/use-cases/customers/GetCustomerByIdUseCase.ts';
import { ListCustomersUseCase } from '../../application/use-cases/customers/ListCustomersUseCase.ts';
import { UpdateCustomerUseCase } from '../../application/use-cases/customers/UpdateCustomerUseCase.ts';
import { GetHealthUseCase } from '../../application/use-cases/GetHealthUseCase.ts';
import { CreateVehicleUseCase } from '../../application/use-cases/vehicles/CreateVehicleUseCase.ts';
import { DeleteVehicleUseCase } from '../../application/use-cases/vehicles/DeleteVehicleUseCase.ts';
import { GetVehicleByIdUseCase } from '../../application/use-cases/vehicles/GetVehicleByIdUseCase.ts';
import { GetVehicleByPlateUseCase } from '../../application/use-cases/vehicles/GetVehicleByPlateUseCase.ts';
import { ListVehiclesUseCase } from '../../application/use-cases/vehicles/ListVehiclesUseCase.ts';
import { UpdateVehicleUseCase } from '../../application/use-cases/vehicles/UpdateVehicleUseCase.ts';

export function configureUseCases(container: Container): void {
  container.bind<GetHealthUseCase>(TYPES.GetHealthUseCase).to(GetHealthUseCase).inTransientScope();
  container.bind<SignInUseCase>(TYPES.SignInUseCase).to(SignInUseCase).inTransientScope();
  container
    .bind<RegisterUserUseCase>(TYPES.RegisterUserUseCase)
    .to(RegisterUserUseCase)
    .inTransientScope();
  container
    .bind<GetAuthenticatedUserUseCase>(TYPES.GetAuthenticatedUserUseCase)
    .to(GetAuthenticatedUserUseCase)
    .inTransientScope();

  container
    .bind<CreateCustomerUseCase>(TYPES.CreateCustomerUseCase)
    .to(CreateCustomerUseCase)
    .inTransientScope();
  container
    .bind<GetCustomerByIdUseCase>(TYPES.GetCustomerByIdUseCase)
    .to(GetCustomerByIdUseCase)
    .inTransientScope();
  container
    .bind<GetCustomerByDocumentUseCase>(TYPES.GetCustomerByDocumentUseCase)
    .to(GetCustomerByDocumentUseCase)
    .inTransientScope();
  container
    .bind<ListCustomersUseCase>(TYPES.ListCustomersUseCase)
    .to(ListCustomersUseCase)
    .inTransientScope();
  container
    .bind<UpdateCustomerUseCase>(TYPES.UpdateCustomerUseCase)
    .to(UpdateCustomerUseCase)
    .inTransientScope();
  container
    .bind<DeleteCustomerUseCase>(TYPES.DeleteCustomerUseCase)
    .to(DeleteCustomerUseCase)
    .inTransientScope();
  container
    .bind<CreateVehicleUseCase>(TYPES.CreateVehicleUseCase)
    .to(CreateVehicleUseCase)
    .inTransientScope();
  container
    .bind<GetVehicleByIdUseCase>(TYPES.GetVehicleByIdUseCase)
    .to(GetVehicleByIdUseCase)
    .inTransientScope();
  container
    .bind<GetVehicleByPlateUseCase>(TYPES.GetVehicleByPlateUseCase)
    .to(GetVehicleByPlateUseCase)
    .inTransientScope();
  container
    .bind<ListVehiclesUseCase>(TYPES.ListVehiclesUseCase)
    .to(ListVehiclesUseCase)
    .inTransientScope();
  container
    .bind<UpdateVehicleUseCase>(TYPES.UpdateVehicleUseCase)
    .to(UpdateVehicleUseCase)
    .inTransientScope();
  container
    .bind<DeleteVehicleUseCase>(TYPES.DeleteVehicleUseCase)
    .to(DeleteVehicleUseCase)
    .inTransientScope();
}
