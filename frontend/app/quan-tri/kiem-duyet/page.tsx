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
  BadgeTone,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { ApiJob, portalFetch, salaryLabel } from '@/lib/portal-api';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Category = { id: number; name: string };

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
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [displayStatus, setDisplayStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [workType, setWorkType] = useState('');
  const [salaryBand, setSalaryBand] = useState('');
  const [location, setLocation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [sort, setSort] = useState('newest');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadJobs();
    portalFetch<Category[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
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
      .filter((item) => !displayStatus || item.displayStatus === displayStatus)
      .filter((item) => !categoryId || item.categoryId === Number(categoryId))
      .filter((item) => !workType || item.type === workType)
      .filter((item) => matchesSalaryBand(item, salaryBand))
      .filter(
        (item) =>
          !location ||
          `${item.location} ${item.province ?? ''} ${item.district ?? ''}`
            .toLocaleLowerCase('vi-VN')
            .includes(location.trim().toLocaleLowerCase('vi-VN')),
      )
      .filter((item) => !from || item.postedAt.slice(0, 10) >= from)
      .filter((item) => !to || item.postedAt.slice(0, 10) <= to)
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
  }, [
    categoryId,
    displayStatus,
    from,
    items,
    location,
    query,
    salaryBand,
    sort,
    status,
    to,
    workType,
  ]);

  const hasFilters = Boolean(
    query ||
    status ||
    displayStatus ||
    categoryId ||
    workType ||
    salaryBand ||
    location ||
    from ||
    to,
  );

  function resetFilters() {
    setSearchInput('');
    setQuery('');
    setStatus('');
    setDisplayStatus('');
    setCategoryId('');
    setWorkType('');
    setSalaryBand('');
    setLocation('');
    setFrom('');
    setTo('');
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

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
          <form className="admin-search-row" onSubmit={submitSearch}>
            <AdminSearchInput
              label="Tìm tin tuyển dụng"
              onChange={setSearchInput}
              onClear={() => {
                setSearchInput('');
                setQuery('');
              }}
              placeholder="Tìm doanh nghiệp hoặc tiêu đề..."
              value={searchInput}
            />
            <AdminButton icon="search" tone="primary" type="submit">
              Tìm kiếm
            </AdminButton>
          </form>
          <div className="admin-filter-row">
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
              label="Ngành nghề"
              onChange={setCategoryId}
              options={[
                { label: 'Tất cả ngành nghề', value: '' },
                ...categories.map((category) => ({
                  label: category.name,
                  value: String(category.id),
                })),
              ]}
              value={categoryId}
            />
            <AdminFilterSelect
              label="Hình thức"
              onChange={setWorkType}
              options={[
                { label: 'Tất cả hình thức', value: '' },
                { label: 'Toàn thời gian', value: 'TOAN_THOI_GIAN' },
                { label: 'Bán thời gian', value: 'BAN_THOI_GIAN' },
                { label: 'Thực tập', value: 'THUC_TAP' },
                { label: 'Thời vụ', value: 'THOI_VU' },
                { label: 'Từ xa', value: 'TU_XA' },
              ]}
              value={workType}
            />
            <AdminFilterSelect
              label="Mức lương"
              onChange={setSalaryBand}
              options={[
                { label: 'Tất cả mức lương', value: '' },
                { label: 'Dưới 10 triệu', value: 'under10' },
                { label: '10 - 20 triệu', value: '10to20' },
                { label: '20 - 30 triệu', value: '20to30' },
                { label: 'Từ 30 triệu', value: 'from30' },
                { label: 'Lương thỏa thuận', value: 'negotiable' },
              ]}
              value={salaryBand}
            />
            <AdminFilterSelect
              label="Hiển thị"
              onChange={setDisplayStatus}
              options={[
                { label: 'Tất cả', value: '' },
                { label: 'Đang hiển thị', value: 'DANG_HIEN_THI' },
                { label: 'Chưa đăng', value: 'CHUA_DANG' },
                { label: 'Tạm ẩn', value: 'TAM_AN' },
                { label: 'Đã đóng', value: 'DA_DONG' },
                { label: 'Hết hạn', value: 'HET_HAN' },
              ]}
              value={displayStatus}
            />
            <label className="admin-date-filter admin-text-filter">
              <span>Địa điểm</span>
              <input
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Hà Nội..."
                type="text"
                value={location}
              />
            </label>
            <label className="admin-date-filter">
              <span>Từ ngày</span>
              <input
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                type="date"
                value={from}
              />
            </label>
            <label className="admin-date-filter">
              <span>Đến ngày</span>
              <input
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                type="date"
                value={to}
              />
            </label>
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
              <AdminButton icon="refresh" onClick={resetFilters}>
                Đặt lại
              </AdminButton>
            )}
          </div>

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
                  <th scope="col">Ngành nghề</th>
                  <th scope="col">Ứng viên</th>
                  <th scope="col">Ngày gửi</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <AdminTableSkeleton columns={7} />}
                {!loading && shown.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <AdminEmptyState
                        action={
                          hasFilters ? (
                            <AdminButton icon="refresh" onClick={resetFilters}>
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
                        <td data-label="Ngành nghề">{item.category}</td>
                        <td data-label="Ứng viên">
                          {(item.applicantCount ?? 0).toLocaleString('vi-VN')}
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

function matchesSalaryBand(job: ApiJob, band: string) {
  if (!band) return true;
  if (band === 'negotiable') return job.negotiable;
  if (job.negotiable) return false;
  const from = Number(job.salaryFrom ?? 0);
  const to = Number(job.salaryTo ?? from);
  if (band === 'under10') return from < 10_000_000;
  if (band === '10to20') return to >= 10_000_000 && from <= 20_000_000;
  if (band === '20to30') return to >= 20_000_000 && from <= 30_000_000;
  if (band === 'from30') return to >= 30_000_000;
  return true;
}
