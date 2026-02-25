import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class SessionService {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async getBySessionId(sessionId) {
    return this.sessionRepository.findBySessionId(sessionId);
  }

  async listUserSessions(userId) {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);
    return sessions.map((session) => ({
      sessionId: session.sessionId,
      familyId: session.familyId,
      userAgent: session.userAgent,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
    }));
  }

  async revokeSession(userId, sessionId) {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session || String(session.userId) !== String(userId)) {
      throw new ApiError(404, ERROR_CODES.AUTH_SESSION_NOT_FOUND, 'Session not found');
    }
    await this.sessionRepository.revokeSession(sessionId);
    return { revoked: true };
  }

  async revokeAll(userId, exceptSessionId = null) {
    const revokedSessions = await this.sessionRepository.revokeAllForUser(userId, 'logout_all', exceptSessionId);
    return { revokedSessions };
  }
}
