import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { USER_STATUS } from '../constants/user-status.js';

const decodeBase64ImageToBuffer = (imageBase64) => {
  const normalized = String(imageBase64 || '').trim();
  const cleaned = normalized.includes(',') ? normalized.split(',').pop() : normalized;
  return Buffer.from(cleaned, 'base64');
};

export class UserService {
  constructor({ userRepository, faceRecognitionClient, idCardVaultService, env, auditService }) {
    this.userRepository = userRepository;
    this.faceRecognitionClient = faceRecognitionClient;
    this.idCardVaultService = idCardVaultService;
    this.env = env;
    this.auditService = auditService;
  }

  toProfile(user) {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isFaceVerified: user.isFaceVerified,
      faceIdentityId: user.faceIdentityId,
      activationDeadline: user.activationDeadline,
      settings: user.settings,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, ERROR_CODES.AUTH_UNAUTHORIZED, 'User not found');
    }
    return this.toProfile(user);
  }

  async activateAccount(userId, payload, context = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, ERROR_CODES.AUTH_UNAUTHORIZED, 'User not found');
    }

    if (user.status === USER_STATUS.ARCHIVED) {
      throw new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Archived account cannot be activated');
    }

    if (!user.isEmailVerified || user.status === USER_STATUS.PENDING_EMAIL_VERIFICATION) {
      throw new ApiError(403, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Email verification is required first');
    }

    if (user.status === USER_STATUS.ACTIVE && user.isFaceVerified) {
      return { activated: true, profile: this.toProfile(user) };
    }

    if (user.status !== USER_STATUS.PENDING_FACE_ACTIVATION) {
      throw new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Account is not eligible for face activation');
    }

    const idFaceCheck = await this.faceRecognitionClient.compareIdWithFace({
      idCardImageBase64: payload.idCardImageBase64,
      liveImageBase64: payload.imageBase64,
      tenantId: this.env.FACE_SERVICE_TENANT_ID,
      requestId: context.requestId,
    });

    if (!idFaceCheck?.matched || idFaceCheck?.livenessStatus !== 'LIVE') {
      throw new ApiError(403, ERROR_CODES.FACE_ACTIVATION_BLOCKED, 'ID-face verification failed');
    }

    const searchResult = await this.faceRecognitionClient.searchWatchlists({
      imageBase64: payload.imageBase64,
      tenantId: this.env.FACE_SERVICE_TENANT_ID,
      threshold: this.env.FACE_SERVICE_SEARCH_THRESHOLD,
      requestId: context.requestId,
    });

    const topCandidate = Array.isArray(searchResult?.candidates) ? searchResult.candidates[0] : null;
    if (searchResult?.decision === 'MATCH_BLOCK' && ['BANNED', 'DEBTOR'].includes(topCandidate?.listType)) {
      throw new ApiError(403, ERROR_CODES.FACE_ACTIVATION_BLOCKED, `Activation blocked: ${topCandidate.listType}`);
    }

    const activationResult = await this.faceRecognitionClient.activateIdentity({
      imageBase64: payload.imageBase64,
      tenantId: this.env.FACE_SERVICE_TENANT_ID,
      personRef: user.id,
      requestId: context.requestId,
    });

    user.status = USER_STATUS.ACTIVE;
    user.isFaceVerified = true;
    user.faceIdentityId = activationResult?.identityId || user.faceIdentityId;
    user.idCardImage = this.idCardVaultService.encrypt(
      decodeBase64ImageToBuffer(payload.idCardImageBase64)
    );
    user.activationDeadline = null;
    await this.userRepository.save(user);

    this.auditService.log('auth.face_activation_success', {
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      activated: true,
      profile: this.toProfile(user),
      face: {
        identityId: user.faceIdentityId,
      },
    };
  }
}
