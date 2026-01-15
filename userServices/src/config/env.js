import dotenv from "dotenv";

dotenv.config();

const required = [
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "ACCESS_TOKEN_TTL",
  "REFRESH_TOKEN_TTL",
  "CORS_ORIGIN"
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing env ${key}`);
  }
});

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL,
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL,
  corsOrigin: process.env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  trustProxy: process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production",
  isProduction: process.env.NODE_ENV === "production"
};
