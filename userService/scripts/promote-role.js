import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserModel } from '../src/models/user.model.js';
import { ROLE_LIST } from '../src/constants/roles.js';

dotenv.config();

const args = process.argv.slice(2);

const readArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return '';
  }
  return String(args[index + 1] || '').trim();
};

const hasFlag = (name) => args.includes(name);

const email = readArg('--email').toLowerCase();
const role = readArg('--role').toLowerCase();
const replace = hasFlag('--replace');

if (!email || !role) {
  console.error('Usage: node scripts/promote-role.js --email user@example.com --role manager [--replace]');
  process.exit(1);
}

if (!ROLE_LIST.includes(role)) {
  console.error(`Invalid role: ${role}. Allowed roles: ${ROLE_LIST.join(', ')}`);
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing in environment');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });

  const user = await UserModel.findOne({ email });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exitCode = 1;
  } else {
    const currentRoles = Array.isArray(user.roles) ? user.roles : [];
    user.roles = replace ? [role] : Array.from(new Set([...currentRoles, role]));
    await user.save();

    console.log('Role update success');
    console.log(`email=${user.email}`);
    console.log(`roles=${user.roles.join(',')}`);
  }
} catch (error) {
  console.error('Role update failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
