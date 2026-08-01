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

type SavedJob = ApiJob & {
  savedAt?: string | null;
  ngayLuu?: string | null;
};

type RemovedJob = {
  job: SavedJob;
  index: number;
};

type Notice = {
  text: string;
  tone: 'success' | 'error';
  canUndo?: boolean;
};

type StatusBadge = {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
};

const visibleStatus = 'DANG_HIEN_THI';
const approvedStatus = 'DA_DUYET';

export default function SavedJobsPage() {
  const [items, setItems] = useState<SavedJob[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const [removedJob, setRemovedJob] = useState<RemovedJob | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    void loadSavedJobs();
  }, []);

  async function loadSavedJobs() {
    setLoading(true);
    setLoadError(false);

    try {
      const data = await portalFetch<SavedJob[]>('/worker/saved-jobs');
      setItems(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = useMemo(() => {
    const keyword = normalizeText(query);
    if (!keyword) return items;

    return items.filter((job) =>
      normalizeText(`${job.title} ${job.company} ${job.location}`).includes(
        keyword,
      ),
    );
  }, [items, query]);

  async function removeJob(job: SavedJob) {
    if (removingIds.includes(job.id)) return;

    setNotice(null);
    setRemovingIds((ids) => [...ids, job.id]);

    try {
      await portalFetch(`/worker/saved-jobs/${job.id}`, { method: 'DELETE' });
      setItems((list) => {
        const index = list.findIndex((item) => item.id === job.id);
        setRemovedJob({ job, index: index >= 0 ? index : 0 });
        return list.filter((item) => item.id !== job.id);
      });
      setNotice({
        text: 'Đã bỏ lưu việc làm.',
        tone: 'success',
        canUndo: true,
      });
    } catch {
      setNotice({
        text: 'Không thể bỏ lưu việc làm. Vui lòng thử lại.',
        tone: 'error',
      });
    } finally {
      setRemovingIds((ids) => ids.filter((id) => id !== job.id));
    }
  }

  async function undoRemove() {
    if (!removedJob || undoing) return;

    setUndoing(true);

    try {
      await portalFetch(`/worker/saved-jobs/${removedJob.job.id}`, {
        method: 'POST',
      });
      setItems((list) => {
        if (list.some((job) => job.id === removedJob.job.id)) return list;
        const next = [...list];
        next.splice(Math.min(removedJob.index, next.length), 0, removedJob.job);
        return next;
      });
      setRemovedJob(null);
      setNotice({ text: 'Đã lưu lại việc làm.', tone: 'success' });
    } catch {
      setNotice({
        text: 'Không thể hoàn tác. Vui lòng thử lại sau.',
        tone: 'error',
      });
    } finally {
      setUndoing(false);
    }
  }

  function clearQuery() {
    setQuery('');
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const countLabel = loading
    ? 'Đang tải danh sách...'
    : savedCountLabel(items.length);
  const resultLabel =
    query.trim() && !loading
      ? `${filteredJobs.length}/${items.length} kết quả phù hợp`
      : savedOpportunityLabel(items.length);

  return (
    <SiteShell
      pageClassName="saved-jobs-page"
      title="Việc làm đã lưu"
      subtitle="Quản lý những cơ hội bạn quan tâm để xem lại và ứng tuyển."
    >
      <section className="container portal-content saved-jobs-content">
        <div className="saved-jobs-toolbar" aria-labelledby="saved-jobs-title">
          <div className="saved-jobs-toolbar-copy">
            <span className="saved-jobs-kicker">{countLabel}</span>
            <h2 id="saved-jobs-title">Danh sách việc làm đã lưu</h2>
            <p aria-live="polite">{resultLabel}</p>
          </div>

          <form
            className="saved-jobs-search"
            onSubmit={submitSearch}
            role="search"
          >
            <label className="sr-only" htmlFor="saved-jobs-query">
              Tìm theo tên việc hoặc công ty
            </label>
            <Icon name="search" />
            <input
              id="saved-jobs-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên việc hoặc công ty"
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
        </div>

        {notice && (
          <div
            className={`saved-jobs-alert ${notice.tone}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            <span>{notice.text}</span>
            {notice.canUndo && removedJob && (
              <button
                disabled={undoing}
                onClick={() => {
                  void undoRemove();
                }}
                type="button"
              >
                {undoing ? 'Đang hoàn tác...' : 'Hoàn tác'}
              </button>
            )}
          </div>
        )}

        {loadError && !items.length ? (
          <SavedJobsErrorState
            onRetry={() => {
              void loadSavedJobs();
            }}
          />
        ) : (
          <div className="saved-jobs-list" aria-busy={loading}>
            {loading && <SavedJobCardSkeleton />}
            {loading && <SavedJobCardSkeleton />}
            {loading && <SavedJobCardSkeleton />}

            {!loading &&
              filteredJobs.map((job) => (
                <SavedJobCard
                  job={job}
                  key={job.id}
                  onRemove={(selectedJob) => {
                    void removeJob(selectedJob);
                  }}
                  removing={removingIds.includes(job.id)}
                />
              ))}

            {!loading && !loadError && !items.length && <SavedJobsEmptyState />}

            {!loading &&
              !loadError &&
              Boolean(items.length) &&
              !filteredJobs.length && (
                <SavedJobsNoResults onClear={clearQuery} />
              )}
          </div>
        )}

        {!loading && !loadError && Boolean(items.length) && (
          <div className="saved-jobs-followup">
            <span>Bạn muốn xem thêm cơ hội phù hợp?</span>
            <Link href="/viec-lam">Khám phá việc làm</Link>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function SavedJobCard({
  job,
  onRemove,
  removing,
}: {
  job: SavedJob;
  onRemove: (job: SavedJob) => void;
  removing: boolean;
}) {
  const status = getJobStatus(job);
  const verified = isVerifiedEmployer(job);
  const skills = job.skills.slice(0, 3);
  const hiddenSkillCount = Math.max(job.skills.length - skills.length, 0);
  const savedAt = job.savedAt ?? job.ngayLuu;
  const canApply = canApplyToJob(job);
  const fullQuota = Boolean(job.daDatChiTieu ?? job.daDuChiTieu);

  return (
    <article className="saved-job-card">
      <CompanyLogo company={job.company} logoUrl={job.companyLogo} />

      <div className="saved-job-main">
        <div className="saved-job-title-row">
          <div className="saved-job-title-block">
            {status && (
              <span className={`saved-job-status ${status.tone}`}>
                {status.label}
              </span>
            )}
            <h3>
              <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
            </h3>
            <p className="saved-job-company">
              <span>{job.company}</span>
              {verified && (
                <span
                  className="saved-job-verified"
                  title="Doanh nghiệp đã được xác thực"
                >
                  <Icon name="checkCircle" />
                  Đã xác thực
                </span>
              )}
            </p>
          </div>

          <button
            aria-label={`Bỏ lưu việc làm ${job.title}`}
            aria-pressed="true"
            className="saved-job-unsave"
            disabled={removing}
            onClick={() => onRemove(job)}
            type="button"
          >
            <Icon
              className={removing ? 'saved-icon-spin' : undefined}
              name="bookmarkFilled"
            />
            <span>{removing ? 'Đang bỏ lưu...' : 'Bỏ lưu'}</span>
          </button>
        </div>

        <div className="saved-job-meta">
          {job.location && (
            <span>
              <Icon name="mapPin" />
              {job.location}
            </span>
          )}
          <span className="saved-job-salary">
            <Icon name="wallet" />
            {salaryLabel(job)}
          </span>
          <span>
            <Icon name="userCheck" />
            {experienceLabel(job.experience)}
          </span>
          <span>
            <Icon name="briefcase" />
            {jobTypeLabel(job.type)}
          </span>
          {job.deadline && (
            <span>
              <Icon name="calendar" />
              Hạn nộp {formatDate(job.deadline)}
            </span>
          )}
          {job.postedAt && (
            <span>
              <Icon name="clock" />
              Đăng {relativeDate(job.postedAt)}
            </span>
          )}
          {savedAt && (
            <span>
              <Icon name="bookmark" />
              Đã lưu {relativeDate(savedAt)}
            </span>
          )}
        </div>

        {Boolean(skills.length) && (
          <div className="saved-job-skills" aria-label="Kỹ năng">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
            {hiddenSkillCount > 0 && <span>+{hiddenSkillCount}</span>}
          </div>
        )}

        <div className="saved-job-footer">
          {!canApply && (
            <span className="saved-job-note">
              Tin này hiện không còn nhận hồ sơ ứng tuyển.
            </span>
          )}
          {canApply && fullQuota && (
            <span className="saved-job-note">
              Tin vẫn tiếp nhận hồ sơ dự phòng.
            </span>
          )}
          <div className="saved-job-actions">
            <Link className="saved-job-primary" href={`/viec-lam/${job.id}`}>
              Xem chi tiết
            </Link>
            {canApply && (
              <Link
                className="saved-job-secondary"
                href={`/nop-ho-so/${job.id}`}
              >
                Ứng tuyển
              </Link>
            )}
          </div>
        </div>
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
      <img
        alt={`Logo ${company}`}
        className="saved-company-logo"
        src={logoUrl}
      />
    );
  }

  return (
    <div aria-label={`Logo ${company}`} className="saved-company-logo fallback">
      {companyInitials(company)}
    </div>
  );
}

function SavedJobCardSkeleton() {
  return (
    <article
      className="saved-job-card saved-job-skeleton"
      aria-label="Đang tải việc làm"
    >
      <span className="saved-skeleton-logo" />
      <div className="saved-skeleton-body">
        <span className="saved-skeleton-line title" />
        <span className="saved-skeleton-line company" />
        <span className="saved-skeleton-line meta" />
        <span className="saved-skeleton-line skills" />
      </div>
    </article>
  );
}

function SavedJobsEmptyState() {
  return (
    <div className="saved-jobs-state">
      <span className="saved-jobs-state-icon">
        <Icon name="bookmark" />
      </span>
      <h3>Bạn chưa lưu việc làm nào</h3>
      <p>Lưu những cơ hội phù hợp để dễ dàng xem lại và ứng tuyển sau.</p>
      <Link className="saved-job-primary" href="/viec-lam">
        Khám phá việc làm
      </Link>
    </div>
  );
}

function SavedJobsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="saved-jobs-state">
      <span className="saved-jobs-state-icon">
        <Icon name="search" />
      </span>
      <h3>Không tìm thấy việc làm đã lưu phù hợp</h3>
      <p>Hãy thử một từ khóa khác.</p>
      <button className="saved-job-secondary" onClick={onClear} type="button">
        Xóa từ khóa
      </button>
    </div>
  );
}

function SavedJobsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="saved-jobs-state saved-jobs-error" role="alert">
      <span className="saved-jobs-state-icon">
        <Icon name="alertCircle" />
      </span>
      <h3>Không thể tải việc làm đã lưu</h3>
      <p>Vui lòng thử lại sau.</p>
      <button className="saved-job-primary" onClick={onRetry} type="button">
        Thử lại
      </button>
    </div>
  );
}

function savedCountLabel(count: number) {
  return `${count} việc làm đã lưu`;
}

function savedOpportunityLabel(count: number) {
  if (count === 1) return '1 cơ hội đang được lưu trong tài khoản của bạn.';
  return `${count} cơ hội đang được lưu trong tài khoản của bạn.`;
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function companyInitials(company: string) {
  const source =
    company
      .replace(/\b(công ty|cong ty|tnhh|mtv|cp|cổ phần|co phan)\b/gi, ' ')
      .trim() || company;

  const words = source.split(/\s+/).filter(Boolean);
  const initials = words
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'CT';
}

function experienceLabel(value: ApiJob['experience']) {
  const years = Number(value ?? 0);
  if (!Number.isFinite(years) || years <= 0) return 'Không yêu cầu';
  if (years < 1) return 'Dưới 1 năm';
  return `${years} năm`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);

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

function getJobStatus(job: SavedJob): StatusBadge | null {
  if (isExpired(job.deadline)) {
    return { label: 'Đã hết hạn', tone: 'danger' };
  }

  if (job.displayStatus && job.displayStatus !== visibleStatus) {
    return { label: 'Đã đóng', tone: 'neutral' };
  }

  if (job.ngungNhanHoSo || job.conNhanHoSo === false) {
    return { label: 'Ngừng nhận hồ sơ', tone: 'warning' };
  }

  if (Boolean(job.daDatChiTieu ?? job.daDuChiTieu)) {
    return { label: 'Đã đủ chỉ tiêu', tone: 'warning' };
  }

  const deadlineDays = daysUntil(job.deadline);
  if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 3) {
    return { label: 'Sắp hết hạn', tone: 'warning' };
  }

  if (job.status === approvedStatus || job.displayStatus === visibleStatus) {
    return { label: 'Đang tuyển', tone: 'success' };
  }

  return null;
}

function canApplyToJob(job: SavedJob) {
  const approved = !job.status || job.status === approvedStatus;
  const visible = !job.displayStatus || job.displayStatus === visibleStatus;
  const accepting = job.conNhanHoSo !== false && !job.ngungNhanHoSo;
  return approved && visible && accepting && !isExpired(job.deadline);
}

function isExpired(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return startOfDay(date).getTime() < startOfToday().getTime();
}

function daysUntil(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = startOfDay(date).getTime() - startOfToday().getTime();
  return Math.ceil(diff / 86_400_000);
}

function startOfToday() {
  return startOfDay(new Date());
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isVerifiedEmployer(job: SavedJob) {
  return job.employer?.trangThaiDuyet === approvedStatus;
}

type IconName =
  | 'alertCircle'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'briefcase'
  | 'calendar'
  | 'checkCircle'
  | 'clock'
  | 'mapPin'
  | 'search'
  | 'userCheck'
  | 'wallet'
  | 'x';

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
    bookmark: <path d="M6 4h12v16l-6-3-6 3V4Z" />,
    bookmarkFilled: <path d="M6 4h12v16l-6-3-6 3V4Z" />,
    briefcase: (
      <>
        <path d="M10 6h4a2 2 0 0 1 2 2v1H8V8a2 2 0 0 1 2-2Z" />
        <path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" />
        <path d="M9 13h6" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 4v3M17 4v3" />
        <path d="M5 7h14v12H5V7Z" />
        <path d="M5 11h14" />
      </>
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2L15.8 9" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    mapPin: (
      <>
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    userCheck: (
      <>
        <path d="M15 20a5 5 0 0 0-10 0" />
        <circle cx="10" cy="8" r="4" />
        <path d="m16 11 2 2 4-5" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7h15a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2V7Z" />
        <path d="M4 7a2 2 0 0 1 2-2h11" />
        <path d="M17 13h.01" />
      </>
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill={name === 'bookmarkFilled' ? 'currentColor' : 'none'}
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
