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
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import {
  FormEvent,
  ReactNode,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
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

type StatusTone =
  'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning';
type PageState = 'error' | 'loading' | 'ready';
type FilterKey =
  | 'all'
  | 'new'
  | 'reviewing'
  | 'interview'
  | 'approved'
  | 'rejected'
  | 'withdrawn';
type SortKey = 'newest' | 'oldest' | 'updated' | 'name-asc';
type DialogState =
  | { application: ApplicantApplication; kind: 'interview' }
  | { application: ApplicantApplication; kind: 'reject' }
  | null;

type WorkerProfile = {
  anhDaiDienUrl?: string | null;
  diaChi?: string | null;
  diaDiemMongMuon?: string | null;
  gioiThieuBanThan?: string | null;
  hoTen?: string | null;
  id: number;
  mucLuongMongMuonDen?: string | number | null;
  mucLuongMongMuonTu?: string | number | null;
  tepCvUrl?: string | null;
};

type ApplicantApplication = {
  emailSnapshot?: string | null;
  hoSoNguoiLaoDong: WorkerProfile;
  hoSoNguoiLaoDongId: number;
  hoTenSnapshot: string;
  id: number;
  lyDoTuChoi?: string | null;
  ngayCapNhatTrangThai?: string | null;
  ngayNop: string;
  soDienThoaiSnapshot?: string | null;
  tepCvSnapshotUrl?: string | null;
  thuGioiThieu?: string | null;
  tinTuyenDungId: number;
  trangThaiHienTai: string;
};

type StatusMeta = {
  description: string;
  label: string;
  tone: StatusTone;
};

type FilterOption = {
  key: FilterKey;
  label: string;
  match: (application: ApplicantApplication) => boolean;
};

const pageSize = 8;

const applicationStatusMeta: Record<ApplicationStatus, StatusMeta> = {
  DA_NOP: {
    label: 'Hồ sơ mới',
    tone: 'info',
    description: 'Hồ sơ chưa được nhà tuyển dụng xem.',
  },
  DA_XEM: {
    label: 'Đang xem xét',
    tone: 'warning',
    description: 'Hồ sơ đã được mở và đang được đánh giá.',
  },
  DUOC_CHON_SO_BO: {
    label: 'Qua sơ tuyển',
    tone: 'primary',
    description: 'Ứng viên đã được chọn qua vòng sàng lọc ban đầu.',
  },
  MOI_PHONG_VAN: {
    label: 'Mời phỏng vấn',
    tone: 'primary',
    description: 'Ứng viên đã được chuyển sang bước phỏng vấn.',
  },
  DA_PHONG_VAN: {
    label: 'Đã phỏng vấn',
    tone: 'neutral',
    description: 'Ứng viên đã hoàn tất phỏng vấn.',
  },
  TRUNG_TUYEN: {
    label: 'Đã duyệt',
    tone: 'success',
    description: 'Ứng viên đã vượt qua bước xét hồ sơ.',
  },
  KHONG_PHU_HOP: {
    label: 'Không phù hợp',
    tone: 'danger',
    description: 'Hồ sơ đã bị từ chối.',
  },
  DA_RUT: {
    label: 'Đã rút hồ sơ',
    tone: 'neutral',
    description: 'Ứng viên đã rút hồ sơ ứng tuyển.',
  },
};

const filters: FilterOption[] = [
  { key: 'all', label: 'Tất cả', match: () => true },
  {
    key: 'new',
    label: 'Hồ sơ mới',
    match: (application) => application.trangThaiHienTai === 'DA_NOP',
  },
  {
    key: 'reviewing',
    label: 'Đang xem xét',
    match: (application) =>
      application.trangThaiHienTai === 'DA_XEM' ||
      application.trangThaiHienTai === 'DUOC_CHON_SO_BO',
  },
  {
    key: 'interview',
    label: 'Phỏng vấn',
    match: (application) =>
      application.trangThaiHienTai === 'MOI_PHONG_VAN' ||
      application.trangThaiHienTai === 'DA_PHONG_VAN',
  },
  {
    key: 'approved',
    label: 'Đã duyệt',
    match: (application) => application.trangThaiHienTai === 'TRUNG_TUYEN',
  },
  {
    key: 'rejected',
    label: 'Không phù hợp',
    match: (application) => application.trangThaiHienTai === 'KHONG_PHU_HOP',
  },
  {
    key: 'withdrawn',
    label: 'Đã rút',
    match: (application) => application.trangThaiHienTai === 'DA_RUT',
  },
];

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'newest', label: 'Nộp mới nhất' },
  { key: 'oldest', label: 'Nộp cũ nhất' },
  { key: 'updated', label: 'Cập nhật gần nhất' },
  { key: 'name-asc', label: 'Tên ứng viên A-Z' },
];

