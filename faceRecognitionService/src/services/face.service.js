import { MATCH_DECISION } from '../constants/face.js';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

const cosineSimilarity = (vectorA, vectorB) => {
  const dot = vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0);
  const magA = Math.sqrt(vectorA.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(vectorB.reduce((sum, value) => sum + value * value, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
};

const decodeBase64Image = (imageBase64) => {
  const normalized = String(imageBase64 || '').trim();
  const cleaned = normalized.includes(',') ? normalized.split(',').pop() : normalized;
  return Buffer.from(cleaned, 'base64');
};

export class FaceService {
  constructor({ env, logger, vectorRepository, embedderClient }) {
    this.env = env;
    this.logger = logger;
    this.vectorRepository = vectorRepository;
    this.embedderClient = embedderClient;
  }

  toDecision(score, threshold, reviewThreshold) {
    if (score >= threshold) return MATCH_DECISION.MATCH_BLOCK;
    if (score >= reviewThreshold) return MATCH_DECISION.REVIEW;
    return MATCH_DECISION.NO_MATCH;
  }

  async activate(payload, context) {
    const startedAt = Date.now();
    const imageBuffer = decodeBase64Image(payload.imageBase64);
    const embeddingResult = await this.embedderClient.extractEmbedding(imageBuffer);

    if (embeddingResult.dimension !== this.env.EMBEDDING_DIMENSION) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Embedding dimension mismatch');
    }

    const identity = await this.vectorRepository.upsertIdentity({
      personRef: payload.personRef,
      tenantId: payload.tenantId,
      listType: payload.listType,
      reason: payload.reason || null,
    });

    const vector = await this.vectorRepository.upsertVector({
      identity,
      embedding: embeddingResult.embedding,
      dim: embeddingResult.dimension,
      modelVersion: embeddingResult.modelVersion || 'placeholder-v1',
      qualityScore: embeddingResult.qualityScore || 0,
    });

    const result = {
      identityId: String(identity._id),
      personRef: vector.personRef,
      tenantId: vector.tenantId,
      listType: vector.listType,
      dim: vector.dim,
      modelVersion: vector.modelVersion,
      qualityScore: vector.qualityScore,
      activated: true,
    };

    await this.vectorRepository.createEvent({
      requestId: context.requestId,
      eventType: 'FACE_ACTIVATED',
      tenantId: payload.tenantId,
      personRef: payload.personRef,
      result,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  }

  async search(payload, context) {
    const startedAt = Date.now();
    const imageBuffer = decodeBase64Image(payload.imageBase64);
    const embeddingResult = await this.embedderClient.extractEmbedding(imageBuffer);

    const candidates = await this.vectorRepository.vectorSearch({
      embedding: embeddingResult.embedding,
      tenantId: payload.tenantId,
      listTypes: payload.targetLists,
      topK: payload.topK || this.env.DEFAULT_K_CANDIDATES,
      indexName: this.env.VECTOR_SEARCH_INDEX_NAME,
    });

    const top = candidates[0];
    const threshold = payload.threshold || this.env.DEFAULT_MATCH_THRESHOLD;
    const reviewThreshold = this.env.REVIEW_THRESHOLD;
    const topScore = top?.score || 0;

    const result = {
      decision: this.toDecision(topScore, threshold, reviewThreshold),
      topScore,
      threshold,
      reviewThreshold,
      candidates,
    };

    await this.vectorRepository.createEvent({
      requestId: context.requestId,
      eventType: 'FACE_SEARCHED',
      tenantId: payload.tenantId,
      personRef: null,
      result,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  }

  async verify(payload, context) {
    const startedAt = Date.now();
    const imageBuffer = decodeBase64Image(payload.imageBase64);
    const embeddingResult = await this.embedderClient.extractEmbedding(imageBuffer);
    const stored = await this.vectorRepository.findVectorByPersonRef(payload.tenantId, payload.personRef);

    if (!stored) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Stored face embedding not found');
    }

    const score = cosineSimilarity(embeddingResult.embedding, stored.embedding);
    const threshold = payload.threshold || this.env.DEFAULT_MATCH_THRESHOLD;
    const result = {
      verified: score >= threshold,
      score,
      threshold,
      personRef: stored.personRef,
      modelVersion: stored.modelVersion,
    };

    await this.vectorRepository.createEvent({
      requestId: context.requestId,
      eventType: 'FACE_VERIFIED',
      tenantId: payload.tenantId,
      personRef: payload.personRef,
      result,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  }

  async compareIdWithFace(payload, context) {
    const startedAt = Date.now();
    const idCardBuffer = decodeBase64Image(payload.idCardImageBase64);
    const liveImageBuffer = decodeBase64Image(payload.liveImageBase64);

    const compareResult = await this.embedderClient.compareIdWithFace(idCardBuffer, liveImageBuffer);

    const result = {
      matched: Boolean(compareResult?.matched),
      score: Number(compareResult?.score || 0),
      threshold: Number(compareResult?.threshold || 0),
      livenessStatus: String(compareResult?.livenessStatus || 'UNKNOWN'),
      spoofScore: Number(compareResult?.spoofScore || 0),
      reasons: Array.isArray(compareResult?.reasons) ? compareResult.reasons : [],
    };

    await this.vectorRepository.createEvent({
      requestId: context.requestId,
      eventType: 'FACE_ID_VERIFIED',
      tenantId: payload.tenantId,
      personRef: null,
      result,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  }
}
