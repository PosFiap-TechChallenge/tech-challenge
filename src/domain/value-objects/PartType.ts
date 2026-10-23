/** PART: peca aplicada ao veiculo (ex.: filtro). SUPPLY: insumo consumido no servico (ex.: oleo, graxa). */
export const PART_TYPES = ['PART', 'SUPPLY'] as const;

export type PartType = (typeof PART_TYPES)[number];
