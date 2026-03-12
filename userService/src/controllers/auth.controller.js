import { ok } from '../utils/api-response.js';

const attachRefreshToken = (res, env, refreshToken) => {
  if (env.REFRESH_TOKEN_TRANSPORT === 'cookie' || env.REFRESH_TOKEN_TRANSPORT === 'both') {
    // Security: HttpOnly cookie blocks JS access, reducing token theft via XSS.
    res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: '/auth',
      maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }
};

const clearRefreshToken = (res, env) => {
  if (env.REFRESH_TOKEN_TRANSPORT === 'cookie' || env.REFRESH_TOKEN_TRANSPORT === 'both') {
    res.clearCookie(env.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: '/auth',
    });
  }
};

const refreshTransportPayload = (env, tokens) => ({
  ...tokens,
  refreshToken:
    env.REFRESH_TOKEN_TRANSPORT === 'cookie' ? undefined : tokens.refreshToken,
});

export class AuthController {
  constructor({ env, authService, userService }) {
    this.env = env;
    this.authService = authService;
    this.userService = userService;
  }

  register = async (req, res) => {
    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      deviceId: req.body.deviceId,
    };
    const result = await this.authService.register(req.body, context);
    if (result.refreshToken) {
      attachRefreshToken(res, this.env, result.refreshToken);
    }
    return ok(res, refreshTransportPayload(this.env, result), 201);
  };

  login = async (req, res) => {
    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      deviceId: req.body.deviceId,
    };
    const result = await this.authService.login(req.body, context);
    attachRefreshToken(res, this.env, result.refreshToken);
    return ok(res, refreshTransportPayload(this.env, result));
  };

  refresh = async (req, res) => {
    const cookieToken = req.cookies?.[this.env.REFRESH_COOKIE_NAME];
    const bodyToken = req.body?.refreshToken;
    const refreshToken = cookieToken || bodyToken;

    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      deviceId: req.body?.deviceId,
    };

    const result = await this.authService.refresh(refreshToken, context);
    attachRefreshToken(res, this.env, result.refreshToken);
    return ok(res, refreshTransportPayload(this.env, result));
  };

  logout = async (req, res) => {
    const cookieToken = req.cookies?.[this.env.REFRESH_COOKIE_NAME];
    const bodyToken = req.body?.refreshToken;
    const refreshToken = bodyToken || cookieToken;

    if (req.body?.sessionId) {
      await this.authService.logoutByAccessSession(req.auth.userId, req.body.sessionId);
    } else if (refreshToken) {
      await this.authService.logoutByRefreshToken(req.auth.userId, refreshToken);
    } else {
      await this.authService.logoutByAccessSession(req.auth.userId, req.auth.sessionId);
    }

    clearRefreshToken(res, this.env);
    return ok(res, { revoked: true });
  };

  logoutAll = async (req, res) => {
    const exceptCurrentSession = req.body?.exceptCurrentSession ? req.auth.sessionId : null;
    const result = await this.authService.logoutAll(req.auth.userId, exceptCurrentSession);
    clearRefreshToken(res, this.env);
    return ok(res, result);
  };

  me = async (req, res) => {
    const profile = await this.userService.getProfile(req.auth.userId);
    return ok(res, profile);
  };

  profile = async (req, res) => {
    const profile = await this.userService.getProfile(req.auth.userId);
    return ok(res, profile);
  };

  activateAccount = async (req, res) => {
    const result = await this.userService.activateAccount(req.auth.userId, req.body, {
      requestId: req.requestId,
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
    });
    return ok(res, result);
  };

  startEmailVerification = async (req, res) => {
    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
    };
    const result = await this.authService.startEmailVerification(req.body, context);
    return ok(res, result);
  };

  verifyEmail = async (req, res) => {
    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
    };
    const result = await this.authService.verifyEmail(req.body, context);
    return ok(res, result);
  };

  requestEmailChange = async (_req, res) => {
    const result = await this.authService.requestEmailChange();
    return ok(res, result, 501);
  };

  startPhoneVerification = async (req, res) => {
    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      requestId: req.requestId,
    };
    const result = await this.authService.startPhoneVerification(req.auth.userId, req.body, context);
    return ok(res, result);
  };

  verifyPhone = async (req, res) => {
    const context = {
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      requestId: req.requestId,
    };
    const result = await this.authService.verifyPhone(req.auth.userId, req.body, context);
    return ok(res, result);
  };
}

