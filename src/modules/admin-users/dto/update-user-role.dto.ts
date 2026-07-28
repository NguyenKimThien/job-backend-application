import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VaiTroTaiKhoan } from '../../../../generated/prisma/client.js';

export class UpdateUserRoleDto {
  @IsEnum(VaiTroTaiKhoan)
  role!: VaiTroTaiKhoan;

  @IsOptional()
  @IsString()
  hoTen?: string;

  @IsOptional()
  @IsString()
  tenDonVi?: string;

  @IsOptional()
  @IsString()
  maSoThue?: string;

  @IsOptional()
  @IsString()
  diaChiTruSo?: string;
}
