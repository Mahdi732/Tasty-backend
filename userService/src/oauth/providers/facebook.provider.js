import axios from 'axios';
import { OAuthProvider } from '../oauth-provider.interface.js';

export class FacebookOAuthProvider extends OAuthProvider {
  getName() {
    return 'facebook';
  }

  getAuthorizationUrl({ state, clientConfig }) {
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', clientConfig.clientId);
    url.searchParams.set('redirect_uri', clientConfig.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'email,public_profile');
    return url.toString();
  }

  async exchangeCodeForProfile({ code, clientConfig }) {
    const tokenParams = {
      client_id: clientConfig.clientId,
      redirect_uri: clientConfig.redirectUri,
      code,
    };

    if (clientConfig.clientSecret) {
      tokenParams.client_secret = clientConfig.clientSecret;
    }

    const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: tokenParams,
    });

    const accessToken = tokenResponse.data.access_token;

    const profileResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email',
        access_token: accessToken,
      },
    });

    return {
      provider: 'facebook',
      providerUserId: profileResponse.data.id,
      email: profileResponse.data.email || null,
      emailVerified: Boolean(profileResponse.data.email),
      name: profileResponse.data.name || null,
      profile: profileResponse.data,
    };
  }
}
