type Env = Record<string, unknown>;

const requiredKeys = [
  'DATABASE_URL',
  'OTP_PEPPER',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_NAME',
  'SMTP_FROM_EMAIL',
];

const integerKeys = [
  'OTP_TTL_SECONDS',
  'OTP_MAX_ATTEMPTS',
  'OTP_RESEND_COOLDOWN_SECONDS',
  'OTP_MAX_SENDS_PER_HOUR',
  'BCRYPT_SALT_ROUNDS',
  'SMTP_PORT',
];

const defaultValues: Record<string, string> = {
  OTP_TTL_SECONDS: '300',
  OTP_MAX_ATTEMPTS: '5',
  OTP_RESEND_COOLDOWN_SECONDS: '60',
  OTP_MAX_SENDS_PER_HOUR: '5',
  BCRYPT_SALT_ROUNDS: '12',
  SMTP_PORT: '587',
  SMTP_ENABLED: 'false',
  SMTP_SECURE: 'false',
  SMTP_FORCE_IPV4: 'false',
};

export function validateEnv(config: Env): Env {
  const validated = { ...defaultValues, ...config };

  for (const key of requiredKeys) {
    if (!validated[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  for (const key of integerKeys) {
    const value = Number(validated[key]);

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${key} must be a positive integer`);
    }

    validated[key] = value;
  }

  const smtpEnabled = String(validated.SMTP_ENABLED).toLowerCase();

  if (!['true', 'false'].includes(smtpEnabled)) {
    throw new Error('SMTP_ENABLED must be true or false');
  }

  validated.SMTP_ENABLED = smtpEnabled === 'true';

  const smtpSecure = String(validated.SMTP_SECURE).toLowerCase();

  if (!['true', 'false'].includes(smtpSecure)) {
    throw new Error('SMTP_SECURE must be true or false');
  }

  validated.SMTP_SECURE = smtpSecure === 'true';

  const smtpForceIpv4 = String(validated.SMTP_FORCE_IPV4).toLowerCase();

  if (!['true', 'false'].includes(smtpForceIpv4)) {
    throw new Error('SMTP_FORCE_IPV4 must be true or false');
  }

  validated.SMTP_FORCE_IPV4 = smtpForceIpv4 === 'true';

  if (String(validated.OTP_PEPPER).length < 32) {
    throw new Error('OTP_PEPPER must contain at least 32 characters');
  }

  return validated;
}
