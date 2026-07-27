import 'dotenv/config';
import { setDefaultResultOrder } from 'dns';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readBoolean(name: string, defaultValue?: boolean): boolean {
  const rawValue = process.env[name];

  if (!rawValue && defaultValue !== undefined) {
    return defaultValue;
  }

  const value = requireEnv(name).toLowerCase();

  if (!['true', 'false'].includes(value)) {
    throw new Error(`${name} must be true or false`);
  }

  return value === 'true';
}

function readPort(name: string): number {
  const value = Number(requireEnv(name));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

async function main() {
  const host = requireEnv('SMTP_HOST');
  const port = readPort('SMTP_PORT');
  const secure = readBoolean('SMTP_SECURE');
  const forceIpv4 = readBoolean('SMTP_FORCE_IPV4', false);
  const user = requireEnv('SMTP_USER');
  const password = requireEnv('SMTP_PASSWORD');
  const fromEmail = requireEnv('SMTP_FROM_EMAIL');

  if (host === 'smtp.gmail.com' && port === 587 && secure) {
    console.warn(
      'Warning: Gmail with port 587 should usually use SMTP_SECURE=false.',
    );
  }

  if (host === 'smtp.gmail.com' && port === 465 && !secure) {
    console.warn(
      'Warning: Gmail with port 465 should usually use SMTP_SECURE=true.',
    );
  }

  if (forceIpv4) {
    setDefaultResultOrder('ipv4first');
  }

  const options: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: {
      user,
      pass: password,
    },
  };

  const transporter = nodemailer.createTransport(options);

  console.log('Checking SMTP connection with:');
  console.log({
    host,
    port,
    secure,
    forceIpv4,
    user,
    fromEmail,
  });

  await transporter.verify();
  console.log('SMTP connection verified successfully.');
}

main().catch((error: unknown) => {
  console.error('SMTP connection failed.');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
