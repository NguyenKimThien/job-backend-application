"use client";

import SiteShell from "@/components/SiteShell";
import { ApiJob, portalFetch, salaryLabel } from "@/lib/portal-api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const statusLabel: Record<string, string> = {
  BAN_NHAP: "Bản nháp",
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đang hiển thị",
  TU_CHOI: "Từ chối",
  YEU_CAU_BO_SUNG: "Yêu cầu bổ sung",
};

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    portalFetch<ApiJob[]>("/employer/jobs")
      .then(setJobs)
      .catch((error) => setMessage(error.message));
  }, []);

  const shown = useMemo(() => jobs.filter((job) => {
    const term = query.trim().toLocaleLowerCase("vi");
    return (!term || job.title.toLocaleLowerCase("vi").includes(term))
      && (!filter || job.status === filter);
  }), [filter, jobs, query]);

  return (
    <SiteShell role="employer" title="Quản lý tin tuyển dụng" subtitle="Đăng tin, chỉnh sửa và theo dõi hiệu quả tuyển dụng." action={<Link className="btn btn-primary" href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi">＋ Đăng tin mới</Link>}>
      <section className="container portal-content">
        {message && <div className="form-message error">{message}</div>}
        <div className="summary-grid">
          <div className="summary-card"><span>📢</span><div><b>{jobs.length}</b><small>Tổng tin tuyển dụng</small></div></div>
          <div className="summary-card"><span>●</span><div><b>{jobs.filter((job) => job.displayStatus === "DANG_HIEN_THI").length}</b><small>Đang hiển thị</small></div></div>
          <div className="summary-card"><span>👥</span><div><b>{jobs.reduce((sum, job) => sum + (job.applicantCount ?? 0), 0)}</b><small>Hồ sơ ứng viên</small></div></div>
        </div>
        <div className="content-card table-card">
          <div className="table-toolbar">
            <input className="table-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề tin..." />
            <select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">Tất cả trạng thái</option><option value="DA_DUYET">Đang hiển thị</option><option value="CHO_DUYET">Chờ duyệt</option><option value="TU_CHOI">Từ chối</option>
            </select>
          </div>
          <div className="responsive-table"><table><thead><tr><th>Tiêu đề tin</th><th>Ngày đăng</th><th>Ứng viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
            {shown.map((job) => <tr key={job.id}><td><strong>{job.title}</strong><small>{salaryLabel(job)} · {job.location}</small></td><td>{new Date(job.postedAt).toLocaleDateString("vi-VN")}</td><td><Link className="applicant-count" href={`/nha-tuyen-dung/tin-tuyen-dung/${job.id}/ung-vien`}>{job.applicantCount ?? 0} hồ sơ</Link></td><td><span className={`status ${job.status === "DA_DUYET" ? "success" : job.status === "TU_CHOI" ? "danger" : "warning"}`}>{statusLabel[job.status] ?? job.status}</span></td><td><Link className="table-link applicant-action" href={`/nha-tuyen-dung/tin-tuyen-dung/${job.id}/ung-vien`}>Xem ứng viên</Link><Link className="table-link" href={`/viec-lam/${job.id}`}>Xem tin</Link></td></tr>)}
          </tbody></table></div>
        </div>
      </section>
    </SiteShell>
  );
}
