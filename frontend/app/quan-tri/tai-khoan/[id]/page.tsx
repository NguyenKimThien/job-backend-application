"use client";

import SiteShell from "@/components/SiteShell";
import { portalFetch } from "@/lib/portal-api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = {
  id: number;
  tenDangNhap: string;
  email: string;
  soDienThoai: string | null;
  vaiTro: string;
  trangThaiTaiKhoan: string;
  emailXacThucLuc: string | null;
  lanDangNhapCuoi: string | null;
  ngayTao: string;
  hoSoNguoiLaoDong?: {
    hoTen: string;
    ngaySinh: string | null;
    gioiTinh: string | null;
    diaChi: string | null;
    mucLuongMongMuonTu: string | number | null;
    mucLuongMongMuonDen: string | number | null;
    diaDiemMongMuon: string | null;
    hocVans: Array<{ tenCoSoDaoTao: string; chuyenNganh: string | null; trinhDo: string }>;
    kinhNghiemLamViecs: Array<{ tenDonVi: string; viTriCongViec: string }>;
    hoSoKyNangs: Array<{ kyNang: { tenKyNang: string } }>;
  } | null;
  hoSoNhaTuyenDung?: {
    tenDonVi: string;
    maSoThue: string;
    diaChiTruSo: string;
    nguoiDaiDien: string | null;
    chucVuNguoiDaiDien: string | null;
    trangThaiDuyet: string;
    linhVuc: { tenLinhVuc: string } | null;
  } | null;
};

const value = (data: unknown) => data === null || data === undefined || data === "" ? "Chưa cập nhật" : String(data);

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    portalFetch<Detail>(`/admin/users/${params.id}`)
      .then(setAccount)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ."));
  }, [params.id]);

  return (
    <SiteShell role="admin" title="Chi tiết tài khoản" subtitle="Thông tin tài khoản và hồ sơ liên quan trong hệ thống.">
      <section className="container portal-content">
        <Link className="back-link" href="/quan-tri/tai-khoan">← Quay lại danh sách tài khoản</Link>
        {message && <div className="admin-message">{message}</div>}
        {!account && !message && <div className="content-card detail-loading">Đang tải dữ liệu...</div>}
        {account && <>
          <article className="content-card account-detail-card">
            <div className="account-detail-head">
              <span>{(account.hoSoNguoiLaoDong?.hoTen ?? account.hoSoNhaTuyenDung?.tenDonVi ?? account.tenDangNhap).slice(0, 1)}</span>
              <div><small>MÃ TÀI KHOẢN #{account.id}</small><h2>{account.hoSoNguoiLaoDong?.hoTen ?? account.hoSoNhaTuyenDung?.tenDonVi ?? account.tenDangNhap}</h2><p>{account.email}</p></div>
              <i className={`status ${account.trangThaiTaiKhoan === "HOAT_DONG" ? "success" : "danger"}`}>{account.trangThaiTaiKhoan}</i>
            </div>
            <div className="detail-info-grid">
              <div><small>Tên đăng nhập</small><strong>{account.tenDangNhap}</strong></div>
              <div><small>Vai trò</small><strong>{account.vaiTro}</strong></div>
              <div><small>Số điện thoại</small><strong>{value(account.soDienThoai)}</strong></div>
              <div><small>Ngày tạo</small><strong>{new Date(account.ngayTao).toLocaleString("vi-VN")}</strong></div>
              <div><small>Xác thực email lúc</small><strong>{account.emailXacThucLuc ? new Date(account.emailXacThucLuc).toLocaleString("vi-VN") : "Chưa xác thực"}</strong></div>
              <div><small>Đăng nhập cuối</small><strong>{account.lanDangNhapCuoi ? new Date(account.lanDangNhapCuoi).toLocaleString("vi-VN") : "Chưa đăng nhập"}</strong></div>
            </div>
          </article>

          {account.hoSoNguoiLaoDong && <article className="content-card account-detail-card">
            <h3>Hồ sơ người lao động</h3>
            <div className="detail-info-grid">
              <div><small>Họ tên</small><strong>{account.hoSoNguoiLaoDong.hoTen}</strong></div>
              <div><small>Ngày sinh</small><strong>{value(account.hoSoNguoiLaoDong.ngaySinh)}</strong></div>
              <div><small>Giới tính</small><strong>{value(account.hoSoNguoiLaoDong.gioiTinh)}</strong></div>
              <div><small>Địa chỉ</small><strong>{value(account.hoSoNguoiLaoDong.diaChi)}</strong></div>
              <div><small>Mức lương mong muốn</small><strong>{value(account.hoSoNguoiLaoDong.mucLuongMongMuonTu)} - {value(account.hoSoNguoiLaoDong.mucLuongMongMuonDen)}</strong></div>
              <div><small>Địa điểm mong muốn</small><strong>{value(account.hoSoNguoiLaoDong.diaDiemMongMuon)}</strong></div>
              <div className="wide"><small>Kỹ năng</small><strong>{account.hoSoNguoiLaoDong.hoSoKyNangs.map((item) => item.kyNang.tenKyNang).join(", ") || "Chưa cập nhật"}</strong></div>
              <div className="wide"><small>Học vấn</small><strong>{account.hoSoNguoiLaoDong.hocVans.map((item) => `${item.trinhDo} - ${item.chuyenNganh ?? "Chưa ghi chuyên ngành"}, ${item.tenCoSoDaoTao}`).join("; ") || "Chưa cập nhật"}</strong></div>
              <div className="wide"><small>Kinh nghiệm</small><strong>{account.hoSoNguoiLaoDong.kinhNghiemLamViecs.map((item) => `${item.viTriCongViec} tại ${item.tenDonVi}`).join("; ") || "Chưa cập nhật"}</strong></div>
            </div>
          </article>}

          {account.hoSoNhaTuyenDung && <article className="content-card account-detail-card">
            <h3>Hồ sơ nhà tuyển dụng</h3>
            <div className="detail-info-grid">
              <div><small>Tên đơn vị</small><strong>{account.hoSoNhaTuyenDung.tenDonVi}</strong></div>
              <div><small>Mã số thuế / tên đăng nhập</small><strong>{account.hoSoNhaTuyenDung.maSoThue}</strong></div>
              <div className="wide"><small>Địa chỉ trụ sở</small><strong>{account.hoSoNhaTuyenDung.diaChiTruSo}</strong></div>
              <div><small>Lĩnh vực</small><strong>{value(account.hoSoNhaTuyenDung.linhVuc?.tenLinhVuc)}</strong></div>
              <div><small>Trạng thái duyệt</small><strong>{account.hoSoNhaTuyenDung.trangThaiDuyet}</strong></div>
              <div><small>Người đại diện</small><strong>{value(account.hoSoNhaTuyenDung.nguoiDaiDien)}</strong></div>
              <div><small>Chức vụ</small><strong>{value(account.hoSoNhaTuyenDung.chucVuNguoiDaiDien)}</strong></div>
            </div>
          </article>}
        </>}
      </section>
    </SiteShell>
  );
}
