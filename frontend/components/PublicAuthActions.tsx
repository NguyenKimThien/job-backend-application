"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from "@/lib/backend-api";

export default function PublicAuthActions() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const stored = localStorage.getItem(ACCOUNT_KEY);
    if (!token || !stored) return;
    try {
      setAccount(JSON.parse(stored));
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCOUNT_KEY);
    }
  }, []);

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    setAccount(null);
    router.push("/");
    router.refresh();
  }

  if (!account) {
    return <div className="nav-actions">
      <Link className="nav-pill nav-register" href="/dang-ky">Đăng ký</Link>
      <Link className="nav-pill nav-login" href="/dang-nhap">Đăng nhập</Link>
      <Link className="employer-cta" href="/dang-ky-nha-tuyen-dung"><strong>Nhà tuyển dụng</strong></Link>
    </div>;
  }

  const area = account.vaiTro === "QUAN_TRI_VIEN"
    ? "/quan-tri/thong-ke"
    : account.vaiTro === "NHA_TUYEN_DUNG"
      ? "/nha-tuyen-dung/tin-tuyen-dung"
      : "/ho-so";

  return <div className="nav-actions public-account">
    <button className="nav-pill nav-register public-account-trigger" type="button" onClick={() => setOpen(!open)}>
      {account.tenHienThi ?? account.tenDangNhap ?? account.email}<span>⌄</span>
    </button>
    <button className="nav-pill nav-login" type="button" onClick={logout}>Đăng xuất</button>
    {open && <div className="public-account-menu">
      {account.vaiTro === "NGUOI_LAO_DONG" && <>
        <Link href="/ho-so">Hồ sơ người lao động</Link>
        <Link href="/viec-lam-da-luu">Việc làm đã lưu</Link>
        <Link href="/viec-lam-da-ung-tuyen">Việc đã ứng tuyển</Link>
      </>}
      {account.vaiTro === "NHA_TUYEN_DUNG" && <>
        <Link href="/nha-tuyen-dung/ho-so">Hồ sơ nhà tuyển dụng</Link>
        <Link href="/nha-tuyen-dung/tin-tuyen-dung">Quản lý tin tuyển dụng</Link>
        <Link href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi">Đăng tin mới</Link>
      </>}
      {account.vaiTro === "QUAN_TRI_VIEN" && <Link href={area}>Trang quản trị</Link>}
      <Link href="/thong-bao">Thông báo</Link>
      <Link href="/doi-mat-khau">Đổi mật khẩu</Link>
    </div>}
  </div>;
}
