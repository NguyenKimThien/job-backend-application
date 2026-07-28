'use client';

import NavNotifications from '@/components/NavNotifications';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, SVGProps, useEffect, useState } from 'react';

type ShellRole = 'worker' | 'employer' | 'admin';

type MenuItem = {
  href: string;
  label: string;
  title?: string;
};

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

const menus: Record<ShellRole, MenuItem[]> = {
  worker: [
    { href: '/', label: 'Tìm việc' },
    { href: '/ho-so', label: 'Hồ sơ' },
    { href: '/viec-lam-da-luu', label: 'Việc làm đã lưu' },
    { href: '/viec-lam-da-ung-tuyen', label: 'Việc đã ứng tuyển' },
    { href: '/thong-bao', label: 'Thông báo' },
  ],
  employer: [
    { href: '/nha-tuyen-dung/ho-so', label: 'Hồ sơ doanh nghiệp' },
    { href: '/nha-tuyen-dung/tin-tuyen-dung', label: 'Tin tuyển dụng' },
    { href: '/thong-bao', label: 'Thông báo' },
  ],
  admin: [
    { href: '/quan-tri/tai-khoan', label: 'Tài khoản' },
    {
      href: '/quan-tri/nha-tuyen-dung',
      label: 'Nhà tuyển dụng',
      title: 'Kiểm duyệt nhà tuyển dụng',
    },
    {
      href: '/quan-tri/kiem-duyet',
      label: 'Tin tuyển dụng',
      title: 'Kiểm duyệt tin tuyển dụng',
    },
    {
      href: '/quan-tri/danh-muc-nghe',
      label: 'Ngành nghề',
      title: 'Danh mục ngành nghề',
    },
    {
      href: '/quan-tri/thong-ke',
      label: 'Báo cáo',
      title: 'Thống kê và báo cáo',
    },
    { href: '/thong-bao', label: 'Thông báo' },
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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setAccountOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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
  const shellClassName = uniqueClassNames(
    'portal-page',
    shellRole === 'admin' ? 'admin-page' : '',
    pageClassName,
  );

  return (
    <main className={shellClassName}>
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
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            className="portal-menu"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <ShellIcon name="menu" />
          </button>
          <nav
            aria-label={
              shellRole === 'admin' ? 'Điều hướng quản trị' : 'Điều hướng chính'
            }
            className={open ? 'portal-links open' : 'portal-links'}
          >
            <ul>
              {menus[shellRole].map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                const href =
                  item.href === '/thong-bao'
                    ? `${item.href}?role=${shellRole}`
                    : item.href;

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.title ?? item.label}
                      className={active ? 'active' : ''}
                      href={href}
                      title={item.title ?? item.label}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="portal-account">
            <NavNotifications
              role={shellRole}
              onOpen={() => setAccountOpen(false)}
            />
            <button
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              className="account-trigger"
              onClick={() => setAccountOpen((value) => !value)}
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
                      role="menuitem"
                      type="button"
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

function uniqueClassNames(...values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values
        .join(' ')
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).join(' ');
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
  height = 18,
  width = 18,
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
      height={height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={width}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
