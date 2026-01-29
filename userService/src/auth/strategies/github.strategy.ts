import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService, private readonly authService: AuthService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID', { infer: true }),
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET', { infer: true }),
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any) {
    return this.authService.handleOAuthProfile('github', profile);
  }
}
