'use client';

import Link from 'next/link';
import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthAlert,
  AuthLinkPanel,
  AuthShell,
  EmployerApprovalNotice,
  FieldError,
  PasswordField,
  SubmitButton,
  TextField,
} from '@/components/AuthFormComponents';
import { BACKEND_API_URL, getApiMessage } from '@/lib/backend-api';

type Role = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG';
type RegisterField =
  | 'hoTen'
  | 'tenDonVi'
  | 'maSoThue'
  | 'diaChiTruSo'
  | 'email'
  | 'soDienThoai'
  | 'matKhau'
  | 'xacNhanMatKhau'
  | 'terms';
type FieldErrors = Partial<Record<RegisterField, string>>;
type RegisterResponse = {
  code?: string;
  data?: unknown;
  error?: { code?: string };
  errors?: Record<string, string | string[] | undefined>;
  message?: string;
};

const passwordRuleText =
  'Mật khẩu cần có 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';

export function RegisterPageContent({
  initialRole = 'NGUOI_LAO_DONG',
  lockRole = false,
}: {
  initialRole?: Role;
  lockRole?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || success) return;

    const form = new FormData(event.currentTarget);
    const email = formString(form, 'email').trim().toLowerCase();
    const phone = formString(form, 'soDienThoai').replace(/\D/g, '');
    const passwordValue = formString(form, 'matKhau');
    const passwordConfirmation = formString(form, 'xacNhanMatKhau');
    const taxCode = formString(form, 'maSoThue').replace(/\D/g, '');
    const nextErrors = validateRegisterForm(form, role);

    setMessage('');
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setTimeout(() => focusFirstInvalid(formRef.current), 0);
      return;
    }

    setLoading(true);

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
                hoTen: formString(form, 'hoTen'),
                tenDangNhap: phone,
              }
            : {}),
          email,
          soDienThoai: formString(form, 'soDienThoai'),
          matKhau: passwordValue,
          xacNhanMatKhau: passwordConfirmation,
          ...(role === 'NHA_TUYEN_DUNG'
            ? {
                tenDonVi: formString(form, 'tenDonVi'),
                maSoThue: taxCode,
                diaChiTruSo: formString(form, 'diaChiTruSo'),
              }
            : {}),
        }),
      });
      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        const errorCode = getErrorCode(data);
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
        setErrors(extractFieldErrors(data));
        setTimeout(() => focusFirstInvalid(formRef.current), 0);
        return;
      }

      setSuccess(true);
      setMessage(
        data.message ??
          'Tài khoản đã được tạo. Mã xác thực đã được gửi tới email của bạn.',
      );
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

  const isEmployer = role === 'NHA_TUYEN_DUNG';
  const title = isEmployer
    ? 'Đăng ký nhà tuyển dụng'
    : 'Đăng ký người lao động';
  const description = isEmployer
    ? 'Tạo hồ sơ doanh nghiệp để đăng tuyển và quản lý ứng viên.'
    : 'Tạo tài khoản để xây dựng hồ sơ và ứng tuyển việc làm.';

  return (
    <AuthShell
      title={title}
      description={description}
      maxWidth={isEmployer ? 'employer' : 'register'}
    >
      {!lockRole && (
        <div className="role-picker refined-role-picker">
          <button
            className={role === 'NGUOI_LAO_DONG' ? 'selected' : ''}
            type="button"
            onClick={() => setRole('NGUOI_LAO_DONG')}
          >
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
            <span>
              <strong>Nhà tuyển dụng</strong>
              <small>Đăng tin và quản lý ứng viên</small>
            </span>
          </button>
        </div>
      )}

      {message && (
        <AuthAlert tone={success ? 'success' : 'error'}>{message}</AuthAlert>
      )}

      <form
        ref={formRef}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        {isEmployer ? (
          <>
            <div className="form-row refined-form-row">
              <TextField
                label="Tên đơn vị"
                name="tenDonVi"
                placeholder="Nhập tên doanh nghiệp hoặc đơn vị"
                autoComplete="organization"
                error={errors.tenDonVi}
              />
              <TextField
                label="Mã số thuế"
                name="maSoThue"
                placeholder="0101234567"
                inputMode="numeric"
                helperText="Mã số thuế sẽ được sử dụng làm tên đăng nhập của doanh nghiệp."
                error={errors.maSoThue}
              />
            </div>

            <TextField
              label="Địa chỉ trụ sở"
              name="diaChiTruSo"
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              autoComplete="street-address"
              error={errors.diaChiTruSo}
            />
          </>
        ) : (
          <TextField
            label="Họ và tên"
            name="hoTen"
            placeholder="Nhập họ và tên"
            autoComplete="name"
            error={errors.hoTen}
          />
        )}

        <div className="form-row refined-form-row">
          <TextField
            label="Email"
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            inputMode="email"
            error={errors.email}
          />
          <TextField
            label="Số điện thoại"
            name="soDienThoai"
            type="tel"
            placeholder="0912345678"
            autoComplete="tel"
            inputMode="tel"
            error={errors.soDienThoai}
          />
        </div>

        <div className="form-row refined-form-row">
          <div>
            <PasswordField
              label="Mật khẩu"
              name="matKhau"
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
              helperText={passwordRuleText}
              error={errors.matKhau}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
            {password && <PasswordChecklist password={password} />}
          </div>
          <PasswordField
            label="Xác nhận mật khẩu"
            name="xacNhanMatKhau"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            error={errors.xacNhanMatKhau}
          />
        </div>

        {isEmployer && <EmployerApprovalNotice />}

        <TermsCheckbox error={errors.terms} />

        <SubmitButton
          loading={loading || success}
          loadingLabel="Đang tạo tài khoản..."
        >
          {isEmployer ? 'Tạo tài khoản nhà tuyển dụng' : 'Tạo tài khoản'}
        </SubmitButton>
      </form>

      <AuthLinkPanel
        items={[
          {
            href: '/dang-nhap',
            prefix: 'Đã có tài khoản?',
            label: 'Đăng nhập',
          },
          isEmployer
            ? {
                href: '/dang-ky',
                prefix: 'Bạn đang tìm việc?',
                label: 'Đăng ký người lao động',
              }
            : {
                href: '/dang-ky-nha-tuyen-dung',
                prefix: 'Bạn cần tuyển nhân sự?',
                label: 'Đăng ký nhà tuyển dụng',
              },
        ]}
      />
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <RegisterPageContent initialRole="NGUOI_LAO_DONG" lockRole />;
}

