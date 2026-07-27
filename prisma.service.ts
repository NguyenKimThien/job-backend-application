import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { MucDichMaXacThuc } from '../../../../generated/prisma/client.js';

@Injectable()
export class OtpService {
  constructor(private readonly configService: ConfigService) {}

  generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  hashOtp(accountId: number, purpose: MucDichMaXacThuc, otp: string): string {
    const pepper = this.configService.getOrThrow<string>('OTP_PEPPER');
    const payload = `${accountId}:${purpose}:${otp}`;

    return createHmac('sha256', pepper).update(payload).digest('hex');
  }

  compareOtp(
    accountId: number,
    purpose: MucDichMaXacThuc,
    otp: string,
    storedHash: string,
  ): boolean {
    const incomingHash = this.hashOtp(accountId, purpose, otp);
    const incoming = Buffer.from(incomingHash, 'hex');
    const stored = Buffer.from(storedHash, 'hex');

    if (incoming.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(incoming, stored);
  }

  calculateExpiry(from = new Date()): Date {
    return new Date(from.getTime() + this.getTtlSeconds() * 1000);
  }

  getTtlSeconds(): number {
    return this.configService.getOrThrow<number>('OTP_TTL_SECONDS');
  }

  getMaxAttempts(): number {
    return this.configService.getOrThrow<number>('OTP_MAX_ATTEMPTS');
  }

  getResendCooldownSeconds(): number {
    return this.configService.getOrThrow<number>('OTP_RESEND_COOLDOWN_SECONDS');
  }

  getMaxSendsPerHour(): number {
    return this.configService.getOrThrow<number>('OTP_MAX_SENDS_PER_HOUR');
  }
}
