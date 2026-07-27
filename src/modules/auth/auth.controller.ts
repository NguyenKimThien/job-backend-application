import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { RegisterWorkerDto } from './dto/register-worker.dto.js';
import { ResendEmployerRegistrationOtpDto } from './dto/resend-employer-registration-otp.dto.js';
import { ResendRegistrationOtpDto } from './dto/resend-registration-otp.dto.js';
import { VerifyEmployerRegistrationOtpDto } from './dto/verify-employer-registration-otp.dto.js';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register/worker')
  @HttpCode(HttpStatus.CREATED)
  registerWorker(@Body() dto: RegisterWorkerDto) {
    return this.authService.registerWorker(dto);
  }

  @Post('verify-registration-otp')
  @HttpCode(HttpStatus.OK)
  verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  @Post('resend-registration-otp')
  @HttpCode(HttpStatus.OK)
  resendRegistrationOtp(@Body() dto: ResendRegistrationOtpDto) {
    return this.authService.resendRegistrationOtp(dto);
  }

  @Post('register/employer')
  @HttpCode(HttpStatus.CREATED)
  registerEmployer(@Body() dto: RegisterEmployerDto) {
    return this.authService.registerEmployer(dto);
  }

  @Post('verify-employer-registration-otp')
  @HttpCode(HttpStatus.OK)
  verifyEmployerRegistrationOtp(@Body() dto: VerifyEmployerRegistrationOtpDto) {
    return this.authService.verifyEmployerRegistrationOtp(dto);
  }

  @Post('resend-employer-registration-otp')
  @HttpCode(HttpStatus.OK)
  resendEmployerRegistrationOtp(@Body() dto: ResendEmployerRegistrationOtpDto) {
    return this.authService.resendEmployerRegistrationOtp(dto);
  }
}
