"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCESS_TOKEN_KEY,
  ACCOUNT_KEY,
  BACKEND_API_URL,
  getApiMessage,
} from "@/lib/backend-api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tendangnhap: form.get("dinhDanh"),
          matKhau: form.get("matKhau"),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(getApiMessage(data, "Đăng nhập không thành công."));
        return;
      }

      const account = data.data?.taiKhoan;
      window.localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
      const destination = getDestinationAfterLogin(account?.vaiTro);
      router.push(destination);
      router.refresh();
    } catch {
      setMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page simple-auth-page">
      <section className="auth-intro">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">V</span>
          <span>
            <strong>VIỆC LÀM</strong>
            <small>THANH NIÊN HÀ NỘI</small>
          </span>
        </Link>
        <div className="auth-intro-content">
          <span className="auth-kicker">KẾT NỐI · PHÁT TRIỂN · THÀNH CÔNG</span>
          <h1>Mỗi lần đăng nhập,<br />một cơ hội mới mở ra.</h1>
          <p>
            Theo dõi hồ sơ ứng tuyển, cập nhật trạng thái và kết nối với các
            doanh nghiệp uy tín tại Hà Nội.
          </p>
          <div className="auth-benefits">
            <span>✓ Hàng nghìn việc làm đã kiểm duyệt</span>
            <span>✓ Theo dõi tiến trình ứng tuyển minh bạch</span>
            <span>✓ Hỗ trợ hướng nghiệp miễn phí</span>
          </div>
        </div>
        <small className="auth-copyright">© 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</small>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <Link className="auth-back" href="/">← Quay lại trang chủ</Link>
          <h2>Đăng nhập tài khoản</h2>
          <p className="auth-subtitle">Nhập thông tin để tiếp tục sử dụng hệ thống.</p>

          {message && <div className="form-message error">{message}</div>}

          <form onSubmit={handleSubmit}>
            <label className="form-group">
              <span>Email, số điện thoại hoặc tên đăng nhập / mã số thuế</span>
              <input
                name="dinhDanh"
                type="text"
                placeholder="Email, số điện thoại hoặc mã số thuế"
                autoComplete="username"
                required
              />
            </label>
            <label className="form-group">
              <span>Mật khẩu</span>
              <div className="password-field">
                <input
                  name="matKhau"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </label>
            <div className="form-options">
              <label><input type="checkbox" /> Ghi nhớ đăng nhập</label>
              <Link href="/quen-mat-khau">Quên mật khẩu?</Link>
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập →"}
            </button>
          </form>

          <p className="auth-switch">
            Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link>
          </p>
          <p className="auth-switch secondary-switch">
            Dành cho doanh nghiệp: <Link href="/dang-ky-nha-tuyen-dung">Đăng ký nhà tuyển dụng</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function getDestinationAfterLogin(role?: string) {
  const fallback =
    role === "QUAN_TRI_VIEN"
      ? "/quan-tri/thong-ke"
      : role === "NHA_TUYEN_DUNG"
        ? "/nha-tuyen-dung/tin-tuyen-dung"
        : "/";

  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || !isSafeRedirect(redirect)) return fallback;
  if (!canAccessRedirect(role, redirect)) return fallback;
  return redirect;
}

function isSafeRedirect(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && value !== "/dang-nhap";
}

function canAccessRedirect(role: string | undefined, path: string) {
  if (path.startsWith("/quan-tri")) return role === "QUAN_TRI_VIEN";
  if (path.startsWith("/nha-tuyen-dung")) return role === "NHA_TUYEN_DUNG";
  if (
    path.startsWith("/ho-so") ||
    path.startsWith("/viec-lam-da-luu") ||
    path.startsWith("/viec-lam-da-ung-tuyen") ||
    path.startsWith("/nop-ho-so")
  ) {
    return role === "NGUOI_LAO_DONG";
  }
  return true;
}
