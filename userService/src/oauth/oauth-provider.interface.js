export class OAuthProvider {
  getName() {
    throw new Error('Not implemented');
  }

  getAuthorizationUrl(_state, _codeChallenge) {
    throw new Error('Not implemented');
  }

  async exchangeCodeForProfile(_code) {
    throw new Error('Not implemented');
  }
}
