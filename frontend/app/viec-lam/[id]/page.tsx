"use client";

import SiteShell from "@/components/SiteShell";
import { ApiJob, jobTypeLabel, portalFetch, salaryLabel } from "@/lib/portal-api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<ApiJob | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    portalFetch<ApiJob>(`/jobs/${params.id}`).then(setJob).catch((error) => setMessage(error.message));
  }, [params.id]);

  async function toggleSave() {
    if (!job) return;
    try {
      await portalFetch(`/worker/saved-jobs/${job.id}`, { method: saved ? "DELETE" : "POST" });
      setSaved(!saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bạn cần đăng nhập để lưu tin.");
    }
  }

  if (!job) return <SiteShell><section className="container portal-content"><div className="content-card detail-loading">{message || "Đang tải tin tuyển dụng..."}</div></section></SiteShell>;
  return (
    <SiteShell>
      <section className="job-detail-hero">
        <div className="container detail-hero-grid">
          <div className="company-logo large">{job.company.slice(0, 2).toUpperCase()}</div>
          <div><span className="verified-label">✓ Tin đã kiểm duyệt</span><h1>{job.title}</h1><p>{job.company}</p></div>
          <div className="detail-actions"><Link className="btn btn-primary" href={`/nop-ho-so/${job.id}`}>Ứng tuyển ngay</Link><button className="btn btn-ghost" onClick={toggleSave}>{saved ? "♥ Đã lưu" : "♡ Lưu tin"}</button></div>
        </div>
      </section>
      {message && <div className="container admin-message">{message}</div>}
      <section className="container detail-layout">
        <article className="content-card job-content">
          <h2>Mô tả công việc</h2><p>{job.description}</p>
          <h2>Yêu cầu ứng viên</h2><p>{job.requirements}</p>
          <h2>Quyền lợi</h2><p>{job.benefits || "Trao đổi khi phỏng vấn."}</p>
        </article>
        <aside className="detail-sidebar">
          <div className="content-card"><h3>Thông tin chung</h3><dl className="info-list"><div><dt>💰 Mức lương</dt><dd>{salaryLabel(job)}</dd></div><div><dt>📍 Địa điểm</dt><dd>{job.location}</dd></div><div><dt>💼 Kinh nghiệm</dt><dd>{job.experience ? `${job.experience} năm` : "Không yêu cầu"}</dd></div><div><dt>⏱ Hình thức</dt><dd>{jobTypeLabel(job.type)}</dd></div><div><dt>📅 Hạn nộp</dt><dd>{new Date(job.deadline).toLocaleDateString("vi-VN")}</dd></div></dl></div>
          <div className="content-card company-box"><h3>{job.company}</h3><p>Doanh nghiệp đã được Trung tâm xác thực thông tin.</p><Link className="text-button" href={`/cong-ty/${job.companyId}`}>Xem thông tin công ty →</Link></div>
        </aside>
      </section>
    </SiteShell>
  );
}
