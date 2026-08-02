import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
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
  @IsIn(['true', 'false'])
  verified?: 'true' | 'false';

  @IsOptional()
  @IsIn(['true', 'false'])
  hasProfile?: 'true' | 'false';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
