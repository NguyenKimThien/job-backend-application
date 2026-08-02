import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VaiTroTaiKhoan } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiError } from '../api-error.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { defaultPermissions, type PermissionCode } from './permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user.role as VaiTroTaiKhoan;
    const effective = new Set<PermissionCode>(defaultPermissions(role));
    const overrides = await this.prisma.phanQuyenTaiKhoan.findMany({
      where: { taiKhoanId: request.user.sub },
    });
    for (const item of overrides) {
      if (item.duocPhep) effective.add(item.maQuyen as PermissionCode);
      else effective.delete(item.maQuyen as PermissionCode);
    }
    if (!required.every((permission) => effective.has(permission))) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'PERMISSION_DENIED',
        message: 'Bạn không có quyền thực hiện chức năng này.',
      });
    }
    return true;
  }
}
