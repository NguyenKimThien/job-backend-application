import nodemailer from "nodemailer";

type OtpEmail = {
  email: string;
  hoTen: string;
  otp: string;
};

function smtpIsConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD,
  );
}

export async function sendOtpEmail({ email, hoTen, otp }: OtpEmail) {
  if (!smtpIsConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP thử nghiệm] ${email}: ${otp}`);
      return { developmentMode: true };
    }
    throw new Error("Chưa cấu hình máy chủ SMTP");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Mã xác thực tài khoản Việc Làm Thanh Niên Hà Nội",
    text: `Xin chào ${hoTen}, mã OTP của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#075394">Xác thực tài khoản</h2>
        <p>Xin chào <strong>${hoTen}</strong>,</p>
        <p>Mã OTP xác thực email của bạn là:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f67cf;
          background:#eef6ff;padding:18px;text-align:center;border-radius:8px">${otp}</div>
        <p style="color:#63738a">Mã có hiệu lực trong 5 phút. Không cung cấp mã này cho người khác.</p>
      </div>
    `,
  });

  return { developmentMode: false };
}
