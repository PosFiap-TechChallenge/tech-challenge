import type { UserId } from '../aggregates/User.ts';
import type { UserRole } from '../value-objects/UserRole.ts';

export type AccessTokenPayload = {
  sub: UserId;
  email: string;
  role: UserRole;
};

export type IssuedAccessToken = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export interface TokenProvider {
  sign(payload: AccessTokenPayload): Promise<IssuedAccessToken>;

  /**
   * Rejeita com UnauthorizedError quando o token esta expirado, adulterado,
   * assinado por outro segredo ou com claims fora do contrato.
   */
  verify(token: string): Promise<AccessTokenPayload>;
}
