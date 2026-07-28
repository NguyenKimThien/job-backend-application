'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthAlert,
  AuthLinkPanel,
  AuthShell,
  PasswordField,
  SubmitButton,
  TextField,
} from '@/components/AuthFormComponents';
import {
  ACCESS_TOKEN_KEY,
  ACCOUNT_KEY,
  BACKEND_API_URL,
  getApiMessage,
} from '@/lib/backend-api';

type LoginErrors = Partial<Record<'dinhDanh' | 'matKhau', string>>;
type LoginResponse = {
  data?: {
    accessToken?: string;
    taiKhoan?: {
      vaiTro?: string;
    } & Record<string, unknown>;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const nextErrors = validateLogin(form);

    setMessage('');
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      focusFirstInvalid(formRef.current);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tendangnhap: form.get('dinhDanh'),
          matKhau: form.get('matKhau'),
        }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setMessage(getApiMessage(data, 'Đăng nhập không thành công.'));
        return;
      }

      const account = data.data?.taiKhoan;
      const accessToken = data.data?.accessToken;

      if (!accessToken) {
        setMessage('Đăng nhập không thành công. Vui lòng thử lại.');
        return;
      }

      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account ?? null));
      const destination = getDestinationAfterLogin(account?.vaiTro);
      router.push(destination);
      router.refresh();
    } catch {
      setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Đăng nhập tài khoản"
      description="Nhập thông tin để tiếp tục sử dụng hệ thống."
      maxWidth="login"
    >
      {message && <AuthAlert>{message}</AuthAlert>}

      <form
        ref={formRef}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        <TextField
          label="Tài khoản"
          name="dinhDanh"
          type="text"
          placeholder="Nhập email, số điện thoại, tên đăng nhập hoặc mã số thuế"
          autoComplete="username"
          helperText="Nhà tuyển dụng có thể đăng nhập bằng mã số thuế."
          error={errors.dinhDanh}
        />

        <PasswordField
          label="Mật khẩu"
          name="matKhau"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          error={errors.matKhau}
        />

        <div className="form-options refined-form-options">
          <label>
            <input type="checkbox" name="remember" />
            <span>Giữ tôi đăng nhập</span>
          </label>
          <a href="/quen-mat-khau">Quên mật khẩu?</a>
        </div>

        <SubmitButton loading={loading} loadingLabel="Đang đăng nhập...">
          Đăng nhập
        </SubmitButton>
      </form>

      <AuthLinkPanel
        items={[
          {
            href: '/dang-ky',
            prefix: 'Bạn đang tìm việc?',
            label: 'Đăng ký người lao động',
          },
          {
            href: '/dang-ky-nha-tuyen-dung',
            prefix: 'Bạn cần tuyển nhân sự?',
            label: 'Đăng ký nhà tuyển dụng',
          },
        ]}
      />
    </AuthShell>
  );
}

function validateLogin(form: FormData): LoginErrors {
  const errors: LoginErrors = {};
  const identifier = formString(form, 'dinhDanh').trim();
  const password = formString(form, 'matKhau');

  if (!identifier) {
    errors.dinhDanh = 'Vui lòng nhập tài khoản.';
  }
  if (!password) {
    errors.matKhau = 'Vui lòng nhập mật khẩu.';
  }

  return errors;
}

function formString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function focusFirstInvalid(form: HTMLFormElement | null) {
  const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
  field?.focus();
}

function getDestinationAfterLogin(role?: string) {
  const fallback =
    role === 'QUAN_TRI_VIEN'
      ? '/quan-tri/thong-ke'
      : role === 'NHA_TUYEN_DUNG'
        ? '/nha-tuyen-dung/tin-tuyen-dung'
        : '/';

  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect || !isSafeRedirect(redirect)) return fallback;
  if (!canAccessRedirect(role, redirect)) return fallback;
  return redirect;
}

function isSafeRedirect(value: string) {
  return (
    value.startsWith('/') && !value.startsWith('//') && value !== '/dang-nhap'
  );
}

function canAccessRedirect(role: string | undefined, path: string) {
  if (path.startsWith('/quan-tri')) return role === 'QUAN_TRI_VIEN';
  if (path.startsWith('/nha-tuyen-dung')) return role === 'NHA_TUYEN_DUNG';
  if (
    path.startsWith('/ho-so') ||
    path.startsWith('/viec-lam-da-luu') ||
    path.startsWith('/viec-lam-da-ung-tuyen') ||
    path.startsWith('/nop-ho-so')
  ) {
    return role === 'NGUOI_LAO_DONG';
  }
  return true;
}
