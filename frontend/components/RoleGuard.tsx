'use client';

import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

type AccountRole = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI_VIEN';

type StoredAccount = {
  vaiTro?: AccountRole;
};

const roleHome: Record<AccountRole, string> = {
  NGUOI_LAO_DONG: '/ho-so',
  NHA_TUYEN_DUNG: '/nha-tuyen-dung/tin-tuyen-dung',
  QUAN_TRI_VIEN: '/quan-tri/tai-khoan',
};

export default function RoleGuard({
  allowed,
  children,
}: {
  allowed: readonly AccountRole[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const stored = window.localStorage.getItem(ACCOUNT_KEY);

    if (!token || !stored) {
      router.replace(`/dang-nhap?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    try {
      const account = JSON.parse(stored) as StoredAccount;
      if (!account.vaiTro || !allowed.includes(account.vaiTro)) {
        router.replace(account.vaiTro ? roleHome[account.vaiTro] : '/');
        return;
      }
      setAuthorized(true);
    } catch {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(ACCOUNT_KEY);
      router.replace(`/dang-nhap?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [allowed, pathname, router]);

  if (!authorized) {
    return (
      <main className="route-guard-loading" aria-live="polite">
        Đang kiểm tra quyền truy cập...
      </main>
    );
  }

  return children;
}
