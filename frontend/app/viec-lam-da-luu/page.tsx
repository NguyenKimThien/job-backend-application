"use client";
import SiteShell from "@/components/SiteShell";
import { ApiJob, portalFetch, salaryLabel } from "@/lib/portal-api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

export default function SavedJobsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ApiJob[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    portalFetch<ApiJob[]>("/worker/saved-jobs")
      .then(setItems)
      .catch((e) => setMessage(e.message));
  }, []);

  const jobs = useMemo(
    () =>
      items.filter((job) =>
        `${job.title} ${job.company}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  function openJobDetail(id: number) {
    router.push(`/viec-lam/${id}`);
  }

  function openJobDetailWithKeyboard(
    event: KeyboardEvent<HTMLElement>,
    id: number,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openJobDetail(id);
  }

  function stopRowNavigation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  async function removeJob(id: number) {
    try {
      await portalFetch(`/worker/saved-jobs/${id}`, { method: "DELETE" });
      setItems((list) => list.filter((job) => job.id !== id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể bỏ lưu.");
    }
  }

  return (
    <SiteShell
      title="Việc làm đã lưu"
      subtitle="Danh sách các cơ hội bạn quan tâm để xem lại và ứng tuyển."
    >
      <section className="container portal-content">
        {message && <div className="form-message error">{message}</div>}
        <div className="summary-grid compact saved-summary">
          <div className="summary-card">
            <span>♡</span>
            <div>
              <b>{items.length}</b>
              <small>Việc làm đã lưu</small>
            </div>
          </div>
        </div>
        <div className="content-card saved-jobs-card">
          <div className="card-title saved-jobs-toolbar">
            <div>
              <h2>Danh sách lưu tin</h2>
              <p>Dữ liệu được đồng bộ với tài khoản của bạn.</p>
            </div>
            <input
              className="table-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên việc hoặc công ty..."
            />
          </div>
          <div className="saved-job-list">
            {jobs.map((job) => (
              <article
                aria-label={`Xem chi tiết ${job.title}`}
                className="saved-job-item"
                key={job.id}
                onClick={() => openJobDetail(job.id)}
                onKeyDown={(event) => openJobDetailWithKeyboard(event, job.id)}
                role="link"
                tabIndex={0}
              >
                <div className="company-logo saved-logo">
                  {job.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="saved-job-info">
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <div className="job-meta">
                    <span>⌖ {job.location}</span>
                    <span className="salary">₫ {salaryLabel(job)}</span>
                  </div>
                </div>
                <div className="saved-job-actions" onClick={stopRowNavigation}>
                  <Link className="btn btn-primary" href={`/nop-ho-so/${job.id}`}>
                    Ứng tuyển ngay
                  </Link>
                  <Link className="btn btn-ghost" href={`/viec-lam/${job.id}`}>
                    Xem chi tiết
                  </Link>
                  <button
                    className="btn btn-ghost"
                    onClick={() => removeJob(job.id)}
                    type="button"
                  >
                    ♥ Bỏ lưu
                  </button>
                </div>
              </article>
            ))}
            {!jobs.length && (
              <div className="empty-state">
                <span>♡</span>
                <h3>Chưa có việc làm đã lưu</h3>
                <Link className="btn btn-primary empty-action" href="/viec-lam">
                  Tìm việc làm
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
