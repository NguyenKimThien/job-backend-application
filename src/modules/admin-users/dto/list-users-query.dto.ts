import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  TrangThaiTaiKhoan,
  VaiTroTaiKhoan,
} from '../../../../generated/prisma/client.js';

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(VaiTroTaiKhoan)
  role?: VaiTroTaiKhoan;

  @IsOptional()
  @IsEnum(TrangThaiTaiKhoan)
  status?: TrangThaiTaiKhoan;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
