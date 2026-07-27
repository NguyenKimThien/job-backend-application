export const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const ACCESS_TOKEN_KEY = "jobconnect_access_token";
export const ACCOUNT_KEY = "jobconnect_account";

export function getAccessToken() {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getApiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as {
    message?: string | string[];
    error?: { message?: string | string[] };
  };
  const message = value.message ?? value.error?.message;
  const raw = Array.isArray(message) ? message.join(" ") : message ?? fallback;
  const translations: Array<[RegExp, string]> = [
    [/maSoThue must match/i, "Mã số thuế phải gồm 10 chữ số hoặc 13 chữ số."],
    [/email must be an email/i, "Email không đúng định dạng."],
    [/soDienThoai must match/i, "Số điện thoại không đúng định dạng."],
    [/matKhau must be longer than or equal to 8 characters/i, "Mật khẩu phải có ít nhất 8 ký tự."],
    [/xacNhanMatKhau/i, "Mật khẩu xác nhận không hợp lệ."],
    [/Thong tin dang nhap khong chinh xac/i, "Thông tin đăng nhập hoặc mật khẩu không chính xác."],
    [/Tai khoan chua xac thuc email/i, "Tài khoản chưa xác thực email. Vui lòng xác thực OTP trước khi đăng nhập."],
    [/Tai khoan dang bi tam khoa/i, "Tài khoản đang bị tạm khóa."],
    [/Tai khoan da bi khoa/i, "Tài khoản đã bị khóa."],
    [/Mat khau xac nhan khong khop/i, "Mật khẩu xác nhận không khớp."],
    [/Ma OTP khong hop le/i, "Mã OTP không hợp lệ hoặc đã hết hạn."],
    [/Email da ton tai/i, "Email đã tồn tại."],
    [/Ten dang nhap da ton tai/i, "Tên đăng nhập đã tồn tại."],
    [/So dien thoai da ton tai/i, "Số điện thoại đã tồn tại."],
    [/must be a string/i, "Thông tin nhập vào không đúng định dạng."],
    [/should not be empty/i, "Vui lòng nhập đầy đủ thông tin bắt buộc."],
  ];
  return translations.find(([pattern]) => pattern.test(raw))?.[1] ?? raw;
}
