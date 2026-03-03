import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const pemTransform = (value) => (value ? value.replace(/\\n/g, '\n') : value);
const OAUTH_PLATFORMS = ['web', 'mobile', 'desktop', 'android', 'ios'];
const OAUTH_CLIENT_TYPES = ['public', 'confidential'];

const DEFAULT_CLIENT_TYPE_BY_PLATFORM = {
  web: 'confidential',
  mobile: 'public',
  desktop: 'public',
  android: 'public',
  ios: 'public',
};

const trimEnv = (envMap, key) => (envMap[key] || '').trim();

const parsePlatformClientConfig = (envMap, providerName, platform, warnings) => {
  const providerUpper = providerName.toUpperCase();
  const platformUpper = platform.toUpperCase();
  const prefix = `OAUTH_${providerUpper}_${platformUpper}`;

  const clientId = trimEnv(envMap, `${prefix}_CLIENT_ID`);
  const clientSecret = trimEnv(envMap, `${prefix}_CLIENT_SECRET`);
  const redirectUri = trimEnv(envMap, `${prefix}_REDIRECT_URI`);
  const configuredClientType = trimEnv(envMap, `${prefix}_CLIENT_TYPE`);

  const hasAnyValue = Boolean(clientId || clientSecret || redirectUri || configuredClientType);
  if (!hasAnyValue) {
    return null;
  }

  const clientType = configuredClientType || DEFAULT_CLIENT_TYPE_BY_PLATFORM[platform];

  if (!OAUTH_CLIENT_TYPES.includes(clientType)) {
    throw new Error(`Invalid OAuth client type for ${providerName}/${platform}: ${clientType}`);
  }

  if (!clientId || !redirectUri) {
    throw new Error(
      `Incomplete OAuth config for ${providerName}/${platform}. Both CLIENT_ID and REDIRECT_URI are required.`
    );
  }

  if (clientType === 'confidential' && !clientSecret) {
    warnings.push(
      `[oauth-config] Confidential client ${providerName}/${platform} has no client secret. Provider exchange may fail.`
    );
  }

  return {
    clientId,
    clientSecret: clientSecret || null,
    redirectUri,
    clientType,
  };
};

const buildProviderConfigs = (envMap, providerName, warnings) => {
  const result = {};
  for (const platform of OAUTH_PLATFORMS) {
    const config = parsePlatformClientConfig(envMap, providerName, platform, warnings);
    if (config) {
      result[platform] = config;
    }
  }
  return result;
};

const applyLegacyProviderFallback = (providerConfigs, parsedEnv, providerName, warnings) => {
  const hasModernWeb = Boolean(providerConfigs.web);
  if (hasModernWeb) {
    return providerConfigs;
  }

  const providerUpper = providerName.toUpperCase();
  const legacyClientId = (parsedEnv[`${providerUpper}_CLIENT_ID`] || '').trim();
  const legacyClientSecret = (parsedEnv[`${providerUpper}_CLIENT_SECRET`] || '').trim();
  const legacyRedirectUri = (parsedEnv[`${providerUpper}_REDIRECT_URI`] || '').trim();

  if (!legacyClientId && !legacyRedirectUri && !legacyClientSecret) {
    return providerConfigs;
  }

  if (!legacyClientId || !legacyRedirectUri) {
    warnings.push(
      `[oauth-config] Ignoring incomplete legacy ${providerUpper}_CLIENT_* values. Provide both ${providerUpper}_CLIENT_ID and ${providerUpper}_REDIRECT_URI, or migrate to OAUTH_${providerUpper}_<PLATFORM>_*.`
    );
    return providerConfigs;
  }

  warnings.push(
    `[oauth-config] Legacy ${providerUpper}_CLIENT_ID/SECRET/REDIRECT_URI detected. Migrate to OAUTH_${providerUpper}_WEB_* variables.`
  );

  return {
    ...providerConfigs,
    web: {
      clientId: legacyClientId,
      clientSecret: legacyClientSecret || null,
      redirectUri: legacyRedirectUri,
      clientType: 'confidential',
    },
  };
};

const parseOAuthConfig = (envMap, parsedEnv) => {
  const warnings = [];

  const google = applyLegacyProviderFallback(
    buildProviderConfigs(envMap, 'google', warnings),
    parsedEnv,
    'google',
    warnings
  );

  const facebook = applyLegacyProviderFallback(
    buildProviderConfigs(envMap, 'facebook', warnings),
    parsedEnv,
    'facebook',
    warnings
  );

  return {
    oauth: { google, facebook },
    warnings,
  };
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BODY_LIMIT: z.string().default('16kb'),
  TRUST_PROXY: z.coerce.number().default(1),

  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ACTIVE_KID: z.string().min(1),
  JWT_PREVIOUS_KID: z.string().optional().default(''),
  JWT_PRIVATE_KEY: z.string().transform(pemTransform),
  JWT_PUBLIC_KEY: z.string().transform(pemTransform),
  JWT_PREVIOUS_PUBLIC_KEY: z.string().optional().transform(pemTransform),
  TOKEN_HASH_SECRET: z.string().min(24),

  REFRESH_TOKEN_TRANSPORT: z.enum(['cookie', 'body', 'both']).default('both'),
  REFRESH_COOKIE_NAME: z.string().default('rt'),
  COOKIE_SECURE: z.coerce.boolean().default(true),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  // Legacy single-client OAuth provider fields (kept for migration compatibility).
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional().default(''),
  FACEBOOK_CLIENT_ID: z.string().optional().default(''),
  FACEBOOK_CLIENT_SECRET: z.string().optional().default(''),
  FACEBOOK_REDIRECT_URI: z.string().optional().default(''),

  OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  ALLOW_AUTO_LINK_VERIFIED_OAUTH_EMAIL: z.coerce.boolean().default(false),

  EMAIL_VERIFICATION_ENABLED: z.coerce.boolean().default(true),
  EMAIL_VERIFICATION_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  EMAIL_VERIFICATION_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  EMAIL_VERIFICATION_SEND_MAX_PER_WINDOW: z.coerce.number().int().positive().default(5),
  EMAIL_VERIFICATION_SEND_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
  EMAIL_VERIFICATION_EMAIL_MAX_PER_WINDOW: z.coerce.number().int().positive().default(5),
  EMAIL_VERIFICATION_HASH_SECRET: z.string().optional().default(''),

  SMTP_ENABLED: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().email().optional().default('noreply@tasty.local'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Security: fail fast on misconfiguration to avoid insecure fallback runtime behavior.
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

const { oauth, warnings } = parseOAuthConfig(process.env, parsed.data);

for (const warning of warnings) {
  // Security/operations: explicit startup warnings for deprecated OAuth config mode.
  console.warn(warning);
}

export const env = {
  ...parsed.data,
  OAUTH: oauth,
  OAUTH_PLATFORMS: OAUTH_PLATFORMS,
  CORS_ORIGINS_LIST: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
