import { SetMetadata } from '@nestjs/common';
import { VaiTroTaiKhoan } from '../../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: VaiTroTaiKhoan[]) =>
  SetMetadata(ROLES_KEY, roles);
