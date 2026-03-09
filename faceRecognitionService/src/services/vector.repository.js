import { FaceIdentityModel } from '../models/face-identity.model.js';
import { FaceVectorModel } from '../models/face-vector.model.js';
import { FaceEventModel } from '../models/face-event.model.js';

const cosineSimilarity = (vectorA, vectorB) => {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length !== vectorB.length) {
    return 0;
  }

  const dot = vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0);
  const magA = Math.sqrt(vectorA.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(vectorB.reduce((sum, value) => sum + value * value, 0));

  if (!magA || !magB) {
    return 0;
  }

  return dot / (magA * magB);
};

const supportsVectorSearch = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return !(
    message.includes('$vectorsearch') ||
    message.includes('vector search') ||
    message.includes('unrecognized pipeline stage')
  );
};

export class VectorRepository {
  async upsertIdentity({ personRef, tenantId, listType, reason }) {
    return FaceIdentityModel.findOneAndUpdate(
      { personRef, tenantId },
      { $set: { listType, reason, active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async upsertVector({ identity, embedding, dim, modelVersion, qualityScore }) {
    return FaceVectorModel.findOneAndUpdate(
      { personRef: identity.personRef, tenantId: identity.tenantId },
      {
        $set: {
          identityId: String(identity._id),
          personRef: identity.personRef,
          tenantId: identity.tenantId,
          listType: identity.listType,
          embedding,
          dim,
          modelVersion,
          qualityScore,
          active: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async findVectorByPersonRef(tenantId, personRef) {
    return FaceVectorModel.findOne({ tenantId, personRef, active: true }).lean();
  }

  async vectorSearch({
    embedding,
    tenantId,
    listTypes,
    topK,
    indexName,
  }) {
    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: 'embedding',
          queryVector: embedding,
          numCandidates: Math.max(topK * 20, 100),
          limit: topK,
          filter: {
            tenantId,
            active: true,
            listType: { $in: listTypes },
          },
        },
      },
      {
        $project: {
          personRef: 1,
          tenantId: 1,
          listType: 1,
          modelVersion: 1,
          qualityScore: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    try {
      return await FaceVectorModel.aggregate(pipeline);
    } catch (error) {
      if (supportsVectorSearch(error)) {
        throw error;
      }

      const docs = await FaceVectorModel.find({
        tenantId,
        active: true,
        listType: { $in: listTypes },
      })
        .select('personRef tenantId listType modelVersion qualityScore embedding')
        .lean();

      return docs
        .map((doc) => ({
          personRef: doc.personRef,
          tenantId: doc.tenantId,
          listType: doc.listType,
          modelVersion: doc.modelVersion,
          qualityScore: doc.qualityScore,
          score: cosineSimilarity(embedding, doc.embedding),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
    }
  }

  createEvent(payload) {
    return FaceEventModel.create(payload);
  }
}
