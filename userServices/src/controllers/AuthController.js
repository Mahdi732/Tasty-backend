import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";

class AuthController {
  constructor(authService) {
    this.authService = authService;
    this.register = asyncHandler(this.register.bind(this));
    this.login = asyncHandler(this.login.bind(this));
    this.refresh = asyncHandler(this.refresh.bind(this));
    this.logout = asyncHandler(this.logout.bind(this));
    this.me = asyncHandler(this.me.bind(this));
  }

  setRefreshCookie(res, token, maxAge) {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: "lax",
      maxAge,
      path: "/api/auth/refresh"
    });
  }

  clearRefreshCookie(res) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: "lax",
      path: "/api/auth/refresh"
    });
  }

  async register(req, res) {
    const result = await this.authService.register({ name: req.body.name, email: req.body.email, password: req.body.password });
    this.setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
    res.status(201).json({ user: result.user, accessToken: result.accessToken, accessExpiresAt: result.accessExpiresAt });
  }

  async login(req, res) {
    const result = await this.authService.login({ email: req.body.email, password: req.body.password });
    this.setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
    res.status(200).json({ user: result.user, accessToken: result.accessToken, accessExpiresAt: result.accessExpiresAt });
  }

  async refresh(req, res) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError("Unauthorized", 401);
    }
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
    res.status(200).json({ user: result.user, accessToken: result.accessToken, accessExpiresAt: result.accessExpiresAt });
  }

  async logout(req, res) {
    await this.authService.logout(req.userId);
    this.clearRefreshCookie(res);
    res.status(204).send();
  }

  async me(req, res) {
    const user = await this.authService.getProfile(req.userId);
    res.status(200).json({ user });
  }
}

export { AuthController };
