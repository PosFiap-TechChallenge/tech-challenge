import type { z } from 'zod';
import { VehicleRegisteredEvent } from '../events/VehicleRegisteredEvent.ts';
import { vehicleSchema, type VehicleData } from '../schemas/VehicleSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { applyChanges, type Changes } from '../shared/Changes.ts';
import { generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { LicensePlate } from '../value-objects/LicensePlate.ts';
import type { CustomerId } from './Customer.ts';

export type VehicleId = Brand<string, 'VehicleId'>;

type VehicleProps = Omit<VehicleData, 'id' | 'plate' | 'customerId'> & {
  plate: LicensePlate;
  customerId: CustomerId;
};

type VehicleContent = Omit<VehicleData, 'id' | 'createdAt' | 'updatedAt'>;

const ERROR_CODES = {
  plate: 'INVALID_LICENSE_PLATE',
  brand: 'INVALID_VEHICLE_TEXT',
  model: 'INVALID_VEHICLE_TEXT',
  year: 'INVALID_VEHICLE_YEAR',
  customerId: 'INVALID_VEHICLE_CUSTOMER',
};

export class Vehicle extends AggregateRoot<VehicleProps, VehicleId> {
  private constructor(props: VehicleProps, id: VehicleId) {
    super(props, id);
  }

  private static parse(data: z.input<typeof vehicleSchema>): VehicleData {
    return parseSchema(vehicleSchema, data, ERROR_CODES, 'INVALID_VEHICLE');
  }

  private static toProps({ id: _id, plate, customerId, ...data }: VehicleData): VehicleProps {
    return { ...data, plate: LicensePlate.create(plate), customerId: customerId as CustomerId };
  }

  static create(input: VehicleContent): Vehicle {
    const now = new Date();

    const vehicle = Vehicle.from({
      ...input,
      id: generateId<VehicleId>(),
      createdAt: now,
      updatedAt: now,
    });

    vehicle.raiseEvent(
      new VehicleRegisteredEvent({
        vehicleId: vehicle.id,
        customerId: vehicle.customerId,
        plate: vehicle.plate.value,
      }),
    );

    return vehicle;
  }

  static from(data: z.input<typeof vehicleSchema>): Vehicle {
    const vehicle = Vehicle.parse(data);

    return new Vehicle(Vehicle.toProps(vehicle), vehicle.id as VehicleId);
  }

  get plate(): LicensePlate {
    return this.props.plate;
  }

  get brand(): string {
    return this.props.brand;
  }

  get model(): string {
    return this.props.model;
  }

  get year(): number {
    return this.props.year;
  }

  get customerId(): CustomerId {
    return this.props.customerId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toData(): VehicleData {
    return { ...this.props, id: this.id, plate: this.props.plate.value };
  }

  /**
   * Valida todos os campos antes de aplicar: uma falha nao deixa o veiculo parcialmente alterado.
   * Alterar `customerId` transfere o veiculo para outro cliente.
   */
  update(changes: Changes<VehicleContent>): void {
    const next = Vehicle.parse({ ...applyChanges(this.toData(), changes), updatedAt: new Date() });

    Object.assign(this.props, Vehicle.toProps(next));
  }
}
