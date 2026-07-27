import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export type UserRole = "NGUOI_LAO_DONG" | "NHA_TUYEN_DUNG" | "QUAN_TRI";

export type SessionUser = {
  id: number;
  hoTen: string;
  email: string;
  vaiTro: UserRole;
  trangThai: "CHO_DUYET" | "HOAT_DONG" | "BI_KHOA";
};

const COOKIE_NAME = "viec_lam_session";

function getSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET phải có ít nhất 32 ký tự");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    hoTen: user.hoTen,
    email: user.email,
    vaiTro: user.vaiTro,
    trangThai: user.trangThai,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: Number(payload.sub),
      hoTen: String(payload.hoTen),
      email: String(payload.email),
      vaiTro: payload.vaiTro as UserRole,
      trangThai: payload.trangThai as SessionUser["trangThai"],
    };
  } catch {
    return null;
  }
}
