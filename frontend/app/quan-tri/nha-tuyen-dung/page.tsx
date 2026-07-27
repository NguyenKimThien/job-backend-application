"use client";

import SiteShell from "@/components/SiteShell";
import Link from "next/link";
import { useEffect, useState } from "react";
import { portalFetch } from "@/lib/portal-api";

type Employer = {
  ma_nha_tuyen_dung: number;
  ten_don_vi: string;
  ma_so_thue: string;
  nguoi_dai_dien: string;
  email: string;
  so_dien_thoai_lien_he: string;
  ngay_tao: string;
  trang_thai_duyet: "CHO_DUYET" | "DA_DUYET" | "TU_CHOI";
};

export default function EmployerApprovalListPage() {
  const [items, setItems] = useState<Employer[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  useEffect(() => {
    portalFetch<any[]>("/admin/employers")
      .then((data) => setItems(data.map((item) => ({
        ma_nha_tuyen_dung: item.id,
        ten_don_vi: item.tenDonVi,
        ma_so_thue: item.maSoThue,
        nguoi_dai_dien: item.nguoiDaiDien ?? "Chưa cập nhật",
        email: item.taiKhoan.email,
        so_dien_thoai_lien_he: item.soDienThoaiLienHe ?? item.taiKhoan.soDienThoai ?? "",
        ngay_tao: item.ngayTao,
        trang_thai_duyet: item.trangThaiDuyet === "BAN_NHAP" ? "CHO_DUYET" : item.trangThaiDuyet,
      }))))
      .catch(() => undefined);
  }, []);
  const shown = filter === "Tất cả" ? items : items.filter((item) => item.trang_thai_duyet === filter);
  return (
    <SiteShell role="admin" title="Kiểm duyệt nhà tuyển dụng" subtitle="Xác minh thông tin doanh nghiệp trước khi cho phép đăng tin tuyển dụng.">
      <section className="container portal-content">
        <div className="summary-grid">
          <div className="summary-card"><span>⏳</span><div><b>{items.filter((x) => x.trang_thai_duyet === "CHO_DUYET").length}</b><small>Chờ duyệt</small></div></div>
          <div className="summary-card"><span>✓</span><div><b>{items.filter((x) => x.trang_thai_duyet === "DA_DUYET").length}</b><small>Đã duyệt</small></div></div>
          <div className="summary-card"><span>🏢</span><div><b>{items.length}</b><small>Tổng hồ sơ</small></div></div>
        </div>
        <div className="content-card table-card">
          <div className="table-toolbar"><input className="table-search" placeholder="Tìm tên đơn vị hoặc mã số thuế..." /><select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}><option>Tất cả</option><option value="CHO_DUYET">Chờ duyệt</option><option value="DA_DUYET">Đã duyệt</option><option value="TU_CHOI">Từ chối</option></select></div>
          <div className="responsive-table"><table><thead><tr><th>Đơn vị đăng ký</th><th>Mã số thuế</th><th>Người đại diện</th><th>Ngày đăng ký</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{shown.map((item) => <tr key={item.ma_nha_tuyen_dung}><td><strong>{item.ten_don_vi}</strong><small>{item.email} · {item.so_dien_thoai_lien_he}</small></td><td>{item.ma_so_thue}</td><td>{item.nguoi_dai_dien}</td><td>{new Date(item.ngay_tao).toLocaleDateString("vi-VN")}</td><td><span className={`status ${item.trang_thai_duyet === "DA_DUYET" ? "success" : item.trang_thai_duyet === "TU_CHOI" ? "danger" : "warning"}`}>{item.trang_thai_duyet === "DA_DUYET" ? "Đã duyệt" : item.trang_thai_duyet === "TU_CHOI" ? "Từ chối" : "Chờ duyệt"}</span></td><td><Link className="table-link" href={`/quan-tri/nha-tuyen-dung/${item.ma_nha_tuyen_dung}`}>Xem chi tiết →</Link></td></tr>)}</tbody></table></div>
        </div>
      </section>
    </SiteShell>
  );
}
