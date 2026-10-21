/** Unidades de medida de pecas e insumos. */
export const MEASUREMENT_UNITS = ['UN', 'L', 'ML', 'KG', 'G', 'M'] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

/** Itens contados por unidade (UN) nao podem ser fracionados; os demais aceitam decimais. */
export function isFractionable(unit: MeasurementUnit): boolean {
  return unit !== 'UN';
}

export function isMeasurementUnit(value: string): value is MeasurementUnit {
  return (MEASUREMENT_UNITS as readonly string[]).includes(value);
}
