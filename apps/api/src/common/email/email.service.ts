import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, token: string, firstName: string) {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const link = `${frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">🎓 LearnHub</h1>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1f2937;margin-top:0;">Hi ${firstName}, confirm your email</h2>
            <p style="color:#6b7280;line-height:1.6;">
              Thanks for signing up! Click the button below to verify your email address and activate your account.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${link}"
                style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                Verify Email
              </a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">
              This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
            <p style="color:#d1d5db;font-size:12px;text-align:center;">
              Or copy this URL into your browser:<br>
              <span style="color:#6366f1;word-break:break-all;">${link}</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LearnHub" <${this.config.get('SMTP_FROM', this.config.get('SMTP_USER'))}>`,
        to,
        subject: 'Verify your LearnHub email',
        html,
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}: ${err.message}`);
      // Don't throw — registration still succeeds; user can resend
    }
  }

  async sendPasswordResetEmail(to: string, token: string, firstName: string) {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const link = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">🎓 LearnHub</h1>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1f2937;margin-top:0;">Reset your password</h2>
            <p style="color:#6b7280;">Hi ${firstName}, click below to reset your password. This link expires in 1 hour.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${link}" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">If you didn't request this, ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LearnHub" <${this.config.get('SMTP_FROM', this.config.get('SMTP_USER'))}>`,
        to,
        subject: 'Reset your LearnHub password',
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send password reset email: ${err.message}`);
    }
  }
}
