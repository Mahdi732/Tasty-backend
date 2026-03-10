import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

const SUPPORTED_PLATFORMS = ['web', 'mobile', 'desktop', 'android', 'ios'];

export class OAuthClientConfigResolver {
  constructor(env) {
    this.oauthConfig = env.OAUTH || {};
  }

  resolve(providerName, platform) {
    const normalizedPlatform = platform || 'web';

    if (!SUPPORTED_PLATFORMS.includes(normalizedPlatform)) {
      throw new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Unsupported oauth platform');
    }

    const providerConfig = this.oauthConfig[providerName];
    if (!providerConfig) {
      throw new ApiError(400, ERROR_CODES.OAUTH_NOT_SUPPORTED, 'OAuth provider is not configured');
    }

    const platformConfig = providerConfig[normalizedPlatform];
    if (!platformConfig) {
      throw new ApiError(
        400,
        ERROR_CODES.OAUTH_PROVIDER_ERROR,
        `OAuth client config missing for provider=${providerName}, platform=${normalizedPlatform}`
      );
    }

    return {
      ...platformConfig,
      provider: providerName,
      platform: normalizedPlatform,
    };
  }
}

