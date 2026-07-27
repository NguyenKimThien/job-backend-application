import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { normalizeEmail } from '../utils/normalize-email.util.js';

export class VerifyEmployerRegistrationOtpDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;
}
