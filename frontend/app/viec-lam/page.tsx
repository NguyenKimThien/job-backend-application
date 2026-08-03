'use client';

import Link from 'next/link';
import {
  FormEvent,
  ReactNode,
  SVGProps,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';

type Job = {
  id: number;
  title: string;
  company: string;
  companyLogo?: string | null;
  location: string;
  category: string;
  salary: string;
  salaryValue: number;
  experience: string;
  experienceValue: number | null;
  type: string;
  typeValue: string;
  posted: string;
  postedAt: number;
  deadlineLabel: string;
  deadlineAt: number | null;
  initials: string;
  tags: string[];
  matchScore?: number;
  matchReasons?: string[];
};

type Account = {
  vaiTro?: 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI_VIEN';
};

type RecommendedApiJob = ApiJob & {
  diemPhuHop?: number;
  lyDoPhuHop?: string[];
};

type RecommendedJobsResponse = {
  needsPreferences: boolean;
  message?: string;
  items: RecommendedApiJob[];
  total: number;
};

type CategoryOption = {
  id: number;
  name: string;
  jobCount?: number;
};

type Filters = {
  category: string;
  location: string;
  salary: string;
  experience: string;
  type: string;
};

type FilterKey = keyof Filters;

type ActiveFilter = {
  key: FilterKey;
  label: string;
  value: string;
};

const defaults: Filters = {
  category: 'Tất cả ngành nghề',
  location: 'Tất cả địa điểm',
  salary: 'Tất cả mức lương',
  experience: 'Tất cả kinh nghiệm',
  type: 'Tất cả hình thức',
};

const fallbackCategories = [
  'Marketing',
  'Công nghệ thông tin',
  'Nhân sự',
  'Kinh doanh',
  'Thiết kế',
  'Giáo dục',
  'Thực tập sinh',
  'Kế toán',
  'Dịch vụ khách hàng',
];

const locationOptions = [
  defaults.location,
  'Ba Đình',
  'Cầu Giấy',
  'Đống Đa',
  'Hai Bà Trưng',
  'Hoàn Kiếm',
  'Long Biên',
  'Nam Từ Liêm',
  'Thanh Xuân',
  'Hà Nội',
];

const salaryOptions = [
  defaults.salary,
  'Dưới 10 triệu',
  '10 - 20 triệu',
  '20 - 30 triệu',
  'Trên 30 triệu',
  'Thỏa thuận',
];

const experienceOptions = [
  defaults.experience,
  'Không yêu cầu',
  'Dưới 1 năm',
  '1 - 2 năm',
  '2 - 3 năm',
  'Trên 3 năm',
];

const workTypeOptions = [
  { label: defaults.type, value: defaults.type },
  { label: 'Toàn thời gian', value: 'TOAN_THOI_GIAN' },
  { label: 'Bán thời gian', value: 'BAN_THOI_GIAN' },
  { label: 'Thực tập', value: 'THUC_TAP' },
  { label: 'Thời vụ', value: 'THOI_VU' },
  { label: 'Từ xa', value: 'TU_XA' },
];

const sortOptions = [
  { label: 'Phù hợp nhất', value: 'recommended' },
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Mức lương cao nhất', value: 'salary' },
] as const;

type SortValue = (typeof sortOptions)[number]['value'];

const defaultSort: SortValue = 'newest';

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-loading">Đang tải danh sách việc làm...</div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [keyword, setKeyword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>(defaults);
  const [saved, setSaved] = useState<number[]>([]);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortValue>(defaultSort);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(
    fallbackCategories.map((name, index) => ({ id: index + 1, name })),
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedApiJob[]>(
    [],
  );
  const [recommendationMessage, setRecommendationMessage] = useState('');
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const stored = window.localStorage.getItem(ACCOUNT_KEY);
    if (!token || !stored) return;

    try {
      const account = JSON.parse(stored) as Account;
      const worker = account.vaiTro === 'NGUOI_LAO_DONG';
      setIsWorker(worker);
    } catch {
      setIsWorker(false);
    }
  }, []);

  useEffect(() => {
    const nextKeyword = searchParams.get('tuKhoa') ?? '';
    const nextFilters = {
      ...defaults,
      category: searchParams.get('nganh') || defaults.category,
      location: searchParams.get('diaDiem') || defaults.location,
      salary: searchParams.get('luong') || defaults.salary,
      experience: searchParams.get('kinhNghiem') || defaults.experience,
      type: searchParams.get('hinhThuc') || defaults.type,
    };
    const sortParam = searchParams.get('sapXep');
    const nextSort = sortParam
      ? parseSort(sortParam)
      : isWorker
        ? 'recommended'
        : defaultSort;

    setKeyword(nextKeyword);
    setSearchTerm(nextKeyword);
    setFilters(nextFilters);
    setSort(nextSort);
  }, [isWorker, searchKey, searchParams]);

  useEffect(() => {
    portalFetch<CategoryOption[]>('/categories')
      .then((items) => {
        if (items.length) setCategories(items);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    portalFetch<ApiJob[]>('/worker/saved-jobs')
      .then((items) => setSaved(items.map((job) => job.id)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isWorker) {
      setRecommendedJobs([]);
      setRecommendationMessage('');
      return;
    }

    let ignore = false;
    setRecommendationLoading(true);
    portalFetch<RecommendedJobsResponse>('/jobs/recommended?pageSize=20')
      .then((data) => {
        if (ignore) return;
        setRecommendedJobs(data.items ?? []);
        setRecommendationMessage(
          data.needsPreferences ? (data.message ?? '') : '',
        );
      })
      .catch(() => {
        if (ignore) return;
        setRecommendedJobs([]);
        setRecommendationMessage('Không thể tải đề xuất việc làm lúc này.');
      })
      .finally(() => {
        if (!ignore) setRecommendationLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isWorker]);

  useEffect(() => {
    const query = buildJobsQuery(searchTerm, filters);
    let ignore = false;

    setLoading(true);
    setMessage('');
    setJobs([]);

    portalFetch<ApiJob[]>(`/jobs${query}`)
      .then((items) => {
        if (ignore) return;
        setJobs(items.map(mapJob));
      })
      .catch(() => {
        if (ignore) return;
        setJobs([]);
        setMessage('Không thể tải danh sách việc làm');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [filters, retryKey, searchTerm]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setFilterDrawerOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const categoryOptions = useMemo(
    () => [defaults.category, ...categories.map((item) => item.name)],
    [categories],
  );

  const activeFilters = useMemo(() => buildActiveFilters(filters), [filters]);

  const shownJobs = useMemo(() => {
    const recommendations = new Map(
      recommendedJobs.map((job) => [job.id, job] as const),
    );
    const locallyFiltered = jobs
      .filter((job) => matchesLocalFilters(job, filters))
      .map((job) => {
        const recommendation = recommendations.get(job.id);
        return recommendation
          ? {
              ...job,
              matchScore: recommendation.diemPhuHop ?? 0,
              matchReasons: recommendation.lyDoPhuHop ?? [],
            }
          : job;
      });

    if (sort === 'recommended' && isWorker) {
      return [...locallyFiltered].sort(
        (a, b) =>
          (b.matchScore ?? 0) - (a.matchScore ?? 0) || b.postedAt - a.postedAt,
      );
    }

    if (sort === 'salary') {
      return [...locallyFiltered].sort((a, b) => b.salaryValue - a.salaryValue);
    }

    return [...locallyFiltered].sort((a, b) => b.postedAt - a.postedAt);
  }, [filters, isWorker, jobs, recommendedJobs, sort]);

  const hasFilters = activeFilters.length > 0;
  const resultLabel = buildResultLabel(shownJobs.length, searchTerm);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    pushStateToUrl(keyword.trim(), filters, sort);
  }

  function updateFilter(name: FilterKey, value: string) {
    pushStateToUrl(searchTerm, { ...filters, [name]: value }, sort);
  }

  function updateSort(value: SortValue) {
    pushStateToUrl(searchTerm, filters, value);
  }

  function clearOnlyFilters() {
    pushStateToUrl(searchTerm, defaults, sort);
  }

  function clearAllSearch() {
    router.push('/viec-lam');
  }

  function retryJobs() {
    setRetryKey((value) => value + 1);
  }

  async function toggleSave(id: number) {
    if (savingIds.includes(id)) return;

    const isSaved = saved.includes(id);
    setSavingIds((items) => [...items, id]);

    try {
      await portalFetch(`/worker/saved-jobs/${id}`, {
        method: isSaved ? 'DELETE' : 'POST',
      });
      setSaved((list) =>
        isSaved ? list.filter((item) => item !== id) : [...list, id],
      );
    } catch {
      router.push('/dang-nhap');
    } finally {
      setSavingIds((items) => items.filter((item) => item !== id));
    }
  }

  function pushStateToUrl(
    nextKeyword: string,
    nextFilters: Filters,
    nextSort: SortValue,
  ) {
    const params = new URLSearchParams();

    if (nextKeyword) params.set('tuKhoa', nextKeyword);
    if (nextFilters.category !== defaults.category) {
      params.set('nganh', nextFilters.category);
    }
    if (nextFilters.location !== defaults.location) {
      params.set('diaDiem', nextFilters.location);
    }
    if (nextFilters.salary !== defaults.salary) {
      params.set('luong', nextFilters.salary);
    }
    if (nextFilters.experience !== defaults.experience) {
      params.set('kinhNghiem', nextFilters.experience);
    }
    if (nextFilters.type !== defaults.type) {
      params.set('hinhThuc', nextFilters.type);
    }
    if (nextSort !== defaultSort) {
      params.set('sapXep', nextSort);
    }

    router.push(`/viec-lam${params.toString() ? `?${params.toString()}` : ''}`);
  }

  const renderFilterPanel = (idPrefix: string) => (
    <JobFilterSidebar
      activeCount={activeFilters.length}
      categoryOptions={categoryOptions}
      disabled={!hasFilters}
      filters={filters}
      idPrefix={idPrefix}
      onClear={clearOnlyFilters}
      onUpdate={updateFilter}
    />
  );

  return (
    <main className="jobs-directory">
      <PublicHeader active="jobs" />

      <section className="job-directory-intro">
        <div className="jobs-container">
          <div className="job-directory-heading">
            <h1>Tất cả việc làm</h1>
            <p>
              Khám phá các cơ hội việc làm được kiểm duyệt và cập nhật thường
              xuyên tại Hà Nội.
            </p>
          </div>

          <JobSearchBar
            filters={filters}
            keyword={keyword}
            loading={loading}
            onKeywordChange={setKeyword}
            onLocationChange={(value) => updateFilter('location', value)}
            onSubmit={submitSearch}
          />
        </div>
      </section>

      <section className="jobs-container all-jobs-layout">
        <aside className="advanced-filter">
          {renderFilterPanel('desktop')}
        </aside>

        <div className="all-jobs-results">
          <JobListToolbar
            activeFilterCount={activeFilters.length}
            loading={loading}
            onOpenFilters={() => setFilterDrawerOpen(true)}
            onSortChange={updateSort}
            resultLabel={resultLabel}
            sort={sort}
          />

          <ActiveFilterChips
            filters={activeFilters}
            onClearAll={clearOnlyFilters}
            onRemove={(key) => updateFilter(key, defaults[key])}
          />

          {isWorker && !searchTerm && !hasFilters && (
            <div className="jobs-recommendation-note" role="status">
              <Icon name="sparkles" />
              <div>
                <strong>
                  {recommendationLoading
                    ? 'Đang tìm việc làm phù hợp với bạn...'
                    : recommendationMessage
                      ? 'Chưa đủ thông tin để đề xuất chính xác'
                      : 'Việc làm phù hợp với bạn được ưu tiên lên đầu'}
                </strong>
                <p>
                  {recommendationMessage ||
                    'Thứ tự dựa trên ngành nghề, vị trí, kỹ năng, địa điểm, mức lương và hình thức làm việc trong hồ sơ.'}
                </p>
              </div>
              {recommendationMessage && (
                <Link href="/ho-so">Cập nhật hồ sơ</Link>
              )}
            </div>
          )}

          <div
            className="directory-job-list"
            aria-busy={loading}
            aria-live="polite"
          >
            {loading && <JobCardSkeleton count={4} />}

            {!loading && message && (
              <JobListError message={message} onRetry={retryJobs} />
            )}

            {!loading &&
              !message &&
              shownJobs.map((job) => (
                <JobCard
                  isSaved={saved.includes(job.id)}
                  isSaving={savingIds.includes(job.id)}
                  job={job}
                  key={job.id}
                  onToggleSave={() => {
                    void toggleSave(job.id);
                  }}
                />
              ))}

            {!loading && !message && !shownJobs.length && (
              <JobEmptyState
                hasFilters={hasFilters}
                searchTerm={searchTerm}
                onClearAll={clearAllSearch}
                onClearFilters={clearOnlyFilters}
              />
            )}
          </div>
        </div>
      </section>

      {filterDrawerOpen && (
        <div className="mobile-filter-layer" role="presentation">
          <button
            className="mobile-filter-backdrop"
            aria-label="Đóng bộ lọc"
            onClick={() => setFilterDrawerOpen(false)}
            type="button"
          />
          <div
            className="mobile-filter-drawer"
            aria-modal="true"
            role="dialog"
            aria-labelledby="mobile-filter-title"
          >
            <div className="mobile-filter-head">
              <h2 id="mobile-filter-title">Bộ lọc</h2>
              <button
                aria-label="Đóng bộ lọc"
                onClick={() => setFilterDrawerOpen(false)}
                type="button"
              >
                <Icon name="x" />
              </button>
            </div>
            {renderFilterPanel('mobile')}
            <button
              className="mobile-filter-apply"
              onClick={() => setFilterDrawerOpen(false)}
              type="button"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function JobSearchBar({
  filters,
  keyword,
  loading,
  onKeywordChange,
  onLocationChange,
  onSubmit,
}: {
  filters: Filters;
  keyword: string;
  loading: boolean;
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="directory-search-form" onSubmit={onSubmit}>
      <label className="directory-search-input" htmlFor="job-keyword">
        <span className="sr-only">Từ khóa tìm kiếm</span>
        <Icon name="search" />
        <input
          id="job-keyword"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Tên công việc, kỹ năng hoặc công ty"
        />
      </label>

      <label className="directory-search-input" htmlFor="job-location">
        <span className="sr-only">Địa điểm</span>
        <Icon name="mapPin" />
        <select
          id="job-location"
          value={filters.location}
          onChange={(event) => onLocationChange(event.target.value)}
        >
          {locationOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>

      <button disabled={loading} type="submit">
        {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
      </button>
    </form>
  );
}

function JobFilterSidebar({
  activeCount,
  categoryOptions,
  disabled,
  filters,
  idPrefix,
  onClear,
  onUpdate,
}: {
  activeCount: number;
  categoryOptions: string[];
  disabled: boolean;
  filters: Filters;
  idPrefix: string;
  onClear: () => void;
  onUpdate: (name: FilterKey, value: string) => void;
}) {
  return (
    <>
      <div className="advanced-filter-title">
        <h2>Bộ lọc</h2>
        {activeCount > 0 && <span>{activeCount}</span>}
      </div>
      <FilterSelect
        id={`${idPrefix}-filter-category`}
        label="Ngành nghề"
        value={filters.category}
        onChange={(value) => onUpdate('category', value)}
        options={categoryOptions}
      />
      <FilterSelect
        id={`${idPrefix}-filter-location`}
        label="Địa điểm"
        value={filters.location}
        onChange={(value) => onUpdate('location', value)}
        options={locationOptions}
      />
      <FilterSelect
        id={`${idPrefix}-filter-salary`}
        label="Mức lương"
        value={filters.salary}
        onChange={(value) => onUpdate('salary', value)}
        options={salaryOptions}
      />
      <FilterSelect
        id={`${idPrefix}-filter-experience`}
        label="Kinh nghiệm"
        value={filters.experience}
        onChange={(value) => onUpdate('experience', value)}
        options={experienceOptions}
      />
      <FilterSelect
        id={`${idPrefix}-filter-type`}
        label="Hình thức làm việc"
        value={filters.type}
        onChange={(value) => onUpdate('type', value)}
        options={workTypeOptions.map((item) => item.label)}
      />
      <button
        className="clear-filter"
        disabled={disabled}
        type="button"
        onClick={onClear}
      >
        Xóa tất cả bộ lọc
      </button>
    </>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-group" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {Array.from(new Set(options)).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ActiveFilterChips({
  filters,
  onClearAll,
  onRemove,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
  onRemove: (key: FilterKey) => void;
}) {
  if (!filters.length) return null;

  return (
    <div className="active-filter-chips" aria-label="Bộ lọc đang áp dụng">
      {filters.map((filter) => (
        <button
          aria-label={`Xóa bộ lọc ${filter.label}: ${filter.value}`}
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          type="button"
        >
          <span>{filter.value}</span>
          <Icon name="x" />
        </button>
      ))}
      <button className="clear-all-chip" onClick={onClearAll} type="button">
        Xóa tất cả
      </button>
    </div>
  );
}

function JobListToolbar({
  activeFilterCount,
  loading,
  onOpenFilters,
  onSortChange,
  resultLabel,
  sort,
}: {
  activeFilterCount: number;
  loading: boolean;
  onOpenFilters: () => void;
  onSortChange: (value: SortValue) => void;
  resultLabel: string;
  sort: SortValue;
}) {
  return (
    <div className="directory-results-bar">
      <p aria-live="polite">{loading ? 'Đang tải việc làm...' : resultLabel}</p>
      <div>
        <button
          className="mobile-filter-toggle"
          onClick={onOpenFilters}
          type="button"
        >
          <Icon name="sliders" />
          Bộ lọc {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        </button>
        <label htmlFor="job-sort">
          <span>Sắp xếp</span>
          <select
            id="job-sort"
            value={sort}
            onChange={(event) => onSortChange(parseSort(event.target.value))}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function JobCard({
  isSaved,
  isSaving,
  job,
  onToggleSave,
}: {
  isSaved: boolean;
  isSaving: boolean;
  job: Job;
  onToggleSave: () => void;
}) {
  const visibleTags = job.tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, job.tags.length - visibleTags.length);

  return (
    <article className="directory-job-card">
      <CompanyLogo job={job} />

      <div className="job-main">
        <div className="job-title-row">
          <div className="job-title-copy">
            <h3>
              <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
            </h3>
            <p className="company-name">
              <span>{job.company}</span>
            </p>
          </div>

          <button
            aria-label={isSaved ? 'Bỏ lưu việc làm' : 'Lưu việc làm'}
            aria-pressed={isSaved}
            className={`save-button ${isSaved ? 'saved' : ''}`}
            disabled={isSaving}
            onClick={onToggleSave}
            type="button"
          >
            {isSaving ? (
              <Icon className="save-spinner" name="loader" />
            ) : (
              <Icon name={isSaved ? 'bookmarkFilled' : 'bookmark'} />
            )}
          </button>
        </div>

        <div className="job-meta" aria-label="Thông tin việc làm">
          <span>
            <Icon name="mapPin" />
            {job.location}
          </span>
          <span className="salary">
            <Icon name="wallet" />
            {job.salary}
          </span>
          <span>
            <Icon name="userCheck" />
            {job.experience}
          </span>
          <span>
            <Icon name="briefcase" />
            {job.type}
          </span>
        </div>

        <div className="job-tags">
          {visibleTags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className="tag more">+{hiddenTagCount}</span>
          )}
        </div>

        {(job.matchScore ?? 0) > 0 && (
          <div className="directory-job-match">
            <strong>Phù hợp {job.matchScore}%</strong>
            {job.matchReasons?.[0] && <span>{job.matchReasons[0]}</span>}
          </div>
        )}

        <div className="job-footer">
          <div className="job-dates">
            <span>
              <Icon name="clock" />
              Đăng {job.posted}
            </span>
            {job.deadlineLabel && (
              <span>
                <Icon name="calendar" />
                Hạn nộp {job.deadlineLabel}
              </span>
            )}
          </div>
          <Link className="job-detail-link" href={`/viec-lam/${job.id}`}>
            Xem chi tiết
            <Icon name="arrowRight" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CompanyLogo({ job }: { job: Job }) {
  if (job.companyLogo) {
    return (
      <img
        alt={`Logo ${job.company}`}
        className="company-logo"
        src={job.companyLogo}
      />
    );
  }

  return (
    <div className="company-logo fallback" aria-label={`Logo ${job.company}`}>
      {job.initials}
    </div>
  );
}

function JobCardSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <article
          className="directory-job-card job-card-skeleton"
          key={`job-skeleton-${index}`}
          aria-hidden="true"
        >
          <span className="skeleton-logo" />
          <div>
            <span className="skeleton-line wide" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line short" />
            <span className="skeleton-line full" />
          </div>
        </article>
      ))}
      <span className="sr-only">Đang tải danh sách việc làm</span>
    </>
  );
}

function JobEmptyState({
  hasFilters,
  onClearAll,
  onClearFilters,
  searchTerm,
}: {
  hasFilters: boolean;
  onClearAll: () => void;
  onClearFilters: () => void;
  searchTerm: string;
}) {
  return (
    <div className="job-list-state">
      <Icon name="search" />
      <h3>
        {searchTerm
          ? `Không tìm thấy kết quả cho "${searchTerm}"`
          : 'Không tìm thấy việc làm phù hợp'}
      </h3>
      <p>Hãy thử thay đổi từ khóa hoặc mở rộng một số bộ lọc.</p>
      <div>
        {hasFilters && (
          <button onClick={onClearFilters} type="button">
            Xóa bộ lọc
          </button>
        )}
        <button onClick={onClearAll} type="button">
          Xem tất cả việc làm
        </button>
      </div>
    </div>
  );
}

function JobListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="job-list-state error" role="alert">
      <Icon name="alertCircle" />
      <h3>{message}</h3>
      <p>Vui lòng thử lại sau.</p>
      <div>
        <button onClick={onRetry} type="button">
          Thử lại
        </button>
      </div>
    </div>
  );
}

function buildJobsQuery(searchTerm: string, filters: Filters) {
  const params = new URLSearchParams();
  const salaryRange = salaryQuery(filters.salary);
  const experienceMax = experienceQuery(filters.experience);
  const workType = workTypeOptions.find((item) => item.label === filters.type);

  if (searchTerm.trim()) params.set('keyword', searchTerm.trim());
  if (filters.category !== defaults.category) {
    params.set('category', filters.category);
  }
  if (filters.location !== defaults.location) {
    params.set('location', filters.location);
  }
  if (salaryRange.salaryMin !== undefined) {
    params.set('salaryMin', String(salaryRange.salaryMin));
  }
  if (salaryRange.salaryMax !== undefined) {
    params.set('salaryMax', String(salaryRange.salaryMax));
  }
  if (experienceMax !== undefined) {
    params.set('experienceMax', String(experienceMax));
  }
  if (workType && workType.value !== defaults.type) {
    params.set('type', workType.value);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildActiveFilters(filters: Filters): ActiveFilter[] {
  const labels: Record<FilterKey, string> = {
    category: 'Ngành nghề',
    location: 'Địa điểm',
    salary: 'Mức lương',
    experience: 'Kinh nghiệm',
    type: 'Hình thức làm việc',
  };

  return (Object.keys(filters) as FilterKey[])
    .filter((key) => filters[key] !== defaults[key])
    .map((key) => ({
      key,
      label: labels[key],
      value: filters[key],
    }));
}

function buildResultLabel(count: number, searchTerm: string) {
  if (searchTerm) {
    return `${count} kết quả cho "${searchTerm}"`;
  }

  return `${count} việc làm phù hợp`;
}

function parseSort(value: string | null): SortValue {
  return sortOptions.some((option) => option.value === value)
    ? (value as SortValue)
    : defaultSort;
}

function mapJob(job: ApiJob): Job {
  const salaryValue = getSalaryValue(job);
  const experienceValue =
    job.experience === null || job.experience === undefined
      ? null
      : Number(job.experience);
  const postedAt = new Date(job.postedAt).getTime();
  const deadlineAt = new Date(job.deadline).getTime();

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    location: job.location,
    category: job.category,
    salary: salaryLabel(job),
    salaryValue,
    experience: experienceLabel(experienceValue),
    experienceValue,
    type: jobTypeLabel(job.type),
    typeValue: job.type,
    posted: relativeDate(job.postedAt),
    postedAt: Number.isNaN(postedAt) ? 0 : postedAt,
    deadlineLabel: formatDate(job.deadline),
    deadlineAt: Number.isNaN(deadlineAt) ? null : deadlineAt,
    initials: getInitials(job.company),
    tags: job.skills.length ? job.skills : [job.category],
  };
}

function matchesLocalFilters(job: Job, filters: Filters) {
  if (filters.salary === 'Thỏa thuận' && job.salary !== 'Thỏa thuận') {
    return false;
  }

  switch (filters.experience) {
    case 'Không yêu cầu':
      return job.experienceValue === null || job.experienceValue === 0;
    case 'Dưới 1 năm':
      return job.experienceValue !== null && job.experienceValue < 1;
    case '1 - 2 năm':
      return (
        job.experienceValue !== null &&
        job.experienceValue >= 1 &&
        job.experienceValue <= 2
      );
    case '2 - 3 năm':
      return (
        job.experienceValue !== null &&
        job.experienceValue >= 2 &&
        job.experienceValue <= 3
      );
    case 'Trên 3 năm':
      return job.experienceValue !== null && job.experienceValue > 3;
    default:
      return true;
  }
}

function salaryQuery(label: string) {
  switch (label) {
    case 'Dưới 10 triệu':
      return { salaryMax: 10_000_000 };
    case '10 - 20 triệu':
      return { salaryMin: 10_000_000, salaryMax: 20_000_000 };
    case '20 - 30 triệu':
      return { salaryMin: 20_000_000, salaryMax: 30_000_000 };
    case 'Trên 30 triệu':
      return { salaryMin: 30_000_000 };
    default:
      return {};
  }
}

function experienceQuery(label: string) {
  switch (label) {
    case 'Dưới 1 năm':
      return 1;
    case '1 - 2 năm':
      return 2;
    case '2 - 3 năm':
      return 3;
    default:
      return undefined;
  }
}

function experienceLabel(value: number | null) {
  if (value === null || value === 0 || Number.isNaN(value)) {
    return 'Không yêu cầu';
  }
  if (value < 1) return 'Dưới 1 năm';
  return `${value} năm`;
}

function getSalaryValue(job: ApiJob) {
  if (job.negotiable) return 0;
  const from = Number(job.salaryFrom ?? 0);
  const to = Number(job.salaryTo ?? 0);
  return Math.max(from, to);
}

function getInitials(company: string) {
  const words = company
    .replace(/công ty|tnhh|cổ phần|cp|mtv/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (words[0]?.[0] ?? 'V')
    .concat(words[1]?.[0] ?? words[0]?.[1] ?? 'L')
    .toUpperCase();
}

function relativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (Number.isNaN(date.getTime())) return 'chưa cập nhật';
  if (diff < 60 * 60 * 1000) return 'vừa xong';
  if (diff < day) return `${Math.floor(diff / (60 * 60 * 1000))} giờ trước`;
  if (diff < day * 2) return 'hôm qua';
  if (diff < day * 7) return `${Math.floor(diff / day)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
}

type IconName =
  | 'alertCircle'
  | 'arrowRight'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'briefcase'
  | 'calendar'
  | 'clock'
  | 'loader'
  | 'mapPin'
  | 'search'
  | 'sliders'
  | 'sparkles'
  | 'userCheck'
  | 'wallet'
  | 'x';

function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    alertCircle: (
      <path d="M12 8v5m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
    arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
    bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />,
    bookmarkFilled: (
      <path
        d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
    ),
    briefcase: (
      <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 0h14v12H5V6Zm0 5h14" />
    ),
    calendar: (
      <path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
    ),
    clock: <path d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    loader: <path d="M12 3a9 9 0 1 0 9 9" />,
    mapPin: (
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    ),
    search: (
      <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
    ),
    sliders: <path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 5v4M8 15v4" />,
    sparkles: (
      <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM5 14l.9 2.6L8.5 17l-2.6.9L5 20.5l-.9-2.6L1.5 17l2.6-.4L5 14Z" />
    ),
    userCheck: (
      <path d="M15 19a5 5 0 0 0-10 0m5-8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 1 2 2 4-5" />
    ),
    wallet: <path d="M4 7h16v12H4V7Zm0 4h17v5h-4a2 2 0 0 1 0-4h4" />,
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
