import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { normalizeEmail } from '../utils/normalize-email.util.js';

export class ResendEmployerRegistrationOtpDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
