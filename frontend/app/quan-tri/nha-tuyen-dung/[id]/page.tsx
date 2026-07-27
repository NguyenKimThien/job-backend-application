"use client";

import SiteShell from "@/components/SiteShell";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { portalFetch } from "@/lib/portal-api";

type Profile = Record<string, string | number | null>;
const empty: Profile = { ten_don_vi: "", ma_so_thue: "", dia_chi_tru_so: "", nguoi_dai_dien: "", email: "", so_dien_thoai_lien_he: "", ten_linh_vuc_hoat_dong: "", tep_giay_phep_kinh_doanh: "", trang_thai_duyet: "CHO_DUYET", ngay_tao: "" };
const fromApi = (item: any): Profile => ({
  ma_nha_tuyen_dung: item.id,
  ten_don_vi: item.tenDonVi,
  ma_so_thue: item.maSoThue,
  dia_chi_tru_so: item.diaChiTruSo,
  nguoi_dai_dien: item.nguoiDaiDien,
  email: item.taiKhoan?.email,
  so_dien_thoai_lien_he: item.soDienThoaiLienHe ?? item.taiKhoan?.soDienThoai,
  ten_linh_vuc_hoat_dong: item.linhVuc?.tenLinhVuc,
  tep_giay_phep_kinh_doanh: item.tepGiayPhepUrl,
  trang_thai_duyet: item.trangThaiDuyet === "BAN_NHAP" ? "CHO_DUYET" : item.trangThaiDuyet,
  ngay_tao: item.ngayTao,
});

export default function EmployerApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile>(empty);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    portalFetch<any>(`/admin/employers/${id}`).then((data) => setProfile(fromApi(data))).catch(() => undefined);
  }, [id]);
  async function decide(hanhDong: "PHE_DUYET" | "TU_CHOI") {
    if (hanhDong === "TU_CHOI" && !reason.trim()) return setMessage("Vui lòng nhập lý do từ chối.");
    try {
      const data = await portalFetch<any>(`/admin/employers/${id}/review`, { method: "PATCH", body: JSON.stringify({ action: hanhDong === "PHE_DUYET" ? "approve" : "reject", reason }) });
      setMessage("Đã cập nhật kết quả kiểm duyệt.");
      setProfile(fromApi({ ...data, taiKhoan: { email: profile.email }, linhVuc: { tenLinhVuc: profile.ten_linh_vuc_hoat_dong } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật.");
    }
  }
  return (
    <SiteShell role="admin" title="Chi tiết hồ sơ nhà tuyển dụng" subtitle="Đối chiếu thông tin đăng ký và giấy tờ doanh nghiệp.">
      <section className="container portal-content employer-review-layout">
        <article className="content-card company-profile-card">
          <div className="company-profile-head"><span>ABC</span><div><small>HỒ SƠ DOANH NGHIỆP</small><h2>{profile.ten_don_vi}</h2><p>Đăng ký ngày {new Date(String(profile.ngay_tao)).toLocaleDateString("vi-VN")}</p></div><i className={`status ${profile.trang_thai_duyet === "DA_DUYET" ? "success" : profile.trang_thai_duyet === "TU_CHOI" ? "danger" : "warning"}`}>{profile.trang_thai_duyet === "DA_DUYET" ? "Đã duyệt" : profile.trang_thai_duyet === "TU_CHOI" ? "Từ chối" : "Chờ duyệt"}</i></div>
          <section><h3>Thông tin pháp lý</h3><div className="detail-info-grid"><div><small>Mã số thuế</small><strong>{profile.ma_so_thue}</strong></div><div><small>Lĩnh vực hoạt động</small><strong>{profile.ten_linh_vuc_hoat_dong || "Chưa cập nhật"}</strong></div><div className="wide"><small>Địa chỉ trụ sở</small><strong>{profile.dia_chi_tru_so}</strong></div></div></section>
          <section><h3>Người đại diện và liên hệ</h3><div className="detail-info-grid"><div><small>Người đại diện</small><strong>{profile.nguoi_dai_dien}</strong></div><div><small>Số điện thoại</small><strong>{profile.so_dien_thoai_lien_he}</strong></div><div><small>Email tài khoản</small><strong>{profile.email}</strong></div></div></section>
          <section><h3>Giấy phép kinh doanh</h3><div className="document-row"><span>📄</span><div><strong>{profile.tep_giay_phep_kinh_doanh || "Chưa tải tệp giấy phép"}</strong><small>Tệp minh chứng do nhà tuyển dụng cung cấp</small></div><button className="btn btn-ghost">Xem tệp</button></div></section>
        </article>
        <aside className="content-card review-panel"><h3>Kết quả kiểm duyệt</h3>{message && <div className="form-message success">{message}</div>}<div className="review-checklist"><span>✓ Thông tin đơn vị đầy đủ</span><span>✓ Mã số thuế hợp lệ</span><span>✓ Thông tin liên hệ rõ ràng</span><span>□ Kiểm tra giấy phép kinh doanh</span></div><label className="form-group"><span>Lý do từ chối</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bắt buộc nhập khi từ chối..." /></label><button className="decision approve" onClick={() => decide("PHE_DUYET")}>✓ Phê duyệt hồ sơ</button><button className="decision reject" onClick={() => decide("TU_CHOI")}>✕ Từ chối hồ sơ</button><p>Sau khi phê duyệt, tài khoản chuyển sang hoạt động và được phép đăng tin tuyển dụng.</p></aside>
      </section>
    </SiteShell>
  );
}
