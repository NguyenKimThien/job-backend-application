import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @Length(8, 64, { message: 'Mật khẩu mới phải có từ 8 đến 64 ký tự.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'Mật khẩu mới phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
  })
  newPassword!: string;

  @IsString()
  confirmPassword!: string;
}
