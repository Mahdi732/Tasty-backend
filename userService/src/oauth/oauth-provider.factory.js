import { GoogleOAuthProvider } from './providers/google.provider.js';
import { FacebookOAuthProvider } from './providers/facebook.provider.js';
import { AppleOAuthProvider } from './providers/apple.provider.js';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class OAuthProviderFactory {
  constructor(env) {
    this.providers = new Map([
      ['google', new GoogleOAuthProvider(env)],
      ['facebook', new FacebookOAuthProvider(env)],
      ['apple', new AppleOAuthProvider(env)],
    ]);
  }

  getProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ApiError(400, ERROR_CODES.OAUTH_NOT_SUPPORTED, 'OAuth provider is not supported');
    }
    return provider;
  }
}