function TermsCheckbox({ error }: { error?: string }) {
  return (
    <div className="refined-terms">
      <input
        id="terms"
        name="terms"
        type="checkbox"
        aria-describedby={error ? 'terms-error' : undefined}
        aria-invalid={Boolean(error)}
      />
      <label htmlFor="terms">
        Tôi đồng ý với{' '}
        <Link href="/#lien-he" onClick={(event) => event.stopPropagation()}>
          Điều khoản sử dụng
        </Link>{' '}
        và{' '}
        <Link href="/#lien-he" onClick={(event) => event.stopPropagation()}>
          Chính sách bảo mật
        </Link>
        .
      </label>
      <FieldError id="terms-error" message={error} />
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const rules = [
    { label: 'Tối thiểu 8 ký tự', passed: password.length >= 8 },
    { label: 'Có chữ hoa', passed: /[A-Z]/.test(password) },
    { label: 'Có chữ thường', passed: /[a-z]/.test(password) },
    { label: 'Có chữ số', passed: /\d/.test(password) },
    { label: 'Có ký tự đặc biệt', passed: /[^A-Za-z\d]/.test(password) },
  ];

  return (
    <ul className="password-rules" aria-label="Yêu cầu mật khẩu">
      {rules.map((rule) => (
        <li className={rule.passed ? 'passed' : ''} key={rule.label}>
          <span aria-hidden="true">{rule.passed ? '✓' : '•'}</span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

function validateRegisterForm(form: FormData, role: Role): FieldErrors {
  const errors: FieldErrors = {};
  const email = formString(form, 'email').trim();
  const phone = formString(form, 'soDienThoai').replace(/\D/g, '');
  const password = formString(form, 'matKhau');
  const passwordConfirmation = formString(form, 'xacNhanMatKhau');

  if (role === 'NGUOI_LAO_DONG') {
    const fullName = formString(form, 'hoTen').trim();
    if (!fullName) errors.hoTen = 'Vui lòng nhập họ và tên.';
    if (fullName && (fullName.length < 2 || fullName.length > 100)) {
      errors.hoTen = 'Họ và tên cần có từ 2 đến 100 ký tự.';
    }
  } else {
    const organization = formString(form, 'tenDonVi').trim();
    const taxCode = formString(form, 'maSoThue').replace(/\D/g, '');
    const address = formString(form, 'diaChiTruSo').trim();

    if (!organization) errors.tenDonVi = 'Vui lòng nhập tên đơn vị.';
    if (
      organization &&
      (organization.length < 2 || organization.length > 255)
    ) {
      errors.tenDonVi = 'Tên đơn vị cần có từ 2 đến 255 ký tự.';
    }
    if (!taxCode) errors.maSoThue = 'Vui lòng nhập mã số thuế.';
    if (taxCode && !/^\d{10}(\d{3})?$/.test(taxCode)) {
      errors.maSoThue = 'Mã số thuế phải gồm 10 chữ số hoặc 13 chữ số.';
    }
    if (!address) errors.diaChiTruSo = 'Vui lòng nhập địa chỉ trụ sở.';
    if (address.length > 500) {
      errors.diaChiTruSo = 'Địa chỉ trụ sở không được vượt quá 500 ký tự.';
    }
  }

  if (!email) errors.email = 'Vui lòng nhập email.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không đúng định dạng.';
  }

  if (!phone) errors.soDienThoai = 'Vui lòng nhập số điện thoại.';
  if (phone && !/^0\d{9}$/.test(phone)) {
    errors.soDienThoai =
      'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.';
  }

  if (!password) {
    errors.matKhau = 'Vui lòng nhập mật khẩu.';
  } else if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/.test(password)
  ) {
    errors.matKhau = passwordRuleText;
  }

  if (!passwordConfirmation) {
    errors.xacNhanMatKhau = 'Vui lòng nhập lại mật khẩu.';
  } else if (password !== passwordConfirmation) {
    errors.xacNhanMatKhau = 'Mật khẩu xác nhận không khớp.';
  }

  if (form.get('terms') !== 'on') {
    errors.terms = 'Bạn cần đồng ý với điều khoản sử dụng.';
  }

  return errors;
}

function extractFieldErrors(payload: unknown): FieldErrors {
  if (!payload || typeof payload !== 'object') return {};

  const { errors } = payload as {
    errors?: Record<string, string | string[] | undefined>;
  };
  if (!errors) return {};

  return Object.entries(errors).reduce<FieldErrors>((result, [key, value]) => {
    if (!isRegisterField(key)) return result;

    const message = Array.isArray(value) ? value[0] : value;
    if (message) result[key] = message;
    return result;
  }, {});
}

function formString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function isRegisterField(value: string): value is RegisterField {
  return [
    'hoTen',
    'tenDonVi',
    'maSoThue',
    'diaChiTruSo',
    'email',
    'soDienThoai',
    'matKhau',
    'xacNhanMatKhau',
    'terms',
  ].includes(value);
}

function getErrorCode(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;

  const value = payload as {
    code?: unknown;
    error?: { code?: unknown };
  };
  return typeof value.code === 'string'
    ? value.code
    : typeof value.error?.code === 'string'
      ? value.error.code
      : undefined;
}

function focusFirstInvalid(form: HTMLFormElement | null) {
  const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
  field?.focus();
}
