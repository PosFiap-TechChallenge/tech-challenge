import { inject, injectable } from 'inversify';
import { errors, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { z } from 'zod';
import { TYPES } from '../../application/dto/Types.ts';
import { UnauthorizedError } from '../../application/exceptions/AppError.ts';
import type { UserId } from '../../domain/aggregates/User.ts';
import type {
  AccessTokenPayload,
  IssuedAccessToken,
  TokenProvider,
} from '../../domain/providers/TokenProvider.ts';
import { USER_ROLES } from '../../domain/value-objects/UserRole.ts';

const SIGNING_ALGORITHM = 'HS256';

export type JwtConfig = {
  secret: string;
  expiresInSeconds: number;
  issuer: string;
  audience: string;
};

const accessTokenClaimsSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  role: z.enum(USER_ROLES),
});

@injectable()
export class JoseTokenProvider implements TokenProvider {
  private readonly signingKey: Uint8Array;

  constructor(
    @inject(TYPES.JwtConfig)
    private readonly config: JwtConfig,
  ) {
    this.signingKey = new TextEncoder().encode(config.secret);
  }

  async sign(payload: AccessTokenPayload): Promise<IssuedAccessToken> {
    const accessToken = await new SignJWT({ email: payload.email, role: payload.role })
      .setProtectedHeader({ alg: SIGNING_ALGORITHM, typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.config.expiresInSeconds}s`)
      .sign(this.signingKey);

    return { accessToken, tokenType: 'Bearer', expiresIn: this.config.expiresInSeconds };
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    const payload = await this.verifySignature(token);

    const claims = accessTokenClaimsSchema.safeParse(payload);

    if (!claims.success) {
      throw new UnauthorizedError('Token de acesso invalido', 'INVALID_TOKEN');
    }

    return {
      sub: claims.data.sub as UserId,
      email: claims.data.email,
      role: claims.data.role,
    };
  }

  private async verifySignature(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.signingKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [SIGNING_ALGORITHM],
      });

      return payload;
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        throw new UnauthorizedError('Token de acesso expirado', 'TOKEN_EXPIRED');
      }

      if (error instanceof errors.JOSEError) {
        throw new UnauthorizedError('Token de acesso invalido', 'INVALID_TOKEN');
      }

      throw error;
    }
  }
}
