'use client';

import {
  AdminButton,
  AdminLinkButton,
  AdminStatusBadge,
  BadgeTone,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { ApiJob, portalFetch, salaryLabel } from '@/lib/portal-api';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const statusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  BAN_NHAP: { label: 'Bản nháp', tone: 'neutral' },
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
  DA_DUYET: { label: 'Đã phê duyệt', tone: 'success' },
  TU_CHOI: { label: 'Từ chối', tone: 'danger' },
  YEU_CAU_BO_SUNG: { label: 'Cần chỉnh sửa', tone: 'info' },
};

export default function JobModerationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<ApiJob | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    portalFetch<ApiJob>(`/admin/jobs/${id}`)
      .then(setJob)
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
        ),
      );
  }, [id]);

  async function review(action: 'approve' | 'reject') {
    if (action === 'reject' && !reason.trim()) {
      setMessage('Vui lòng nhập lý do từ chối.');
      return;
    }
    setSaving(true);
    try {
      await portalFetch(`/admin/jobs/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      });
      setMessage(
        action === 'approve' ? 'Đã phê duyệt tin.' : 'Đã từ chối tin.',
      );
      setJob((current) =>
        current
          ? {
              ...current,
              status: action === 'approve' ? 'DA_DUYET' : 'TU_CHOI',
            }
          : current,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xử lý.');
    } finally {
      setSaving(false);
    }
  }

  if (!job) {
    return (
      <SiteShell pageClassName="admin-page" role="admin">
        <section className="container portal-content admin-content">
          <div className="content-card detail-loading">
            {message || 'Đang tải dữ liệu...'}
          </div>
        </section>
      </SiteShell>
    );
  }

  const status = statusMeta[job.status] ?? {
    label: job.status,
    tone: 'neutral',
  };

  return (
    <SiteShell
      action={
        <AdminLinkButton href="/quan-tri/kiem-duyet" icon="chevronLeft">
          Quay lại
        </AdminLinkButton>
      }
      breadcrumb="Trang chủ / Kiểm duyệt tin tuyển dụng / Chi tiết"
      pageClassName="admin-page"
      role="admin"
      title="Chi tiết kiểm duyệt tin"
    >
      <section className="container portal-content admin-content employer-review-layout">
        <article className="content-card job-content">
          <div className="card-title">
            <div>
              <AdminStatusBadge tone={status.tone}>
                {status.label}
              </AdminStatusBadge>
              <h2>{job.title}</h2>
              <p>{job.company}</p>
            </div>
          </div>
          <h2>Mô tả công việc</h2>
          <p>{job.description}</p>
          <h2>Yêu cầu ứng viên</h2>
          <p>{job.requirements}</p>
          <h2>Quyền lợi</h2>
          <p>{job.benefits || 'Không có'}</p>
          <p>
            <b>Địa điểm:</b> {job.location} · <b>Lương:</b> {salaryLabel(job)}
          </p>
        </article>

        <aside className="content-card review-panel">
          <h3>Kết quả kiểm duyệt</h3>
          {message && <div className="form-message success">{message}</div>}
          <AdminButton
            disabled={saving}
            icon="checkCircle"
            onClick={() => {
              void review('approve');
            }}
            tone="primary"
          >
            Phê duyệt tin
          </AdminButton>
          <label className="form-group">
            <span>Lý do từ chối *</span>
            <textarea
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </label>
          <AdminButton
            disabled={saving}
            icon="x"
            onClick={() => {
              void review('reject');
            }}
            tone="danger"
          >
            Từ chối
          </AdminButton>
        </aside>
      </section>
    </SiteShell>
  );
}
