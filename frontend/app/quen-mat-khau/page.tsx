"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BACKEND_API_URL, getApiMessage } from "@/lib/backend-api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identity, setIdentity] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (step === 1) {
        const response = await fetch(`${BACKEND_API_URL}/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: identity }) });
        const payload = await response.json(); if (!response.ok) throw new Error(getApiMessage(payload, "Không thể gửi OTP."));
        setMessage(payload.message);
        setStep(2);
      } else if (step === 2) setStep(3);
      else {
        const response = await fetch(`${BACKEND_API_URL}/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: identity, otp, newPassword: password, confirmPassword }) });
        const payload = await response.json(); if (!response.ok) throw new Error(getApiMessage(payload, "Không thể đặt lại mật khẩu."));
        setMessage("Đặt lại mật khẩu thành công. Bạn có thể quay lại đăng nhập.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra."); }
  }
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link className="auth-brand" href="/"><span className="brand-mark">V</span><span><strong>VIỆC LÀM</strong><small>THANH NIÊN HÀ NỘI</small></span></Link>
        <div className="auth-intro-content">
          <span className="auth-kicker">KHÔI PHỤC TÀI KHOẢN AN TOÀN</span>
          <h1>Lấy lại mật khẩu<br />chỉ trong vài phút.</h1>
          <p>Hệ thống gửi mã xác thực đến email hoặc số điện thoại đã đăng ký để bảo vệ tài khoản của bạn.</p>
        </div>
        <small className="auth-copyright">© 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-card">
          <Link className="auth-back" href="/dang-nhap">← Quay lại đăng nhập</Link>
          <span className="auth-kicker dark">XÁC THỰC TÀI KHOẢN</span>
          <h2>{step === 1 ? "Quên mật khẩu" : step === 2 ? "Xác thực OTP" : "Tạo mật khẩu mới"}</h2>
          <p className="auth-subtitle">Bước {step}/3 · {step === 1 ? "Xác định tài khoản cần khôi phục." : step === 2 ? `Nhập mã đã gửi tới ${identity}.` : "Mật khẩu mới phải có ít nhất 8 ký tự, chữ hoa và số."}</p>
          <div className="stepper"><i className="done" /><i className={step >= 2 ? "done" : ""} /><i className={step >= 3 ? "done" : ""} /></div>
          {message && <div className="form-message warning">{message}</div>}
          <form onSubmit={submit}>
            {step === 1 && <label className="form-group"><span>Email hoặc số điện thoại</span><input value={identity} onChange={(event) => setIdentity(event.target.value)} required placeholder="Nhập email hoặc số điện thoại" /></label>}
            {step === 2 && <label className="form-group"><span>Mã OTP gồm 6 số</span><input className="otp-input" value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" /></label>}
            {step === 3 && <><label className="form-group"><span>Mật khẩu mới</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required /></label><label className="form-group"><span>Xác nhận mật khẩu mới</span><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={8} required /></label></>}
            <button className="auth-submit">{step === 1 ? "Gửi mã xác thực →" : step === 2 ? "Xác nhận OTP →" : "Đặt lại mật khẩu →"}</button>
            {step > 1 && <button className="text-button" type="button" onClick={() => setStep(step === 3 ? 2 : 1)}>← Quay lại bước trước</button>}
          </form>
        </div>
      </section>
    </main>
  );
}
