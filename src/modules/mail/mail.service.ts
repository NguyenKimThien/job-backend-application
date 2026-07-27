import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setDefaultResultOrder } from 'dns';
import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

type SendRegistrationOtpParams = {
  email: string;
  hoTen: string;
  otp: string;
  expiresInMinutes: number;
};

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const forceIpv4 = this.configService.getOrThrow<boolean>('SMTP_FORCE_IPV4');

    if (forceIpv4) {
      setDefaultResultOrder('ipv4first');
    }

    const options: SMTPTransport.Options = {
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: this.configService.getOrThrow<number>('SMTP_PORT'),
      secure: this.configService.getOrThrow<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(options);
  }

  async verifyConnection(): Promise<void> {
    await this.transporter.verify();
  }

  async sendRegistrationOtp(params: SendRegistrationOtpParams): Promise<void> {
    if (!this.configService.get<boolean>('SMTP_ENABLED')) {
      return;
    }

    const fromName = this.configService.getOrThrow<string>('SMTP_FROM_NAME');
    const fromEmail = this.configService.getOrThrow<string>('SMTP_FROM_EMAIL');
    const subject = 'Mã OTP xác thực đăng ký tài khoản Người lao động';
    const text = [
      `Xin chào ${params.hoTen},`,
      '',
      `Mã OTP xác thực đăng ký của bạn là: ${params.otp}`,
      `Mã OTP hết hạn sau ${params.expiresInMinutes} phút.`,
      'Vui lòng không chia sẻ mã OTP này cho bất kỳ ai.',
    ].join('\n');
    const html = `
      <p>Xin chào ${this.escapeHtml(params.hoTen)},</p>
      <p>Mã OTP xác thực đăng ký của bạn là:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${params.otp}</p>
      <p>Mã OTP hết hạn sau ${params.expiresInMinutes} phút.</p>
      <p>Vui lòng không chia sẻ mã OTP này cho bất kỳ ai.</p>
    `;

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.email,
      subject,
      text,
      html,
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
