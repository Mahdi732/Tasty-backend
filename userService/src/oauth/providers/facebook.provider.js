import axios from 'axios';
import { OAuthProvider } from '../oauth-provider.interface.js';

export class FacebookOAuthProvider extends OAuthProvider {
  constructor(env) {
    super();
    this.clientId = env.FACEBOOK_CLIENT_ID;
    this.clientSecret = env.FACEBOOK_CLIENT_SECRET;
    this.redirectUri = env.FACEBOOK_REDIRECT_URI;
  }

  getName() {
    return 'facebook';
  }

  getAuthorizationUrl(state) {
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'email,public_profile');
    return url.toString();
  }

  async exchangeCodeForProfile(code) {
    const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      },
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
