import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('app.github.clientId') || 'placeholder',
      clientSecret: config.get('app.github.clientSecret') || 'placeholder',
      callbackURL: config.get('app.github.callbackUrl') || 'http://localhost:4000/api/v1/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
    const nameParts = (profile.displayName || profile.username || '').split(' ');
    done(null, {
      email,
      firstName: nameParts[0] || profile.username,
      lastName: nameParts.slice(1).join(' ') || '',
      avatar: profile.photos?.[0]?.value,
      provider: 'github',
      providerId: String(profile.id),
    });
  }
}
