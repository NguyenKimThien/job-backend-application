import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TrangThaiTaiKhoan } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Vui lòng đăng nhập để tiếp tục.',
      });
    }

    let tokenUser: AuthenticatedUser;
    try {
      tokenUser = await this.jwtService.verifyAsync<AuthenticatedUser>(
        authorization.slice(7),
      );
    } catch {
      throw new ApiError(HttpStatus.UNAUTHORIZED, {
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
    }

    const account = await this.prisma.taiKhoan.findUnique({
      where: { id: tokenUser.sub },
      select: { id: true, email: true, vaiTro: true, trangThaiTaiKhoan: true },
    });
    if (
      !account ||
      account.trangThaiTaiKhoan !== TrangThaiTaiKhoan.HOAT_DONG
    ) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, {
        code: 'ACCOUNT_NOT_ACTIVE',
        message: 'Tài khoản không tồn tại hoặc không ở trạng thái hoạt động.',
      });
    }
    if (tokenUser.role !== account.vaiTro) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, {
        code: 'ROLE_CHANGED',
        message:
          'Vai trò tài khoản đã thay đổi. Vui lòng đăng nhập lại để tiếp tục.',
      });
    }

    request.user = {
      sub: account.id,
      email: account.email,
      role: account.vaiTro,
    };
    return true;
  }
}
