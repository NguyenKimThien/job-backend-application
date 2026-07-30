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
  CSSProperties,
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

type InterviewMode = 'TRUC_TIEP' | 'TRUC_TUYEN';

type InterviewInfo = {
  id: number;
  thoiGianBatDau: string;
  thoiGianKetThuc?: string | null;
  hinhThucPhongVan: InterviewMode;
  diaDiemPhongVan?: string | null;
  duongDanPhongVan?: string | null;
  nguoiLienHe: string;
  soDienThoaiLienHe: string;
  noiDungChuanBi?: string | null;
  ghiChuPhongVan?: string | null;
};

type AppliedJob = {
  id: number;
  ngayNop?: string | null;
  ngayCapNhatTrangThai?: string | null;
  trangThaiHienTai: ApplicationStatus;
  tepCvSnapshotUrl?: string | null;
  lyDoTuChoi?: string | null;
  thongTinPhongVan?: InterviewInfo | null;
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

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  clipPath: 'inset(50%)',
};

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

  const resultLabel =
    query.trim() || filter !== 'all'
      ? `${shown.length}/${items.length} hồ sơ phù hợp`
      : `${items.length} hồ sơ trong tài khoản của bạn`;

  return (
    <SiteShell
      pageClassName="applied-jobs-page"
      title="Việc làm đã ứng tuyển"
      subtitle="Theo dõi trạng thái xử lý của các hồ sơ bạn đã nộp."
    >
      <section className="container portal-content applied-jobs-content">
        <div className="applied-toolbar" aria-labelledby="applied-title">
          <div className="applied-toolbar-copy">
            <h2 id="applied-title">Hồ sơ ứng tuyển</h2>
            <p aria-live="polite">{resultLabel}</p>
          </div>
          <div className="applied-toolbar-controls">
            <form
              className="applied-search"
              onSubmit={submitSearch}
              role="search"
            >
              <label style={visuallyHiddenStyle} htmlFor="applied-query">
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
            <label className="applied-sort" htmlFor="applied-sort">
              <span>Sắp xếp</span>
              <select
                id="applied-sort"
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
            <AppliedJobsNoResults
              filterLabel={
                filters.find((filterItem) => filterItem.key === filter)
                  ?.label ?? ''
              }
              hasQuery={Boolean(query.trim())}
              onClear={
                query.trim()
                  ? clearQuery
                  : () => {
                      changeFilter('all');
                    }
              }
            />
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function AppliedJobsList({ items }: { items: AppliedJob[] }) {
  return (
    <div className="content-card applied-table-card">
      <div className="applied-table-wrap">
        <table className="applied-table">
          <thead>
            <tr>
              <th scope="col">Công việc</th>
              <th scope="col">Công ty</th>
              <th scope="col">Ngày nộp</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <AppliedJobRows item={item} key={item.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppliedJobRows({ item }: { item: AppliedJob }) {
  const showInterview =
    item.trangThaiHienTai === 'MOI_PHONG_VAN' && item.thongTinPhongVan;

  return (
    <>
      <AppliedJobRow item={item} />
      {showInterview && (
        <tr className="applied-interview-row">
          <td colSpan={5}>
            <WorkerInterviewCard info={item.thongTinPhongVan!} item={item} />
          </td>
        </tr>
      )}
    </>
  );
}

function AppliedJobRow({ item }: { item: AppliedJob }) {
  const meta = applicationStatusMeta[item.trangThaiHienTai];
  const updatedAt = item.ngayCapNhatTrangThai;

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
        </div>
      </td>
      <td>
        <time
          dateTime={item.ngayNop ?? undefined}
          title={formatDateTime(item.ngayNop)}
        >
          {formatDate(item.ngayNop)}
        </time>
        <small>{relativeDate(item.ngayNop)}</small>
      </td>
      <td>
        <span className={`applied-status ${meta.tone}`}>{meta.label}</span>
        {updatedAt && <small>Cập nhật {relativeDate(updatedAt)}</small>}
      </td>
      <td>
        <div className="applied-actions">
          <Link href={`/viec-lam/${item.job.id}`}>Xem tin tuyển dụng</Link>
        </div>
      </td>
    </tr>
  );
}

function WorkerInterviewCard({
  info,
  item,
}: {
  info: InterviewInfo;
  item: AppliedJob;
}) {
  const isOnline = info.hinhThucPhongVan === 'TRUC_TUYEN';
  const hasValidUrl = isValidHttpUrl(info.duongDanPhongVan);

  return (
    <section className="worker-interview-card">
      <div className="worker-interview-card-header">
        <div>
          <h3>Thông tin phỏng vấn</h3>
          <p>
            {item.job.title} · {item.job.company}
          </p>
        </div>
        {isOnline && hasValidUrl && (
          <a
            className="worker-interview-join"
            href={info.duongDanPhongVan ?? undefined}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon name="externalLink" />
            Tham gia phỏng vấn
          </a>
        )}
      </div>
      <div className="worker-interview-grid">
        <WorkerInterviewDetail
          icon="calendar"
          label="Thời gian phỏng vấn"
          value={formatInterviewTimeRange(info)}
        />
        <WorkerInterviewDetail
          icon="briefcase"
          label="Hình thức phỏng vấn"
          value={interviewModeLabel(info.hinhThucPhongVan)}
        />
        {isOnline ? (
          hasValidUrl && (
            <div className="worker-interview-detail">
              <Icon name="link" />
              <div>
                <span>Đường dẫn tham gia</span>
                <a
                  href={info.duongDanPhongVan ?? undefined}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {info.duongDanPhongVan}
                </a>
              </div>
            </div>
          )
        ) : (
          <WorkerInterviewDetail
            icon="mapPin"
            label="Địa điểm"
            value={info.diaDiemPhongVan}
          />
        )}
        <WorkerInterviewDetail
          icon="user"
          label="Người liên hệ"
          value={info.nguoiLienHe}
        />
        <div className="worker-interview-detail">
          <Icon name="phone" />
          <div>
            <span>Số điện thoại liên hệ</span>
            <a href={`tel:${info.soDienThoaiLienHe}`}>
              {info.soDienThoaiLienHe}
            </a>
          </div>
        </div>
        <WorkerInterviewDetail
          icon="file"
          label="Nội dung cần chuẩn bị"
          value={info.noiDungChuanBi}
        />
        <WorkerInterviewDetail
          icon="file"
          label="Ghi chú từ Nhà tuyển dụng"
          value={info.ghiChuPhongVan}
        />
      </div>
    </section>
  );
}

function WorkerInterviewDetail({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="worker-interview-detail">
      <Icon name={icon} />
      <div>
        <span>{label}</span>
        <p>{value}</p>
      </div>
    </div>
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

function AppliedJobsNoResults({
  filterLabel,
  hasQuery,
  onClear,
}: {
  filterLabel: string;
  hasQuery: boolean;
  onClear: () => void;
}) {
  const title = hasQuery
    ? 'Không tìm thấy hồ sơ phù hợp'
    : `Không có hồ sơ ở trạng thái ${filterLabel.toLowerCase()}`;
  const description = hasQuery
    ? 'Hãy thử đổi trạng thái lọc hoặc nhập từ khóa khác.'
    : 'Bạn có thể quay lại toàn bộ hồ sơ để xem các ứng tuyển đã nộp.';
  const actionLabel = hasQuery ? 'Xóa từ khóa' : 'Xem tất cả';

  return (
    <div className="applied-state">
      <span>
        <Icon name="search" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="applied-secondary" onClick={onClear} type="button">
        {actionLabel}
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

function joinMeta(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(' · ');
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

function formatInterviewTimeRange(info: InterviewInfo) {
  const start = formatDateTime(info.thoiGianBatDau);
  const end = info.thoiGianKetThuc ? formatDateTime(info.thoiGianKetThuc) : '';
  return end ? `${start} - ${end}` : start;
}

function interviewModeLabel(value: InterviewMode) {
  return value === 'TRUC_TIEP' ? 'Phỏng vấn trực tiếp' : 'Phỏng vấn trực tuyến';
}

function isValidHttpUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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

type IconName =
  | 'alertCircle'
  | 'briefcase'
  | 'calendar'
  | 'externalLink'
  | 'file'
  | 'link'
  | 'mapPin'
  | 'phone'
  | 'search'
  | 'user'
  | 'x';

function Icon({
  name,
  height = 18,
  width = 18,
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
    briefcase: (
      <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 0h14v13H5V6Zm0 5h14" />
    ),
    calendar: (
      <path d="M7 3v4M17 3v4M4 9h16M5 5h14v15H5V5Zm4 8h2m3 0h2m-7 4h2" />
    ),
    externalLink: <path d="M14 4h6v6m0-6-9 9M20 14v5H5V4h5" />,
    file: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4" />
      </>
    ),
    link: (
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    ),
    mapPin: (
      <>
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    phone: (
      <path d="M6 4h4l2 5-3 2a11 11 0 0 0 4 4l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2Z" />
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
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
      width={width}
      height={height}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
