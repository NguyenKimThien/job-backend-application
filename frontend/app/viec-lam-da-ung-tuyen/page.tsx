'use client';

import SiteShell from '@/components/SiteShell';
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';
import Link from 'next/link';
import {
  FormEvent,
  ReactNode,
  SVGProps,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ApplicationStatus =
  | 'DA_NOP'
  | 'DA_XEM'
  | 'DUOC_CHON_SO_BO'
  | 'MOI_PHONG_VAN'
  | 'DA_PHONG_VAN'
  | 'TRUNG_TUYEN'
  | 'KHONG_PHU_HOP'
  | 'DA_RUT';

type AppliedJob = {
  id: number;
  ngayNop?: string | null;
  ngayCapNhatTrangThai?: string | null;
  trangThaiHienTai: ApplicationStatus;
  tepCvSnapshotUrl?: string | null;
  lyDoTuChoi?: string | null;
  job: ApiJob;
};

type FilterKey = 'all' | 'pending' | 'interview' | 'approved' | 'rejected';
type SortKey = 'updated-desc' | 'applied-desc' | 'applied-asc' | 'status';
type PageState = 'loading' | 'ready' | 'error';

type StatusMeta = {
  label: string;
  description: string;
  nextAction: string;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
};

const applicationStatusMeta: Record<ApplicationStatus, StatusMeta> = {
  DA_NOP: {
    label: 'Đang chờ xử lý',
    description: 'Hồ sơ đã được gửi tới nhà tuyển dụng.',
    nextAction: 'Theo dõi phản hồi từ nhà tuyển dụng.',
    tone: 'info',
  },
  DA_XEM: {
    label: 'Đã xem',
    description: 'Nhà tuyển dụng đã xem hồ sơ của bạn.',
    nextAction: 'Chuẩn bị thông tin nếu được liên hệ tiếp.',
    tone: 'info',
  },
  DUOC_CHON_SO_BO: {
    label: 'Sơ bộ',
    description: 'Hồ sơ đang ở vòng xem xét tiếp theo.',
    nextAction: 'Theo dõi lịch phỏng vấn hoặc thông báo mới.',
    tone: 'warning',
  },
  MOI_PHONG_VAN: {
    label: 'Mời phỏng vấn',
    description: 'Nhà tuyển dụng đã chuyển hồ sơ sang bước phỏng vấn.',
    nextAction: 'Kiểm tra thông báo và chuẩn bị phỏng vấn.',
    tone: 'warning',
  },
  DA_PHONG_VAN: {
    label: 'Đã phỏng vấn',
    description: 'Hồ sơ đã qua bước phỏng vấn.',
    nextAction: 'Chờ kết quả đánh giá cuối cùng.',
    tone: 'warning',
  },
  TRUNG_TUYEN: {
    label: 'Đã duyệt',
    description: 'Hồ sơ đã được nhà tuyển dụng chấp nhận.',
    nextAction: 'Theo dõi hướng dẫn tiếp theo từ nhà tuyển dụng.',
    tone: 'success',
  },
  KHONG_PHU_HOP: {
    label: 'Từ chối',
    description: 'Nhà tuyển dụng đã kết thúc xử lý hồ sơ này.',
    nextAction: 'Tìm thêm cơ hội phù hợp khác.',
    tone: 'danger',
  },
  DA_RUT: {
    label: 'Đã rút',
    description: 'Hồ sơ đã được rút khỏi quy trình ứng tuyển.',
    nextAction: 'Bạn có thể tìm thêm cơ hội phù hợp khác.',
    tone: 'neutral',
  },
};

const filters: Array<{
  key: FilterKey;
  label: string;
  statuses?: ApplicationStatus[];
}> = [
  { key: 'all', label: 'Tất cả' },
  {
    key: 'pending',
    label: 'Đang chờ',
    statuses: ['DA_NOP', 'DA_XEM', 'DUOC_CHON_SO_BO'],
  },
  {
    key: 'interview',
    label: 'Phỏng vấn',
    statuses: ['MOI_PHONG_VAN', 'DA_PHONG_VAN'],
  },
  { key: 'approved', label: 'Đã duyệt', statuses: ['TRUNG_TUYEN'] },
  { key: 'rejected', label: 'Từ chối', statuses: ['KHONG_PHU_HOP', 'DA_RUT'] },
];

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'updated-desc', label: 'Mới cập nhật nhất' },
  { key: 'applied-desc', label: 'Ngày nộp mới nhất' },
  { key: 'applied-asc', label: 'Ngày nộp cũ nhất' },
  { key: 'status', label: 'Theo trạng thái' },
];

