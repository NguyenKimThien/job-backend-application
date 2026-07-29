"use client";

import SiteShell from "@/components/SiteShell";
import { portalFetch } from "@/lib/portal-api";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

export default function JobEditorPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [negotiableSalary, setNegotiableSalary] = useState(false);

  useEffect(() => {
    portalFetch<Category[]>("/categories").then(setCategories).catch((error) => setMessage(error.message));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await portalFetch("/employer/jobs", {
        method: "POST",
        body: JSON.stringify({
          viTriTuyenDung: form.get("viTriTuyenDung"),
          nganhNgheId: Number(form.get("nganhNgheId")),
          hinhThucLamViec: form.get("hinhThucLamViec"),
          mucLuongTu: Number(form.get("mucLuongTu")) || null,
          mucLuongDen: Number(form.get("mucLuongDen")) || null,
          coTheThoaThuan: form.get("coTheThoaThuan") === "on",
          diaDiemLamViec: form.get("diaDiemLamViec"),
          moTaCongViec: form.get("moTaCongViec"),
          yeuCauUngVien: form.get("yeuCauUngVien"),
          quyenLoi: form.get("quyenLoi"),
          thoiHanNhanHoSo: form.get("thoiHanNhanHoSo"),
          soLuongTuyen: Number(form.get("soLuongTuyen") || 1),
          soNamKinhNghiemToiThieu:
            form.get("soNamKinhNghiemToiThieu") === ""
              ? null
              : Number(form.get("soNamKinhNghiemToiThieu")),
          trinhDoYeuCau: form.get("trinhDoYeuCau"),
          skills: String(form.get("skills") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      setMessage("Đã gửi tin tuyển dụng để kiểm duyệt.");
      setTimeout(() => router.push("/nha-tuyen-dung/tin-tuyen-dung"), 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo tin tuyển dụng.");
    }
  }

  return (
    <SiteShell role="employer" title="Tạo tin tuyển dụng" subtitle="Cung cấp thông tin rõ ràng để tiếp cận ứng viên phù hợp.">
      <section className="container portal-content editor-layout">
        <form className="content-card editor-form" onSubmit={save}>
          {message && <div className={`form-message ${message.startsWith("Đã") ? "success" : "error"}`}>{message}</div>}
          <div className="card-title numbered"><b>1</b><div><h2>Thông tin cơ bản</h2><p>Tiêu đề, ngành nghề và địa điểm làm việc.</p></div></div>
          <div className="form-grid">
            <label className="form-group full"><span>Tiêu đề công việc *</span><input name="viTriTuyenDung" required /></label>
            <label className="form-group"><span>Ngành nghề *</span><select name="nganhNgheId" required><option value="">Chọn ngành nghề</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label className="form-group"><span>Hình thức làm việc *</span><select name="hinhThucLamViec"><option value="TOAN_THOI_GIAN">Toàn thời gian</option><option value="BAN_THOI_GIAN">Bán thời gian</option><option value="THUC_TAP">Thực tập</option><option value="THOI_VU">Thời vụ</option><option value="TU_XA">Từ xa</option></select></label>
            <label className="form-group"><span>Lương từ (VNĐ)</span><input disabled={negotiableSalary} min="0" name="mucLuongTu" type="number" /></label>
            <label className="form-group"><span>Lương đến (VNĐ)</span><input disabled={negotiableSalary} min="0" name="mucLuongDen" type="number" /></label>
            <label className="form-group full checkbox-line">
              <input
                checked={negotiableSalary}
                name="coTheThoaThuan"
                onChange={(event) => setNegotiableSalary(event.target.checked)}
                type="checkbox"
              />
              <span>Lương thỏa thuận</span>
            </label>
            <label className="form-group full"><span>Địa điểm *</span><input name="diaDiemLamViec" required /></label>
            <label className="form-group">
              <span>Số năm kinh nghiệm tối thiểu</span>
              <input min="0" name="soNamKinhNghiemToiThieu" step="0.5" type="number" />
            </label>
            <label className="form-group">
              <span>Trình độ yêu cầu</span>
              <input name="trinhDoYeuCau" placeholder="Ví dụ: Cao đẳng, Đại học" />
            </label>
          </div>
          <div className="card-title numbered"><b>2</b><div><h2>Nội dung tuyển dụng</h2><p>Mô tả trách nhiệm và tiêu chí ứng viên.</p></div></div>
          <label className="form-group"><span>Mô tả công việc *</span><textarea name="moTaCongViec" required /></label>
          <label className="form-group"><span>Yêu cầu ứng viên *</span><textarea name="yeuCauUngVien" required /></label>
          <label className="form-group">
            <span>Kỹ năng (phân cách bằng dấu phẩy)</span>
            <input name="skills" placeholder="Ví dụ: Giao tiếp, Excel, Làm việc nhóm" />
          </label>
          <label className="form-group"><span>Quyền lợi</span><textarea name="quyenLoi" /></label>
          <div className="form-grid"><label className="form-group"><span>Hạn nộp hồ sơ *</span><input name="thoiHanNhanHoSo" type="date" required /></label><label className="form-group"><span>Số lượng tuyển</span><input name="soLuongTuyen" type="number" defaultValue="1" min="1" /></label></div>
          <div className="form-footer"><button className="btn btn-primary">Gửi kiểm duyệt</button></div>
        </form>
        <aside className="editor-tips content-card"><h3>💡 Mẹo đăng tin hiệu quả</h3><ul><li>Tiêu đề ngắn gọn, đúng vị trí cần tuyển.</li><li>Nêu rõ mức lương và quyền lợi.</li><li>Mô tả công việc bằng các gạch đầu dòng.</li></ul><p>Tin sẽ được quản trị viên kiểm duyệt trước khi hiển thị.</p></aside>
      </section>
    </SiteShell>
  );
}
