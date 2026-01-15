import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { createAccessToken, createRefreshToken, verifyRefreshToken, ttlToMs } from "../utils/token.js";
import { AppError } from "../utils/errors.js";

class AuthService {
  constructor(userModel) {
    this.User = userModel;
  }

  async register(payload) {
    const existing = await this.User.findOne({ email: payload.email });
    if (existing) throw new AppError("Email already in use", 409);
    const user = new this.User({ name: payload.name, email: payload.email, password: payload.password });
    const access = createAccessToken(user.id);
    const refresh = createRefreshToken(user.id);
    await user.setRefreshToken(refresh.token, refresh.jti, refresh.expiresAt);
    await user.save();
    return { user, accessToken: access.token, accessExpiresAt: access.expiresAt, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt, refreshMaxAge: ttlToMs(env.refreshTokenTtl) };
  }

  async login(payload) {
    const user = await this.User.findOne({ email: payload.email });
    if (!user) throw new AppError("Invalid credentials", 401);
    const valid = await user.comparePassword(payload.password);
    if (!valid) throw new AppError("Invalid credentials", 401);
    const access = createAccessToken(user.id);
    const refresh = createRefreshToken(user.id);
    await user.setRefreshToken(refresh.token, refresh.jti, refresh.expiresAt);
    await user.save();
    return { user, accessToken: access.token, accessExpiresAt: access.expiresAt, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt, refreshMaxAge: ttlToMs(env.refreshTokenTtl) };
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new AppError("Unauthorized", 401);
    }
    const user = await this.User.findById(payload.sub);
    if (!user || !user.refreshTokenId || !user.refreshTokenHash || user.refreshTokenId !== payload.jti) {
      throw new AppError("Unauthorized", 401);
    }
    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      user.clearRefreshToken();
      await user.save();
      throw new AppError("Unauthorized", 401);
    }
    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) {
      user.clearRefreshToken();
      await user.save();
      throw new AppError("Unauthorized", 401);
    }
    const access = createAccessToken(user.id);
    const newRefresh = createRefreshToken(user.id);
    await user.setRefreshToken(newRefresh.token, newRefresh.jti, newRefresh.expiresAt);
    await user.save();
    return { user, accessToken: access.token, accessExpiresAt: access.expiresAt, refreshToken: newRefresh.token, refreshExpiresAt: newRefresh.expiresAt, refreshMaxAge: ttlToMs(env.refreshTokenTtl) };
  }

  async logout(userId) {
    const user = await this.User.findById(userId);
    if (user) {
      user.clearRefreshToken();
      await user.save();
    }
    return true;
  }

  async getProfile(userId) {
    const user = await this.User.findById(userId);
    if (!user) throw new AppError("Not found", 404);
    return user;
  }
}

export { AuthService };
