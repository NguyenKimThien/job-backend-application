"use client";

import SiteShell from "@/components/SiteShell";
import { FormEvent, useEffect, useState } from "react";
import { portalFetch } from "@/lib/portal-api";

const initial = { tenDonVi: "Công ty Cổ phần Công nghệ ABC", linhVucId: "", maSoThue: "0109123456", diaChiTruSo: "Số 25 Duy Tân, Cầu Giấy, Hà Nội", nguoiDaiDien: "Chưa cập nhật", chucVuNguoiDaiDien: "Chưa cập nhật", soDienThoaiLienHe: "0987654321", email: "tuyendung@abc.vn", tepGiayPhepKinhDoanh: "", trangThai: "CHO_DUYET" };

export default function EmployerProfilePage() {
  const [form, setForm] = useState(initial);
  const [fields, setFields] = useState<{ ma_linh_vuc: number; ten_linh_vuc_hoat_dong: string }[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([
      portalFetch<any>("/employer/profile"),
      portalFetch<any[]>("/fields"),
    ]).then(([profile, fieldItems]) => {
      setForm({ tenDonVi: profile.tenDonVi, linhVucId: profile.linhVucId ?? "", maSoThue: profile.maSoThue, diaChiTruSo: profile.diaChiTruSo, nguoiDaiDien: profile.nguoiDaiDien ?? "", chucVuNguoiDaiDien: profile.chucVuNguoiDaiDien ?? "", soDienThoaiLienHe: profile.soDienThoaiLienHe ?? "", email: profile.taiKhoan.email, tepGiayPhepKinhDoanh: profile.tepGiayPhepUrl ?? "", trangThai: profile.trangThaiDuyet });
      setFields(fieldItems.map((item) => ({ ma_linh_vuc: item.id, ten_linh_vuc_hoat_dong: item.tenLinhVuc })));
    }).catch((error) => setMessage(error.message));
  }, []);
  function change(name: string, value: string) { setForm((old) => ({ ...old, [name]: value })); }
  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await portalFetch("/employer/profile", { method: "PATCH", body: JSON.stringify({ tenDonVi: form.tenDonVi, linhVucId: form.linhVucId ? Number(form.linhVucId) : null, diaChiTruSo: form.diaChiTruSo, nguoiDaiDien: form.nguoiDaiDien, chucVuNguoiDaiDien: form.chucVuNguoiDaiDien, soDienThoaiLienHe: form.soDienThoaiLienHe, tepGiayPhepKinhDoanh: form.tepGiayPhepKinhDoanh }) });
      setMessage("Đã cập nhật hồ sơ và gửi chờ duyệt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    }
  }
  return (
    <SiteShell role="employer" title="Hồ sơ nhà tuyển dụng" subtitle="Quản lý thông tin pháp lý và hồ sơ doanh nghiệp.">
      <section className="container portal-content employer-profile-layout">
        <aside className="content-card employer-profile-summary"><div className="company-big-logo">ABC</div><h2>{form.tenDonVi}</h2><p>{form.email}</p><span className={`status ${form.trangThai === "DA_DUYET" ? "success" : form.trangThai === "TU_CHOI" ? "danger" : "warning"}`}>{form.trangThai === "DA_DUYET" ? "Đã được phê duyệt" : form.trangThai === "TU_CHOI" ? "Hồ sơ bị từ chối" : "Đang chờ phê duyệt"}</span><div className="profile-note">Tài khoản chỉ được đăng tin tuyển dụng sau khi quản trị viên phê duyệt hồ sơ.</div></aside>
        <form className="content-card profile-form" onSubmit={save}>
          {message && <div className={`form-message ${message.startsWith("Đã") ? "success" : "error"}`}>{message}</div>}
          <div className="card-title"><div><h2>Thông tin doanh nghiệp</h2><p>Các trường có dấu * là thông tin bắt buộc.</p></div></div>
          <div className="form-grid">
            <label className="form-group full"><span>Tên đơn vị *</span><input value={form.tenDonVi} onChange={(e) => change("tenDonVi", e.target.value)} /></label>
            <label className="form-group"><span>Mã số thuế / Tên đăng nhập</span><input value={form.maSoThue} disabled /></label>
            <label className="form-group"><span>Lĩnh vực hoạt động *</span><select value={form.linhVucId} onChange={(e) => change("linhVucId", e.target.value)}><option value="">Chọn lĩnh vực</option>{fields.map((field) => <option value={field.ma_linh_vuc} key={field.ma_linh_vuc}>{field.ten_linh_vuc_hoat_dong}</option>)}</select></label>
            <label className="form-group full"><span>Địa chỉ trụ sở *</span><input value={form.diaChiTruSo} onChange={(e) => change("diaChiTruSo", e.target.value)} /></label>
            <label className="form-group"><span>Người đại diện *</span><input value={form.nguoiDaiDien} onChange={(e) => change("nguoiDaiDien", e.target.value)} /></label>
            <label className="form-group"><span>Chức vụ người đại diện *</span><input value={form.chucVuNguoiDaiDien} onChange={(e) => change("chucVuNguoiDaiDien", e.target.value)} /></label>
            <label className="form-group"><span>Số điện thoại liên hệ *</span><input value={form.soDienThoaiLienHe} onChange={(e) => change("soDienThoaiLienHe", e.target.value)} /></label>
            <label className="form-group"><span>Email tài khoản</span><input value={form.email} disabled /></label>
            <label className="form-group full"><span>Giấy phép kinh doanh</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => change("tepGiayPhepKinhDoanh", e.target.files?.[0]?.name ?? form.tepGiayPhepKinhDoanh)} /><small className="file-hint">Hiện tại: {form.tepGiayPhepKinhDoanh || "Chưa có tệp"}</small></label>
          </div>
          <div className="form-footer"><button className="btn btn-primary">Lưu thông tin</button></div>
        </form>
      </section>
    </SiteShell>
  );
}
