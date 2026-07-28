'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BACKEND_API_URL, getApiMessage } from '@/lib/backend-api';

type Role = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG';
type FieldErrors = Record<string, string[] | undefined>;

export function RegisterPageContent({
  initialRole = 'NGUOI_LAO_DONG',
  lockRole = false,
}: {
  initialRole?: Role;
  lockRole?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setErrors({});

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const phone = String(form.get('soDienThoai') ?? '').replace(/\D/g, '');
    const password = String(form.get('matKhau') ?? '');
    const passwordConfirmation = String(form.get('xacNhanMatKhau') ?? '');
    const taxCode = String(form.get('maSoThue') ?? '').replace(/\D/g, '');

    if (role === 'NHA_TUYEN_DUNG' && !/^\d{10}(\d{3})?$/.test(taxCode)) {
      setMessage('Mã số thuế phải gồm 10 chữ số hoặc 13 chữ số.');
      setErrors({
        maSoThue: ['Mã số thuế phải gồm 10 chữ số hoặc 13 chữ số.'],
      });
      setLoading(false);
      return;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/.test(password)
    ) {
      setMessage(
        'Mật khẩu phải có 8–64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
      );
      setLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      setMessage('Mật khẩu xác nhận không khớp.');
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        role === 'NHA_TUYEN_DUNG'
          ? '/auth/register/employer'
          : '/auth/register/worker';
      const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(role === 'NGUOI_LAO_DONG'
            ? {
                hoTen: form.get('hoTen'),
                tenDangNhap: phone,
              }
            : {}),
          email,
          soDienThoai: form.get('soDienThoai'),
          matKhau: password,
          xacNhanMatKhau: passwordConfirmation,
          ...(role === 'NHA_TUYEN_DUNG'
            ? {
                tenDonVi: form.get('tenDonVi'),
                maSoThue: taxCode,
                diaChiTruSo: form.get('diaChiTruSo'),
              }
            : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const errorCode = data.code ?? data.error?.code;
        if (errorCode === 'ACCOUNT_PENDING_VERIFICATION') {
          const resendEndpoint =
            role === 'NHA_TUYEN_DUNG'
              ? '/auth/resend-employer-registration-otp'
              : '/auth/resend-registration-otp';
          const resendResponse = await fetch(
            `${BACKEND_API_URL}${resendEndpoint}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            },
          );
          await resendResponse.json();
          const accountType =
            role === 'NHA_TUYEN_DUNG' ? '&loai=nha-tuyen-dung' : '';
          router.push(
            `/xac-thuc-otp?email=${encodeURIComponent(email)}${accountType}`,
          );
          return;
        }
        setMessage(getApiMessage(data, 'Đăng ký tài khoản không thành công.'));
        setErrors(data.errors ?? {});
        return;
      }

      setSuccess(true);
      setMessage(data.message ?? 'Đăng ký thành công. Vui lòng nhập mã OTP.');
      const accountType =
        role === 'NHA_TUYEN_DUNG' ? '&loai=nha-tuyen-dung' : '';
      setTimeout(
        () =>
          router.push(
            `/xac-thuc-otp?email=${encodeURIComponent(email)}${accountType}`,
          ),
        900,
      );
    } catch {
      setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const errorFor = (name: string) =>
    errors[name]?.[0] ? (
      <small className="field-error">{errors[name]?.[0]}</small>
    ) : null;

  return (
    <main className="auth-page register-page simple-auth-page">
      <section className="auth-intro">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">V</span>
          <span>
            <strong>VIỆC LÀM</strong>
            <small>THANH NIÊN HÀ NỘI</small>
          </span>
        </Link>
        <div className="auth-intro-content">
          <span className="auth-kicker">BẮT ĐẦU HÀNH TRÌNH MỚI</span>
          <h1>
            Tạo hồ sơ hôm nay.
            <br />
            Nắm bắt cơ hội ngày mai.
          </h1>
          <p>
            Một tài khoản duy nhất giúp bạn tìm việc, tuyển dụng và theo dõi
            toàn bộ quá trình kết nối.
          </p>
          <div className="auth-benefits">
            <span>✓ Đăng ký hoàn toàn miễn phí</span>
            <span>✓ Thông tin được bảo mật</span>
            <span>✓ Doanh nghiệp được xác thực</span>
          </div>
        </div>
        <small className="auth-copyright">
          © 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội
        </small>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card register-card">
          <Link className="auth-back" href="/">
            ← Quay lại trang chủ
          </Link>
          <h2>
            {role === 'NHA_TUYEN_DUNG'
              ? 'Đăng ký nhà tuyển dụng'
              : 'Đăng ký người lao động'}
          </h2>
          <p className="auth-subtitle">
            {role === 'NHA_TUYEN_DUNG'
              ? 'Tạo hồ sơ doanh nghiệp để đăng tuyển và quản lý ứng viên.'
              : 'Tạo tài khoản để xây dựng hồ sơ và ứng tuyển việc làm.'}
          </p>

          {!lockRole && (
            <div className="role-picker">
              <button
                className={role === 'NGUOI_LAO_DONG' ? 'selected' : ''}
                type="button"
                onClick={() => setRole('NGUOI_LAO_DONG')}
              >
                <b>👤</b>
                <span>
                  <strong>Người lao động</strong>
                  <small>Tìm việc và ứng tuyển</small>
                </span>
              </button>
              <button
                className={role === 'NHA_TUYEN_DUNG' ? 'selected' : ''}
                type="button"
                onClick={() => setRole('NHA_TUYEN_DUNG')}
              >
                <b>▦</b>
                <span>
                  <strong>Nhà tuyển dụng</strong>
                  <small>Đăng tin và tìm ứng viên</small>
                </span>
              </button>
            </div>
          )}

          {message && (
            <div className={`form-message ${success ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {role === 'NHA_TUYEN_DUNG' && (
              <>
                <div className="form-row">
                  <label className="form-group">
                    <span>Tên đơn vị</span>
                    <input
                      name="tenDonVi"
                      placeholder="Công ty TNHH ABC"
                      required
                    />
                    {errorFor('tenDonVi')}
                  </label>
                  <label className="form-group">
                    <span>Mã số thuế (Tên đăng nhập)</span>
                    <input name="maSoThue" placeholder="0101234567" required />
                    <small className="field-hint">
                      Sau khi đăng ký, doanh nghiệp dùng mã số thuế này để đăng
                      nhập.
                    </small>
                    {errorFor('maSoThue')}
                  </label>
                </div>
                <label className="form-group">
                  <span>Địa chỉ trụ sở</span>
                  <input
                    name="diaChiTruSo"
                    placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                    required
                  />
                  {errorFor('diaChiTruSo')}
                </label>
              </>
            )}
            {role === 'NGUOI_LAO_DONG' && (
              <div className="form-row">
                <label className="form-group">
                  <span>Họ và tên</span>
                  <input name="hoTen" placeholder="Nguyễn Văn A" required />
                  {errorFor('hoTen')}
                </label>
                <label className="form-group">
                  <span>Số điện thoại</span>
                  <input name="soDienThoai" placeholder="0912345678" required />
                  {errorFor('soDienThoai')}
                </label>
              </div>
            )}
            <div className="form-row">
              <label className="form-group">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                />
                {errorFor('email')}
              </label>
              {role === 'NHA_TUYEN_DUNG' && (
                <label className="form-group">
                  <span>Số điện thoại</span>
                  <input name="soDienThoai" placeholder="0912345678" required />
                  {errorFor('soDienThoai')}
                </label>
              )}
            </div>
            <div className="form-row">
              <label className="form-group">
                <span>Mật khẩu</span>
                <div className="password-field">
                  <input
                    name="matKhau"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ít nhất 8 ký tự, 1 chữ hoa và 1 số"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
                {errorFor('matKhau')}
              </label>
              <label className="form-group">
                <span>Xác nhận mật khẩu</span>
                <input
                  name="xacNhanMatKhau"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
                {errorFor('xacNhanMatKhau')}
              </label>
            </div>
            <label className="terms">
              <input type="checkbox" required />
              <span>
                Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và{' '}
                <a href="#">Chính sách bảo mật</a>.
              </span>
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={loading || success}
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản →'}
            </button>
          </form>

          <p className="auth-switch">
            Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link>
          </p>
          <p className="auth-switch secondary-switch">
            {role === 'NHA_TUYEN_DUNG' ? (
              <>
                Bạn là người tìm việc?{' '}
                <Link href="/dang-ky">Đăng ký người lao động</Link>
              </>
            ) : (
              <>
                Bạn cần tuyển nhân sự?{' '}
                <Link href="/dang-ky-nha-tuyen-dung">
                  Đăng ký nhà tuyển dụng
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return <RegisterPageContent initialRole="NGUOI_LAO_DONG" lockRole />;
}
