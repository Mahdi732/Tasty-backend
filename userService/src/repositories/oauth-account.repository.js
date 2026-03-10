export class OAuthAccountRepository {
  constructor(oauthAccountModel) {
    this.oauthAccountModel = oauthAccountModel;
  }

  async findByProviderAndProviderUserId(provider, providerUserId) {
    return this.oauthAccountModel.findOne({ provider, providerUserId });
  }

  async findByUserAndProvider(userId, provider) {
    return this.oauthAccountModel.findOne({ userId, provider });
  }

  async create(payload) {
    return this.oauthAccountModel.create(payload);
  }

  async updateLoginMeta(id, updates) {
    return this.oauthAccountModel.findByIdAndUpdate(id, updates, { new: true });
  }

  async deleteByUserAndProvider(userId, provider) {
    return this.oauthAccountModel.findOneAndDelete({ userId, provider });
  }
}

