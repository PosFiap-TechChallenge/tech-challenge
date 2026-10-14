import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { injectable } from 'inversify';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.ts';

const HASH_PREFIX = 'scrypt';
const SALT_LENGTH_IN_BYTES = 16;
const KEY_LENGTH_IN_BYTES = 64;

function deriveKey(plainPassword: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plainPassword, salt, KEY_LENGTH_IN_BYTES, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

/**
 * Formato persistido: `scrypt$<salt base64>$<hash base64>`. Usa o scrypt nativo
 * do Node, sem dependencia nativa extra como bcrypt/argon2.
 */
@injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH_IN_BYTES);

    const derivedKey = await deriveKey(plainPassword, salt);

    return [HASH_PREFIX, salt.toString('base64'), derivedKey.toString('base64')].join('$');
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    const [prefix, encodedSalt, encodedKey, ...rest] = passwordHash.split('$');

    if (prefix !== HASH_PREFIX || !encodedSalt || !encodedKey || rest.length > 0) {
      return false;
    }

    const expectedKey = Buffer.from(encodedKey, 'base64');

    if (expectedKey.length !== KEY_LENGTH_IN_BYTES) {
      return false;
    }

    const derivedKey = await deriveKey(plainPassword, Buffer.from(encodedSalt, 'base64'));

    return timingSafeEqual(derivedKey, expectedKey);
  }
}
