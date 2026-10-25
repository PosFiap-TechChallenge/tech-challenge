export const TYPES = {
  // Infraestrutura
  PrismaClient: Symbol.for('PrismaClient'),
  DatabaseUrl: Symbol.for('DatabaseUrl'),
  JwtConfig: Symbol.for('JwtConfig'),
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Providers
  TokenProvider: Symbol.for('TokenProvider'),
  PasswordHasher: Symbol.for('PasswordHasher'),
  EventPublisher: Symbol.for('EventPublisher'),

  // Repositorios
  UserRepository: Symbol.for('UserRepository'),
  CustomerRepository: Symbol.for('CustomerRepository'),
  VehicleRepository: Symbol.for('VehicleRepository'),
  PartRepository: Symbol.for('PartRepository'),
  ServiceRepository: Symbol.for('ServiceRepository'),

  // Casos de uso
  GetHealthUseCase: Symbol.for('GetHealthUseCase'),
  SignInUseCase: Symbol.for('SignInUseCase'),
  RegisterUserUseCase: Symbol.for('RegisterUserUseCase'),
  GetAuthenticatedUserUseCase: Symbol.for('GetAuthenticatedUserUseCase'),
  CreateCustomerUseCase: Symbol.for('CreateCustomerUseCase'),
  GetCustomerByIdUseCase: Symbol.for('GetCustomerByIdUseCase'),
  GetCustomerByDocumentUseCase: Symbol.for('GetCustomerByDocumentUseCase'),
  ListCustomersUseCase: Symbol.for('ListCustomersUseCase'),
  UpdateCustomerUseCase: Symbol.for('UpdateCustomerUseCase'),
  DeleteCustomerUseCase: Symbol.for('DeleteCustomerUseCase'),
  CreateVehicleUseCase: Symbol.for('CreateVehicleUseCase'),
  GetVehicleByIdUseCase: Symbol.for('GetVehicleByIdUseCase'),
  GetVehicleByPlateUseCase: Symbol.for('GetVehicleByPlateUseCase'),
  ListVehiclesUseCase: Symbol.for('ListVehiclesUseCase'),
  UpdateVehicleUseCase: Symbol.for('UpdateVehicleUseCase'),
  DeleteVehicleUseCase: Symbol.for('DeleteVehicleUseCase'),
  CreatePartUseCase: Symbol.for('CreatePartUseCase'),
  GetPartByIdUseCase: Symbol.for('GetPartByIdUseCase'),
  ListPartsUseCase: Symbol.for('ListPartsUseCase'),
  ListStockMovementsUseCase: Symbol.for('ListStockMovementsUseCase'),
  RegisterStockEntryUseCase: Symbol.for('RegisterStockEntryUseCase'),
  AdjustStockUseCase: Symbol.for('AdjustStockUseCase'),
  ReservePartsUseCase: Symbol.for('ReservePartsUseCase'),
  ConsumePartsUseCase: Symbol.for('ConsumePartsUseCase'),
  ReleasePartReservationsUseCase: Symbol.for('ReleasePartReservationsUseCase'),
  UpdatePartUseCase: Symbol.for('UpdatePartUseCase'),
  DeletePartUseCase: Symbol.for('DeletePartUseCase'),
  PartCommandRunner: Symbol.for('PartCommandRunner'),
  CreateServiceUseCase: Symbol.for('CreateServiceUseCase'),
  GetServiceByIdUseCase: Symbol.for('GetServiceByIdUseCase'),
  ListServicesUseCase: Symbol.for('ListServicesUseCase'),
  UpdateServiceUseCase: Symbol.for('UpdateServiceUseCase'),
  DeleteServiceUseCase: Symbol.for('DeleteServiceUseCase'),

  // Handlers de eventos de dominio (multi-binding: o EventPublisher entrega a todos)
  DomainEventHandler: Symbol.for('DomainEventHandler'),

  // Controllers (multi-binding: todos sao registrados no router pelo app)
  Controller: Symbol.for('Controller'),
} as const;

export type Types = typeof TYPES;
