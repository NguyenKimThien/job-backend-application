import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrangThaiTaiKhoan } from '../../../../generated/prisma/client.js';

export class UpdateUserStatusDto {
  @IsEnum(TrangThaiTaiKhoan)
  status!: TrangThaiTaiKhoan;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
