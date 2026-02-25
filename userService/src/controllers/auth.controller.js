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
    attachRefreshToken(res, this.env, result.refreshToken);
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
}
