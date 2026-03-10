import { createClient } from 'redis';

export const createRedis = async (url) => {
  const client = createClient({ url });
  await client.connect();
  return client;
};

