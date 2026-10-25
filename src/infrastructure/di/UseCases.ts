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
import { AdjustStockUseCase } from '../../application/use-cases/parts/AdjustStockUseCase.ts';
import { ConsumePartsUseCase } from '../../application/use-cases/parts/ConsumePartsUseCase.ts';
import { CreatePartUseCase } from '../../application/use-cases/parts/CreatePartUseCase.ts';
import { GetPartByIdUseCase } from '../../application/use-cases/parts/GetPartByIdUseCase.ts';
import { ListPartsUseCase } from '../../application/use-cases/parts/ListPartsUseCase.ts';
import { ListStockMovementsUseCase } from '../../application/use-cases/parts/ListStockMovementsUseCase.ts';
import { RegisterStockEntryUseCase } from '../../application/use-cases/parts/RegisterStockEntryUseCase.ts';
import { ReservePartsUseCase } from '../../application/use-cases/parts/ReservePartsUseCase.ts';
import { DeletePartUseCase } from '../../application/use-cases/parts/DeletePartUseCase.ts';
import { PartCommandRunner } from '../../application/use-cases/parts/PartCommandRunner.ts';
import { ReleasePartReservationsUseCase } from '../../application/use-cases/parts/ReleasePartReservationsUseCase.ts';
import { UpdatePartUseCase } from '../../application/use-cases/parts/UpdatePartUseCase.ts';
import { CreateServiceUseCase } from '../../application/use-cases/services/CreateServiceUseCase.ts';
import { DeleteServiceUseCase } from '../../application/use-cases/services/DeleteServiceUseCase.ts';
import { GetServiceByIdUseCase } from '../../application/use-cases/services/GetServiceByIdUseCase.ts';
import { ListServicesUseCase } from '../../application/use-cases/services/ListServicesUseCase.ts';
import { UpdateServiceUseCase } from '../../application/use-cases/services/UpdateServiceUseCase.ts';
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
  container
    .bind<AdjustStockUseCase>(TYPES.AdjustStockUseCase)
    .to(AdjustStockUseCase)
    .inTransientScope();
  container
    .bind<ConsumePartsUseCase>(TYPES.ConsumePartsUseCase)
    .to(ConsumePartsUseCase)
    .inTransientScope();
  container
    .bind<CreatePartUseCase>(TYPES.CreatePartUseCase)
    .to(CreatePartUseCase)
    .inTransientScope();
  container
    .bind<GetPartByIdUseCase>(TYPES.GetPartByIdUseCase)
    .to(GetPartByIdUseCase)
    .inTransientScope();
  container.bind<ListPartsUseCase>(TYPES.ListPartsUseCase).to(ListPartsUseCase).inTransientScope();
  container
    .bind<ListStockMovementsUseCase>(TYPES.ListStockMovementsUseCase)
    .to(ListStockMovementsUseCase)
    .inTransientScope();
  container
    .bind<RegisterStockEntryUseCase>(TYPES.RegisterStockEntryUseCase)
    .to(RegisterStockEntryUseCase)
    .inTransientScope();
  container
    .bind<ReservePartsUseCase>(TYPES.ReservePartsUseCase)
    .to(ReservePartsUseCase)
    .inTransientScope();
  container
    .bind<DeletePartUseCase>(TYPES.DeletePartUseCase)
    .to(DeletePartUseCase)
    .inTransientScope();
  container
    .bind<PartCommandRunner>(TYPES.PartCommandRunner)
    .to(PartCommandRunner)
    .inTransientScope();
  container
    .bind<ReleasePartReservationsUseCase>(TYPES.ReleasePartReservationsUseCase)
    .to(ReleasePartReservationsUseCase)
    .inTransientScope();
  container
    .bind<UpdatePartUseCase>(TYPES.UpdatePartUseCase)
    .to(UpdatePartUseCase)
    .inTransientScope();
  container
    .bind<CreateServiceUseCase>(TYPES.CreateServiceUseCase)
    .to(CreateServiceUseCase)
    .inTransientScope();
  container
    .bind<GetServiceByIdUseCase>(TYPES.GetServiceByIdUseCase)
    .to(GetServiceByIdUseCase)
    .inTransientScope();
  container
    .bind<ListServicesUseCase>(TYPES.ListServicesUseCase)
    .to(ListServicesUseCase)
    .inTransientScope();
  container
    .bind<UpdateServiceUseCase>(TYPES.UpdateServiceUseCase)
    .to(UpdateServiceUseCase)
    .inTransientScope();
  container
    .bind<DeleteServiceUseCase>(TYPES.DeleteServiceUseCase)
    .to(DeleteServiceUseCase)
    .inTransientScope();
}
