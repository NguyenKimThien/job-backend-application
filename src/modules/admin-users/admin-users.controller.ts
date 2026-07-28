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
import { AdminUsersService } from './admin-users.service.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.updateStatus(id, dto, request.user.sub);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.updateRole(id, dto, request.user.sub);
  }
}
