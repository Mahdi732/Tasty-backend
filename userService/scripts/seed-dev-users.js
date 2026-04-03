import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserModel } from '../src/models/user.model.js';
import { PasswordHasher } from '../src/security/password.hasher.js';
import { ROLES } from '../src/constants/roles.js';
import { USER_STATUS } from '../src/constants/user-status.js';

dotenv.config();

const DEFAULT_MONGO_URI =
  'mongodb://tasty_user_app:user-app-pass-dev@localhost:27017/tasty_user?authSource=tasty_user';
const DEFAULT_PASSWORD = 'TastyDev!23456';

const args = process.argv.slice(2);

const readArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return '';
  }

  return String(args[index + 1] || '').trim();
};

const mongoUri = readArg('--mongo-uri') || process.env.MONGO_URI || DEFAULT_MONGO_URI;
const sharedPassword = readArg('--password') || DEFAULT_PASSWORD;

const now = new Date();

const seedUsers = [
  {
    email: 'admin@tasty.local',
    nickname: 'Tasty Admin',
    phoneNumber: '+201000000001',
    roles: [ROLES.SUPERADMIN],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    isFaceVerified: true,
  },
  {
    email: 'manager@tasty.local',
    nickname: 'Restaurant Manager',
    phoneNumber: '+201000000002',
    roles: [ROLES.MANAGER],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    isFaceVerified: true,
  },
  {
    email: 'staff@tasty.local',
    nickname: 'Floor Staff',
    phoneNumber: '+201000000003',
    roles: [ROLES.STAFF],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    isFaceVerified: true,
  },
  {
    email: 'chef@tasty.local',
    nickname: 'Head Chef',
    phoneNumber: '+201000000004',
    roles: [ROLES.CHEF],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    isFaceVerified: true,
  },
  {
    email: 'delivery@tasty.local',
    nickname: 'Delivery Rider',
    phoneNumber: '+201000000005',
    roles: [ROLES.DELIVERY_MAN],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    isFaceVerified: false,
  },
  {
    email: 'customer@tasty.local',
    nickname: 'Primary Customer',
    phoneNumber: '+201000000006',
    roles: [ROLES.USER],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    isFaceVerified: false,
  },
  {
    email: 'newuser@tasty.local',
    nickname: 'Lifecycle Demo User',
    phoneNumber: '+201000000007',
    roles: [ROLES.USER],
    status: USER_STATUS.PENDING_PHONE_VERIFICATION,
    isEmailVerified: true,
    isPhoneVerified: false,
    isFaceVerified: false,
  },
];

try {
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });

  const passwordHasher = new PasswordHasher();
  const passwordHash = await passwordHasher.hash(sharedPassword);

  const created = [];

  for (const user of seedUsers) {
    const activationDeadline = user.status === USER_STATUS.PENDING_FACE_ACTIVATION
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    const saved = await UserModel.findOneAndUpdate(
      { email: user.email.toLowerCase() },
      {
        $set: {
          email: user.email.toLowerCase(),
          nickname: user.nickname,
          phoneNumber: user.phoneNumber,
          passwordHash,
          roles: user.roles,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          emailVerifiedAt: user.isEmailVerified ? now : null,
          isPhoneVerified: user.isPhoneVerified,
          phoneVerifiedAt: user.isPhoneVerified ? now : null,
          isFaceVerified: user.isFaceVerified,
          faceIdentityId: user.isFaceVerified ? `face-${user.email.split('@')[0]}` : null,
          activationDeadline,
          settings: {
            enableFaceLogin: user.isFaceVerified,
            enableOrderFaceConfirm: false,
          },
          failedLoginCount: 0,
          lockUntil: null,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    created.push(saved);
  }

  console.log('Seeded users successfully.');
  console.log(`Shared password: ${sharedPassword}`);
  for (const user of created) {
    console.log(
      `${user.email} | id=${user.id} | roles=${user.roles.join(',')} | status=${user.status}`
    );
  }
} catch (error) {
  console.error('Failed to seed dev users');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
