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
import { normalizeTaxCode } from '../utils/normalize-tax-code.util.js';

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

export class RegisterEmployerDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @MaxLength(255)
  email!: string;

  @Transform(({ value }) => normalizePhone(value))
  @IsOptional()
  @IsString()
  @Matches(/^\+84\d{9}$/, {
    message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.',
  })
  soDienThoai?: string;

  @IsString()
  @Length(8, 64, { message: 'Mật khẩu phải có từ 8 đến 64 ký tự.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
  })
  matKhau!: string;

  @IsString()
  @MatchPassword('matKhau', {
    message: 'Mật khẩu xác nhận không khớp.',
  })
  xacNhanMatKhau!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @Length(2, 255, { message: 'Tên đơn vị phải có từ 2 đến 255 ký tự.' })
  tenDonVi!: string;

  @Transform(({ value }) => normalizeTaxCode(String(value ?? '')))
  @IsString()
  @Matches(/^\d{10}(\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 chữ số hoặc 13 chữ số.',
  })
  maSoThue!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  diaChiTruSo!: string;
}
