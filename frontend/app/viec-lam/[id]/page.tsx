'use client';

import SiteShell from '@/components/SiteShell';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';
import {
  ApiEmployerSummary,
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ReactNode,
  SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type AccountRole =
  'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI' | 'QUAN_TRI_VIEN';

type ShellRole = 'worker' | 'employer' | 'admin';
type PageState = 'loading' | 'ready' | 'not-found' | 'error';
type NoticeTone = 'success' | 'error' | 'warning' | 'info';

type StoredAccount = {
  email?: string;
  hoTen?: string;
  tenDangNhap?: string;
  tenHienThi?: string;
  vaiTro?: AccountRole;
};

type SessionState = {
  account: StoredAccount | null;
  loaded: boolean;
  token: string | null;
};

type WorkerApplication = {
  id: number;
  tinTuyenDungId?: number | null;
  trangThaiHienTai?: string | null;
  job?: ApiJob;
};

type DetailNotice = {
  text: string;
  tone: NoticeTone;
};

type TextSection = {
  title: string;
  content?: string | null;
};

const approvedStatus = 'DA_DUYET';
const visibleStatus = 'DANG_HIEN_THI';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [job, setJob] = useState<ApiJob | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [session, setSession] = useState<SessionState>({
    account: null,
    loaded: false,
    token: null,
  });
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [workerStateLoading, setWorkerStateLoading] = useState(false);
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [notice, setNotice] = useState<DetailNotice | null>(null);

  const loadJob = useCallback(async () => {
    setPageState('loading');
    setNotice(null);
    setJob(null);

    try {
      const item = await portalFetch<ApiJob>(`/jobs/${jobId}`);
      setJob(item);
      setPageState('ready');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể tải thông tin việc làm.';
      setPageState(isNotFoundMessage(message) ? 'not-found' : 'error');
      setNotice({ text: message, tone: 'error' });
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const stored = window.localStorage.getItem(ACCOUNT_KEY);

    if (!token || !stored) {
      setSession({ account: null, loaded: true, token: null });
      return;
    }

    try {
      setSession({
        account: JSON.parse(stored) as StoredAccount,
        loaded: true,
        token,
      });
    } catch {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(ACCOUNT_KEY);
      setSession({ account: null, loaded: true, token: null });
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    if (!session.loaded || session.account?.vaiTro !== 'NGUOI_LAO_DONG') {
      setSaved(false);
      setApplications([]);
      setWorkerStateLoading(false);
      return;
    }

    setWorkerStateLoading(true);
    void Promise.allSettled([
      portalFetch<ApiJob[]>('/worker/saved-jobs'),
      portalFetch<WorkerApplication[]>('/worker/applications'),
    ]).then(([savedResult, applicationsResult]) => {
      if (ignore) return;

      if (savedResult.status === 'fulfilled') {
        setSaved(savedResult.value.some((item) => String(item.id) === jobId));
      }
      if (applicationsResult.status === 'fulfilled') {
        setApplications(applicationsResult.value);
      }
      setWorkerStateLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [jobId, session.account?.vaiTro, session.loaded]);

  const shellRole = shellRoleFromAccount(session.account?.vaiTro);
  const appliedApplication = useMemo(
    () =>
      applications.find((item) => {
        const itemJobId = item.tinTuyenDungId ?? item.job?.id;
        return String(itemJobId) === jobId;
      }) ?? null,
    [applications, jobId],
  );

  async function toggleSave() {
    if (!job || savePending) return;

    if (!session.token || !session.account) {
      window.location.assign(loginHref(`/viec-lam/${job.id}`));
      return;
    }

    if (session.account.vaiTro !== 'NGUOI_LAO_DONG') {
      setNotice({
        text: 'Chỉ tài khoản người lao động mới có thể lưu tin tuyển dụng.',
        tone: 'warning',
      });
      return;
    }

    const previous = saved;
    setSaved(!previous);
    setSavePending(true);
    setNotice(null);

    try {
      await portalFetch(`/worker/saved-jobs/${job.id}`, {
        method: previous ? 'DELETE' : 'POST',
      });
      setNotice({
        text: previous ? 'Đã bỏ lưu tin tuyển dụng.' : 'Đã lưu tin tuyển dụng.',
        tone: 'success',
      });
    } catch (error) {
      setSaved(previous);
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : 'Không thể cập nhật trạng thái lưu tin.',
        tone: 'error',
      });
    } finally {
      setSavePending(false);
    }
  }

  if (pageState === 'loading') {
    return (
      <SiteShell pageClassName="job-detail-page" role={shellRole}>
        <JobDetailSkeleton />
      </SiteShell>
    );
  }

  if (pageState === 'not-found') {
    return (
      <SiteShell pageClassName="job-detail-page" role={shellRole}>
        <JobDetailState
          title="Không tìm thấy tin tuyển dụng"
          description="Tin có thể đã bị xóa hoặc không còn khả dụng."
          action={<Link href="/viec-lam">Quay lại danh sách việc làm</Link>}
        />
      </SiteShell>
    );
  }

  if (pageState === 'error' || !job) {
    return (
      <SiteShell pageClassName="job-detail-page" role={shellRole}>
        <JobDetailState
          title="Không thể tải thông tin việc làm"
          description="Vui lòng thử lại sau."
          action={
            <button onClick={() => void loadJob()} type="button">
              Thử lại
            </button>
          }
        />
      </SiteShell>
    );
  }

  const employerVerified = isEmployerVerified(job.employer);
  const jobReviewed = job.status === approvedStatus;
  const closedNotice = jobClosedNotice(job);
  const quotaNotice = jobQuotaNotice(job);

  return (
    <SiteShell pageClassName="job-detail-page" role={shellRole}>
      <JobDetailHero
        appliedApplication={appliedApplication}
        employerVerified={employerVerified}
        job={job}
        jobReviewed={jobReviewed}
        saved={saved}
        savePending={savePending}
        session={session}
        workerStateLoading={workerStateLoading}
        onToggleSave={() => {
          void toggleSave();
        }}
      />

      <section
        className="container job-detail-body"
        aria-labelledby="job-detail-content-title"
      >
        {notice && (
          <div
            className={`job-detail-notice ${notice.tone}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
          >
            {notice.text}
          </div>
        )}

        {quotaNotice && <JobStatusNotice notice={quotaNotice} />}
        {closedNotice && <JobStatusNotice notice={closedNotice} />}

        <div className="job-detail-layout">
          <article className="content-card job-detail-content-card">
            <h2 className="sr-only" id="job-detail-content-title">
              Nội dung chi tiết công việc
            </h2>
            <JobContentSections job={job} />
          </article>

          <aside className="job-detail-sidebar" aria-label="Thông tin bổ sung">
            <div className="job-detail-sidebar-inner">
              <JobInformationCard job={job} jobReviewed={jobReviewed} />
              <CompanySummaryCard
                employer={job.employer}
                employerVerified={employerVerified}
                job={job}
              />
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

function JobDetailHero({
  appliedApplication,
  employerVerified,
  job,
  jobReviewed,
  onToggleSave,
  saved,
  savePending,
  session,
  workerStateLoading,
}: {
  appliedApplication: WorkerApplication | null;
  employerVerified: boolean;
  job: ApiJob;
  jobReviewed: boolean;
  onToggleSave: () => void;
  saved: boolean;
  savePending: boolean;
  session: SessionState;
  workerStateLoading: boolean;
}) {
  return (
    <section className="job-detail-hero">
      <div className="container job-detail-hero-inner">
        <nav className="job-detail-breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/viec-lam">Việc làm</Link>
          <span aria-hidden="true">/</span>
          <span>{job.title}</span>
        </nav>

        <div className="job-detail-hero-main">
          <CompanyLogo
            className="job-detail-company-logo"
            company={job.company}
            logoUrl={job.companyLogo ?? job.employer?.logoUrl}
          />

          <div className="job-detail-title-block">
            <div className="job-detail-badges">
              {employerVerified && (
                <VerificationBadge label="Doanh nghiệp đã xác minh" />
              )}
              {jobReviewed && (
                <VerificationBadge
                  label="Tin tuyển dụng đã được kiểm duyệt"
                  tone="neutral"
                />
              )}
            </div>

            <h1>{job.title}</h1>
            <p>
              <Link href={`/cong-ty/${job.companyId}`}>{job.company}</Link>
            </p>
            <small>
              {joinMeta([
                job.postedAt ? `Đăng ngày ${formatDate(job.postedAt)}` : null,
                `Mã tin #${job.id}`,
              ])}
            </small>
          </div>

          <JobApplicationActions
            appliedApplication={appliedApplication}
            job={job}
            saved={saved}
            savePending={savePending}
            session={session}
            workerStateLoading={workerStateLoading}
            onToggleSave={onToggleSave}
          />
        </div>

        <div className="job-detail-quick-meta" aria-label="Thông tin nổi bật">
          <QuickMetaItem
            icon="banknote"
            label="Mức lương"
            value={salaryLabel(job)}
          />
          <QuickMetaItem icon="mapPin" label="Địa điểm" value={job.location} />
          <QuickMetaItem
            icon="briefcase"
            label="Kinh nghiệm"
            value={experienceLabel(job.experience)}
          />
          <QuickMetaItem
            icon="clock"
            label="Hình thức"
            value={jobTypeLabel(job.type)}
          />
        </div>
      </div>
    </section>
  );
}

function JobApplicationActions({
  appliedApplication,
  job,
  onToggleSave,
  saved,
  savePending,
  session,
  workerStateLoading,
}: {
  appliedApplication: WorkerApplication | null;
  job: ApiJob;
  onToggleSave: () => void;
  saved: boolean;
  savePending: boolean;
  session: SessionState;
  workerStateLoading: boolean;
}) {
  const cta = applicationCta(
    job,
    session,
    workerStateLoading,
    appliedApplication,
  );
  const canToggleSave =
    !savePending &&
    (!session.account || session.account.vaiTro === 'NGUOI_LAO_DONG');

  return (
    <div
      className="job-detail-actions"
      aria-label="Hành động với tin tuyển dụng"
    >
      {cta.href ? (
        <Link className="job-detail-apply" href={cta.href}>
          {cta.label}
        </Link>
      ) : (
        <button
          className="job-detail-apply disabled"
          disabled
          title={cta.help}
          type="button"
        >
          {cta.label}
        </button>
      )}

      <button
        aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} tin tuyển dụng ${job.title}`}
        aria-pressed={saved}
        className={saved ? 'job-detail-save saved' : 'job-detail-save'}
        disabled={!canToggleSave}
        onClick={onToggleSave}
        type="button"
      >
        <Icon name={saved ? 'bookmarkFilled' : 'bookmark'} />
        <span>
          {savePending
            ? saved
              ? 'Đang lưu...'
              : 'Đang bỏ lưu...'
            : saved
              ? 'Đã lưu'
              : 'Lưu tin'}
        </span>
      </button>
    </div>
  );
}

function JobStatusNotice({
  notice,
}: {
  notice: { title: string; description: string; tone: NoticeTone };
}) {
  return (
    <section className={`job-status-notice ${notice.tone}`} role="note">
      <Icon name="alertCircle" />
      <div>
        <h2>{notice.title}</h2>
        <p>{notice.description}</p>
      </div>
    </section>
  );
}

function JobContentSections({ job }: { job: ApiJob }) {
  const sections: TextSection[] = [
    { title: 'Mô tả công việc', content: job.description },
    { title: 'Yêu cầu ứng viên', content: job.requirements },
    { title: 'Quyền lợi', content: job.benefits },
    {
      title: 'Địa điểm và hình thức làm việc',
      content: joinLines([
        job.location ? `Địa điểm: ${job.location}` : null,
        job.type ? `Hình thức: ${jobTypeLabel(job.type)}` : null,
      ]),
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <ContentSection
          content={section.content}
          key={section.title}
          title={section.title}
        />
      ))}
      {job.skills.length > 0 && <JobSkillTags skills={job.skills} />}
    </>
  );
}

function ContentSection({
  content,
  title,
}: {
  content?: string | null;
  title: string;
}) {
  const lines = splitContent(content);
  if (!lines.length) return null;
  const shouldUseList =
    lines.length > 1 || lines.some((line) => isListLine(line));

  return (
    <section className="job-detail-section">
      <h2>{title}</h2>
      {shouldUseList ? (
        <ul>
          {lines.map((line) => (
            <li key={line}>{stripListMarker(line)}</li>
          ))}
        </ul>
      ) : (
        <p>{stripListMarker(lines[0])}</p>
      )}
    </section>
  );
}

function JobSkillTags({ skills }: { skills: string[] }) {
  const shown = skills.slice(0, 6);
  const remaining = skills.length - shown.length;

  return (
    <section className="job-detail-section">
      <h2>Kỹ năng liên quan</h2>
      <div className="job-detail-tags" aria-label="Kỹ năng liên quan">
        {shown.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
        {remaining > 0 && <span>+{remaining}</span>}
      </div>
    </section>
  );
}

function JobInformationCard({
  job,
  jobReviewed,
}: {
  job: ApiJob;
  jobReviewed: boolean;
}) {
  const deadlineStatus = deadlineLabel(job.deadline);
  const infoItems = [
    { icon: 'banknote', label: 'Mức lương', value: salaryLabel(job) },
    { icon: 'mapPin', label: 'Địa điểm', value: job.location },
    {
      icon: 'briefcase',
      label: 'Kinh nghiệm',
      value: experienceLabel(job.experience),
    },
    { icon: 'clock', label: 'Hình thức', value: jobTypeLabel(job.type) },
    {
      icon: 'briefcase',
      label: 'Số lượng tuyển',
      value: `${Math.max(1, Number(job.quantity ?? 1)).toLocaleString('vi-VN')} người`,
    },
    {
      icon: 'building',
      label: 'Trình độ yêu cầu',
      value: job.requiredEducation?.trim() || 'Không yêu cầu',
    },
    {
      icon: 'calendar',
      label: 'Hạn nộp',
      value: formatDate(job.deadline),
      helper: deadlineStatus,
    },
    { icon: 'building', label: 'Ngành nghề', value: job.category },
  ] satisfies Array<{
    icon: IconName;
    label: string;
    value: string;
    helper?: string;
  }>;

  return (
    <section className="content-card job-info-card">
      <h2>Thông tin công việc</h2>
      <dl>
        {infoItems.map((item) => (
          <div className="job-info-item" key={item.label}>
            <dt>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </dt>
            <dd>
              {item.value}
              {item.helper && <small>{item.helper}</small>}
            </dd>
          </div>
        ))}
      </dl>
      {jobReviewed && (
        <div className="job-reviewed-note">
          <VerificationBadge
            label="Tin tuyển dụng đã được kiểm duyệt"
            tone="neutral"
          />
        </div>
      )}
    </section>
  );
}

function CompanySummaryCard({
  employer,
  employerVerified,
  job,
}: {
  employer?: ApiEmployerSummary;
  employerVerified: boolean;
  job: ApiJob;
}) {
  const activeJobs = employer?._count?.tinTuyenDungs;
  const field = employer?.linhVuc?.tenLinhVuc;

  return (
    <section className="content-card job-company-card">
      <div className="job-company-head">
        <CompanyLogo
          className="job-company-card-logo"
          company={job.company}
          logoUrl={job.companyLogo ?? employer?.logoUrl}
        />
        <div>
          <h2 title={job.company}>{job.company}</h2>
          {employerVerified && (
            <VerificationBadge label="Doanh nghiệp đã được xác minh" />
          )}
        </div>
      </div>

      <dl>
        {field && (
          <div>
            <dt>Lĩnh vực</dt>
            <dd>{field}</dd>
          </div>
        )}
        {employer?.diaChiTruSo && (
          <div>
            <dt>Địa chỉ</dt>
            <dd>{employer.diaChiTruSo}</dd>
          </div>
        )}
        {typeof activeJobs === 'number' && activeJobs > 0 && (
          <div>
            <dt>Tin đang tuyển</dt>
            <dd>{activeJobs.toLocaleString('vi-VN')} tin đang tuyển</dd>
          </div>
        )}
      </dl>

      <Link className="job-company-link" href={`/cong-ty/${job.companyId}`}>
        Xem hồ sơ doanh nghiệp
      </Link>
    </section>
  );
}

function CompanyLogo({
  className,
  company,
  logoUrl,
}: {
  className: string;
  company: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return <img alt={`Logo ${company}`} className={className} src={logoUrl} />;
  }

  const initials = companyInitials(company);
  return (
    <span
      aria-label={initials ? `Logo ${company}` : `Doanh nghiệp ${company}`}
      className={`${className} fallback`}
      role="img"
    >
      {initials || <Icon name="building" />}
    </span>
  );
}

function VerificationBadge({
  label,
  tone = 'success',
}: {
  label: string;
  tone?: 'success' | 'neutral';
}) {
  return (
    <span className={`job-detail-badge ${tone}`} title={label}>
      <Icon name="checkCircle" />
      {label}
    </span>
  );
}

function QuickMetaItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <span>
      <Icon name={icon} />
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function JobDetailSkeleton() {
  return (
    <>
      <section className="job-detail-hero skeleton" aria-busy="true">
        <div className="container job-detail-hero-inner">
          <span />
          <div className="job-detail-hero-main">
            <span className="job-detail-company-logo fallback" />
            <div className="job-detail-title-block">
              <span />
              <span />
              <span />
            </div>
            <span />
          </div>
        </div>
      </section>
      <section className="container job-detail-body">
        <div className="job-detail-layout">
          <article className="content-card job-detail-content-card skeleton">
            <span />
            <span />
            <span />
            <span />
          </article>
          <aside className="job-detail-sidebar">
            <div className="job-detail-sidebar-inner">
              <section className="content-card job-info-card skeleton">
                <span />
                <span />
                <span />
              </section>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function JobDetailState({
  action,
  description,
  title,
}: {
  action: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="container job-detail-body">
      <div className="content-card job-detail-state" role="alert">
        <Icon name="alertCircle" />
        <h1>{title}</h1>
        <p>{description}</p>
        {action}
      </div>
    </section>
  );
}

function applicationCta(
  job: ApiJob,
  session: SessionState,
  workerStateLoading: boolean,
  appliedApplication: WorkerApplication | null,
) {
  const closed = jobClosedNotice(job);

  if (closed) {
    return { label: closed.title, help: closed.description };
  }

  if (!session.loaded) {
    return {
      label: 'Đang kiểm tra...',
      help: 'Hệ thống đang kiểm tra trạng thái tài khoản.',
    };
  }

  if (!session.token || !session.account) {
    return {
      href: loginHref(`/nop-ho-so/${job.id}`),
      label: 'Đăng nhập để ứng tuyển',
    };
  }

  if (session.account.vaiTro !== 'NGUOI_LAO_DONG') {
    return {
      label: 'Không khả dụng với tài khoản này',
      help: 'Chỉ tài khoản người lao động có thể ứng tuyển tin tuyển dụng.',
    };
  }

  if (workerStateLoading) {
    return {
      label: 'Đang kiểm tra...',
      help: 'Hệ thống đang kiểm tra trạng thái ứng tuyển của bạn.',
    };
  }

  if (appliedApplication) {
    return {
      href: '/viec-lam-da-ung-tuyen',
      label: 'Đã ứng tuyển',
    };
  }

  return {
    href: `/nop-ho-so/${job.id}`,
    label: Boolean(job.daDatChiTieu ?? job.daDuChiTieu)
      ? 'Ứng tuyển hồ sơ dự phòng'
      : 'Ứng tuyển ngay',
  };
}

function jobClosedNotice(job: ApiJob) {
  if (isExpired(job.deadline)) {
    return {
      title: 'Tin tuyển dụng đã hết hạn',
      description: 'Bạn vẫn có thể xem nội dung tin và thông tin doanh nghiệp.',
      tone: 'warning' as const,
    };
  }

  if (job.displayStatus === 'DA_DONG') {
    return {
      title: 'Không còn nhận hồ sơ',
      description: 'Nhà tuyển dụng đã ngừng nhận hồ sơ cho vị trí này.',
      tone: 'warning' as const,
    };
  }

  if (job.ngungNhanHoSo || job.conNhanHoSo === false) {
    return {
      title: 'Tin đã ngừng nhận hồ sơ',
      description:
        'Nhà tuyển dụng đã ngừng nhận thêm hồ sơ mới cho vị trí này.',
      tone: 'warning' as const,
    };
  }

  if (job.displayStatus && job.displayStatus !== visibleStatus) {
    return {
      title: 'Tin chưa mở nhận hồ sơ',
      description: 'Tin tuyển dụng hiện không ở trạng thái đang hiển thị.',
      tone: 'info' as const,
    };
  }

  if (job.status && job.status !== approvedStatus) {
    return {
      title: 'Tin chưa được kiểm duyệt',
      description: 'Tin tuyển dụng chưa sẵn sàng nhận hồ sơ ứng tuyển.',
      tone: 'info' as const,
    };
  }

  return null;
}

function jobQuotaNotice(job: ApiJob) {
  if (
    !Boolean(job.daDatChiTieu ?? job.daDuChiTieu) ||
    job.conNhanHoSo === false ||
    job.ngungNhanHoSo
  ) {
    return null;
  }

  return {
    title: 'Tin tuyển dụng đã đủ chỉ tiêu',
    description:
      'Nhà tuyển dụng vẫn tiếp nhận thêm hồ sơ dự phòng cho vị trí này.',
    tone: 'info' as const,
  };
}

function isEmployerVerified(employer?: ApiEmployerSummary) {
  return employer?.trangThaiDuyet === approvedStatus;
}

function shellRoleFromAccount(role?: AccountRole): ShellRole | undefined {
  if (role === 'NHA_TUYEN_DUNG') return 'employer';
  if (role === 'QUAN_TRI' || role === 'QUAN_TRI_VIEN') return 'admin';
  if (role === 'NGUOI_LAO_DONG') return 'worker';
  return undefined;
}

function loginHref(redirect: string) {
  return `/dang-nhap?redirect=${encodeURIComponent(redirect)}`;
}

function splitContent(value?: string | null) {
  return (value ?? '')
    .split(/\r?\n|;(?=\s*\S)/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isListLine(value: string) {
  return /^([-*•]|\d+[.)])\s+/.test(value.trim());
}

function stripListMarker(value: string) {
  return value.replace(/^([-*•]|\d+[.)])\s+/, '').trim();
}

function joinLines(items: Array<string | null | undefined>) {
  return items.filter(Boolean).join('\n');
}

function joinMeta(items: Array<string | null | undefined>) {
  return items.filter(Boolean).join(' · ');
}

function experienceLabel(value: ApiJob['experience']) {
  const years = Number(value ?? 0);
  if (!Number.isFinite(years) || years <= 0) return 'Không yêu cầu';

  if (years < 1) {
    const months = Math.round(years * 12);
    return months > 0 ? `${months} tháng` : 'Không yêu cầu';
  }

  if (Number.isInteger(years)) return `${years} năm`;
  return `${years.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} năm`;
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

function deadlineLabel(value?: string | null) {
  const days = daysUntil(value);
  if (days === null) return 'Chưa xác định hạn nộp';
  if (days < 0) return 'Đã hết hạn';
  if (days === 0) return 'Hết hạn hôm nay';
  return `Còn ${days.toLocaleString('vi-VN')} ngày`;
}

function isExpired(value?: string | null) {
  const days = daysUntil(value);
  return days !== null && days < 0;
}

function daysUntil(value?: string | null) {
  const date = parseDate(value);
  if (!date) return null;

  const diff = startOfDay(date).getTime() - startOfToday().getTime();
  return Math.ceil(diff / 86_400_000);
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  return startOfDay(new Date());
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function companyInitials(company: string) {
  const source = company
    .replace(
      /\b(công ty|cong ty|tnhh|trách nhiệm hữu hạn|co\.?\s*ltd|ltd|cổ phần|co phan|cp|mtv|một thành viên)\b/gi,
      ' ',
    )
    .trim();

  const words = (source || company)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (!words.length) return '';
  if (
    words.length >= 3 &&
    normalizeText(words[0]) === 'cong' &&
    normalizeText(words[1]) === 'nghe'
  ) {
    return `${words[0][0]}${words[2][0]}`.toUpperCase();
  }

  return words
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function isNotFoundMessage(value: string) {
  const normalized = normalizeText(value);
  return normalized.includes('khong tim thay') || normalized.includes('404');
}

type IconName =
  | 'alertCircle'
  | 'banknote'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'briefcase'
  | 'building'
  | 'calendar'
  | 'checkCircle'
  | 'clock'
  | 'mapPin';

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
    banknote: (
      <>
        <path d="M4 7h16v10H4V7Z" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 10v4M17 10v4" />
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
    building: (
      <>
        <path d="M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15" />
        <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M4 20h16" />
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
