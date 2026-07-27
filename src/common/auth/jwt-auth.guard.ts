import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiError } from '../api-error.js';

export type AuthenticatedUser = {
  sub: number;
  role: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Vui lòng đăng nhập để tiếp tục.',
      });
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUser>(
        authorization.slice(7),
      );
      return true;
    } catch {
      throw new ApiError(HttpStatus.UNAUTHORIZED, {
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
    }
  }
}
