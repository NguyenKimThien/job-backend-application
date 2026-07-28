'use client';

import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSelect,
  AdminLinkButton,
  AdminRowActions,
  AdminSearchInput,
  AdminStatCard,
  AdminStatsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableSkeleton,
  AdminToolbar,
  AdminToolbarGroup,
  BadgeTone,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { ApiJob, portalFetch, salaryLabel } from '@/lib/portal-api';
import { useEffect, useMemo, useState } from 'react';

type ReviewStatus =
  'BAN_NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'YEU_CAU_BO_SUNG';

const statusMeta: Record<ReviewStatus, { label: string; tone: BadgeTone }> = {
  BAN_NHAP: { label: 'Bản nháp', tone: 'neutral' },
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
  DA_DUYET: { label: 'Đã phê duyệt', tone: 'success' },
  TU_CHOI: { label: 'Từ chối', tone: 'danger' },
  YEU_CAU_BO_SUNG: { label: 'Cần chỉnh sửa', tone: 'info' },
};

export default function ModerationPage() {
  const [items, setItems] = useState<ApiJob[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    setMessage('');
    try {
      const data = await portalFetch<ApiJob[]>('/admin/jobs');
      setItems(data);
    } catch (error) {
      setItems([]);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
    } finally {
      setLoading(false);
    }
  }

  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi-VN');
    return items
      .filter((item) => !status || item.status === status)
      .filter((item) => {
        if (!term) return true;
        return `${item.company} ${item.title}`
          .toLocaleLowerCase('vi-VN')
          .includes(term);
      })
      .sort((a, b) =>
        sort === 'oldest'
          ? Date.parse(a.postedAt) - Date.parse(b.postedAt)
          : Date.parse(b.postedAt) - Date.parse(a.postedAt),
      );
  }, [items, query, sort, status]);

  const hasFilters = Boolean(query || status);

  return (
    <SiteShell
      breadcrumb="Trang chủ / Kiểm duyệt tin tuyển dụng"
      pageClassName="admin-page"
      role="admin"
      subtitle="Kiểm tra nội dung và tính hợp lệ trước khi công khai tin tuyển dụng."
      title="Kiểm duyệt tin tuyển dụng"
    >
      <section className="container portal-content admin-content">
        <AdminStatsGrid>
          <AdminStatCard
            icon="shield"
            label="Chờ duyệt"
            tone="warning"
            value={countByStatus(items, 'CHO_DUYET')}
          />
          <AdminStatCard
            icon="checkCircle"
            label="Đã duyệt"
            tone="success"
            value={countByStatus(items, 'DA_DUYET')}
          />
          <AdminStatCard
            icon="edit"
            label="Cần chỉnh sửa"
            tone="info"
            value={countByStatus(items, 'YEU_CAU_BO_SUNG')}
          />
          <AdminStatCard
            icon="briefcase"
            label="Tổng tin"
            value={items.length}
          />
        </AdminStatsGrid>

        <div className="content-card admin-table-card">
          <AdminToolbar>
            <AdminToolbarGroup>
              <AdminSearchInput
                label="Tìm tin tuyển dụng"
                onChange={setQuery}
                onClear={() => setQuery('')}
                placeholder="Tìm doanh nghiệp hoặc tiêu đề..."
                value={query}
              />
            </AdminToolbarGroup>
            <AdminToolbarGroup>
              <AdminFilterSelect
                label="Trạng thái"
                onChange={setStatus}
                options={[
                  { label: 'Tất cả trạng thái', value: '' },
                  { label: 'Chờ duyệt', value: 'CHO_DUYET' },
                  { label: 'Đã phê duyệt', value: 'DA_DUYET' },
                  { label: 'Cần chỉnh sửa', value: 'YEU_CAU_BO_SUNG' },
                  { label: 'Từ chối', value: 'TU_CHOI' },
                ]}
                value={status}
              />
              <AdminFilterSelect
                label="Sắp xếp"
                onChange={setSort}
                options={[
                  { label: 'Mới nhất', value: 'newest' },
                  { label: 'Cũ nhất', value: 'oldest' },
                ]}
                value={sort}
              />
              {hasFilters && (
                <AdminButton
                  icon="refresh"
                  onClick={() => {
                    setQuery('');
                    setStatus('');
                  }}
                >
                  Đặt lại
                </AdminButton>
              )}
            </AdminToolbarGroup>
          </AdminToolbar>

          {message && !loading ? (
            <AdminErrorState
              message={message}
              onRetry={() => {
                void loadJobs();
              }}
            />
          ) : (
            <AdminTable caption="Danh sách tin tuyển dụng cần kiểm duyệt">
              <thead>
                <tr>
                  <th scope="col">Doanh nghiệp</th>
                  <th scope="col">Tiêu đề tin</th>
                  <th scope="col">Ngày gửi</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <AdminTableSkeleton columns={5} />}
                {!loading && shown.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <AdminEmptyState
                        action={
                          hasFilters ? (
                            <AdminButton
                              icon="refresh"
                              onClick={() => {
                                setQuery('');
                                setStatus('');
                              }}
                            >
                              Xóa bộ lọc
                            </AdminButton>
                          ) : undefined
                        }
                        description={
                          hasFilters
                            ? 'Không có tin tuyển dụng phù hợp với bộ lọc hiện tại.'
                            : 'Chưa có tin tuyển dụng nào cần kiểm duyệt.'
                        }
                        icon="briefcase"
                        title={
                          hasFilters
                            ? 'Không tìm thấy dữ liệu phù hợp'
                            : 'Chưa có tin tuyển dụng'
                        }
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  shown.map((item) => {
                    const status = getStatusMeta(item.status);
                    return (
                      <tr key={item.id}>
                        <td data-label="Doanh nghiệp">
                          <strong>{item.company}</strong>
                          <small>{item.location}</small>
                        </td>
                        <td data-label="Tiêu đề tin">
                          <strong>{item.title}</strong>
                          <small>
                            {salaryLabel(item)} · Hạn{' '}
                            {formatAdminDate(item.deadline)}
                          </small>
                        </td>
                        <td data-label="Ngày gửi">
                          {formatAdminDate(item.postedAt)}
                        </td>
                        <td data-label="Trạng thái">
                          <AdminStatusBadge tone={status.tone}>
                            {status.label}
                          </AdminStatusBadge>
                        </td>
                        <td data-label="Thao tác">
                          <AdminRowActions
                            actions={[]}
                            label={item.title}
                            primary={
                              <AdminLinkButton
                                href={`/quan-tri/kiem-duyet/${item.id}`}
                                icon="eye"
                              >
                                {actionLabel(item.status)}
                              </AdminLinkButton>
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </AdminTable>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function getStatusMeta(status: string) {
  return isReviewStatus(status)
    ? statusMeta[status]
    : ({ label: status, tone: 'neutral' } satisfies {
        label: string;
        tone: BadgeTone;
      });
}

function isReviewStatus(status: string): status is ReviewStatus {
  return status in statusMeta;
}

function countByStatus(items: ApiJob[], status: ReviewStatus) {
  return items.filter((item) => item.status === status).length;
}

function actionLabel(status: string) {
  if (status === 'CHO_DUYET') return 'Kiểm duyệt tin';
  if (status === 'YEU_CAU_BO_SUNG') return 'Xem yêu cầu';
  return 'Xem kết quả';
}
