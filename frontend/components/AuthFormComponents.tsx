'use client';

import Link from 'next/link';
import {
  InputHTMLAttributes,
  ReactNode,
  SVGProps,
  useId,
  useState,
} from 'react';

type AuthShellProps = {
  children: ReactNode;
  description: string;
  maxWidth?: 'login' | 'register' | 'employer';
  title: string;
};

export function AuthShell({
  children,
  description,
  maxWidth = 'login',
  title,
}: AuthShellProps) {
  return (
    <main className="auth-page simple-auth-page refined-auth-page">
      <section className="auth-form-side refined-auth-side">
        <div className={`auth-form-card refined-auth-card ${maxWidth}`}>
          <Link className="auth-back refined-auth-back" href="/">
            <Icon name="arrowLeft" />
            Quay lại trang chủ
          </Link>

          <Link
            className="refined-auth-brand"
            href="/"
            aria-label="Về trang chủ"
          >
            <span className="brand-mark refined-auth-mark">V</span>
            <span>
              <strong>VIỆC LÀM</strong>
              <small>THANH NIÊN HÀ NỘI</small>
            </span>
          </Link>

          <header className="refined-auth-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </header>

          {children}
        </div>
      </section>
    </main>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helperText?: string;
  label: string;
  name: string;
};

export function TextField({
  error,
  helperText,
  id,
  label,
  name,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = [helperText ? helperId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-group refined-form-group">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        name={name}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        className={error ? 'has-error' : undefined}
        {...props}
      />
      {helperText && (
        <small className="field-hint" id={helperId}>
          {helperText}
        </small>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, 'type'>;

export function PasswordField({
  error,
  helperText,
  id,
  label,
  name,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = [helperText ? helperId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-group refined-form-group">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-field refined-password-field">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          className={error ? 'has-error' : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
        >
          {visible ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
      {helperText && (
        <small className="field-hint" id={helperId}>
          {helperText}
        </small>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <small className="field-error refined-field-error" id={id}>
      <Icon name="alertCircle" />
      {message}
    </small>
  );
}

export function SubmitButton({
  children,
  loading,
  loadingLabel,
}: {
  children: ReactNode;
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <button
      className="auth-submit refined-auth-submit"
      type="submit"
      disabled={loading}
    >
      {loading && <Icon className="auth-spinner" name="spinner" />}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function AuthAlert({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success';
}) {
  return (
    <div
      className={`form-message ${tone} refined-auth-alert`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export function EmployerApprovalNotice() {
  return (
    <div className="employer-approval-notice">
      <Icon name="info" />
      <div>
        <strong>Quy trình xác minh doanh nghiệp</strong>
        <p>
          Sau khi xác thực email, hồ sơ doanh nghiệp sẽ được gửi đến quản trị
          viên để xét duyệt trước khi tài khoản được phép đăng tin tuyển dụng.
        </p>
      </div>
    </div>
  );
}

export function AuthLinkPanel({
  items,
}: {
  items: Array<{ href: string; label: string; prefix: string }>;
}) {
  return (
    <div className="refined-auth-links">
      {items.map((item) => (
        <p key={item.href}>
          <span>{item.prefix}</span>
          <Link href={item.href}>{item.label}</Link>
        </p>
      ))}
    </div>
  );
}

type IconName = 'alertCircle' | 'arrowLeft' | 'info' | 'spinner';

function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6m0 4h.01" />
      </>
    ),
    arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    spinner: <path d="M12 3a9 9 0 1 1-8.5 12" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
