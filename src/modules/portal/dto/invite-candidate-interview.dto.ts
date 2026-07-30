import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { HinhThucPhongVan } from '../../../../generated/prisma/client.js';
import { normalizePhone } from '../../auth/utils/normalize-phone.util.js';

const trimString = (value: unknown) => String(value ?? '').trim();
const trimOptionalString = (value: unknown) => {
  const text = trimString(value);
  return text || undefined;
};

export class InviteCandidateInterviewDto {
  @IsDateString({}, { message: 'Thời gian phỏng vấn không hợp lệ.' })
  thoiGianBatDau!: string;

  @IsOptional()
  @IsDateString({}, { message: 'Giờ kết thúc không hợp lệ.' })
  thoiGianKetThuc?: string;

  @IsEnum(HinhThucPhongVan, {
    message: 'Hình thức phỏng vấn không hợp lệ.',
  })
  hinhThucPhongVan!: HinhThucPhongVan;

  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  diaDiemPhongVan?: string;

  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  duongDanPhongVan?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên người liên hệ.' })
  @MaxLength(255)
  nguoiLienHe!: string;

  @Transform(({ value }) => normalizePhone(value))
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại liên hệ.' })
  @Matches(/^\+84\d{9}$/, {
    message: 'Số điện thoại liên hệ không hợp lệ.',
  })
  soDienThoaiLienHe!: string;

  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  noiDungChuanBi?: string;

  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ghiChuPhongVan?: string;
}
