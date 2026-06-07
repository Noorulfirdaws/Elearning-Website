import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: hash,
      },
    });

    const tokens = await this.generateTokens(user);

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'USER_REGISTER', entityType: 'User', entityId: user.id },
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive || user.isBanned) throw new UnauthorizedException('Account suspended');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.mfaEnabled && dto.mfaCode) {
      const valid = authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret! });
      if (!valid) throw new UnauthorizedException('Invalid MFA code');
    } else if (user.mfaEnabled && !dto.mfaCode) {
      return { requiresMfa: true };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const tokens = await this.generateTokens(user);

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id, ip },
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const session = await this.prisma.session.findFirst({
      where: { userId, sessionToken: refreshToken, expires: { gt: new Date() } },
      include: { user: true },
    });

    if (!session) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(session.user);
    await this.prisma.session.delete({ where: { id: session.id } });

    return tokens;
  }

  async logout(userId: string, sessionToken: string) {
    await this.prisma.session.deleteMany({ where: { userId, sessionToken } });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async handleOAuthLogin(profile: {
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar,
          emailVerified: new Date(),
        },
      });
    }

    await this.prisma.account.upsert({
      where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.providerId } },
      create: { userId: user.id, provider: profile.provider, providerAccountId: profile.providerId, type: 'oauth' },
      update: {},
    });

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000);

    await this.prisma.passwordReset.create({ data: { email, token, expiresAt } });

    return token;
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!reset) throw new BadRequestException('Invalid or expired reset token');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { email: reset.email }, data: { passwordHash: hash } });
    await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
  }

  async enableMfa(userId: string) {
    const secret = authenticator.generateSecret();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const otpauth = authenticator.keyuri(user.email, 'LMS Platform', secret);
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    return { secret, otpauth };
  }

  async confirmMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA setup not initiated');
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new BadRequestException('Invalid MFA code');
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('app.jwt.secret'),
      expiresIn: this.config.get('app.jwt.expiresIn'),
    });

    const refreshToken = uuidv4();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: refreshToken,
        expires: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  sanitizeUser(user: User) {
    const { passwordHash, mfaSecret, ...safe } = user;
    return safe;
  }
}
