export const TYPES = {
  // Infraestrutura
  PrismaClient: Symbol.for('PrismaClient'),
  DatabaseUrl: Symbol.for('DatabaseUrl'),
  JwtConfig: Symbol.for('JwtConfig'),
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Providers
  TokenProvider: Symbol.for('TokenProvider'),
  PasswordHasher: Symbol.for('PasswordHasher'),

  // Repositorios
  UserRepository: Symbol.for('UserRepository'),
  CustomerRepository: Symbol.for('CustomerRepository'),
  VehicleRepository: Symbol.for('VehicleRepository'),

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

  // Controllers (multi-binding: todos sao registrados no router pelo app)
  Controller: Symbol.for('Controller'),
} as const;

export type Types = typeof TYPES;
