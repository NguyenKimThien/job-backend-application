"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_API_URL, getApiMessage } from "@/lib/backend-api";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [accountType, setAccountType] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem("developmentOtp") ?? "",
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email")?.trim().toLowerCase() ?? "");
    setAccountType(params.get("loai") ?? "");
    setDevelopmentOtp(sessionStorage.getItem("developmentOtp") ?? "");
  }, []);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!email) {
      setMessage("Không tìm thấy email đăng ký. Vui lòng quay lại trang đăng ký.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const endpoint =
        accountType === "nha-tuyen-dung"
          ? "/auth/verify-employer-registration-otp"
          : "/auth/verify-registration-otp";
      const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      setMessage(getApiMessage(data, "Không thể xác thực mã OTP."));
      if (!response.ok) return;

      setSuccess(true);
      setTimeout(() => router.push("/dang-nhap"), 1200);
    } catch {
      setMessage("Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setMessage("Không tìm thấy email đăng ký. Vui lòng quay lại trang đăng ký.");
      return;
    }
    setResending(true);
    setMessage("");
    try {
      const endpoint =
        accountType === "nha-tuyen-dung"
          ? "/auth/resend-employer-registration-otp"
          : "/auth/resend-registration-otp";
      const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(getApiMessage(data, "Không thể gửi lại OTP."));
      if (data.developmentOtp ?? data.data?.developmentOtp) {
        const nextOtp = data.developmentOtp ?? data.data.developmentOtp;
        setDevelopmentOtp(nextOtp);
        sessionStorage.setItem("developmentOtp", nextOtp);
      }
    } catch {
      setMessage("Không thể gửi lại OTP");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">V</span>
          <span><strong>VIỆC LÀM</strong><small>THANH NIÊN HÀ NỘI</small></span>
        </Link>
        <div className="auth-intro-content">
          <span className="auth-kicker">BẢO VỆ TÀI KHOẢN CỦA BẠN</span>
          <h1>Xác thực một lần.<br />An tâm sử dụng.</h1>
          <p>Mã OTP giúp xác nhận email chính chủ và bảo vệ tài khoản khỏi truy cập trái phép.</p>
          <div className="auth-benefits">
            <span>✓ Mã gồm 6 chữ số</span>
            <span>✓ Có hiệu lực trong 5 phút</span>
            <span>✓ Chỉ sử dụng được một lần</span>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card otp-card">
          <Link className="auth-back" href="/dang-ky">← Quay lại đăng ký</Link>
          <span className="auth-kicker dark">XÁC THỰC EMAIL</span>
          <h2>Nhập mã OTP</h2>
          <p className="auth-subtitle">
            Mã xác thực đã được gửi tới <strong>{email || "email của bạn"}</strong>.
          </p>

          {developmentOtp && (
            <div className="dev-otp">
              Chế độ thử nghiệm - OTP: <strong>{developmentOtp}</strong>
            </div>
          )}
          {message && (
            <div className={`form-message ${success ? "success" : "error"}`}>{message}</div>
          )}

          <form onSubmit={handleVerify}>
            <label className="form-group">
              <span>Mã OTP gồm 6 chữ số</span>
              <input
                className="otp-input"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
              />
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={loading || success || otp.length !== 6}
            >
              {loading ? "Đang xác thực..." : "Xác thực tài khoản →"}
            </button>
          </form>

          <p className="auth-switch">
            Chưa nhận được mã?{" "}
            <button className="text-button" type="button" onClick={handleResend} disabled={resending}>
              {resending ? "Đang gửi..." : "Gửi lại OTP"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