export default function EmployerApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<ApplicantApplication[]>([]);
  const [job, setJob] = useState<ApiJob | null>(null);
  const [queryInput, setQueryInput] = useState(searchParams.get('q') ?? '');
  const [pageState, setPageState] = useState<PageState>('loading');
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const query = searchParams.get('q') ?? '';
  const filter = parseFilter(searchParams.get('status'));
  const sort = parseSort(searchParams.get('sort'));
  const page = parsePage(searchParams.get('page'));

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  useEffect(() => {
    void loadData();
  }, [jobId]);

  const counts = useMemo(() => getFilterCounts(applications), [applications]);
  const visibleFilters = useMemo(
    () =>
      filters.filter(
        (item) =>
          item.key === 'all' ||
          item.key === 'new' ||
          item.key === 'reviewing' ||
          counts[item.key] > 0,
      ),
    [counts],
  );
  const filteredApplications = useMemo(() => {
    const term = normalizeText(query);
    return applications
      .filter((application) =>
        filters.find((item) => item.key === filter)?.match(application),
      )
      .filter((application) => {
        if (!term) return true;
        return normalizeText(
          [
            getApplicantName(application),
            application.emailSnapshot,
            application.soDienThoaiSnapshot,
            application.hoSoNguoiLaoDong.diaChi,
            application.hoSoNguoiLaoDong.diaDiemMongMuon,
          ]
            .filter(Boolean)
            .join(' '),
        ).includes(term);
      })
      .sort((a, b) => compareApplications(a, b, sort));
  }, [applications, filter, query, sort]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredApplications.length / pageSize),
  );
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredApplications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    if (page > pageCount) updateUrl({ page: String(pageCount) }, true);
  }, [page, pageCount]);

  async function loadData() {
    setPageState('loading');
    setMessage('');
    try {
      const [jobData, applicantData] = await Promise.all([
        portalFetch<ApiJob>(`/employer/jobs/${jobId}`),
        portalFetch<ApplicantApplication[]>(
          `/employer/jobs/${jobId}/applicants`,
        ),
      ]);
      setJob(jobData);
      setApplications(applicantData);
      setPageState('ready');
    } catch {
      setPageState('error');
      setMessage('Vui lòng thử lại sau.');
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
      .getElementById('applicants-list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function updateApplicationStatus(
    application: ApplicantApplication,
    status: ApplicationStatus,
    note?: string,
  ) {
    setPendingId(application.id);
    setMessage('');
    try {
      const updated = await portalFetch<ApplicantApplication>(
        `/employer/jobs/${jobId}/applicants/${application.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ note, reason: note, status }),
        },
      );
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                ...updated,
                hoSoNguoiLaoDong:
                  updated.hoSoNguoiLaoDong ?? item.hoSoNguoiLaoDong,
              }
            : item,
        ),
      );
      setDialog(null);
    } catch {
      setMessage('Không thể cập nhật trạng thái hồ sơ. Vui lòng thử lại.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <SiteShell
      action={
        <Link
          className="btn btn-ghost job-applicants-back"
          href="/nha-tuyen-dung/tin-tuyen-dung"
        >
          <Icon name="arrowLeft" />
          Quay lại quản lý tin
        </Link>
      }
      breadcrumb="Trang chủ / Tin tuyển dụng / Ứng viên"
      pageClassName="job-applicants-page"
      role="employer"
      title="Ứng viên ứng tuyển"
      subtitle={
        job
          ? `${job.title} · ${applications.length.toLocaleString(
              'vi-VN',
            )} ứng viên · ${displayStatusLabel(job.displayStatus)} · Hạn nộp ${formatDate(job.deadline)}`
          : 'Theo dõi và xử lý hồ sơ ứng viên theo từng tin tuyển dụng.'
      }
    >
      <section
        className="container portal-content job-applicants-content"
        aria-labelledby="job-applicants-title"
      >
        {pageState === 'loading' && <ApplicantsSkeleton />}
        {pageState === 'error' && (
          <ApplicantsError
            message={message}
            onRetry={() => {
              void loadData();
            }}
          />
        )}
        {pageState === 'ready' && (
          <>
            {job && (
              <JobContextSummary
                applicantCount={applications.length}
                job={job}
              />
            )}
            <div
              className="content-card table-card job-applicants-panel"
              id="applicants-list"
            >
              <ApplicantsToolbar
                queryInput={queryInput}
                resultCount={filteredApplications.length}
                sort={sort}
                total={applications.length}
                onClearSearch={() => {
                  setQueryInput('');
                  updateUrl({ q: '', page: '1' });
                }}
                onQueryInput={setQueryInput}
                onSort={changeSort}
                onSubmit={submitSearch}
              />
              {message && (
                <div className="job-applicants-alert" role="alert">
                  {message}
                </div>
              )}
              <ApplicantStatusFilter
                counts={counts}
                filter={filter}
                filters={visibleFilters}
                onChange={changeFilter}
              />
              <ApplicantsTable
                applications={pageItems}
                filter={filter}
                hasQuery={Boolean(query)}
                jobId={jobId}
                pendingId={pendingId}
                total={applications.length}
                onClearQuery={() => {
                  setQueryInput('');
                  updateUrl({ q: '', page: '1' });
                }}
                onOpenDialog={setDialog}
                onShowAll={() => changeFilter('all')}
              />
              <ApplicantsPagination
                currentPage={currentPage}
                pageCount={pageCount}
                total={filteredApplications.length}
                onPageChange={changePage}
              />
            </div>
          </>
        )}
      </section>
      {dialog && (
        <StatusConfirmDialog
          dialog={dialog}
          isSaving={pendingId === dialog.application.id}
          onClose={() => setDialog(null)}
          onSubmit={(note) => {
            void updateApplicationStatus(
              dialog.application,
              dialog.kind === 'interview' ? 'MOI_PHONG_VAN' : 'KHONG_PHU_HOP',
              note,
            );
          }}
        />
      )}
    </SiteShell>
  );
}

function JobContextSummary({
  applicantCount,
  job,
}: {
  applicantCount: number;
  job: ApiJob;
}) {
  return (
    <article className="content-card job-applicants-summary">
      <div>
        <span>Tin tuyển dụng</span>
        <h2>{job.title}</h2>
        <p>
          {displayStatusLabel(job.displayStatus)} · Hạn nộp{' '}
          {formatDate(job.deadline)} · {applicantCount.toLocaleString('vi-VN')}{' '}
          ứng viên
        </p>
        <small>
          {job.company} · {job.location} · {jobTypeLabel(job.type)} ·{' '}
          {salaryLabel(job)}
        </small>
      </div>
      <Link href={`/viec-lam/${job.id}`}>Xem tin tuyển dụng</Link>
    </article>
  );
}

function ApplicantsToolbar({
  onClearSearch,
  onQueryInput,
  onSort,
  onSubmit,
  queryInput,
  resultCount,
  sort,
  total,
}: {
  onClearSearch: () => void;
  onQueryInput: (value: string) => void;
  onSort: (value: SortKey) => void;
  onSubmit: (event: FormEvent) => void;
  queryInput: string;
  resultCount: number;
  sort: SortKey;
  total: number;
}) {
  return (
    <div className="table-toolbar job-applicants-toolbar">
      <div>
        <h2 id="job-applicants-title">Danh sách ứng viên</h2>
        <p aria-live="polite">
          {resultCount.toLocaleString('vi-VN')}/{total.toLocaleString('vi-VN')}{' '}
          hồ sơ ứng tuyển
        </p>
      </div>
      <div className="job-applicants-controls">
        <form
          className="table-search job-applicants-search"
          onSubmit={onSubmit}
          role="search"
        >
          <label className="sr-only" htmlFor="job-applicants-query">
            Tìm theo tên, email hoặc số điện thoại
          </label>
          <Icon name="search" />
          <input
            id="job-applicants-query"
            onChange={(event) => onQueryInput(event.target.value)}
            placeholder="Tìm theo tên, email hoặc số điện thoại"
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
        <label className="job-applicants-sort" htmlFor="job-applicants-sort">
          <span className="sr-only">Sắp xếp ứng viên</span>
          <select
            className="filter-select"
            id="job-applicants-sort"
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

function ApplicantStatusFilter({
  counts,
  filter,
  filters,
  onChange,
}: {
  counts: Record<FilterKey, number>;
  filter: FilterKey;
  filters: FilterOption[];
  onChange: (filter: FilterKey) => void;
}) {
  return (
    <div
      className="filter-tabs job-applicants-tabs"
      role="tablist"
      aria-label="Lọc ứng viên theo trạng thái"
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
          <span>{counts[item.key].toLocaleString('vi-VN')}</span>
        </button>
      ))}
    </div>
  );
}

function ApplicantsTable({
  applications,
  filter,
  hasQuery,
  jobId,
  onClearQuery,
  onOpenDialog,
  onShowAll,
  pendingId,
  total,
}: {
  applications: ApplicantApplication[];
  filter: FilterKey;
  hasQuery: boolean;
  jobId: string;
  onClearQuery: () => void;
  onOpenDialog: (dialog: DialogState) => void;
  onShowAll: () => void;
  pendingId: number | null;
  total: number;
}) {
  if (!total) return <ApplicantsEmptyState jobId={jobId} />;
  if (!applications.length && hasQuery) {
    return <ApplicantsNoResults onClear={onClearQuery} />;
  }
  if (!applications.length) {
    const label = filters.find((item) => item.key === filter)?.label ?? '';
    return <ApplicantsFilterEmpty label={label} onShowAll={onShowAll} />;
  }

  return (
    <div className="responsive-table job-applicants-table-wrap">
      <table className="job-applicants-table">
        <thead>
          <tr>
            <th scope="col">Ứng viên</th>
            <th scope="col">Ngày nộp</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <ApplicantTableRow
              application={application}
              isPending={pendingId === application.id}
              jobId={jobId}
              key={application.id}
              onOpenDialog={onOpenDialog}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicantTableRow({
  application,
  isPending,
  jobId,
  onOpenDialog,
}: {
  application: ApplicantApplication;
  isPending: boolean;
  jobId: string;
  onOpenDialog: (dialog: DialogState) => void;
}) {
  const name = getApplicantName(application);
  const cvHref = validDocumentHref(
    application.tepCvSnapshotUrl ?? application.hoSoNguoiLaoDong.tepCvUrl,
  );
  const profileHref = `/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien/${application.id}`;
  const canInvite = canMoveTo(application.trangThaiHienTai, 'MOI_PHONG_VAN');
  const canReject = canMoveTo(application.trangThaiHienTai, 'KHONG_PHU_HOP');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  function closeMenu() {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  return (
    <tr>
      <td>
        <div className="job-applicant-person">
          <span>{getInitials(name)}</span>
          <div>
            <strong>{name}</strong>
            <small>{candidateSummary(application)}</small>
            <p>{candidateContact(application)}</p>
          </div>
        </div>
      </td>
      <td>
        <time
          className="job-applicant-date"
          dateTime={application.ngayNop}
          title={formatDateTime(application.ngayNop)}
        >
          {formatDateTime(application.ngayNop)}
        </time>
      </td>
      <td>
        <ApplicationStatusBadge status={application.trangThaiHienTai} />
      </td>
      <td>
        <div className="job-applicant-actions">
          <Link className="table-link primary" href={profileHref}>
            Xem hồ sơ
          </Link>
          {canInvite && (
            <button
              disabled={isPending}
              onClick={() => onOpenDialog({ application, kind: 'interview' })}
              type="button"
            >
              Mời phỏng vấn
            </button>
          )}
          <div
            className="job-applicant-menu"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeMenu();
            }}
          >
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={`Mở menu thao tác cho hồ sơ ${name}`}
              className="table-link"
              onClick={() => setMenuOpen((value) => !value)}
              ref={menuButtonRef}
              type="button"
            >
              <Icon name="more" />
            </button>
            {menuOpen && (
              <div role="menu">
                {cvHref && (
                  <Link href={cvHref} role="menuitem" target="_blank">
                    Xem CV
                  </Link>
                )}
                {canReject && (
                  <button
                    className="danger"
                    disabled={isPending}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDialog({ application, kind: 'reject' });
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Từ chối hồ sơ
                  </button>
                )}
                {!cvHref && !canReject && <span>Không có thao tác khác</span>}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`job-applicant-status ${meta.tone}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

function StatusConfirmDialog({
  dialog,
  isSaving,
  onClose,
  onSubmit,
}: {
  dialog: NonNullable<DialogState>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (note?: string) => void;
}) {
  const [note, setNote] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const name = getApplicantName(dialog.application);
  const isReject = dialog.kind === 'reject';

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSaving, onClose]);

  return (
    <div
      className="job-applicant-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="job-applicant-dialog-title"
        aria-modal="true"
        className="job-applicant-dialog"
        role="dialog"
      >
        <button
          aria-label="Đóng hộp thoại"
          className="job-applicant-dialog-close"
          disabled={isSaving}
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <Icon name="x" />
        </button>
        <h2 id="job-applicant-dialog-title">
          {isReject ? `Từ chối hồ sơ của ${name}?` : `Mời ${name} phỏng vấn?`}
        </h2>
        <p>
          {isReject
            ? 'Hồ sơ sẽ được chuyển sang trạng thái “Không phù hợp”.'
            : 'Hồ sơ sẽ được chuyển sang trạng thái “Mời phỏng vấn”. Backend hiện chưa có lịch phỏng vấn riêng.'}
        </p>
        {isReject && (
          <label>
            <span>Lý do hoặc ghi chú</span>
            <textarea
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập ghi chú nội bộ hoặc lý do từ chối nếu cần"
              value={note}
            />
          </label>
        )}
        <div>
          <button disabled={isSaving} onClick={onClose} type="button">
            Hủy
          </button>
          <button
            className={isReject ? 'danger' : 'primary'}
            disabled={isSaving}
            onClick={() => onSubmit(note.trim() || undefined)}
            type="button"
          >
            {isSaving
              ? 'Đang cập nhật...'
              : isReject
                ? 'Xác nhận từ chối'
                : 'Xác nhận mời phỏng vấn'}
          </button>
        </div>
      </section>
    </div>
  );
}

function ApplicantsPagination({
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
    <nav className="job-applicants-pagination" aria-label="Phân trang ứng viên">
      <span>
        Trang {currentPage}/{pageCount} · {total.toLocaleString('vi-VN')} hồ sơ
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

function ApplicantsSkeleton() {
  return (
    <>
      <div className="job-applicants-summary skeleton">
        <span />
        <span />
      </div>
      <div className="job-applicants-panel skeleton" aria-busy="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </>
  );
}

function ApplicantsEmptyState({ jobId }: { jobId: string }) {
  return (
    <div className="job-applicants-state">
      <Icon name="users" />
      <h3>Chưa có ứng viên ứng tuyển</h3>
      <p>Hồ sơ ứng tuyển cho vị trí này sẽ xuất hiện tại đây.</p>
      <Link href={`/viec-lam/${jobId}`}>Xem tin tuyển dụng</Link>
    </div>
  );
}

function ApplicantsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="job-applicants-state">
      <Icon name="search" />
      <h3>Không tìm thấy ứng viên phù hợp</h3>
      <p>Hãy thử tìm bằng tên, email hoặc số điện thoại khác.</p>
      <button onClick={onClear} type="button">
        Xóa từ khóa
      </button>
    </div>
  );
}

function ApplicantsFilterEmpty({
  label,
  onShowAll,
}: {
  label: string;
  onShowAll: () => void;
}) {
  return (
    <div className="job-applicants-state">
      <Icon name="filter" />
      <h3>Không có ứng viên ở trạng thái “{label}”</h3>
      <p>Quay lại toàn bộ danh sách để xem các hồ sơ khác.</p>
      <button onClick={onShowAll} type="button">
        Xem tất cả ứng viên
      </button>
    </div>
  );
}

function ApplicantsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="job-applicants-panel">
      <div className="job-applicants-state error" role="alert">
        <Icon name="alertCircle" />
        <h3>Không thể tải danh sách ứng viên</h3>
        <p>{message || 'Vui lòng thử lại sau.'}</p>
        <button onClick={onRetry} type="button">
          Thử lại
        </button>
      </div>
    </div>
  );
}

function getFilterCounts(applications: ApplicantApplication[]) {
  return filters.reduce<Record<FilterKey, number>>(
    (result, item) => {
      result[item.key] = applications.filter(item.match).length;
      return result;
    },
    {
      all: 0,
      approved: 0,
      interview: 0,
      new: 0,
      rejected: 0,
      reviewing: 0,
      withdrawn: 0,
    },
  );
}

function getStatusMeta(status: string): StatusMeta {
  if (
    status === 'DA_NOP' ||
    status === 'DA_XEM' ||
    status === 'DUOC_CHON_SO_BO' ||
    status === 'MOI_PHONG_VAN' ||
    status === 'DA_PHONG_VAN' ||
    status === 'TRUNG_TUYEN' ||
    status === 'KHONG_PHU_HOP' ||
    status === 'DA_RUT'
  ) {
    return applicationStatusMeta[status];
  }
  return {
    description: 'Trạng thái hồ sơ chưa được hệ thống nhận diện.',
    label: 'Trạng thái khác',
    tone: 'neutral',
  };
}

function canMoveTo(currentStatus: string, nextStatus: ApplicationStatus) {
  const allowed: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
    DA_NOP: ['MOI_PHONG_VAN', 'KHONG_PHU_HOP'],
    DA_XEM: ['MOI_PHONG_VAN', 'KHONG_PHU_HOP'],
    DUOC_CHON_SO_BO: ['MOI_PHONG_VAN', 'KHONG_PHU_HOP'],
    MOI_PHONG_VAN: ['DA_PHONG_VAN', 'TRUNG_TUYEN', 'KHONG_PHU_HOP'],
    DA_PHONG_VAN: ['TRUNG_TUYEN', 'KHONG_PHU_HOP'],
  };
  return (
    isApplicationStatus(currentStatus) &&
    Boolean(allowed[currentStatus]?.includes(nextStatus))
  );
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (
    value === 'DA_NOP' ||
    value === 'DA_XEM' ||
    value === 'DUOC_CHON_SO_BO' ||
    value === 'MOI_PHONG_VAN' ||
    value === 'DA_PHONG_VAN' ||
    value === 'TRUNG_TUYEN' ||
    value === 'KHONG_PHU_HOP' ||
    value === 'DA_RUT'
  );
}

