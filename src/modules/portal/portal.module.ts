import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import {
  ProtectedPortalController,
  PublicPortalController,
} from './portal.controller.js';
import { PortalService } from './portal.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ??
          config.getOrThrow<string>('OTP_PEPPER'),
      }),
    }),
  ],
  controllers: [PublicPortalController, ProtectedPortalController],
  providers: [PortalService, JwtAuthGuard, RolesGuard],
})
export class PortalModule {}
