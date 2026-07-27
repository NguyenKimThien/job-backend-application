process.env.DATABASE_URL ??=
  'postgresql://postgres:password@localhost:5432/test';
process.env.OTP_PEPPER ??= 'test-otp-pepper-that-is-long-enough-123456';
process.env.SMTP_HOST ??= 'smtp.example.com';
process.env.SMTP_USER ??= 'user@example.com';
process.env.SMTP_PASSWORD ??= 'password';
process.env.SMTP_FROM_NAME ??= 'Test Sender';
process.env.SMTP_FROM_EMAIL ??= 'no-reply@example.com';
