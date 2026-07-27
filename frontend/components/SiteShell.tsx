"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from "@/lib/backend-api";
import { portalFetch } from "@/lib/portal-api";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  role?: "worker" | "employer" | "admin";
  action?: ReactNode;
};

const menus = {
  worker: [
    ["/", "Tìm việc"],
    ["/viec-lam-da-luu", "Việc làm đã lưu"],
    ["/viec-lam-da-ung-tuyen", "Việc đã ứng tuyển"],
    ["/thong-bao", "Thông báo"],
  ],
  employer: [
    ["/nha-tuyen-dung/tin-tuyen-dung", "Tin tuyển dụng"],
    ["/thong-bao", "Thông báo"],
  ],
  admin: [
    ["/quan-tri/tai-khoan", "Tài khoản"],
    ["/quan-tri/nha-tuyen-dung", "Duyệt nhà tuyển dụng"],
    ["/quan-tri/kiem-duyet", "Kiểm duyệt tin"],
    ["/quan-tri/danh-muc-nghe", "Danh mục nghề"],
    ["/quan-tri/thong-ke", "Thống kê & báo cáo"],
    ["/thong-bao", "Thông báo"],
  ],
} as const;

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
  title,
  subtitle,
  role = "worker",
  action,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [user, setUser] = useState<{ hoTen: string; email: string; vaiTro: string } | null>(null);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACCOUNT_KEY);
    if (stored) {
      try {
        const account = JSON.parse(stored);
        setUser({
          hoTen: account.hoTen ?? account.tenDangNhap ?? account.email,
          email: account.email,
          vaiTro: account.vaiTro,
        });
        return;
      } catch {
        window.localStorage.removeItem(ACCOUNT_KEY);
      }
    }
    setUser(null);
  }, []);
  useEffect(() => {
    if (window.localStorage.getItem(ACCESS_TOKEN_KEY)) portalFetch<any[]>("/notifications").then(setNotices).catch(() => setNotices([]));
  }, []);

  async function logout() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(ACCOUNT_KEY);
    router.push("/dang-nhap");
    router.refresh();
  }

  const displayName = user?.hoTen ?? (role === "admin" ? "Quản trị viên" : role === "employer" ? "Nhà tuyển dụng" : "Khách");
  const initials = displayName.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
  const unreadCount = notices.filter((item) => !item.daDoc).length;

  return (
    <main className="portal-page">
      <header className="portal-header">
        <div className="container portal-nav">
          <Logo />
          <button className="portal-menu" onClick={() => setOpen(!open)}>☰</button>
          <nav className={open ? "portal-links open" : "portal-links"}>
            {menus[role].map(([href, label]) => (
              <Link className={pathname === href ? "active" : ""} href={href === "/thong-bao" ? `${href}?role=${role}` : href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="portal-account">
            <button className="notification-button" onClick={() => { setNotificationOpen(!notificationOpen); setAccountOpen(false); }} aria-label="Mở thông báo" aria-expanded={notificationOpen}>🔔{unreadCount > 0 && <b>{unreadCount}</b>}</button>
            {notificationOpen && <div className="notification-popover">
              <div className="notification-popover-head"><div><h3>Thông báo</h3><small>{unreadCount} thông báo chưa đọc</small></div><Link href={`/thong-bao?role=${role}`}>Xem tất cả</Link></div>
              <div className="notification-popover-list">{notices.slice(0, 3).map((item) => <Link className={!item.daDoc ? "popover-notice unread" : "popover-notice"} href={`/thong-bao?role=${role}`} key={item.id}><span>🔔</span><div><strong>{item.tieuDe}</strong><p>{item.noiDung}</p><small>{new Date(item.ngayTao).toLocaleDateString("vi-VN")}</small></div>{!item.daDoc && <i />}</Link>)}</div>
              <Link className="notification-popover-footer" href={`/thong-bao?role=${role}`}>Xem toàn bộ thông báo →</Link>
            </div>}
            <button className="account-trigger" onClick={() => { setAccountOpen(!accountOpen); setNotificationOpen(false); }} aria-expanded={accountOpen}>
              <span className="account-avatar">{initials || "TK"}</span>
              <span><strong>{displayName}</strong><small>{user ? (role === "admin" ? "Cán bộ quản trị" : role === "employer" ? "Nhà tuyển dụng" : "Người lao động") : "Chưa đăng nhập"}</small></span>
              <b>⌄</b>
            </button>
            {accountOpen && <div className="account-menu">
              {user ? <>
                {role !== "admin" && (
                  <Link href={role === "employer" ? "/nha-tuyen-dung/ho-so" : "/ho-so"}>
                    Hồ sơ
                  </Link>
                )}
                <Link href="/doi-mat-khau">Đổi mật khẩu</Link>
                <button onClick={logout}>Đăng xuất</button>
              </> : <>
                <Link href="/dang-nhap">Đăng nhập</Link>
                <Link href="/dang-ky">Đăng ký tài khoản</Link>
              </>}
            </div>}
          </div>
        </div>
      </header>

      {(title || subtitle || action) && (
        <section className="page-heading">
          <div className="container page-heading-inner">
            <div>
              <span className="breadcrumb">Trang chủ / {title}</span>
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
