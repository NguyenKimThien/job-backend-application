import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tendangnhap!: string;

  @IsString()
  @IsNotEmpty()
  matKhau!: string;
}
