import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './repositories/auth.repository.js';
import { OtpService } from './services/otp.service.js';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, OtpService],
})
export class AuthModule {}
