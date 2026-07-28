'use client';

import SiteShell from '@/components/SiteShell';
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FormEvent,
  ReactNode,
  SVGProps,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ReviewStatus =
  'BAN_NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'YEU_CAU_BO_SUNG';

type DisplayStatus =
  'CHUA_DANG' | 'DANG_HIEN_THI' | 'TAM_AN' | 'DA_DONG' | 'HET_HAN';

type StatusTone = 'danger' | 'neutral' | 'success' | 'warning';

type EmployerJob = ApiJob & {
  applicantCount?: number;
  editCount?: number;
};

type StatusMeta = {
  description: string;
  icon: IconName;
  label: string;
  tone: StatusTone;
};

type FilterKey =
  'all' | 'active' | 'pending' | 'draft' | 'needs-edit' | 'closed' | 'expired';
type SortKey =
  'updated-desc' | 'posted-desc' | 'applicants-desc' | 'deadline-asc';
type PageState = 'error' | 'loading' | 'ready';

const pageSize = 8;

const reviewStatusMeta: Record<ReviewStatus, StatusMeta> = {
  BAN_NHAP: {
    label: 'Bản nháp',
    tone: 'neutral',
    icon: 'file',
    description: 'Tin chưa được gửi xét duyệt.',
  },
  CHO_DUYET: {
    label: 'Chờ duyệt',
    tone: 'warning',
    icon: 'clock',
    description: 'Tin đang chờ quản trị viên kiểm duyệt.',
  },
  DA_DUYET: {
    label: 'Đã duyệt',
    tone: 'success',
    icon: 'checkCircle',
    description: 'Tin đã được kiểm duyệt.',
  },
  TU_CHOI: {
    label: 'Cần chỉnh sửa',
    tone: 'danger',
    icon: 'alertCircle',
    description: 'Tin bị từ chối và có thể chỉnh sửa gửi lại.',
  },
  YEU_CAU_BO_SUNG: {
    label: 'Cần bổ sung',
    tone: 'danger',
    icon: 'alertCircle',
    description: 'Tin cần bổ sung thông tin trước khi duyệt.',
  },
};

const displayStatusMeta: Record<DisplayStatus, StatusMeta> = {
  CHUA_DANG: {
    label: 'Chưa đăng',
    tone: 'neutral',
    icon: 'file',
    description: 'Tin chưa được hiển thị công khai.',
  },
  DANG_HIEN_THI: {
    label: 'Đang hiển thị',
    tone: 'success',
    icon: 'checkCircle',
    description: 'Tin đang hiển thị với người lao động.',
  },
  TAM_AN: {
    label: 'Đang ẩn',
    tone: 'neutral',
    icon: 'eyeOff',
    description: 'Tin đang được ẩn khỏi danh sách công khai.',
  },
  DA_DONG: {
    label: 'Đã đóng',
    tone: 'neutral',
    icon: 'archive',
    description: 'Tin đã ngừng nhận ứng viên mới.',
  },
  HET_HAN: {
    label: 'Hết hạn',
    tone: 'danger',
    icon: 'alertCircle',
    description: 'Tin đã quá hạn nhận hồ sơ.',
  },
};

const filters: Array<{
  key: FilterKey;
  label: string;
  match: (job: EmployerJob) => boolean;
}> = [
  { key: 'all', label: 'Tất cả', match: () => true },
  {
    key: 'active',
    label: 'Đang hiển thị',
    match: (job) =>
      job.status === 'DA_DUYET' && job.displayStatus === 'DANG_HIEN_THI',
  },
  {
    key: 'pending',
    label: 'Chờ duyệt',
    match: (job) => job.status === 'CHO_DUYET',
  },
  {
    key: 'draft',
    label: 'Nháp',
    match: (job) => job.status === 'BAN_NHAP',
  },
  {
    key: 'needs-edit',
    label: 'Cần chỉnh sửa',
    match: (job) =>
      job.status === 'TU_CHOI' || job.status === 'YEU_CAU_BO_SUNG',
  },
  {
    key: 'closed',
    label: 'Đã đóng',
    match: (job) => job.displayStatus === 'DA_DONG',
  },
  {
    key: 'expired',
    label: 'Hết hạn',
    match: (job) => job.displayStatus === 'HET_HAN',
  },
];

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'updated-desc', label: 'Mới cập nhật nhất' },
  { key: 'posted-desc', label: 'Ngày đăng mới nhất' },
  { key: 'applicants-desc', label: 'Nhiều ứng viên nhất' },
  { key: 'deadline-asc', label: 'Sắp hết hạn' },
];

