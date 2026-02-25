import { OAuthProvider } from '../oauth-provider.interface.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../constants/errors.js';

export class AppleOAuthProvider extends OAuthProvider {
  getName() {
    return 'apple';
  }

  getAuthorizationUrl({ state, codeChallenge, clientConfig }) {
    const url = new URL('https://appleid.apple.com/auth/authorize');
    url.searchParams.set('client_id', clientConfig.clientId);
    url.searchParams.set('redirect_uri', clientConfig.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', 'name email');
    url.searchParams.set('state', state);
    if (codeChallenge) {
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }
    return url.toString();
  }

  async exchangeCodeForProfile({ clientConfig }) {
    // TODO: Implement Apple token exchange + ID token validation using Apple JWKS.
    // TODO: Use platform-aware clientConfig for web/ios/desktop specific Apple app identifiers.
    // TODO: Handle first-login-only name payload and email relay address caveats.
    throw new ApiError(
      501,
      ERROR_CODES.OAUTH_NOT_SUPPORTED,
      'Apple OAuth exchange is scaffolded but not implemented yet'
    );
  }
}
