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

type SendPasswordResetOtpParams = SendRegistrationOtpParams;

type SendInterviewInvitationParams = {
  email: string;
  candidateName: string;
  employerName: string;
  jobTitle: string;
  startTime: string;
  endTime?: string | null;
  interviewMode: string;
  location?: string | null;
  meetingUrl?: string | null;
  contactName: string;
  contactPhone: string;
  preparation?: string | null;
  note?: string | null;
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
    const fromName = this.configService.getOrThrow<string>('SMTP_FROM_NAME');
    const fromEmail = this.configService.getOrThrow<string>('SMTP_FROM_EMAIL');
    const subject = 'Mã OTP xác thực đăng ký tài khoản';
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

  async sendPasswordResetOtp(
    params: SendPasswordResetOtpParams,
  ): Promise<void> {
    const fromName = this.configService.getOrThrow<string>('SMTP_FROM_NAME');
    const fromEmail = this.configService.getOrThrow<string>('SMTP_FROM_EMAIL');
    const subject = 'Mã OTP đặt lại mật khẩu';
    const text = [
      `Xin chào ${params.hoTen},`,
      '',
      `Mã OTP đặt lại mật khẩu của bạn là: ${params.otp}`,
      `Mã OTP hết hạn sau ${params.expiresInMinutes} phút.`,
      'Vui lòng không chia sẻ mã OTP này cho bất kỳ ai.',
    ].join('\n');
    const html = `
      <p>Xin chào ${this.escapeHtml(params.hoTen)},</p>
      <p>Mã OTP đặt lại mật khẩu của bạn là:</p>
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

  async sendInterviewInvitation(
    params: SendInterviewInvitationParams,
  ): Promise<void> {
    const fromName = this.configService.getOrThrow<string>('SMTP_FROM_NAME');
    const fromEmail = this.configService.getOrThrow<string>('SMTP_FROM_EMAIL');
    const subject = `Thư mời phỏng vấn - ${params.jobTitle}`;
    const rawDetails: Array<[string, string | null | undefined]> = [
      ['Tên ứng viên', params.candidateName],
      ['Đơn vị tuyển dụng', params.employerName],
      ['Vị trí ứng tuyển', params.jobTitle],
      ['Thời gian bắt đầu', params.startTime],
      ['Thời gian kết thúc', params.endTime],
      ['Hình thức phỏng vấn', params.interviewMode],
      ['Địa điểm', params.location],
      ['Đường dẫn tham gia', params.meetingUrl],
      ['Người liên hệ', params.contactName],
      ['Số điện thoại liên hệ', params.contactPhone],
      ['Nội dung cần chuẩn bị', params.preparation],
      ['Ghi chú', params.note],
    ];
    const details = rawDetails.filter(
      (item): item is [string, string] =>
        typeof item[1] === 'string' && Boolean(item[1].trim()),
    );

    const text = [
      `Xin chào ${params.candidateName},`,
      '',
      `Bạn đã nhận được lời mời phỏng vấn cho vị trí ${params.jobTitle} tại ${params.employerName}.`,
      '',
      ...details.map(([label, value]) => `${label}: ${value}`),
    ].join('\n');
    const htmlDetails = details
      .map(
        ([label, value]) =>
          `<li><strong>${this.escapeHtml(label)}:</strong> ${this.escapeHtml(value)}</li>`,
      )
      .join('');
    const html = `
      <p>Xin chào ${this.escapeHtml(params.candidateName)},</p>
      <p>Bạn đã nhận được lời mời phỏng vấn cho vị trí <strong>${this.escapeHtml(params.jobTitle)}</strong> tại ${this.escapeHtml(params.employerName)}.</p>
      <ul>${htmlDetails}</ul>
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
