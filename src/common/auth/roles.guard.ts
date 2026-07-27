import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VaiTroTaiKhoan } from '../../../generated/prisma/client.js';
import { ApiError } from '../api-error.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<VaiTroTaiKhoan[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!requiredRoles.includes(request.user.role as VaiTroTaiKhoan)) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'ACCESS_DENIED',
        message: 'Bạn không có quyền thực hiện chức năng này.',
      });
    }

    return true;
  }
}
