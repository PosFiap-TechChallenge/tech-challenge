import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { UserCreatedEvent } from '../events/UserCreatedEvent.ts';
import { makePasswordHasherMock } from '../test/mocks/AuthMocks.ts';
import { UserRole } from '../value-objects/UserRole.ts';
import type { UserData } from '../schemas/UserSchema.ts';
import { User } from './User.ts';

const validInput: Parameters<typeof User.create>[0] = {
  name: 'Maria Atendente',
  email: 'Maria@Oficina.com',
  password: 'Oficina123',
  role: UserRole.ATTENDANT,
};

const primitives: UserData = {
  id: '0b9d7a4e-8a8f-4c55-a1e5-0f2a5a7b8c9d',
  name: 'Joao Mecanico',
  email: 'joao@oficina.com',
  passwordHash: 'scrypt$salt$hash',
  role: UserRole.MECHANIC,
  active: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('User', () => {
  const passwordHasher = makePasswordHasherMock();

  beforeEach(() => {
    passwordHasher.hash.mockReset();
    passwordHasher.compare.mockReset();
    passwordHasher.hash.mockResolvedValue('scrypt$salt$hash');
  });

  describe('create', () => {
    it('cria usuario ativo com id gerado, e-mail normalizado e senha em hash', async () => {
      const user = await User.create(validInput, passwordHasher);

      expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(user.email).toBe('maria@oficina.com');
      expect(user.passwordHash).toBe('scrypt$salt$hash');
      expect(user.active).toBe(true);
      expect(user.role).toBe(UserRole.ATTENDANT);
      expect(passwordHasher.hash).toHaveBeenCalledWith('Oficina123');
    });

    it('levanta o evento UserCreatedEvent', async () => {
      const user = await User.create(validInput, passwordHasher);

      expect(user.raisedEvents).toHaveLength(1);
      expect(user.raisedEvents[0]).toBeInstanceOf(UserCreatedEvent);
      expect(user.raisedEvents[0]?.payload).toEqual({ userId: user.id, role: UserRole.ATTENDANT });
    });

    it('remove espacos das extremidades do nome', async () => {
      const user = await User.create({ ...validInput, name: '  Maria  ' }, passwordHasher);

      expect(user.name).toBe('Maria');
    });

    it('rejeita nome vazio', async () => {
      await expect(User.create({ ...validInput, name: '   ' }, passwordHasher)).rejects.toThrow(
        DomainError,
      );
    });

    it('rejeita nome acima de 120 caracteres', async () => {
      await expect(
        User.create({ ...validInput, name: 'a'.repeat(121) }, passwordHasher),
      ).rejects.toThrow(DomainError);
    });

    it('rejeita papel desconhecido', async () => {
      await expect(
        User.create({ ...validInput, role: 'CLIENT' as UserRole }, passwordHasher),
      ).rejects.toThrow(DomainError);
    });

    it('rejeita hash vazio devolvido pelo hasher', async () => {
      passwordHasher.hash.mockResolvedValue('');

      await expect(User.create(validInput, passwordHasher)).rejects.toMatchObject({
        code: 'INVALID_PASSWORD_HASH',
      });
    });
  });

  describe('politica de senha', () => {
    it('aceita exatamente 8 caracteres com letras e numeros', async () => {
      await expect(
        User.create({ ...validInput, password: 'abcdef12' }, passwordHasher),
      ).resolves.toBeInstanceOf(User);
    });

    it.each([
      ['menos de 8 caracteres', 'abc1234'],
      ['mais de 128 caracteres', `a1${'b'.repeat(127)}`],
      ['sem numeros', 'somenteletras'],
      ['sem letras', '1234567890'],
      ['vazia', ''],
    ])('rejeita senha %s com WEAK_PASSWORD sem gerar hash', async (_case, password) => {
      await expect(User.create({ ...validInput, password }, passwordHasher)).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
      });
      expect(passwordHasher.hash).not.toHaveBeenCalled();
    });
  });

  describe('e-mail', () => {
    it('remove espacos e converte para minusculas', () => {
      const user = User.from({ ...primitives, email: '  Joao.Silva@Oficina.COM ' });

      expect(user.email).toBe('joao.silva@oficina.com');
    });

    it.each([
      ['vazio', '   '],
      ['sem arroba', 'joao.oficina.com'],
      ['sem dominio de topo', 'joao@oficina'],
      ['com espaco interno', 'joao silva@oficina.com'],
      ['acima de 254 caracteres', `${'a'.repeat(250)}@x.com`],
    ])('rejeita e-mail %s com INVALID_EMAIL', (_case, email) => {
      expect(() => User.from({ ...primitives, email })).toThrow(
        expect.objectContaining({ code: 'INVALID_EMAIL' }),
      );
    });

    it('impede criar usuario com e-mail invalido', async () => {
      await expect(
        User.create({ ...validInput, email: 'invalido' }, passwordHasher),
      ).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
    });

    it('impede reconstruir usuario com e-mail invalido', () => {
      expect(() => User.from({ ...primitives, email: 'invalido' })).toThrow(DomainError);
    });
  });

  describe('verifyPassword', () => {
    it('delega a comparacao ao hasher usando o hash do usuario', async () => {
      passwordHasher.compare.mockResolvedValue(true);

      const matches = await User.from(primitives).verifyPassword('Oficina123', passwordHasher);

      expect(matches).toBe(true);
      expect(passwordHasher.compare).toHaveBeenCalledWith('Oficina123', primitives.passwordHash);
    });

    it('retorna false quando a senha nao confere', async () => {
      passwordHasher.compare.mockResolvedValue(false);

      await expect(User.from(primitives).verifyPassword('errada123', passwordHasher)).resolves.toBe(
        false,
      );
    });
  });

  describe('from', () => {
    it('reconstroi o usuario preservando id e datas sem levantar eventos', () => {
      const user = User.from(primitives);

      expect(user.id).toBe(primitives.id);
      expect(user.createdAt).toEqual(primitives.createdAt);
      expect(user.updatedAt).toEqual(primitives.updatedAt);
      expect(user.active).toBe(false);
      expect(user.raisedEvents).toHaveLength(0);
    });

    it('rejeita reconstrucao sem hash de senha', () => {
      expect(() => User.from({ ...primitives, passwordHash: '' })).toThrow(DomainError);
    });

    it('indica que usuario inativo nao pode se autenticar', () => {
      expect(User.from(primitives).canAuthenticate()).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('desativa o usuario e atualiza updatedAt', async () => {
      const user = await User.create(validInput, passwordHasher);
      const previousUpdatedAt = user.updatedAt;

      user.deactivate();

      expect(user.active).toBe(false);
      expect(user.canAuthenticate()).toBe(false);
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
    });
  });
});
