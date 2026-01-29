import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Provider, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from '../common/constants';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  provider: Provider;
  verified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const verificationToken = randomUUID();
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        roles: [Role.USER],
        provider: Provider.LOCAL,
        verificationToken,
        verificationExpires,
      },
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { tokens, user: this.sanitizeUser(user) };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return null;
    }
    const match = await argon2.verify(user.password, password);
    return match ? user : null;
  }

  async login(user: User, res: Response) {
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: this.sanitizeUser(user) };
  }

  async loginWithCredentials(dto: LoginDto, res: Response) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.login(user, res);
  }

  async refreshTokens(userId: string, refreshToken: string, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!matches) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: this.sanitizeUser(user) };
  }

  async logout(userId: string, res: Response) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const now = new Date();
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: dto.token,
        verificationExpires: { gt: now },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verificationToken: null, verificationExpires: null },
    });

    return this.sanitizeUser(updated);
  }

  async handleOAuthProfile(provider: 'google' | 'github', profile: any) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequestException('Email not provided by provider');
    }

    const providerId = profile.id;
    const name = profile.displayName ?? profile.username;
    const avatarUrl = profile.photos?.[0]?.value;

    const data = {
      email,
      name,
      avatarUrl,
      verified: true,
      provider: provider === 'google' ? Provider.GOOGLE : Provider.GITHUB,
      googleId: provider === 'google' ? providerId : undefined,
      githubId: provider === 'github' ? providerId : undefined,
      roles: [Role.USER],
    } as const;

    const user = await this.prisma.user.upsert({
      where: { email },
      update: data,
      create: data,
    });

    return user;
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      provider: user.provider,
      verified: user.verified,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get<string>('ACCESS_TOKEN_TTL', { infer: true }),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get<string>('REFRESH_TOKEN_TTL', { infer: true }),
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const hash = await argon2.hash(token);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: hash } });
  }

  public setRefreshCookie(res: Response, token: string) {
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    const maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshTokenHash, verificationToken, verificationExpires, ...rest } = user;
    return rest;
  }
}
