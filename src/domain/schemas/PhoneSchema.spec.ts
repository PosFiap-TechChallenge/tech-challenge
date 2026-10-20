import { describe, expect, it } from 'vitest';
import { phoneSchema } from './PhoneSchema.ts';

describe('phoneSchema', () => {
  it.each([
    ['(11) 98765-4321', '11987654321'],
    ['11 3333-4444', '1133334444'],
    ['+55 (11) 98765-4321', '11987654321'],
    ['55987654321', '55987654321'],
  ])('normaliza "%s" para "%s"', (raw, expected) => {
    expect(phoneSchema().parse(raw)).toBe(expected);
  });

  it.each(['', '123', '119876543210', '(11) 9876-543A', '+1 202 555 0100', '(01) 98765-4321'])(
    'rejeita telefone invalido: "%s"',
    (raw) => {
      expect(phoneSchema().safeParse(raw).success).toBe(false);
    },
  );
});
