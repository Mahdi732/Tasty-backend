export class OAuthProvider {
  getName() {
    throw new Error('Not implemented');
  }

  getAuthorizationUrl(_payload) {
    throw new Error('Not implemented');
  }

  async exchangeCodeForProfile(_payload) {
    throw new Error('Not implemented');
  }
}
