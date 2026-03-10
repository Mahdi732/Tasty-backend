import { ok } from '../utils/api-response.js';

export class SessionController {
  constructor(sessionService) {
    this.sessionService = sessionService;
  }

  list = async (req, res) => {
    const sessions = await this.sessionService.listUserSessions(req.auth.userId);
    return ok(res, sessions);
  };

  revoke = async (req, res) => {
    const result = await this.sessionService.revokeSession(req.auth.userId, req.params.sessionId);
    return ok(res, result);
  };
}

