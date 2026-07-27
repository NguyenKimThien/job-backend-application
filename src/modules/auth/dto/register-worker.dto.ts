import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { normalizeEmail } from '../utils/normalize-email.util.js';
import { normalizePhone } from '../utils/normalize-phone.util.js';

function MatchPassword(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'matchPassword',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return value === relatedValue;
        },
      },
    });
  };
}

export class RegisterWorkerDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  hoTen!: string;
  
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsString()
  @IsNotEmpty()
  @Length(4, 30)
  @Matches(/^[a-zA-Z0-9._]+$/)
  tenDangNhap!: string;

  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @Transform(({ value }) => normalizePhone(value))
  @IsOptional()
  @IsString()
  @Matches(/^\+84\d{9}$/)
  soDienThoai?: string;

  @IsString()
  @Length(8, 64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
  matKhau!: string;

  @IsString()
  @MatchPassword('matKhau', {
    message: 'Mật khẩu xác nhận không khớp.',
  })
  xacNhanMatKhau!: string;

}
