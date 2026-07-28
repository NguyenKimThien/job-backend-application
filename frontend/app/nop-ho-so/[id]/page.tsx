'use client';

import SiteShell from '@/components/SiteShell';
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ApplicationPageState =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'submitted'
  | 'alreadyApplied'
  | 'closed'
  | 'error';

type ApiAccount = {
  email?: string | null;
  soDienThoai?: string | null;
};

type WorkerProfile = {
  id: number;
  hoTen?: string | null;
  tepCvUrl?: string | null;
  ngayCapNhat?: string | null;
  taiKhoan?: ApiAccount | null;
};

type WorkerApplication = {
  id: number;
  ngayNop?: string | null;
  trangThaiHienTai?: string | null;
  tepCvSnapshotUrl?: string | null;
  thuGioiThieu?: string | null;
  job?: ApiJob;
};

type SubmittedApplication = {
  id?: number;
  submittedAt: string;
  status?: string | null;
  cvUrl?: string | null;
};

type SelectedCv = {
  name: string;
  size: number;
  type: string;
};

type ValidationErrors = {
  profile?: string;
  cv?: string;
  coverLetter?: string;
  confirm?: string;
  submit?: string;
};

type JobStatus = {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
};

const approvedStatus = 'DA_DUYET';
const visibleStatus = 'DANG_HIEN_THI';
const maxCvSize = 5 * 1024 * 1024;
const maxCoverLetterLength = 1000;

const applicationStatusLabels: Record<string, string> = {
  DA_NOP: 'Đã nộp',
  DA_XEM: 'Nhà tuyển dụng đã xem',
  DUOC_CHON_SO_BO: 'Được chọn sơ bộ',
  MOI_PHONG_VAN: 'Mời phỏng vấn',
  DA_PHONG_VAN: 'Đã phỏng vấn',
  TRUNG_TUYEN: 'Trúng tuyển',
  KHONG_PHU_HOP: 'Không phù hợp',
  DA_RUT: 'Đã rút',
};

