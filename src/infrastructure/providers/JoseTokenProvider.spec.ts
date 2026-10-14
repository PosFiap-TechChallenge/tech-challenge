import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../application/exceptions/AppError.ts';
import type { UserId } from '../../domain/aggregates/User.ts';
import { UserRole } from '../../domain/value-objects/UserRole.ts';
import { JoseTokenProvider, type JwtConfig } from './JoseTokenProvider.ts';

const config: JwtConfig = {
  secret: 'segredo-de-teste-com-pelo-menos-32-caracteres',
  expiresInSeconds: 60,
  issuer: 'techchallenge-api',
  audience: 'techchallenge-clients',
};

const payload = {
  sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
  email: 'ana@oficina.com',
  role: UserRole.ADMIN,
};

describe('JoseTokenProvider', () => {
  const provider = new JoseTokenProvider(config);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('assina um token Bearer que pode ser verificado com o mesmo payload', async () => {
    const issued = await provider.sign(payload);

    expect(issued.tokenType).toBe('Bearer');
    expect(issued.expiresIn).toBe(60);
    await expect(provider.verify(issued.accessToken)).resolves.toEqual(payload);
  });

  it('rejeita token expirado com TOKEN_EXPIRED', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const issued = await provider.sign(payload);

    vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));

    await expect(provider.verify(issued.accessToken)).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
      statusCode: 401,
    });
  });

  it('rejeita token adulterado com INVALID_TOKEN', async () => {
    const issued = await provider.sign(payload);
    const tampered = `${issued.accessToken.slice(0, -2)}xx`;

    await expect(provider.verify(tampered)).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('rejeita token assinado com outro segredo', async () => {
    const otherProvider = new JoseTokenProvider({
      ...config,
      secret: 'outro-segredo-tambem-com-mais-de-32-caracteres',
    });
    const issued = await otherProvider.sign(payload);

    await expect(provider.verify(issued.accessToken)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejeita token de outro emissor', async () => {
    const otherIssuer = new JoseTokenProvider({ ...config, issuer: 'outra-api' });
    const issued = await otherIssuer.sign(payload);

    await expect(provider.verify(issued.accessToken)).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });

  it('rejeita token valido cujo payload nao segue o contrato', async () => {
    const token = await new SignJWT({ email: 'ana@oficina.com', role: 'SUPERUSER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt()
      .setExpirationTime('1m')
      .sign(new TextEncoder().encode(config.secret));

    await expect(provider.verify(token)).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('rejeita string que nao e um JWT', async () => {
    await expect(provider.verify('nao-e-um-jwt')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });
});