export default function AppliedJobsPage() {
  const [items, setItems] = useState<AppliedJob[]>([]);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated-desc');

  useEffect(() => {
    applyUrlState();
    window.addEventListener('popstate', applyUrlState);
    return () => window.removeEventListener('popstate', applyUrlState);
  }, []);

  useEffect(() => {
    void loadApplications();
  }, []);

  async function loadApplications() {
    setPageState('loading');
    try {
      const data = await portalFetch<AppliedJob[]>('/worker/applications');
      setItems(data);
      setPageState('ready');
    } catch {
      setPageState('error');
    }
  }

  function applyUrlState() {
    const params = new URLSearchParams(window.location.search);
    const nextFilter = params.get('status');
    const nextSort = params.get('sort');

    setFilter(isFilterKey(nextFilter) ? nextFilter : 'all');
    setSort(isSortKey(nextSort) ? nextSort : 'updated-desc');
    setQuery(params.get('q') ?? '');
  }

  function updateUrl(
    next: { filter?: FilterKey; query?: string; sort?: SortKey },
    mode: 'push' | 'replace',
  ) {
    const params = new URLSearchParams(window.location.search);
    const nextFilter = next.filter ?? filter;
    const nextQuery = next.query ?? query;
    const nextSort = next.sort ?? sort;

    if (nextFilter === 'all') params.delete('status');
    else params.set('status', nextFilter);

    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    else params.delete('q');

    if (nextSort === 'updated-desc') params.delete('sort');
    else params.set('sort', nextSort);

    const url = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](
      null,
      '',
      url,
    );
  }

  function changeFilter(value: FilterKey) {
    setFilter(value);
    updateUrl({ filter: value }, 'push');
  }

  function changeSort(value: SortKey) {
    setSort(value);
    updateUrl({ sort: value }, 'push');
  }

  function changeQuery(value: string) {
    setQuery(value);
    updateUrl({ query: value }, 'replace');
  }

  function clearQuery() {
    changeQuery('');
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ query }, 'push');
  }

  const counts = useMemo(() => getFilterCounts(items), [items]);

  const shown = useMemo(() => {
    const keyword = normalizeText(query);
    const selectedFilter = filters.find((item) => item.key === filter);
    const statuses = selectedFilter?.statuses;

    return [...items]
      .filter((item) => !statuses || statuses.includes(item.trangThaiHienTai))
      .filter((item) => {
        if (!keyword) return true;
        return normalizeText(
          `${item.job.title} ${item.job.company} ${item.job.location}`,
        ).includes(keyword);
      })
      .sort((a, b) => compareApplications(a, b, sort));
  }, [filter, items, query, sort]);

  const countLabel =
    pageState === 'loading'
      ? 'Đang tải hồ sơ...'
      : applicationCountLabel(items.length);
  const resultLabel =
    query.trim() || filter !== 'all'
      ? `${shown.length}/${items.length} hồ sơ phù hợp`
      : `${items.length} hồ sơ ứng tuyển trong tài khoản của bạn`;

  return (
    <SiteShell
      pageClassName="applied-jobs-page"
      title="Việc làm đã ứng tuyển"
      subtitle="Theo dõi trạng thái xử lý của các hồ sơ bạn đã nộp."
    >
      <section className="container portal-content applied-jobs-content">
        <div className="applied-toolbar" aria-labelledby="applied-title">
          <div className="applied-toolbar-copy">
            <span>{countLabel}</span>
            <h2 id="applied-title">Hồ sơ ứng tuyển</h2>
            <p aria-live="polite">{resultLabel}</p>
          </div>
          <div className="applied-toolbar-controls">
            <form
              className="applied-search"
              onSubmit={submitSearch}
              role="search"
            >
              <label className="sr-only" htmlFor="applied-query">
                Tìm theo tên công việc hoặc công ty
              </label>
              <Icon name="search" />
              <input
                id="applied-query"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                placeholder="Tìm theo tên công việc hoặc công ty"
              />
              {query && (
                <button
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={clearQuery}
                  type="button"
                >
                  <Icon name="x" />
                </button>
              )}
            </form>
            <label className="applied-sort">
              <span>Sắp xếp</span>
              <select
                value={sort}
                onChange={(event) => changeSort(event.target.value as SortKey)}
              >
                {sortOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          className="applied-tabs"
          role="tablist"
          aria-label="Lọc trạng thái hồ sơ"
        >
          {filters.map((item) => (
            <button
              aria-selected={filter === item.key}
              className={filter === item.key ? 'active' : ''}
              id={`applied-tab-${item.key}`}
              key={item.key}
              onClick={() => changeFilter(item.key)}
              role="tab"
              type="button"
            >
              {item.label}
              <span>{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <div
          aria-labelledby={`applied-tab-${filter}`}
          className="applied-panel"
          role="tabpanel"
        >
          {pageState === 'loading' && <AppliedJobsSkeleton />}
          {pageState === 'error' && (
            <AppliedJobsError
              onRetry={() => {
                void loadApplications();
              }}
            />
          )}
          {pageState === 'ready' &&
            Boolean(items.length) &&
            Boolean(shown.length) && <AppliedJobsList items={shown} />}
          {pageState === 'ready' && !items.length && <AppliedJobsEmpty />}
          {pageState === 'ready' && Boolean(items.length) && !shown.length && (
            <AppliedJobsNoResults onClear={clearQuery} />
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function AppliedJobsList({ items }: { items: AppliedJob[] }) {
  return (
    <>
      <div className="content-card applied-table-card">
        <div className="applied-table-wrap">
          <table className="applied-table">
            <thead>
              <tr>
                <th>Công việc</th>
                <th>Công ty</th>
                <th>Ngày nộp</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <AppliedJobRow item={item} key={item.id} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="applied-card-list">
        {items.map((item) => (
          <AppliedJobCard item={item} key={item.id} />
        ))}
      </div>
    </>
  );
}

function AppliedJobRow({ item }: { item: AppliedJob }) {
  const meta = applicationStatusMeta[item.trangThaiHienTai];
  const updatedAt = item.ngayCapNhatTrangThai ?? item.ngayNop;

  return (
    <tr>
      <td>
        <div className="applied-job-cell">
          <CompanyLogo
            company={item.job.company}
            logoUrl={item.job.companyLogo}
          />
          <div>
            <Link href={`/viec-lam/${item.job.id}`}>{item.job.title}</Link>
            <small>
              {joinMeta([
                item.job.location,
                salaryLabel(item.job),
                jobTypeLabel(item.job.type),
              ])}
            </small>
          </div>
        </div>
      </td>
      <td>
        <div className="applied-company-cell">
          <Link href={`/cong-ty/${item.job.companyId}`}>
            {item.job.company}
          </Link>
          {isVerifiedEmployer(item.job) && <span>Đã xác thực</span>}
        </div>
      </td>
      <td>
        <time
          dateTime={item.ngayNop ?? undefined}
          title={formatDateTime(item.ngayNop)}
        >
          {formatDate(item.ngayNop)}
        </time>
        <small>Nộp {relativeDate(item.ngayNop)}</small>
      </td>
      <td>
        <span className={`applied-status ${meta.tone}`}>{meta.label}</span>
        {updatedAt && <small>Cập nhật {relativeDate(updatedAt)}</small>}
      </td>
      <td>
        <div className="applied-actions">
          <Link href={`/viec-lam/${item.job.id}`}>Xem tin</Link>
        </div>
      </td>
    </tr>
  );
}

function AppliedJobCard({ item }: { item: AppliedJob }) {
  const meta = applicationStatusMeta[item.trangThaiHienTai];
  const updatedAt = item.ngayCapNhatTrangThai ?? item.ngayNop;

  return (
    <article className="applied-card">
      <div className="applied-card-head">
        <CompanyLogo
          company={item.job.company}
          logoUrl={item.job.companyLogo}
        />
        <div>
          <Link href={`/viec-lam/${item.job.id}`}>{item.job.title}</Link>
          <p>{item.job.company}</p>
        </div>
        <span className={`applied-status ${meta.tone}`}>{meta.label}</span>
      </div>
      <div className="applied-card-meta">
        <span>{joinMeta([item.job.location, salaryLabel(item.job)])}</span>
        <span>Nộp {formatDate(item.ngayNop)}</span>
        {updatedAt && <span>Cập nhật {relativeDate(updatedAt)}</span>}
      </div>
      <p className="applied-next-action">{meta.nextAction}</p>
      <div className="applied-actions">
        <Link href={`/viec-lam/${item.job.id}`}>Xem tin tuyển dụng</Link>
      </div>
    </article>
  );
}

function CompanyLogo({
  company,
  logoUrl,
}: {
  company: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      <img alt={`Logo ${company}`} className="applied-logo" src={logoUrl} />
    );
  }

  return (
    <div aria-label={`Logo ${company}`} className="applied-logo fallback">
      {companyInitials(company)}
    </div>
  );
}

function AppliedJobsSkeleton() {
  return (
    <div className="content-card applied-skeleton">
      <span className="applied-skeleton-line title" />
      <span className="applied-skeleton-line" />
      <span className="applied-skeleton-row" />
      <span className="applied-skeleton-row" />
      <span className="applied-skeleton-row" />
    </div>
  );
}

function AppliedJobsEmpty() {
  return (
    <div className="applied-state">
      <span>
        <Icon name="file" />
      </span>
      <h3>Bạn chưa ứng tuyển công việc nào</h3>
      <p>Khi bạn nộp hồ sơ, trạng thái xử lý sẽ được hiển thị tại đây.</p>
      <Link className="applied-primary" href="/viec-lam">
        Khám phá việc làm
      </Link>
    </div>
  );
}

function AppliedJobsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="applied-state">
      <span>
        <Icon name="search" />
      </span>
      <h3>Không tìm thấy hồ sơ phù hợp</h3>
      <p>Hãy thử đổi trạng thái lọc hoặc nhập từ khóa khác.</p>
      <button className="applied-secondary" onClick={onClear} type="button">
        Xóa từ khóa
      </button>
    </div>
  );
}

function AppliedJobsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="applied-state error" role="alert">
      <span>
        <Icon name="alertCircle" />
      </span>
      <h3>Không thể tải hồ sơ ứng tuyển</h3>
      <p>Vui lòng thử lại sau.</p>
      <button className="applied-primary" onClick={onRetry} type="button">
        Thử lại
      </button>
    </div>
  );
}

function getFilterCounts(items: AppliedJob[]) {
  return filters.reduce<Record<FilterKey, number>>(
    (result, filterItem) => {
      result[filterItem.key] = filterItem.statuses
        ? items.filter((item) =>
            filterItem.statuses?.includes(item.trangThaiHienTai),
          ).length
        : items.length;
      return result;
    },
    { all: 0, pending: 0, interview: 0, approved: 0, rejected: 0 },
  );
}

function compareApplications(a: AppliedJob, b: AppliedJob, sort: SortKey) {
  if (sort === 'applied-asc')
    return timeValue(a.ngayNop) - timeValue(b.ngayNop);
  if (sort === 'applied-desc')
    return timeValue(b.ngayNop) - timeValue(a.ngayNop);
  if (sort === 'status') {
    const status = applicationStatusMeta[
      a.trangThaiHienTai
    ].label.localeCompare(
      applicationStatusMeta[b.trangThaiHienTai].label,
      'vi-VN',
    );
    return status || timeValue(b.ngayNop) - timeValue(a.ngayNop);
  }

  return (
    timeValue(b.ngayCapNhatTrangThai ?? b.ngayNop) -
    timeValue(a.ngayCapNhatTrangThai ?? a.ngayNop)
  );
}

function applicationCountLabel(count: number) {
  return `${count} hồ sơ ứng tuyển`;
}

function joinMeta(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(' · ');
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function relativeDate(value?: string | null) {
  if (!value) return 'chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'chưa có dữ liệu';

  const diff = startOfToday().getTime() - startOfDay(date).getTime();
  const days = Math.floor(diff / 86_400_000);

  if (days <= 0) return 'hôm nay';
  if (days === 1) return '1 ngày trước';
  if (days < 30) return `${days} ngày trước`;

  const months = Math.floor(days / 30);
  if (months === 1) return '1 tháng trước';
  if (months < 12) return `${months} tháng trước`;

  const years = Math.floor(months / 12);
  return years === 1 ? '1 năm trước' : `${years} năm trước`;
}

function startOfToday() {
  return startOfDay(new Date());
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function timeValue(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function companyInitials(company: string) {
  const source =
    company
      .replace(/\b(công ty|cong ty|tnhh|mtv|cp|cổ phần|co phan)\b/gi, ' ')
      .trim() || company;
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return initials || 'CT';
}

function isVerifiedEmployer(job: ApiJob) {
  return job.employer?.trangThaiDuyet === 'DA_DUYET';
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function isFilterKey(value: string | null): value is FilterKey {
  return filters.some((item) => item.key === value);
}

function isSortKey(value: string | null): value is SortKey {
  return sortOptions.some((item) => item.key === value);
}

type IconName = 'alertCircle' | 'file' | 'search' | 'x';

function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
