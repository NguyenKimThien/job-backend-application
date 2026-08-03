'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, SVGProps, useEffect, useRef, useState } from 'react';
import NavNotifications, {
  NotificationRole,
} from '@/components/NavNotifications';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';

type AccountRole = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI_VIEN';

type Account = {
  email?: string;
  hoTen?: string;
  tenDangNhap?: string;
  tenHienThi?: string;
  vaiTro?: AccountRole;
};

type PublicHeaderProps = {
  active?: 'home' | 'jobs' | 'categories' | 'guide' | 'contact';
};

export default function PublicHeader({ active = 'home' }: PublicHeaderProps) {
  const router = useRouter();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const stored = window.localStorage.getItem(ACCOUNT_KEY);

    if (!token || !stored) {
      setAccount(null);
      return;
    }

    try {
      setAccount(JSON.parse(stored) as Account);
    } catch {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(ACCOUNT_KEY);
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function logout() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(ACCOUNT_KEY);
    setAccount(null);
    setAccountMenuOpen(false);
    router.refresh();
  }

  const displayName =
    account?.tenHienThi ??
    account?.hoTen ??
    account?.tenDangNhap ??
    account?.email ??
    '';
  const accountInitials = getInitials(displayName || 'Tài khoản');

  return (
    <header className="home-header">
      <div className="home-utility">
        <div className="home-container home-utility-inner">
          <a href="tel:02438582525">
            <Icon name="phone" />
            <span>024 3858 2525</span>
          </a>
          <a href="mailto:hotro@vieclamthanhnien.vn">
            <Icon name="mail" />
            <span>hotro@vieclamthanhnien.vn</span>
          </a>
        </div>
      </div>

      <nav className="home-container home-nav" aria-label="Điều hướng chính">
        <Link
          className="home-brand"
          href="/"
          aria-label="Việc làm Thanh niên Hà Nội"
        >
          <span className="home-brand-mark">V</span>
          <span>
            <strong>VIỆC LÀM</strong>
            <small>THANH NIÊN HÀ NỘI</small>
          </span>
        </Link>

        <button
          className="home-menu-button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          type="button"
        >
          <Icon name="menu" />
        </button>

        <div className={`home-nav-links ${menuOpen ? 'open' : ''}`}>
          <Link className={active === 'home' ? 'active' : ''} href="/">
            Trang chủ
          </Link>
          <Link className={active === 'jobs' ? 'active' : ''} href="/viec-lam">
            Việc làm
          </Link>
          <Link
            className={active === 'categories' ? 'active' : ''}
            href="/nganh-nghe"
          >
            Ngành nghề
          </Link>
          <Link
            className={active === 'guide' ? 'active' : ''}
            href="/#cam-nang"
          >
            Cẩm nang
          </Link>
          <Link
            className={active === 'contact' ? 'active' : ''}
            href="/#lien-he"
          >
            Liên hệ
          </Link>
        </div>

        <div className={`home-nav-actions ${menuOpen ? 'open' : ''}`}>
          <NavNotifications
            className="home-notification"
            role={notificationRole(account?.vaiTro)}
            onOpen={() => setAccountMenuOpen(false)}
          />
          {account ? (
            <div className="home-account" ref={accountMenuRef}>
              <button
                className="home-account-trigger"
                type="button"
                onClick={() => setAccountMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
              >
                <span className="home-account-avatar">{accountInitials}</span>
                <span className="home-account-name">
                  <strong>{displayName}</strong>
                  <small>{roleLabel(account.vaiTro)}</small>
                </span>
                <Icon name="chevronDown" />
              </button>
              {accountMenuOpen && (
                <div className="home-account-menu" role="menu">
                  {accountMenuItems(account.vaiTro).map((item) => (
                    <Link href={item.href} key={item.href} role="menuitem">
                      {item.label}
                    </Link>
                  ))}
                  <button
                    className="danger"
                    onClick={logout}
                    type="button"
                    role="menuitem"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="home-auth-link" href="/dang-nhap">
                Đăng nhập
              </Link>
              <Link className="home-primary-link" href="/dang-ky">
                Tạo tài khoản
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function accountMenuItems(role?: AccountRole) {
  if (role === 'NHA_TUYEN_DUNG') {
    return [
      { href: '/nha-tuyen-dung/ho-so', label: 'Hồ sơ doanh nghiệp' },
      {
        href: '/nha-tuyen-dung/tin-tuyen-dung',
        label: 'Quản lý tin tuyển dụng',
      },
      {
        href: '/nha-tuyen-dung/tin-tuyen-dung/tao-moi',
        label: 'Đăng tin tuyển dụng',
      },
      { href: '/nha-tuyen-dung/thong-ke', label: 'Thống kê tuyển dụng' },
      { href: '/doi-mat-khau', label: 'Cài đặt tài khoản' },
    ];
  }

  if (role === 'QUAN_TRI_VIEN') {
    return [
      { href: '/quan-tri/thong-ke', label: 'Trang quản trị' },
      { href: '/thong-bao?role=admin', label: 'Thông báo' },
      { href: '/doi-mat-khau', label: 'Cài đặt tài khoản' },
    ];
  }

  return [
    { href: '/ho-so', label: 'Hồ sơ cá nhân' },
    { href: '/viec-lam-da-luu', label: 'Việc làm đã lưu' },
    { href: '/viec-lam-da-ung-tuyen', label: 'Hồ sơ đã ứng tuyển' },
    { href: '/doi-mat-khau', label: 'Cài đặt tài khoản' },
  ];
}

function roleLabel(role?: AccountRole) {
  switch (role) {
    case 'NHA_TUYEN_DUNG':
      return 'Nhà tuyển dụng';
    case 'QUAN_TRI_VIEN':
      return 'Quản trị viên';
    case 'NGUOI_LAO_DONG':
      return 'Người lao động';
    default:
      return 'Tài khoản';
  }
}

function notificationRole(role?: AccountRole): NotificationRole {
  if (role === 'QUAN_TRI_VIEN') return 'admin';
  if (role === 'NHA_TUYEN_DUNG') return 'employer';
  return 'worker';
}

function getInitials(value: string) {
  const words = value
    .replace(/công ty|tnhh|cổ phần|cp|mtv/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (words[0]?.[0] ?? 'V')
    .concat(words[1]?.[0] ?? words[0]?.[1] ?? 'L')
    .toUpperCase();
}

type IconName = 'chevronDown' | 'mail' | 'menu' | 'phone';

function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
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
