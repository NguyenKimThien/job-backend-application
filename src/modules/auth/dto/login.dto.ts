import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập email, số điện thoại hoặc tên đăng nhập.' })
  @MaxLength(255, { message: 'Thông tin đăng nhập không được vượt quá 255 ký tự.' })
  tendangnhap!: string;

  @IsString({ message: 'Mật khẩu không hợp lệ.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  matKhau!: string;
}
