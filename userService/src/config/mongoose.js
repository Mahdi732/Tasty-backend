import mongoose from 'mongoose';

export const connectMongo = async (mongoUri) => {
  await mongoose.connect(mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
};
