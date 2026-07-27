"use client";

import SiteShell from "@/components/SiteShell";
import { ApiJob, portalFetch, salaryLabel } from "@/lib/portal-api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ApplyPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<ApiJob | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [cv, setCv] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([portalFetch<ApiJob>(`/jobs/${params.id}`), portalFetch<any>("/worker/profile")])
      .then(([jobData, profileData]) => { setJob(jobData); setProfile(profileData); setCv(profileData.tepCvUrl ?? ""); })
      .catch((error) => setMessage(error.message));
  }, [params.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await portalFetch(`/worker/applications/${params.id}`, {
        method: "POST",
        body: JSON.stringify({ tepCvUrl: cv || null, thuGioiThieu: form.get("thuGioiThieu") }),
      });
      setMessage("Đã nộp hồ sơ ứng tuyển thành công.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể nộp hồ sơ.");
    }
  }

  if (!job) return <SiteShell><div className="container portal-content detail-loading">{message || "Đang tải..."}</div></SiteShell>;
  return (
    <SiteShell title="Nộp hồ sơ ứng tuyển" subtitle="Kiểm tra thông tin trước khi gửi hồ sơ tới nhà tuyển dụng.">
      <section className="container portal-content application-layout">
        <form className="content-card application-form" onSubmit={submit}>
          {message && <div className={`form-message ${message.startsWith("Đã") ? "success" : "error"}`}>{message}</div>}
          <div className="card-title"><div><h2>Thông tin ứng viên</h2><p>Thông tin này được lấy từ hồ sơ của bạn.</p></div></div>
          <div className="form-grid"><label className="form-group"><span>Họ và tên</span><input value={profile?.hoTen ?? ""} disabled /></label><label className="form-group"><span>Số điện thoại</span><input value={profile?.taiKhoan?.soDienThoai ?? ""} disabled /></label><label className="form-group full"><span>Email</span><input value={profile?.taiKhoan?.email ?? ""} disabled /></label></div>
          <label className="upload-zone"><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setCv(event.target.files?.[0]?.name ?? cv)} /><span>☁</span><strong>Chọn CV</strong><small>{cv || "Chưa có CV"}</small></label>
          <label className="form-group section-gap"><span>Thư giới thiệu</span><textarea name="thuGioiThieu" placeholder="Giới thiệu ngắn gọn lý do bạn phù hợp..." maxLength={1500} /></label>
          <label className="terms"><input type="checkbox" required /> Tôi xác nhận thông tin trong hồ sơ là chính xác.</label>
          <div className="form-footer"><Link className="btn btn-ghost" href={`/viec-lam/${job.id}`}>Quay lại</Link><button className="btn btn-primary">Nộp hồ sơ</button></div>
        </form>
        <aside className="content-card application-summary"><span className="status success">Tin đã kiểm duyệt</span><h2>{job.title}</h2><p>{job.company}</p><dl className="info-list"><div><dt>Mức lương</dt><dd>{salaryLabel(job)}</dd></div><div><dt>Địa điểm</dt><dd>{job.location}</dd></div><div><dt>Hạn nộp</dt><dd>{new Date(job.deadline).toLocaleDateString("vi-VN")}</dd></div></dl></aside>
      </section>
    </SiteShell>
  );
}
