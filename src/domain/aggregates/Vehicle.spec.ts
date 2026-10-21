import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { VehicleRegisteredEvent } from '../events/VehicleRegisteredEvent.ts';
import { CUSTOMER_ID } from '../test/mocks/CustomerMock.ts';
import { makeVehicle } from '../test/mocks/VehicleMock.ts';
import { Vehicle } from './Vehicle.ts';

const OTHER_CUSTOMER_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

const validInput = {
  plate: ' abc-1d23 ',
  brand: '  Fiat  ',
  model: ' Argo ',
  year: 2022,
  customerId: CUSTOMER_ID,
};

describe('Vehicle', () => {
  describe('create', () => {
    it('cria veiculo com dados normalizados e gera id', () => {
      const vehicle = Vehicle.create(validInput);

      expect(vehicle.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(vehicle.plate.value).toBe('ABC1D23');
      expect(vehicle.brand).toBe('Fiat');
      expect(vehicle.model).toBe('Argo');
      expect(vehicle.year).toBe(2022);
      expect(vehicle.customerId).toBe(CUSTOMER_ID);
      expect(vehicle.createdAt).toEqual(vehicle.updatedAt);
    });

    it('registra o evento VehicleRegisteredEvent', () => {
      const vehicle = Vehicle.create(validInput);

      expect(vehicle.raisedEvents).toHaveLength(1);
      expect(vehicle.raisedEvents[0]).toBeInstanceOf(VehicleRegisteredEvent);
      expect(vehicle.raisedEvents[0]?.payload).toEqual({
        vehicleId: vehicle.id,
        customerId: CUSTOMER_ID,
        plate: 'ABC1D23',
      });
    });

    it('aceita o ano seguinte ao atual e o ano minimo', () => {
      const nextYear = new Date().getFullYear() + 1;

      expect(Vehicle.create({ ...validInput, year: nextYear }).year).toBe(nextYear);
      expect(Vehicle.create({ ...validInput, year: 1900 }).year).toBe(1900);
    });

    it('rejeita placa invalida', () => {
      expect(() => Vehicle.create({ ...validInput, plate: 'ABC123' })).toThrow(DomainError);
    });

    it.each(['', '   '])('rejeita marca vazia: "%s"', (brand) => {
      expect(() => Vehicle.create({ ...validInput, brand })).toThrow(DomainError);
    });

    it.each(['', '   '])('rejeita modelo vazio: "%s"', (model) => {
      expect(() => Vehicle.create({ ...validInput, model })).toThrow(DomainError);
    });

    it('rejeita marca e modelo acima do limite', () => {
      expect(() => Vehicle.create({ ...validInput, brand: 'a'.repeat(81) })).toThrow(DomainError);
      expect(() => Vehicle.create({ ...validInput, model: 'a'.repeat(101) })).toThrow(DomainError);
    });

    it.each([1899, new Date().getFullYear() + 2, 2022.5, Number.NaN])(
      'rejeita ano invalido: %s',
      (year) => {
        expect(() => Vehicle.create({ ...validInput, year })).toThrow(DomainError);
      },
    );

    it.each(['', 'abc', '6f1c2b3a-4d5e-4f60-8a7b'])(
      'rejeita identificador de cliente invalido: "%s"',
      (customerId) => {
        expect(() => Vehicle.create({ ...validInput, customerId })).toThrow(DomainError);
      },
    );
  });

  describe('from', () => {
    it('reconstroi o veiculo sem registrar eventos', () => {
      const vehicle = makeVehicle();

      expect(vehicle.raisedEvents).toHaveLength(0);
      expect(vehicle.plate.value).toBe('ABC1D23');
    });

    it('rejeita dados persistidos invalidos', () => {
      expect(() => makeVehicle({ plate: 'INVALID' })).toThrow(DomainError);
    });
  });

  describe('update', () => {
    it('altera somente os campos informados e atualiza updatedAt', () => {
      const vehicle = makeVehicle();
      const previousUpdatedAt = vehicle.updatedAt;

      vehicle.update({ model: 'Pulse', year: 2024 });

      expect(vehicle.model).toBe('Pulse');
      expect(vehicle.year).toBe(2024);
      expect(vehicle.brand).toBe('Fiat');
      expect(vehicle.plate.value).toBe('ABC1D23');
      expect(vehicle.customerId).toBe(CUSTOMER_ID);
      expect(vehicle.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
    });

    it('mantem o id ao trocar a placa', () => {
      const vehicle = makeVehicle();
      const id = vehicle.id;

      vehicle.update({ plate: 'def-4567' });

      expect(vehicle.plate.value).toBe('DEF4567');
      expect(vehicle.id).toBe(id);
    });

    it('transfere o veiculo para outro cliente', () => {
      const vehicle = makeVehicle();

      vehicle.update({ customerId: OTHER_CUSTOMER_ID });

      expect(vehicle.customerId).toBe(OTHER_CUSTOMER_ID);
    });

    it('nao registra eventos ao atualizar', () => {
      const vehicle = makeVehicle();

      vehicle.update({ brand: 'Volkswagen' });

      expect(vehicle.raisedEvents).toHaveLength(0);
    });

    it('nao altera nada quando a validacao falha', () => {
      const vehicle = makeVehicle();

      expect(() => vehicle.update({ brand: 'Volkswagen', plate: 'invalida' })).toThrow(DomainError);
      expect(vehicle.brand).toBe('Fiat');
      expect(vehicle.plate.value).toBe('ABC1D23');
    });
  });

  describe('equals', () => {
    it('compara veiculos pelo id e nao pela placa', () => {
      const vehicle = makeVehicle();

      expect(vehicle.equals(makeVehicle({ plate: 'DEF4567' }))).toBe(true);
      expect(vehicle.equals(makeVehicle({ id: OTHER_CUSTOMER_ID }))).toBe(false);
    });
  });
});
