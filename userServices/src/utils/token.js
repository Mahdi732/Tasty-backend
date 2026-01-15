import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { env } from "../config/env.js";

export const ttlToMs = (ttl) => {
  const match = /^([0-9]+)([smhd])$/i.exec(ttl);
  if (!match) throw new Error("Invalid TTL format");
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;
  throw new Error("Unsupported TTL unit");
};

export const createAccessToken = (userId) => {
  const payload = { sub: userId, type: "access" };
  const token = jwt.sign(payload, env.accessTokenSecret, { expiresIn: env.accessTokenTtl });
  const expiresAt = new Date(Date.now() + ttlToMs(env.accessTokenTtl));
  return { token, expiresAt };
};

export const createRefreshToken = (userId) => {
  const jti = uuid();
  const payload = { sub: userId, type: "refresh", jti };
  const token = jwt.sign(payload, env.refreshTokenSecret, { expiresIn: env.refreshTokenTtl });
  const expiresAt = new Date(Date.now() + ttlToMs(env.refreshTokenTtl));
  return { token, jti, expiresAt };
};

export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.accessTokenSecret);
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
};

export const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, env.refreshTokenSecret);
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return payload;
};
