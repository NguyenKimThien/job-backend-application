import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './repositories/auth.repository.js';
import { OtpService } from './services/otp.service.js';

@Module({
  imports: [
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = Number(
          configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS') ?? 900,
        );

        return {
          secret:
            configService.get<string>('JWT_SECRET') ??
            configService.getOrThrow<string>('OTP_PEPPER'),
          signOptions: {
            expiresIn:
              Number.isInteger(expiresIn) && expiresIn > 0 ? expiresIn : 900,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, OtpService],
})
export class AuthModule {}
