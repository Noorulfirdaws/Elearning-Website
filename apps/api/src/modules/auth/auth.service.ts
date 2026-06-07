import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // AES-256-GCM encryption for MFA secrets at rest
  private encryptSecret(plain: string): string {
    const key = Buffer.from(this.config.get('ENCRYPTION_KEY') || crypto.randomBytes(32).toString('hex'), 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptSecret(encoded: string): string {
    const key = Buffer.from(this.config.get('ENCRYPTION_KEY') || '', 'hex');
    const [ivHex, tagHex, encHex] = encoded.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
  }

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
    // Always run bcrypt to prevent timing-based email enumeration
    const dummyHash = '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const hashToCompare = user?.passwordHash || dummyHash;
    const valid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !user.passwordHash || !valid) {
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: { increment: 1 }, lastFailedLoginAt: new Date() },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive || user.isBanned) throw new UnauthorizedException('Account suspended');

    // Account lockout after repeated failures
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutExpiry = new Date((user.lastFailedLoginAt?.getTime() || 0) + LOCKOUT_DURATION_MS);
      if (new Date() < lockoutExpiry) {
        const remaining = Math.ceil((lockoutExpiry.getTime() - Date.now()) / 60000);
        throw new UnauthorizedException(`Account locked. Try again in ${remaining} minute(s).`);
      }
    }

    if (user.mfaEnabled && dto.mfaCode) {
      const secret = this.decryptSecret(user.mfaSecret!);
      const mfaValid = authenticator.verify({ token: dto.mfaCode, secret });
      if (!mfaValid) throw new UnauthorizedException('Invalid MFA code');
    } else if (user.mfaEnabled && !dto.mfaCode) {
      return { requiresMfa: true };
    }

    // Reset lockout counter on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0 },
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
    // Encrypt the TOTP secret before storing
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: this.encryptSecret(secret) } });
    return { secret, otpauth }; // Return plaintext secret only once for QR code display
  }

  async confirmMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA setup not initiated');
    const secret = this.decryptSecret(user.mfaSecret);
    const valid = authenticator.verify({ token: code, secret });
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
