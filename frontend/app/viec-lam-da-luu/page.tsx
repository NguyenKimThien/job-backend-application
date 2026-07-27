"use client";
import SiteShell from "@/components/SiteShell";
import { ApiJob, portalFetch, salaryLabel } from "@/lib/portal-api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function SavedJobsPage() {
  const [items, setItems] = useState<ApiJob[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { portalFetch<ApiJob[]>("/worker/saved-jobs").then(setItems).catch((e) => setMessage(e.message)); }, []);
  const jobs = useMemo(() => items.filter((job) => `${job.title} ${job.company}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  async function removeJob(id: number) {
    try { await portalFetch(`/worker/saved-jobs/${id}`, { method: "DELETE" }); setItems((list) => list.filter((job) => job.id !== id)); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Không thể bỏ lưu."); }
  }
  return <SiteShell title="Việc làm đã lưu" subtitle="Danh sách các cơ hội bạn quan tâm để xem lại và ứng tuyển.">
    <section className="container portal-content">
      {message && <div className="form-message error">{message}</div>}
      <div className="summary-grid compact saved-summary"><div className="summary-card"><span>♡</span><div><b>{items.length}</b><small>Việc làm đã lưu</small></div></div></div>
      <div className="content-card saved-jobs-card"><div className="card-title saved-jobs-toolbar"><div><h2>Danh sách lưu tin</h2><p>Dữ liệu được đồng bộ với tài khoản của bạn.</p></div><input className="table-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên việc hoặc công ty..." /></div>
        <div className="saved-job-list">{jobs.map((job) => <article className="saved-job-item" key={job.id}><div className="company-logo saved-logo">{job.company.slice(0, 2).toUpperCase()}</div><div><h3><Link href={`/viec-lam/${job.id}`}>{job.title}</Link></h3><p>{job.company}</p><div className="job-meta"><span>⌖ {job.location}</span><span className="salary">₫ {salaryLabel(job)}</span></div></div><div className="saved-job-actions"><Link className="btn btn-primary" href={`/nop-ho-so/${job.id}`}>Ứng tuyển</Link><button className="btn btn-ghost" onClick={() => removeJob(job.id)}>♥ Bỏ lưu</button></div></article>)}
        {!jobs.length && <div className="empty-state"><span>♡</span><h3>Chưa có việc làm đã lưu</h3><Link className="btn btn-primary empty-action" href="/viec-lam">Tìm việc làm</Link></div>}</div>
      </div>
    </section>
  </SiteShell>;
}
