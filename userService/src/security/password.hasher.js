import argon2 from 'argon2';

export class PasswordHasher {
  async hash(plainPassword) {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
      hashLength: 32,
    });
  }

  async verify(hash, plainPassword) {
    return argon2.verify(hash, plainPassword);
  }
}
