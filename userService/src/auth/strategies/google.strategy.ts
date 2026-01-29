import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService, private readonly authService: AuthService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', { infer: true }),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', { infer: true }),
      callbackURL: '/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    return this.authService.handleOAuthProfile('google', profile);
  }
}