export default function ApplyPage() {
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);
  const [pageState, setPageState] = useState<ApplicationPageState>('loading');
  const [job, setJob] = useState<ApiJob | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [existingApplication, setExistingApplication] =
    useState<WorkerApplication | null>(null);
  const [submittedApplication, setSubmittedApplication] =
    useState<SubmittedApplication | null>(null);
  const [selectedCv, setSelectedCv] = useState<SelectedCv | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loadMessage, setLoadMessage] = useState('');
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      setPageState('loading');
      setLoadMessage('');
      setErrors({});

      try {
        const [jobData, profileData, applicationData] = await Promise.all([
          portalFetch<ApiJob>(`/jobs/${params.id}`),
          portalFetch<WorkerProfile>('/worker/profile'),
          portalFetch<WorkerApplication[]>('/worker/applications'),
        ]);

        if (!active) return;

        const applied = applicationData.find(
          (item) => Number(item.job?.id) === Number(jobData.id),
        );

        setJob(jobData);
        setProfile(profileData);
        setApplications(applicationData);
        setExistingApplication(applied ?? null);

        if (applied) {
          setPageState('alreadyApplied');
          return;
        }

        setPageState(isJobOpen(jobData) ? 'ready' : 'closed');
      } catch {
        if (!active) return;
        setPageState('error');
        setLoadMessage(
          'Không thể tải thông tin ứng tuyển. Vui lòng thử lại sau.',
        );
      }
    }

    void loadPageData();

    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    if (pageState === 'submitted' || pageState === 'alreadyApplied') {
      resultHeadingRef.current?.focus();
    }
  }, [pageState]);

  const cvValue = selectedCv?.name ?? profile?.tepCvUrl ?? '';
  const missingProfileItems = useMemo(
    () => getMissingProfileItems(profile),
    [profile],
  );
  const submitting = pageState === 'submitting';

  async function reloadPageData() {
    setPageState('loading');
    try {
      const [jobData, profileData, applicationData] = await Promise.all([
        portalFetch<ApiJob>(`/jobs/${params.id}`),
        portalFetch<WorkerProfile>('/worker/profile'),
        portalFetch<WorkerApplication[]>('/worker/applications'),
      ]);
      const applied = applicationData.find(
        (item) => Number(item.job?.id) === Number(jobData.id),
      );
      setJob(jobData);
      setProfile(profileData);
      setApplications(applicationData);
      setExistingApplication(applied ?? null);
      setPageState(
        applied ? 'alreadyApplied' : isJobOpen(jobData) ? 'ready' : 'closed',
      );
      setLoadMessage('');
    } catch {
      setPageState('error');
      setLoadMessage(
        'Không thể tải thông tin ứng tuyển. Vui lòng thử lại sau.',
      );
    }
  }

  function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const cvError = validateCvFile(file);
    if (cvError) {
      setErrors((current) => ({ ...current, cv: cvError }));
      return;
    }

    setSelectedCv({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setErrors((current) => ({ ...current, cv: undefined }));
  }

  function handleCvKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    document.getElementById('application-cv-upload')?.click();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || !profile || submitting) return;

    const nextErrors = validateForm({
      confirmed,
      coverLetter,
      job,
      missingProfileItems,
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }

    const applied = applications.find(
      (item) => Number(item.job?.id) === Number(job.id),
    );

    if (applied) {
      setExistingApplication(applied);
      setPageState('alreadyApplied');
      return;
    }

    setPageState('submitting');
    setErrors({});

    try {
      const response = await portalFetch<Partial<WorkerApplication>>(
        `/worker/applications/${job.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            tepCvUrl: cvValue || null,
            thuGioiThieu: coverLetter.trim() || null,
          }),
        },
      );

      setSubmittedApplication({
        id: response.id,
        submittedAt: response.ngayNop ?? new Date().toISOString(),
        status: response.trangThaiHienTai,
        cvUrl: (response.tepCvSnapshotUrl ?? cvValue) || null,
      });
      setPageState('submitted');
    } catch (error) {
      const message = mapSubmitError(error);

      if (isAlreadyAppliedMessage(message)) {
        const latestApplication = await findExistingApplication(job.id);
        setExistingApplication(latestApplication);
        setPageState('alreadyApplied');
        return;
      }

      if (isClosedJobMessage(message)) {
        setPageState('closed');
        return;
      }

      setErrors({ submit: message });
      setPageState('ready');
    }
  }

  async function findExistingApplication(id: number) {
    try {
      const latest = await portalFetch<WorkerApplication[]>(
        '/worker/applications',
      );
      setApplications(latest);
      return latest.find((item) => Number(item.job?.id) === id) ?? null;
    } catch {
      return null;
    }
  }

  const shell = (
    <SiteShell
      breadcrumb="Trang chủ / Tin tuyển dụng / Nộp hồ sơ"
      pageClassName="application-page"
      title="Nộp hồ sơ ứng tuyển"
      subtitle="Kiểm tra thông tin và tài liệu trước khi gửi hồ sơ tới nhà tuyển dụng."
    >
      <section className="container portal-content application-layout">
        {pageState === 'loading' && <ApplicationPageSkeleton />}

        {pageState === 'error' && (
          <ApplicationErrorState
            jobId={jobId}
            message={loadMessage}
            onRetry={() => {
              void reloadPageData();
            }}
          />
        )}

        {job && pageState !== 'loading' && pageState !== 'error' && (
          <>
            <div className="application-main-column">
              {(pageState === 'ready' || pageState === 'submitting') &&
                profile && (
                  <form
                    className="content-card application-form"
                    onSubmit={(event) => {
                      void submit(event);
                    }}
                    noValidate
                  >
                    <ApplicationStepState state={pageState} />

                    {Boolean(missingProfileItems.length) && (
                      <ProfileNotice missingItems={missingProfileItems} />
                    )}

                    <ApplicantInformation profile={profile} />

                    <ApplicationCvSelector
                      cvValue={cvValue}
                      error={errors.cv}
                      onChange={handleCvChange}
                      onKeyDown={handleCvKeyDown}
                      profileCvUrl={profile.tepCvUrl}
                      profileUpdatedAt={profile.ngayCapNhat}
                      selectedCv={selectedCv}
                    />

                    <ApplicationCoverLetter
                      disabled={submitting}
                      error={errors.coverLetter}
                      value={coverLetter}
                      onChange={(value) => {
                        setCoverLetter(value);
                        setErrors((current) => ({
                          ...current,
                          coverLetter: undefined,
                        }));
                      }}
                    />

                    <ApplicationConfirm
                      checked={confirmed}
                      disabled={submitting}
                      error={errors.confirm}
                      onChange={(checked) => {
                        setConfirmed(checked);
                        setErrors((current) => ({
                          ...current,
                          confirm: undefined,
                        }));
                      }}
                    />

                    {errors.profile && (
                      <div className="application-alert error" role="alert">
                        {errors.profile}
                      </div>
                    )}
                    {errors.submit && (
                      <div className="application-alert error" role="alert">
                        {errors.submit}
                      </div>
                    )}

                    <ApplicationSubmitActions
                      job={job}
                      submitting={submitting}
                    />
                  </form>
                )}

              {pageState === 'submitted' && submittedApplication && (
                <ApplicationResultState
                  cvValue={submittedApplication.cvUrl ?? cvValue}
                  job={job}
                  refHeading={resultHeadingRef}
                  submitted={submittedApplication}
                  type="submitted"
                />
              )}

              {pageState === 'alreadyApplied' && (
                <ApplicationResultState
                  application={existingApplication}
                  cvValue={existingApplication?.tepCvSnapshotUrl ?? cvValue}
                  job={job}
                  refHeading={resultHeadingRef}
                  type="alreadyApplied"
                />
              )}

              {pageState === 'closed' && <ApplicationClosedState job={job} />}
            </div>

            <ApplicationJobSummary job={job} />
          </>
        )}
      </section>
    </SiteShell>
  );

  return shell;
}

function ApplicationStepState({ state }: { state: ApplicationPageState }) {
  const steps = [
    { label: 'Chuẩn bị hồ sơ', active: state === 'ready' },
    { label: 'Đang gửi', active: state === 'submitting' },
    { label: 'Hoàn tất', active: state === 'submitted' },
  ];

  return (
    <ol className="application-steps" aria-label="Tiến trình nộp hồ sơ">
      {steps.map((step) => (
        <li className={step.active ? 'active' : ''} key={step.label}>
          <span />
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function ApplicantInformation({ profile }: { profile: WorkerProfile }) {
  return (
    <section
      className="application-section"
      aria-labelledby="applicant-info-title"
    >
      <div className="application-section-title">
        <div>
          <h2 id="applicant-info-title">Thông tin ứng viên</h2>
          <p>Thông tin này được lấy từ hồ sơ cá nhân của bạn.</p>
        </div>
        <Link href="/ho-so">Cập nhật hồ sơ</Link>
      </div>

      <div className="readonly-info-grid">
        <ReadonlyInfo label="Họ và tên" value={profile.hoTen} />
        <ReadonlyInfo
          label="Số điện thoại"
          value={formatPhone(profile.taiKhoan?.soDienThoai)}
        />
        <ReadonlyInfo
          className="full"
          label="Email"
          value={profile.taiKhoan?.email}
        />
      </div>
    </section>
  );
}

function ReadonlyInfo({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value?: string | null;
}) {
  return (
    <div className={`readonly-info ${className ?? ''}`}>
      <span>{label}</span>
      <strong>{value || 'Chưa cập nhật'}</strong>
    </div>
  );
}

function ProfileNotice({ missingItems }: { missingItems: string[] }) {
  return (
    <div className="application-alert warning" role="note">
      <div>
        <strong>Thông tin hồ sơ chưa đầy đủ</strong>
        <p>Vui lòng cập nhật các thông tin bắt buộc trước khi nộp hồ sơ.</p>
      </div>
      <ul>
        {missingItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link href="/ho-so">Hoàn thiện hồ sơ</Link>
    </div>
  );
}

function ApplicationCvSelector({
  cvValue,
  error,
  onChange,
  onKeyDown,
  profileCvUrl,
  profileUpdatedAt,
  selectedCv,
}: {
  cvValue: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  profileCvUrl?: string | null;
  profileUpdatedAt?: string | null;
  selectedCv: SelectedCv | null;
}) {
  const hasCv = Boolean(cvValue);
  const canView = Boolean(profileCvUrl && isDownloadableUrl(profileCvUrl));

  return (
    <section
      className="application-section"
      aria-labelledby="application-cv-title"
    >
      <div className="application-section-title">
        <div>
          <h2 id="application-cv-title">CV ứng tuyển</h2>
          <p>Chọn CV mà nhà tuyển dụng sẽ nhận cùng hồ sơ ứng tuyển.</p>
        </div>
      </div>

      <input
        id="application-cv-upload"
        className="application-file-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onChange}
      />

      {hasCv ? (
        <div className="application-cv-card">
          <span className="application-cv-type">{fileExtension(cvValue)}</span>
          <div className="application-cv-info">
            <strong title={fileName(cvValue)}>{fileName(cvValue)}</strong>
            <small>
              {selectedCv
                ? `${formatFileSize(selectedCv.size)} · CV vừa chọn cho lần ứng tuyển này`
                : profileUpdatedAt
                  ? `CV được chọn từ hồ sơ cá nhân · Cập nhật ${formatDate(profileUpdatedAt)}`
                  : 'CV được chọn từ hồ sơ cá nhân'}
            </small>
          </div>
          <div className="application-cv-actions">
            {canView && (
              <a href={profileCvUrl ?? ''} target="_blank" rel="noreferrer">
                Xem CV
              </a>
            )}
            <label
              htmlFor="application-cv-upload"
              tabIndex={0}
              onKeyDown={onKeyDown}
            >
              Thay đổi
            </label>
          </div>
        </div>
      ) : (
        <label
          className="application-upload-zone"
          htmlFor="application-cv-upload"
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Kéo thả CV hoặc chọn tệp"
        >
          <Icon name="upload" />
          <strong>Kéo thả CV hoặc chọn tệp</strong>
          <small>PDF hoặc DOCX, tối đa 5 MB</small>
        </label>
      )}

      {error && (
        <p className="field-error" id="application-cv-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ApplicationCoverLetter({
  disabled,
  error,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const descriptionId = 'cover-letter-help';
  const counterId = 'cover-letter-counter';

  return (
    <section
      className="application-section"
      aria-labelledby="cover-letter-title"
    >
      <label className="application-textarea-label" htmlFor="cover-letter">
        <span id="cover-letter-title">Thư giới thiệu — Không bắt buộc</span>
        <small id={descriptionId}>
          Nêu ngắn gọn kinh nghiệm, kỹ năng liên quan và lý do bạn phù hợp với
          vị trí này.
        </small>
      </label>
      <textarea
        id="cover-letter"
        aria-describedby={`${descriptionId} ${counterId}${error ? ' cover-letter-error' : ''}`}
        disabled={disabled}
        maxLength={maxCoverLetterLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ví dụ: Tôi có kinh nghiệm phát triển API bằng NestJS và đã làm việc với PostgreSQL, Prisma..."
        value={value}
      />
      <div className="application-field-meta">
        {error ? (
          <span className="field-error" id="cover-letter-error" role="alert">
            {error}
          </span>
        ) : (
          <span />
        )}
        <span id={counterId}>
          {value.length}/{maxCoverLetterLength}
        </span>
      </div>
    </section>
  );
}

function ApplicationConfirm({
  checked,
  disabled,
  error,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="application-confirm">
      <label htmlFor="application-confirm">
        <input
          id="application-confirm"
          aria-describedby={error ? 'application-confirm-error' : undefined}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          Tôi xác nhận thông tin là chính xác và đồng ý gửi hồ sơ này tới nhà
          tuyển dụng.
        </span>
      </label>
      {error && (
        <p className="field-error" id="application-confirm-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ApplicationSubmitActions({
  job,
  submitting,
}: {
  job: ApiJob;
  submitting: boolean;
}) {
  return (
    <div className="application-actions">
      <Link
        className="application-secondary-button"
        href={`/viec-lam/${job.id}`}
      >
        Xem lại tin tuyển dụng
      </Link>
      <button
        className="application-primary-button"
        disabled={submitting}
        type="submit"
      >
        {submitting && <Icon name="loader" />}
        {submitting ? 'Đang gửi hồ sơ...' : 'Nộp hồ sơ'}
      </button>
    </div>
  );
}

function ApplicationResultState({
  application,
  cvValue,
  job,
  refHeading,
  submitted,
  type,
}: {
  application?: WorkerApplication | null;
  cvValue: string;
  job: ApiJob;
  refHeading: React.RefObject<HTMLHeadingElement | null>;
  submitted?: SubmittedApplication;
  type: 'submitted' | 'alreadyApplied';
}) {
  const isSubmitted = type === 'submitted';
  const submittedAt = submitted?.submittedAt ?? application?.ngayNop;
  const status = submitted?.status ?? application?.trangThaiHienTai;

  return (
    <section
      className={`content-card application-result ${isSubmitted ? 'success' : 'info'}`}
      role={isSubmitted ? 'status' : 'region'}
      aria-live={isSubmitted ? 'polite' : undefined}
    >
      <span className="application-result-icon">
        <Icon name={isSubmitted ? 'checkCircle' : 'fileCheck'} />
      </span>
      <h2 ref={refHeading} tabIndex={-1}>
        {isSubmitted
          ? 'Hồ sơ đã được gửi thành công'
          : 'Bạn đã ứng tuyển vị trí này'}
      </h2>
      <p>
        {isSubmitted
          ? 'Nhà tuyển dụng sẽ nhận được hồ sơ và thông tin liên hệ của bạn.'
          : 'Hệ thống ghi nhận hồ sơ ứng tuyển trước đó, vì vậy bạn không cần gửi lại.'}
      </p>

      <dl className="application-result-list">
        {submitted?.id && (
          <div>
            <dt>Mã hồ sơ</dt>
            <dd>#{submitted.id}</dd>
          </div>
        )}
        <div>
          <dt>Vị trí</dt>
          <dd>{job.title}</dd>
        </div>
        <div>
          <dt>Doanh nghiệp</dt>
          <dd>{job.company}</dd>
        </div>
        {submittedAt && (
          <div>
            <dt>Thời gian gửi</dt>
            <dd>{formatDateTime(submittedAt)}</dd>
          </div>
        )}
        {status && (
          <div>
            <dt>Trạng thái</dt>
            <dd>{applicationStatusLabels[status] ?? status}</dd>
          </div>
        )}
        <div>
          <dt>CV đã gửi</dt>
          <dd>{cvValue ? fileName(cvValue) : 'Không có CV đính kèm'}</dd>
        </div>
      </dl>

      <div className="application-result-actions">
        <Link
          className="application-primary-button"
          href="/viec-lam-da-ung-tuyen"
        >
          Theo dõi hồ sơ ứng tuyển
        </Link>
        <Link className="application-secondary-button" href="/viec-lam">
          Xem thêm việc làm
        </Link>
        {!isSubmitted && (
          <Link
            className="application-secondary-button"
            href={`/viec-lam/${job.id}`}
          >
            Quay lại tin tuyển dụng
          </Link>
        )}
      </div>
    </section>
  );
}

function ApplicationClosedState({ job }: { job: ApiJob }) {
  const reason = closedReason(job);

  return (
    <section className="content-card application-result warning" role="alert">
      <span className="application-result-icon">
        <Icon name="alertCircle" />
      </span>
      <h2>Tin tuyển dụng không còn nhận hồ sơ</h2>
      <p>{reason}</p>
      <div className="application-result-actions">
        <Link className="application-primary-button" href="/viec-lam">
          Quay lại danh sách việc làm
        </Link>
        <Link
          className="application-secondary-button"
          href={`/viec-lam/${job.id}`}
        >
          Xem lại tin tuyển dụng
        </Link>
      </div>
    </section>
  );
}

function ApplicationJobSummary({ job }: { job: ApiJob }) {
  const status = getJobStatus(job);

  return (
    <aside
      className="content-card application-job-summary"
      aria-labelledby="job-summary-title"
    >
      {status && (
        <span className={`application-status ${status.tone}`}>
          {status.label}
        </span>
      )}
      <h2 id="job-summary-title">{job.title}</h2>
      <p>{job.company}</p>
      <dl>
        <div>
          <dt>Mức lương</dt>
          <dd>{salaryLabel(job)}</dd>
        </div>
        {job.location && (
          <div>
            <dt>Địa điểm</dt>
            <dd>{job.location}</dd>
          </div>
        )}
        {job.type && (
          <div>
            <dt>Hình thức</dt>
            <dd>{jobTypeLabel(job.type)}</dd>
          </div>
        )}
        {job.deadline && (
          <div>
            <dt>Hạn nộp</dt>
            <dd>{formatDate(job.deadline)}</dd>
          </div>
        )}
      </dl>
      <Link href={`/viec-lam/${job.id}`}>Xem lại tin tuyển dụng</Link>
    </aside>
  );
}

function ApplicationPageSkeleton() {
  return (
    <>
      <div className="content-card application-form application-skeleton">
        <span className="application-skeleton-line short" />
        <span className="application-skeleton-line title" />
        <div className="application-skeleton-grid">
          <span />
          <span />
          <span />
        </div>
        <span className="application-skeleton-block" />
        <span className="application-skeleton-block small" />
      </div>
      <aside className="content-card application-job-summary application-skeleton">
        <span className="application-skeleton-line short" />
        <span className="application-skeleton-line title" />
        <span className="application-skeleton-line" />
        <span className="application-skeleton-block small" />
      </aside>
    </>
  );
}

function ApplicationErrorState({
  jobId,
  message,
  onRetry,
}: {
  jobId: number;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="content-card application-result error" role="alert">
      <span className="application-result-icon">
        <Icon name="alertCircle" />
      </span>
      <h2>Không thể tải thông tin ứng tuyển</h2>
      <p>{message || 'Vui lòng thử lại sau.'}</p>
      <div className="application-result-actions">
        <button
          className="application-primary-button"
          onClick={onRetry}
          type="button"
        >
          Thử lại
        </button>
        <Link
          className="application-secondary-button"
          href={`/viec-lam/${jobId}`}
        >
          Quay lại tin tuyển dụng
        </Link>
      </div>
    </section>
  );
}

function validateForm({
  confirmed,
  coverLetter,
  job,
  missingProfileItems,
}: {
  confirmed: boolean;
  coverLetter: string;
  job: ApiJob;
  missingProfileItems: string[];
}) {
  const nextErrors: ValidationErrors = {};

  if (missingProfileItems.length) {
    nextErrors.profile =
      'Vui lòng cập nhật các thông tin bắt buộc trước khi nộp hồ sơ.';
  }

  if (coverLetter.length > maxCoverLetterLength) {
    nextErrors.coverLetter = `Thư giới thiệu không được vượt quá ${maxCoverLetterLength} ký tự.`;
  }

  if (!confirmed) {
    nextErrors.confirm = 'Bạn cần xác nhận thông tin trước khi nộp hồ sơ.';
  }

  if (!isJobOpen(job)) {
    nextErrors.submit = 'Tin tuyển dụng không còn nhận hồ sơ.';
  }

  return nextErrors;
}

function focusFirstError(errors: ValidationErrors) {
  const target =
    (errors.profile &&
      document.querySelector<HTMLElement>('.application-alert.warning a')) ||
    (errors.cv && document.getElementById('application-cv-upload')) ||
    (errors.coverLetter && document.getElementById('cover-letter')) ||
    (errors.confirm && document.getElementById('application-confirm')) ||
    document.querySelector<HTMLElement>('.application-alert.error');

  target?.focus();
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function getMissingProfileItems(profile: WorkerProfile | null) {
  const missing: string[] = [];
  if (!profile?.hoTen?.trim()) missing.push('Họ và tên');
  if (!profile?.taiKhoan?.email?.trim()) missing.push('Email');
  if (!profile?.taiKhoan?.soDienThoai?.trim()) missing.push('Số điện thoại');
  return missing;
}

function validateCvFile(file: File) {
  if (!file.size) return 'CV không được để trống.';
  if (file.size > maxCvSize) return 'Dung lượng CV không được vượt quá 5 MB.';

  const name = file.name.toLowerCase();
  const validExtension = name.endsWith('.pdf') || name.endsWith('.docx');
  const validMime =
    file.type === 'application/pdf' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === '';

  if (!validExtension || !validMime) {
    return 'CV phải có định dạng PDF hoặc DOCX.';
  }

  return '';
}

function isJobOpen(job: ApiJob) {
  return (
    job.status === approvedStatus &&
    job.displayStatus === visibleStatus &&
    !isExpired(job.deadline)
  );
}

function getJobStatus(job: ApiJob): JobStatus | null {
  if (isExpired(job.deadline)) return { label: 'Đã hết hạn', tone: 'danger' };
  if (job.displayStatus !== visibleStatus) {
    return { label: 'Đã đóng', tone: 'neutral' };
  }
  if (job.status === approvedStatus) {
    return { label: 'Tin đã kiểm duyệt', tone: 'success' };
  }
  return { label: 'Chưa mở nhận hồ sơ', tone: 'warning' };
}

function closedReason(job: ApiJob) {
  if (isExpired(job.deadline)) return 'Tin tuyển dụng đã hết hạn.';
  if (job.displayStatus !== visibleStatus) {
    return 'Nhà tuyển dụng đã dừng nhận hồ sơ cho tin này.';
  }
  if (job.status !== approvedStatus) {
    return 'Tin tuyển dụng chưa ở trạng thái được phép nhận hồ sơ.';
  }
  return 'Tin tuyển dụng hiện không còn nhận hồ sơ.';
}

function isExpired(value: string) {
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatPhone(value?: string | null) {
  if (!value) return '';
  const compact = value.replace(/\s+/g, '');
  if (/^\+84\d{9,10}$/.test(compact)) {
    const rest = compact.slice(3);
    return `+84 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim();
  }
  if (/^0\d{9}$/.test(compact)) {
    return `${compact.slice(0, 4)} ${compact.slice(4, 7)} ${compact.slice(7)}`;
  }
  return value;
}

function fileName(value: string) {
  if (!value) return '';
  const clean = value.split('?')[0].split('#')[0];
  return decodeURIComponent(clean.split(/[\\/]/).pop() ?? clean);
}

function fileExtension(value: string) {
  const extension = fileName(value).split('.').pop();
  return extension ? extension.slice(0, 4).toUpperCase() : 'CV';
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isDownloadableUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

function mapSubmitError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Không thể gửi hồ sơ. Vui lòng thử lại.';
  }

  const message = error.message;
  const normalized = normalizeText(message);

  if (normalized.includes('da ung tuyen')) {
    return 'Bạn đã ứng tuyển vị trí này.';
  }

  if (
    normalized.includes('khong con nhan ho so') ||
    normalized.includes('job_not_open')
  ) {
    return 'Tin tuyển dụng không còn nhận hồ sơ.';
  }

  if (normalized.includes('ho so') && normalized.includes('hoan thien')) {
    return 'Hồ sơ cá nhân chưa đầy đủ.';
  }

  return message || 'Không thể gửi hồ sơ. Vui lòng thử lại.';
}

function isAlreadyAppliedMessage(message: string) {
  return normalizeText(message).includes('da ung tuyen');
}

function isClosedJobMessage(message: string) {
  const normalized = normalizeText(message);
  return (
    normalized.includes('khong con nhan ho so') ||
    normalized.includes('da het han')
  );
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

type IconName =
  'alertCircle' | 'checkCircle' | 'fileCheck' | 'loader' | 'upload';

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
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2L15.8 9" />
      </>
    ),
    fileCheck: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4" />
        <path d="m9.5 15 2 2 4-5" />
      </>
    ),
    loader: (
      <>
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="m4.2 4.2 2.1 2.1" />
        <path d="m17.7 17.7 2.1 2.1" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
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
