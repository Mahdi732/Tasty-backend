import { USER_STATUS } from '../constants/user-status.js';

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

  async findExpiredPendingFaceActivation(now, limit = 200) {
    return this.userModel
      .find({
        status: USER_STATUS.PENDING_FACE_ACTIVATION,
        activationDeadline: { $lt: now },
      })
      .limit(limit)
      .lean();
  }

  async deleteByIds(ids) {
    if (!ids?.length) {
      return { deletedCount: 0 };
    }
    return this.userModel.deleteMany({ _id: { $in: ids } });
  }
}

