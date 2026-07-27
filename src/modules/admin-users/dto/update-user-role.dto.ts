import { IsEnum } from 'class-validator';
import { VaiTroTaiKhoan } from '../../../../generated/prisma/client.js';

export class UpdateUserRoleDto {
  @IsEnum(VaiTroTaiKhoan)
  role!: VaiTroTaiKhoan;
}
