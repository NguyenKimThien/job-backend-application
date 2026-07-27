"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { portalFetch } from "@/lib/portal-api";

type FieldErrors = Record<string, string[] | undefined>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setErrors({});
    const form = new FormData(event.currentTarget);

    try {
      const data = await portalFetch<{ message?: string }>("/account/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: form.get("matKhauHienTai"),
          newPassword: form.get("matKhauMoi"),
        }),
      });
      setMessage(data?.message ?? "Đổi mật khẩu thành công.");

      setSuccess(true);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  }

  const errorFor = (name: string) =>
    errors[name]?.[0] ? <small className="field-error">{errors[name]?.[0]}</small> : null;

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">V</span>
          <span><strong>VIỆC LÀM</strong><small>THANH NIÊN HÀ NỘI</small></span>
        </Link>
        <div className="auth-intro-content">
          <span className="auth-kicker">AN TOÀN VÀ BẢO MẬT</span>
          <h1>Chủ động bảo vệ<br />tài khoản của bạn.</h1>
          <p>Đổi mật khẩu định kỳ để đảm bảo thông tin hồ sơ và lịch sử ứng tuyển luôn an toàn.</p>
          <div className="auth-benefits">
            <span>✓ Mật khẩu tối thiểu 8 ký tự</span>
            <span>✓ Mật khẩu mới phải khác mật khẩu cũ</span>
            <span>✓ Mật khẩu được mã hóa trước khi lưu</span>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <Link className="auth-back" href="/">← Quay lại trang chủ</Link>
          <span className="auth-kicker dark">BẢO MẬT TÀI KHOẢN</span>
          <h2>Đổi mật khẩu</h2>
          <p className="auth-subtitle">Bạn cần đăng nhập trước khi thực hiện chức năng này.</p>

          {message && (
            <div className={`form-message ${success ? "success" : "error"}`}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="form-group">
              <span>Mật khẩu hiện tại</span>
              <div className="password-field">
                <input
                  name="matKhauHienTai"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
              {errorFor("matKhauHienTai")}
            </label>
            <label className="form-group">
              <span>Mật khẩu mới</span>
              <input
                name="matKhauMoi"
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                required
              />
              {errorFor("matKhauMoi")}
            </label>
            <label className="form-group">
              <span>Xác nhận mật khẩu mới</span>
              <input
                name="xacNhanMatKhauMoi"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
              />
              {errorFor("xacNhanMatKhauMoi")}
            </label>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu →"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
