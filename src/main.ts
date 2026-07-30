import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      exceptionFactory: (validationErrors: ValidationError[]) => {
        const labels: Record<string, string> = {
          email: 'Email',
          soDienThoai: 'Số điện thoại',
          matKhau: 'Mật khẩu',
          xacNhanMatKhau: 'Mật khẩu xác nhận',
          currentPassword: 'Mật khẩu hiện tại',
          newPassword: 'Mật khẩu mới',
          confirmPassword: 'Mật khẩu xác nhận',
          tendangnhap: 'Thông tin đăng nhập',
          tenDangNhap: 'Tên đăng nhập',
          hoTen: 'Họ và tên',
          tenDonVi: 'Tên đơn vị',
          maSoThue: 'Mã số thuế',
          diaChiTruSo: 'Địa chỉ trụ sở',
          otp: 'Mã OTP',
        };
        const fieldErrors: Record<string, string[]> = {};
        const collect = (error: ValidationError) => {
          const label = labels[error.property] ?? error.property;
          const messages = Object.entries(error.constraints ?? {}).map(
            ([constraint, original]) => {
              if (/[À-ỹ]/u.test(original)) return original;
              if (constraint === 'isNotEmpty') return `${label} không được để trống.`;
              if (constraint === 'isEmail') return `${label} không đúng định dạng.`;
              if (constraint === 'isString') return `${label} phải là chuỗi ký tự.`;
              if (constraint === 'matches') return `${label} không đúng định dạng.`;
              if (constraint === 'minLength') return `${label} chưa đủ độ dài tối thiểu.`;
              if (constraint === 'maxLength') return `${label} vượt quá độ dài cho phép.`;
              if (constraint === 'length') return `${label} có độ dài không hợp lệ.`;
              if (constraint === 'isEnum') return `${label} có giá trị không hợp lệ.`;
              return `${label} không hợp lệ.`;
            },
          );
          if (messages.length) fieldErrors[error.property] = messages;
          error.children?.forEach(collect);
        };
        validationErrors.forEach(collect);
        const messages = Object.values(fieldErrors).flat();
        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: messages.length
            ? messages
            : ['Thông tin nhập vào không hợp lệ.'],
          errors: fieldErrors,
        });
      },
    }),
  );
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
