import crypto from 'crypto';

export const timingSafeEqualHex = (aHex, bHex) => {
  if (!aHex || !bHex || aHex.length !== bHex.length) {
    return false;
  }
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  return crypto.timingSafeEqual(a, b);
};

