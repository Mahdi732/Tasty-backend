import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  const indexName = process.env.VECTOR_SEARCH_INDEX_NAME || 'watchlist_embedding_index';
  const dim = Number(process.env.EMBEDDING_DIMENSION || 512);

  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(mongoUri);

  const command = {
    createSearchIndexes: 'facevectors',
    indexes: [
      {
        name: indexName,
        definition: {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: dim,
              similarity: 'cosine',
            },
            {
              type: 'filter',
              path: 'tenantId',
            },
            {
              type: 'filter',
              path: 'listType',
            },
            {
              type: 'filter',
              path: 'active',
            },
          ],
        },
      },
    ],
  };

  try {
    const db = mongoose.connection.db;
    const result = await db.command(command);
    console.log('Search index command result:', result);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

