export class UserRepository {
  constructor(userModel) {
    this.userModel = userModel;
  }

  async create(userPayload) {
    return this.userModel.create(userPayload);
  }

  async findByEmail(email) {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id) {
    return this.userModel.findById(id);
  }

  async save(user) {
    return user.save();
  }
}