export default function EmployerJobsPage() {
  return (
    <Suspense
      fallback={
        <SiteShell
          action={
            <Link
              className="employer-jobs-create"
              href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi"
            >
              <Icon name="plus" />
              Đăng tin tuyển dụng
            </Link>
          }
          breadcrumb="Trang chủ / Quản lý tin tuyển dụng"
          pageClassName="employer-jobs-page"
          role="employer"
          title="Quản lý tin tuyển dụng"
          subtitle="Đăng tin, theo dõi ứng viên và quản lý trạng thái tuyển dụng."
        >
          <section className="container portal-content employer-jobs-content">
            <EmployerJobsSkeleton />
          </section>
        </SiteShell>
      }
    >
      <EmployerJobsContent />
    </Suspense>
  );
}

function EmployerJobsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [queryInput, setQueryInput] = useState(searchParams.get('q') ?? '');
  const [pageState, setPageState] = useState<PageState>('loading');
  const [message, setMessage] = useState('');

  const query = searchParams.get('q') ?? '';
  const filter = parseFilter(searchParams.get('status'));
  const sort = parseSort(searchParams.get('sort'));
  const page = parsePage(searchParams.get('page'));

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  useEffect(() => {
    void loadJobs();
  }, []);

  const counts = useMemo(() => getFilterCounts(jobs), [jobs]);
  const stats = useMemo(() => buildStats(jobs), [jobs]);
  const filteredJobs = useMemo(() => {
    const term = normalizeText(query);
    return jobs
      .filter((job) => filters.find((item) => item.key === filter)?.match(job))
      .filter((job) => {
        if (!term) return true;
        return normalizeText(
          `${job.title} ${job.location} ${job.category}`,
        ).includes(term);
      })
      .sort((a, b) => compareJobs(a, b, sort));
  }, [filter, jobs, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedJobs = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const resultLabel =
    query || filter !== 'all'
      ? `${filteredJobs.length}/${jobs.length} tin phù hợp`
      : `${jobs.length} tin tuyển dụng`;

  useEffect(() => {
    if (page > pageCount) updateUrl({ page: String(pageCount) }, true);
  }, [page, pageCount]);

  async function loadJobs() {
    setPageState('loading');
    setMessage('');
    try {
      const data = await portalFetch<EmployerJob[]>('/employer/jobs');
      setJobs(data);
      setPageState('ready');
    } catch {
      setPageState('error');
      setMessage(
        'Không thể tải danh sách tin tuyển dụng. Vui lòng thử lại sau.',
      );
    }
  }

  function updateUrl(
    updates: Partial<Record<'page' | 'q' | 'sort' | 'status', string>>,
    replace = false,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    if (replace) router.replace(nextUrl, { scroll: false });
    else router.push(nextUrl, { scroll: false });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateUrl({ q: queryInput.trim(), page: '1' });
  }

  function changeFilter(nextFilter: FilterKey) {
    updateUrl({ status: nextFilter, page: '1' });
  }

  function changeSort(nextSort: SortKey) {
    updateUrl({ sort: nextSort, page: '1' });
  }

  function changePage(nextPage: number) {
    updateUrl({ page: String(nextPage) });
    document
      .getElementById('employer-jobs-list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <SiteShell
      action={
        <Link
          className="employer-jobs-create"
          href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi"
        >
          <Icon name="plus" />
          Đăng tin tuyển dụng
        </Link>
      }
      breadcrumb="Trang chủ / Quản lý tin tuyển dụng"
      pageClassName="employer-jobs-page"
      role="employer"
      title="Quản lý tin tuyển dụng"
      subtitle="Đăng tin, theo dõi ứng viên và quản lý trạng thái tuyển dụng."
    >
      <section className="container portal-content employer-jobs-content">
        {pageState === 'loading' && <EmployerJobsSkeleton />}
        {pageState === 'error' && (
          <EmployerJobsError
            message={message}
            onRetry={() => {
              void loadJobs();
            }}
          />
        )}
        {pageState === 'ready' && (
          <>
            <JobPostStatistics stats={stats} onFilter={changeFilter} />
            <div className="employer-jobs-card" id="employer-jobs-list">
              <JobPostsToolbar
                queryInput={queryInput}
                resultLabel={resultLabel}
                sort={sort}
                onClearSearch={() => {
                  setQueryInput('');
                  updateUrl({ q: '', page: '1' });
                }}
                onQueryInput={setQueryInput}
                onSort={changeSort}
                onSubmit={submitSearch}
              />
              <JobPostStatusTabs
                counts={counts}
                filter={filter}
                onChange={changeFilter}
              />

              {!jobs.length && <EmployerJobsEmpty />}
              {Boolean(jobs.length) && !filteredJobs.length && (
                <EmployerJobsNoResults
                  filterLabel={
                    filters.find((item) => item.key === filter)?.label ?? ''
                  }
                  hasQuery={Boolean(query)}
                  onClear={
                    query
                      ? () => {
                          setQueryInput('');
                          updateUrl({ q: '', page: '1' });
                        }
                      : () => changeFilter('all')
                  }
                />
              )}
              {Boolean(pagedJobs.length) && (
                <>
                  <JobPostsTable jobs={pagedJobs} />
                  <JobPostsPagination
                    currentPage={currentPage}
                    pageCount={pageCount}
                    total={filteredJobs.length}
                    onPageChange={changePage}
                  />
                </>
              )}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}

function JobPostStatistics({
  onFilter,
  stats,
}: {
  onFilter: (filter: FilterKey) => void;
  stats: Array<{
    icon: IconName;
    label: string;
    target?: FilterKey;
    value: number;
  }>;
}) {
  return (
    <div className="employer-job-stats" aria-label="Thống kê tin tuyển dụng">
      {stats.map((item) =>
        item.target ? (
          <button
            key={item.label}
            onClick={() => onFilter(item.target as FilterKey)}
            type="button"
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString('vi-VN')}</strong>
          </button>
        ) : (
          <div key={item.label}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString('vi-VN')}</strong>
          </div>
        ),
      )}
    </div>
  );
}

function JobPostsToolbar({
  onClearSearch,
  onQueryInput,
  onSort,
  onSubmit,
  queryInput,
  resultLabel,
  sort,
}: {
  onClearSearch: () => void;
  onQueryInput: (value: string) => void;
  onSort: (value: SortKey) => void;
  onSubmit: (event: FormEvent) => void;
  queryInput: string;
  resultLabel: string;
  sort: SortKey;
}) {
  return (
    <div className="employer-jobs-toolbar">
      <div>
        <h2>Tin tuyển dụng</h2>
        <p aria-live="polite">{resultLabel}</p>
      </div>
      <div className="employer-jobs-controls">
        <form
          className="employer-jobs-search"
          onSubmit={onSubmit}
          role="search"
        >
          <label className="sr-only" htmlFor="employer-jobs-query">
            Tìm theo tiêu đề tin tuyển dụng
          </label>
          <Icon name="search" />
          <input
            id="employer-jobs-query"
            onChange={(event) => onQueryInput(event.target.value)}
            placeholder="Tìm theo tiêu đề tin tuyển dụng"
            value={queryInput}
          />
          {queryInput && (
            <button
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={onClearSearch}
              type="button"
            >
              <Icon name="x" />
            </button>
          )}
        </form>
        <label className="employer-jobs-sort" htmlFor="employer-jobs-sort">
          <span className="sr-only">Sắp xếp tin tuyển dụng</span>
          <select
            id="employer-jobs-sort"
            onChange={(event) => onSort(event.target.value as SortKey)}
            value={sort}
          >
            {sortOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function JobPostStatusTabs({
  counts,
  filter,
  onChange,
}: {
  counts: Record<FilterKey, number>;
  filter: FilterKey;
  onChange: (filter: FilterKey) => void;
}) {
  return (
    <div
      className="employer-job-tabs"
      role="tablist"
      aria-label="Lọc tin tuyển dụng theo trạng thái"
    >
      {filters.map((item) => (
        <button
          aria-selected={filter === item.key}
          className={filter === item.key ? 'active' : ''}
          key={item.key}
          onClick={() => onChange(item.key)}
          role="tab"
          type="button"
        >
          {item.label}
          <span>{counts[item.key]}</span>
        </button>
      ))}
    </div>
  );
}

function JobPostsTable({ jobs }: { jobs: EmployerJob[] }) {
  return (
    <div className="employer-jobs-table-wrap">
      <table className="employer-jobs-table">
        <thead>
          <tr>
            <th scope="col">Tin tuyển dụng</th>
            <th scope="col">Ngày đăng và hạn nộp</th>
            <th scope="col">Ứng viên</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobPostTableRow job={job} key={job.id} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobPostTableRow({ job }: { job: EmployerJob }) {
  const meta = getJobStatusMeta(job);
  const applicantCount = job.applicantCount ?? 0;
  const showStatusDescription = shouldShowStatusDescription(job);

  return (
    <tr>
      <td>
        <div className="employer-job-title-cell">
          <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
          <small>
            {joinMeta([salaryLabel(job), job.location, jobTypeLabel(job.type)])}
          </small>
          {job.rejectionReason && (
            <p className="employer-job-reason">Lý do: {job.rejectionReason}</p>
          )}
        </div>
      </td>
      <td>
        <div className="employer-job-date-cell">
          <span>Đăng {formatDate(job.postedAt)}</span>
          <span>Hạn {formatDate(job.deadline)}</span>
          <DeadlineHint deadline={job.deadline} />
        </div>
      </td>
      <td>
        <Link
          aria-label={`${applicantCount} ứng viên cho tin ${job.title}`}
          className={`employer-applicant-link ${
            applicantCount ? 'has-applicants' : ''
          }`}
          href={`/nha-tuyen-dung/tin-tuyen-dung/${job.id}/ung-vien`}
        >
          {applicantCount ? `${applicantCount} ứng viên` : 'Chưa có ứng viên'}
        </Link>
      </td>
      <td>
        <JobPostStatusBadge meta={meta} />
        {showStatusDescription && (
          <small className="employer-status-desc">{meta.description}</small>
        )}
      </td>
      <td>
        <JobPostActions job={job} applicantCount={applicantCount} />
      </td>
    </tr>
  );
}

function JobPostActions({
  applicantCount,
  job,
}: {
  applicantCount: number;
  job: EmployerJob;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const hasApplicants = applicantCount > 0;
  const primaryHref = hasApplicants
    ? `/nha-tuyen-dung/tin-tuyen-dung/${job.id}/ung-vien`
    : `/viec-lam/${job.id}`;
  const primaryLabel = hasApplicants ? 'Xem ứng viên' : 'Xem tin';

  function closeMenu() {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  return (
    <div className="employer-job-actions">
      <Link className={hasApplicants ? 'primary' : ''} href={primaryHref}>
        {primaryLabel}
      </Link>
      <div
        className="employer-job-action-menu"
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeMenu();
        }}
      >
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Mở menu thao tác cho tin ${job.title}`}
          onClick={() => setOpen((value) => !value)}
          ref={buttonRef}
          type="button"
        >
          <Icon name="more" />
        </button>
        {open && (
          <div role="menu">
            {hasApplicants ? (
              <Link href={`/viec-lam/${job.id}`} role="menuitem">
                Xem tin tuyển dụng
              </Link>
            ) : (
              <Link
                href={`/nha-tuyen-dung/tin-tuyen-dung/${job.id}/ung-vien`}
                role="menuitem"
              >
                Xem danh sách ứng viên
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JobPostStatusBadge({ meta }: { meta: StatusMeta }) {
  return (
    <span
      className={`employer-job-status ${meta.tone}`}
      title={meta.description}
    >
      <Icon name={meta.icon} />
      {meta.label}
    </span>
  );
}

function DeadlineHint({ deadline }: { deadline?: string | null }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0) return <em className="expired">Đã quá hạn</em>;
  if (days <= 7) {
    return <em className="warning">Còn {days} ngày</em>;
  }
  return null;
}

function JobPostsPagination({
  currentPage,
  onPageChange,
  pageCount,
  total,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
  total: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      className="employer-jobs-pagination"
      aria-label="Phân trang tin tuyển dụng"
    >
      <span>
        Trang {currentPage}/{pageCount} · {total} tin
      </span>
      <div>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </nav>
  );
}

function EmployerJobsSkeleton() {
  return (
    <>
      <div className="employer-job-stats skeleton">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="employer-jobs-card skeleton">
        <span />
        <span />
        <span />
        <span />
      </div>
    </>
  );
}

function EmployerJobsEmpty() {
  return (
    <div className="employer-jobs-state">
      <Icon name="file" />
      <h3>Bạn chưa đăng tin tuyển dụng nào</h3>
      <p>Tạo tin tuyển dụng đầu tiên để tiếp cận ứng viên phù hợp.</p>
      <Link href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi">
        Đăng tin tuyển dụng
      </Link>
    </div>
  );
}

function EmployerJobsNoResults({
  filterLabel,
  hasQuery,
  onClear,
}: {
  filterLabel: string;
  hasQuery: boolean;
  onClear: () => void;
}) {
  return (
    <div className="employer-jobs-state">
      <Icon name="search" />
      <h3>
        {hasQuery
          ? 'Không tìm thấy tin tuyển dụng phù hợp'
          : `Không có tin ở trạng thái ${filterLabel.toLowerCase()}`}
      </h3>
      <p>
        {hasQuery
          ? 'Hãy thử một tiêu đề khác.'
          : 'Quay lại toàn bộ danh sách để xem các tin khác.'}
      </p>
      <button onClick={onClear} type="button">
        {hasQuery ? 'Xóa từ khóa' : 'Xem tất cả tin'}
      </button>
    </div>
  );
}

function EmployerJobsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="employer-jobs-state error" role="alert">
      <Icon name="alertCircle" />
      <h3>Không thể tải danh sách tin tuyển dụng</h3>
      <p>{message || 'Vui lòng thử lại sau.'}</p>
      <button onClick={onRetry} type="button">
        Thử lại
      </button>
    </div>
  );
}

function buildStats(jobs: EmployerJob[]) {
  return [
    { icon: 'briefcase' as IconName, label: 'Tổng tin', value: jobs.length },
    {
      icon: 'checkCircle' as IconName,
      label: 'Đang hiển thị',
      target: 'active' as FilterKey,
      value: jobs.filter(
        filters.find((item) => item.key === 'active')?.match ?? (() => false),
      ).length,
    },
    {
      icon: 'clock' as IconName,
      label: 'Chờ duyệt',
      target: 'pending' as FilterKey,
      value: jobs.filter((job) => job.status === 'CHO_DUYET').length,
    },
    {
      icon: 'users' as IconName,
      label: 'Tổng ứng viên',
      value: jobs.reduce((sum, job) => sum + (job.applicantCount ?? 0), 0),
    },
  ];
}

function getFilterCounts(jobs: EmployerJob[]) {
  return filters.reduce<Record<FilterKey, number>>(
    (result, item) => {
      result[item.key] = jobs.filter(item.match).length;
      return result;
    },
    {
      active: 0,
      all: 0,
      closed: 0,
      draft: 0,
      expired: 0,
      'needs-edit': 0,
      pending: 0,
    },
  );
}

function getJobStatusMeta(job: EmployerJob) {
  const reviewStatus = parseReviewStatus(job.status);
  const displayStatus = parseDisplayStatus(job.displayStatus);
  if (displayStatus === 'HET_HAN' || displayStatus === 'DA_DONG') {
    return displayStatusMeta[displayStatus];
  }
  if (reviewStatus === 'DA_DUYET' && displayStatus) {
    return displayStatusMeta[displayStatus];
  }
  return reviewStatusMeta[reviewStatus] ?? reviewStatusMeta.CHO_DUYET;
}

function shouldShowStatusDescription(job: EmployerJob) {
  const reviewStatus = parseReviewStatus(job.status);
  const displayStatus = parseDisplayStatus(job.displayStatus);
  return (
    reviewStatus === 'CHO_DUYET' ||
    reviewStatus === 'TU_CHOI' ||
    reviewStatus === 'YEU_CAU_BO_SUNG' ||
    displayStatus === 'CHUA_DANG'
  );
}

function compareJobs(a: EmployerJob, b: EmployerJob, sort: SortKey) {
  if (sort === 'posted-desc')
    return timeValue(b.postedAt) - timeValue(a.postedAt);
  if (sort === 'applicants-desc') {
    return (b.applicantCount ?? 0) - (a.applicantCount ?? 0);
  }
  if (sort === 'deadline-asc') {
    return timeValue(a.deadline) - timeValue(b.deadline);
  }
  return (
    Math.max(timeValue(b.postedAt), timeValue(b.deadline)) -
    Math.max(timeValue(a.postedAt), timeValue(a.deadline))
  );
}

function parseFilter(value: string | null): FilterKey {
  return filters.some((item) => item.key === value)
    ? (value as FilterKey)
    : 'all';
}

function parseSort(value: string | null): SortKey {
  return sortOptions.some((item) => item.key === value)
    ? (value as SortKey)
    : 'updated-desc';
}

function parsePage(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

function parseReviewStatus(value: string): ReviewStatus {
  if (
    value === 'BAN_NHAP' ||
    value === 'CHO_DUYET' ||
    value === 'DA_DUYET' ||
    value === 'TU_CHOI' ||
    value === 'YEU_CAU_BO_SUNG'
  ) {
    return value;
  }
  return 'CHO_DUYET';
}

function parseDisplayStatus(value?: string | null): DisplayStatus | null {
  if (
    value === 'CHUA_DANG' ||
    value === 'DANG_HIEN_THI' ||
    value === 'TAM_AN' ||
    value === 'DA_DONG' ||
    value === 'HET_HAN'
  ) {
    return value;
  }
  return null;
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
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

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(date).getTime();
  return Math.ceil((target - today) / 86_400_000);
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

type IconName =
  | 'alertCircle'
  | 'archive'
  | 'briefcase'
  | 'checkCircle'
  | 'clock'
  | 'eyeOff'
  | 'file'
  | 'more'
  | 'plus'
  | 'search'
  | 'users'
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
        <path d="M12 8v5M12 16h.01" />
      </>
    ),
    archive: <path d="M4 7h16M6 7v13h12V7M8 4h8l2 3H6l2-3Zm2 8h4" />,
    briefcase: <path d="M10 6V5h4v1m-9 3h14v10H5V9Zm0 4h14" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    eyeOff: (
      <path d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8 5 8 5a13 13 0 0 1-2.2 2.9M6.5 6.5C4.2 8 3 10 3 10s3 5 9 5c1.1 0 2.1-.2 3-.5" />
    ),
    file: <path d="M6 3h8l4 4v14H6V3Zm8 0v5h5" />,
    more: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    ),
    users: (
      <path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6 6c0-1.7-1-3.1-2.5-3.7M17 5.2a3 3 0 0 1 0 5.6" />
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={width}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
