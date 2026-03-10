import axios from 'axios';
import { OAuthProvider } from '../oauth-provider.interface.js';

export class GoogleOAuthProvider extends OAuthProvider {
  getName() {
    return 'google';
  }

  getAuthorizationUrl({ state, codeChallenge, clientConfig }) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientConfig.clientId);
    url.searchParams.set('redirect_uri', clientConfig.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    if (codeChallenge) {
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }
    return url.toString();
  }

  async exchangeCodeForProfile({ code, codeVerifier, clientConfig }) {
    const payload = new URLSearchParams({
      client_id: clientConfig.clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: clientConfig.redirectUri,
    });

    // Security: public clients must not be forced to use a client secret.
    if (clientConfig.clientSecret) {
      payload.set('client_secret', clientConfig.clientSecret);
    }

    if (codeVerifier) {
      payload.set('code_verifier', codeVerifier);
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      payload,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;

    const userInfoResponse = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      provider: 'google',
      providerUserId: userInfoResponse.data.sub,
      email: userInfoResponse.data.email,
      emailVerified: Boolean(userInfoResponse.data.email_verified),
      name: userInfoResponse.data.name || null,
      profile: userInfoResponse.data,
    };
  }
}

