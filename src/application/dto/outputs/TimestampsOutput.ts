import { z } from '../Zod.ts';

/** Datas do dominio (`Date`) serializadas como ISO 8601 na resposta. */
export const timestampsOutputShape = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};
