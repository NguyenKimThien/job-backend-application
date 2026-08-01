import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VaiTroTaiKhoan } from '../../../generated/prisma/client.js';
import type { AuthenticatedRequest } from '../../common/auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { PermissionsGuard } from '../../common/auth/permissions.guard.js';
import { Permissions } from '../../common/auth/permissions.decorator.js';
import { PERMISSIONS } from '../../common/auth/permissions.js';
import { AdminUsersService } from './admin-users.service.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @Permissions(PERMISSIONS.XEM_TAI_KHOAN)
  list(@Query() query: ListUsersQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.XEM_TAI_KHOAN)
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.SUA_TAI_KHOAN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.updateStatus(id, dto, request.user.sub);
  }

  @Patch(':id/permissions')
  @Permissions(PERMISSIONS.PHAN_QUYEN_TAI_KHOAN)
  updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserPermissionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.updatePermissions(id, dto, request.user.sub);
  }
}
