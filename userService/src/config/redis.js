import { createClient } from 'redis';

export const createRedisClient = async (url) => {
  const client = createClient({ url });
  client.on('error', () => {});
  await client.connect();
  return client;
};

