import mongoose from 'mongoose';

export const connectMongo = async (uri) => {
  await mongoose.connect(uri, { autoIndex: true });
};
