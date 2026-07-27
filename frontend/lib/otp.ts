import { randomInt } from "node:crypto";

export const OTP_EXPIRES_MINUTES = 5;

export function generateOtp() {
  return randomInt(100000, 1000000).toString();
}