function compareApplications(
  a: ApplicantApplication,
  b: ApplicantApplication,
  sort: SortKey,
) {
  if (sort === 'oldest') return timeValue(a.ngayNop) - timeValue(b.ngayNop);
  if (sort === 'updated') {
    return (
      timeValue(b.ngayCapNhatTrangThai) - timeValue(a.ngayCapNhatTrangThai)
    );
  }
  if (sort === 'name-asc') {
    return getApplicantName(a).localeCompare(getApplicantName(b), 'vi');
  }
  return timeValue(b.ngayNop) - timeValue(a.ngayNop);
}

function parseFilter(value: string | null): FilterKey {
  return filters.some((item) => item.key === value)
    ? (value as FilterKey)
    : 'all';
}

function parseSort(value: string | null): SortKey {
  return sortOptions.some((item) => item.key === value)
    ? (value as SortKey)
    : 'newest';
}

function parsePage(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

function getApplicantName(application: ApplicantApplication) {
  return (
    application.hoTenSnapshot ||
    application.hoSoNguoiLaoDong.hoTen ||
    'Ứng viên chưa có tên'
  );
}

function candidateSummary(application: ApplicantApplication) {
  const profile = application.hoSoNguoiLaoDong;
  return (
    [profile.diaDiemMongMuon, profile.diaChi].filter(Boolean).join(' · ') ||
    'Thông tin hồ sơ sẽ hiển thị trong trang chi tiết'
  );
}

function candidateContact(application: ApplicantApplication) {
  return (
    [application.emailSnapshot, application.soDienThoaiSnapshot]
      .filter(Boolean)
      .join(' · ') || 'Chưa có thông tin liên hệ snapshot'
  );
}

function displayStatusLabel(value: string) {
  const labels: Record<string, string> = {
    CHUA_DANG: 'Chưa đăng',
    DA_DONG: 'Đã đóng',
    DANG_HIEN_THI: 'Đang hiển thị',
    HET_HAN: 'Hết hạn',
    TAM_AN: 'Đang ẩn',
  };
  return labels[value] ?? 'Trạng thái tin chưa xác định';
}

function validDocumentHref(value?: string | null) {
  if (!value) return null;
  if (
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
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

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Chưa có dữ liệu';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Chưa có dữ liệu';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeValue(value?: string | null) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
  return initials || 'UV';
}

type IconName =
  'alertCircle' | 'arrowLeft' | 'filter' | 'more' | 'search' | 'users' | 'x';

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
    arrowLeft: <path d="M19 12H5m6-7-7 7 7 7" />,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    more: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
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
