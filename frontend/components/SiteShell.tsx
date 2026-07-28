'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, SVGProps, useEffect, useState } from 'react';
import NavNotifications from '@/components/NavNotifications';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';

type ShellRole = 'worker' | 'employer' | 'admin';

type Props = {
  children: ReactNode;
  breadcrumb?: string;
  title?: string;
  subtitle?: string;
  role?: ShellRole;
  action?: ReactNode;
  pageClassName?: string;
};

type AccountRole =
  'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI' | 'QUAN_TRI_VIEN';

type StoredAccount = {
  email?: string;
  hoTen?: string;
  soDienThoai?: string;
  tenDangNhap?: string;
  tenHienThi?: string;
  vaiTro?: AccountRole;
};

const menus: Record<ShellRole, Array<[string, string]>> = {
  worker: [
    ['/', 'Tìm việc'],
    ['/ho-so', 'Hồ sơ'],
    ['/viec-lam-da-luu', 'Việc làm đã lưu'],
    ['/viec-lam-da-ung-tuyen', 'Việc đã ứng tuyển'],
    ['/thong-bao', 'Thông báo'],
  ],
  employer: [
    ['/nha-tuyen-dung/ho-so', 'Hồ sơ doanh nghiệp'],
    ['/nha-tuyen-dung/tin-tuyen-dung', 'Tin tuyển dụng'],
    ['/thong-bao', 'Thông báo'],
  ],
  admin: [
    ['/quan-tri/tai-khoan', 'Tài khoản'],
    ['/quan-tri/nha-tuyen-dung', 'Duyệt nhà tuyển dụng'],
    ['/quan-tri/kiem-duyet', 'Kiểm duyệt tin'],
    ['/quan-tri/danh-muc-nghe', 'Danh mục nghề'],
    ['/quan-tri/thong-ke', 'Thống kê & báo cáo'],
    ['/thong-bao', 'Thông báo'],
  ],
};

export function Logo() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">V</span>
      <span>
        <strong>VIỆC LÀM</strong>
        <small>THANH NIÊN HÀ NỘI</small>
      </span>
    </Link>
  );
}

export default function SiteShell({
  children,
  breadcrumb,
  title,
  subtitle,
  role,
  action,
  pageClassName,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<StoredAccount | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACCOUNT_KEY);
    if (!stored) {
      setUser(null);
      return;
    }

    try {
      setUser(JSON.parse(stored) as StoredAccount);
    } catch {
      window.localStorage.removeItem(ACCOUNT_KEY);
      setUser(null);
    }
  }, []);

  function logout() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(ACCOUNT_KEY);
    router.push('/dang-nhap');
    router.refresh();
  }

  const shellRole = role ?? shellRoleFromAccount(user?.vaiTro) ?? 'worker';
  const displayName =
    user?.tenHienThi ??
    user?.hoTen ??
    user?.tenDangNhap ??
    user?.email ??
    roleFallback(shellRole);
  const initials = getInitials(displayName);

  return (
    <main className={`portal-page ${pageClassName ?? ''}`.trim()}>
      <header className="portal-header">
        <div className="portal-utility">
          <div className="container portal-utility-inner">
            <a href="tel:02438582525">
              <ShellIcon name="phone" />
              <span>024 3858 2525</span>
            </a>
            <a href="mailto:hotro@vieclamthanhnien.vn">
              <ShellIcon name="mail" />
              <span>hotro@vieclamthanhnien.vn</span>
            </a>
          </div>
        </div>
        <div className="container portal-nav">
          <Logo />
          <button
            className="portal-menu"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            type="button"
          >
            <ShellIcon name="menu" />
          </button>
          <nav className={open ? 'portal-links open' : 'portal-links'}>
            {menus[shellRole].map(([href, label]) => {
              const active =
                pathname === href ||
                (href !== '/' && pathname.startsWith(`${href}/`));
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'active' : ''}
                  href={
                    href === '/thong-bao' ? `${href}?role=${shellRole}` : href
                  }
                  key={href}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="portal-account">
            <NavNotifications
              role={shellRole}
              onOpen={() => setAccountOpen(false)}
            />
            <button
              className="account-trigger"
              onClick={() => setAccountOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              title={displayName}
              type="button"
            >
              <span className="account-avatar">{initials || 'TK'}</span>
              <span>
                <strong title={displayName}>{displayName}</strong>
                <small>
                  {user ? accountRoleLabel(user.vaiTro) : 'Chưa đăng nhập'}
                </small>
              </span>
              <ShellIcon name="chevronDown" />
            </button>
            {accountOpen && (
              <div className="account-menu" role="menu">
                {user ? (
                  <>
                    <span className="account-menu-note">
                      {displayName}
                      {user.email ? ` · ${user.email}` : ''}
                    </span>
                    {shellRole !== 'admin' && (
                      <Link
                        href={
                          shellRole === 'employer'
                            ? '/nha-tuyen-dung/ho-so'
                            : '/ho-so'
                        }
                        role="menuitem"
                      >
                        Hồ sơ
                      </Link>
                    )}
                    {user.soDienThoai && (
                      <span className="account-menu-note">
                        {user.soDienThoai}
                      </span>
                    )}
                    <Link href="/doi-mat-khau" role="menuitem">
                      Đổi mật khẩu
                    </Link>
                    <button
                      onClick={() => logout()}
                      type="button"
                      role="menuitem"
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/dang-nhap" role="menuitem">
                      Đăng nhập
                    </Link>
                    <Link href="/dang-ky" role="menuitem">
                      Đăng ký tài khoản
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {(title || subtitle || action) && (
        <section className="page-heading">
          <div className="container page-heading-inner">
            <div>
              <span className="breadcrumb">
                {breadcrumb ?? `Trang chủ / ${title}`}
              </span>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {action}
          </div>
        </section>
      )}

      {children}
      <footer className="portal-footer">
        <div className="container">
          <span>© 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</span>
          <span>Thông tin liên hệ · Điều khoản · Hỗ trợ</span>
        </div>
      </footer>
    </main>
  );
}

function roleFallback(role: ShellRole) {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'employer') return 'Nhà tuyển dụng';
  return 'Khách';
}

function roleLabel(role: ShellRole) {
  if (role === 'admin') return 'Cán bộ quản trị';
  if (role === 'employer') return 'Nhà tuyển dụng';
  return 'Người lao động';
}

function shellRoleFromAccount(role?: AccountRole): ShellRole | null {
  if (role === 'NHA_TUYEN_DUNG') return 'employer';
  if (role === 'QUAN_TRI' || role === 'QUAN_TRI_VIEN') return 'admin';
  if (role === 'NGUOI_LAO_DONG') return 'worker';
  return null;
}

function accountRoleLabel(role?: AccountRole) {
  const shellRole = shellRoleFromAccount(role);
  return shellRole ? roleLabel(shellRole) : 'Tài khoản';
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
}

type ShellIconName = 'chevronDown' | 'mail' | 'menu' | 'phone';

function ShellIcon({
  name,
  ...props
}: { name: ShellIconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<ShellIconName, ReactNode> = {
    chevronDown: <path d="m6 9 6 6 6-6" />,
    mail: <path d="M4 6h16v12H4V6Zm0 1 8 6 8-6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    phone: (
      <path d="M6 4h4l2 5-3 2a11 11 0 0 0 4 4l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2Z" />
    ),
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
