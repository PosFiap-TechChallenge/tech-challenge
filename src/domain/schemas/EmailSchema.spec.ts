import { describe, expect, it } from 'vitest';
import { emailSchema } from './EmailSchema.ts';

describe('emailSchema', () => {
  it('normaliza espacos e maiusculas', () => {
    expect(emailSchema().parse(' Joao@Email.COM ')).toBe('joao@email.com');
  });

  it.each(['', 'joao', 'joao@', '@email.com', 'joao @email.com', 'joao@email'])(
    'rejeita e-mail invalido: "%s"',
    (raw) => {
      expect(emailSchema().safeParse(raw).success).toBe(false);
    },
  );
});
