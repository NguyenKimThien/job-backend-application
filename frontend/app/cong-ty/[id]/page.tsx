'use client';

import PublicHeader from '@/components/PublicHeader';
import SiteShell from '@/components/SiteShell';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ReactNode, SVGProps, useCallback, useEffect, useState } from 'react';

type AccountRole =
  'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI' | 'QUAN_TRI_VIEN';

type ShellRole = 'worker' | 'employer' | 'admin';
type PageState = 'loading' | 'ready' | 'not-found' | 'error';

type StoredAccount = {
  id?: number;
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

type Company = {
  id: number;
  taiKhoanId?: number | null;
  tenDonVi: string;
  maSoThue?: string | null;
  diaChiTruSo?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  moTaDonVi?: string | null;
  trangThaiDuyet?: string | null;
  linhVuc?: { tenLinhVuc?: string | null } | null;
  jobs: ApiJob[];
};

const approvedStatus = 'DA_DUYET';
const visibleStatus = 'DANG_HIEN_THI';

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState<SessionState>({
    account: null,
    loaded: false,
    token: null,
  });

  const loadCompany = useCallback(async () => {
    setPageState('loading');
    setMessage('');
    setCompany(null);

    try {
      const data = await portalFetch<Company>(`/companies/${params.id}`);
      setCompany(data);
      setPageState('ready');
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : 'Không thể tải thông tin doanh nghiệp.';
      setMessage(text);
      setPageState(isNotFoundMessage(text) ? 'not-found' : 'error');
    }
  }, [params.id]);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

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

  const owner =
    Boolean(company?.taiKhoanId) &&
    session.account?.vaiTro === 'NHA_TUYEN_DUNG' &&
    Number(session.account.id) === Number(company?.taiKhoanId);
  const shellRole = shellRoleFromAccount(session.account?.vaiTro);

  const content = (
    <CompanyProfileContent
      company={company}
      isOwner={owner}
      message={message}
      pageState={pageState}
      onRetry={loadCompany}
    />
  );

  if (!session.loaded) {
    return (
      <SiteShell pageClassName="company-profile-page">
        <CompanyProfileSkeleton />
      </SiteShell>
    );
  }

  if (!session.token) {
    return (
      <>
        <PublicHeader active="jobs" />
        <main className="portal-page company-profile-page">{content}</main>
        <PublicCompanyFooter />
      </>
    );
  }

  return (
    <SiteShell pageClassName="company-profile-page" role={shellRole}>
      {content}
    </SiteShell>
  );
}

function CompanyProfileContent({
  company,
  isOwner,
  message,
  onRetry,
  pageState,
}: {
  company: Company | null;
  isOwner: boolean;
  message: string;
  onRetry: () => Promise<void>;
  pageState: PageState;
}) {
  if (pageState === 'loading') return <CompanyProfileSkeleton />;

  if (pageState === 'not-found') {
    return (
      <CompanyProfileState
        title="Không tìm thấy doanh nghiệp"
        description="Hồ sơ có thể đã bị xóa hoặc không còn khả dụng."
        action={<Link href="/viec-lam">Quay lại danh sách việc làm</Link>}
      />
    );
  }

  if (pageState === 'error' || !company) {
    return (
      <CompanyProfileState
        title="Không thể tải thông tin doanh nghiệp"
        description={message || 'Vui lòng thử lại sau.'}
        action={
          <button
            onClick={() => {
              void onRetry();
            }}
            type="button"
          >
            Thử lại
          </button>
        }
      />
    );
  }

  return (
    <>
      <CompanyProfileHero company={company} isOwner={isOwner} />

      <section className="container company-profile-body">
        <nav className="company-profile-anchors" aria-label="Điều hướng hồ sơ">
          <a href="#tong-quan">Tổng quan</a>
          <a href="#tin-tuyen-dung">
            Vị trí đang tuyển
            <span>{company.jobs.length.toLocaleString('vi-VN')}</span>
          </a>
          <a href="#thong-tin-chung">Thông tin chung</a>
        </nav>

        <div className="company-profile-layout">
          <article className="content-card company-overview" id="tong-quan">
            <CompanyOverview company={company} isOwner={isOwner} />
            <CompanyOpenJobs
              company={company}
              isOwner={isOwner}
              previewLimit={company.jobs.length}
            />
          </article>

          <aside
            className="company-profile-sidebar"
            aria-label="Thông tin chung doanh nghiệp"
            id="thong-tin-chung"
          >
            <CompanyInformationCard company={company} />
          </aside>
        </div>
      </section>
    </>
  );
}

function CompanyProfileHero({
  company,
  isOwner,
}: {
  company: Company;
  isOwner: boolean;
}) {
  const verified = isCompanyVerified(company);
  const website = normalizeWebsite(company.website);
  const metadata = [
    company.linhVuc?.tenLinhVuc,
    company.diaChiTruSo,
    openJobsLabel(company.jobs.length),
  ].filter(Boolean);

  return (
    <section className="company-profile-hero">
      <div className="container company-profile-hero-inner">
        <nav className="company-profile-breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/viec-lam">Doanh nghiệp</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{company.tenDonVi}</span>
        </nav>

        <div className="content-card company-identity-card">
          <CompanyLogo
            className="company-identity-logo"
            company={company.tenDonVi}
            logoUrl={company.logoUrl}
          />

          <div className="company-identity-main">
            <div className="company-identity-title">
              <h1 title={company.tenDonVi}>{company.tenDonVi}</h1>
              {verified && <CompanyVerificationBadge />}
            </div>
            {metadata.length > 0 && (
              <p className="company-identity-meta">{metadata.join(' · ')}</p>
            )}
            {website && (
              <a
                aria-label={`Mở website của ${company.tenDonVi}`}
                className="company-website-link"
                href={website.href}
                target="_blank"
                rel="noopener noreferrer"
                title={website.href}
              >
                <Icon name="globe" />
                <span>{website.label}</span>
                <Icon name="externalLink" />
              </a>
            )}
          </div>

          {isOwner && (
            <div className="company-owner-actions">
              <Link href="/nha-tuyen-dung/ho-so">Chỉnh sửa hồ sơ</Link>
              <Link href="/nha-tuyen-dung/tin-tuyen-dung">
                Quản lý tin tuyển dụng
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CompanyOverview({
  company,
  isOwner,
}: {
  company: Company;
  isOwner: boolean;
}) {
  const paragraphs = splitContent(company.moTaDonVi);

  return (
    <section className="company-section">
      <div className="company-section-head">
        <div>
          <span>Tổng quan</span>
          <h2>Giới thiệu doanh nghiệp</h2>
        </div>
        {isOwner && (
          <Link href="/nha-tuyen-dung/ho-so">Cập nhật giới thiệu</Link>
        )}
      </div>

      {paragraphs.length > 0 ? (
        <div className="company-description">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="company-empty-copy">
          Doanh nghiệp chưa cập nhật phần giới thiệu.
        </p>
      )}
    </section>
  );
}

function CompanyInformationCard({ company }: { company: Company }) {
  const website = normalizeWebsite(company.website);
  const items = [
    {
      icon: 'briefcase',
      label: 'Lĩnh vực',
      value: company.linhVuc?.tenLinhVuc,
    },
    {
      icon: 'mapPin',
      label: 'Địa chỉ',
      value: company.diaChiTruSo,
    },
    {
      icon: 'hash',
      label: 'Mã số thuế',
      value: company.maSoThue,
    },
    {
      icon: 'globe',
      label: 'Website',
      value: website?.label,
      href: website?.href,
    },
    {
      icon: 'building',
      label: 'Tin đang tuyển',
      value: openJobsLabel(company.jobs.length),
    },
  ] satisfies Array<{
    href?: string;
    icon: IconName;
    label: string;
    value?: string | null;
  }>;

  return (
    <section className="content-card company-info-card">
      <h2>Thông tin chung</h2>
      <dl>
        {items
          .filter((item) => item.value)
          .map((item) => (
            <div className="company-info-item" key={item.label}>
              <dt>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </dt>
              <dd>
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.href}
                  >
                    {item.value}
                  </a>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
      </dl>
      {isCompanyVerified(company) && (
        <div className="company-info-verified">
          <CompanyVerificationBadge label="Doanh nghiệp đã xác minh" />
        </div>
      )}
    </section>
  );
}

function CompanyOpenJobs({
  company,
  isOwner,
  previewLimit,
}: {
  company: Company;
  isOwner: boolean;
  previewLimit: number;
}) {
  const jobs = company.jobs.slice(0, previewLimit);
  const remaining = company.jobs.length - jobs.length;

  return (
    <section className="company-section company-open-jobs" id="tin-tuyen-dung">
      <div className="company-section-head">
        <div>
          <span>Việc làm</span>
          <h2>Vị trí đang tuyển</h2>
          <p>{openJobsLabel(company.jobs.length)}</p>
        </div>
        {remaining > 0 && (
          <a href="#tin-tuyen-dung">Xem tất cả {company.jobs.length} tin</a>
        )}
      </div>

      {jobs.length > 0 ? (
        <div className="company-job-list">
          {jobs.map((job) => (
            <CompanyJobCard job={job} key={job.id} />
          ))}
        </div>
      ) : (
        <CompanyJobsEmpty isOwner={isOwner} />
      )}

      {remaining > 0 && (
        <p className="company-job-more">
          Đang hiển thị {jobs.length.toLocaleString('vi-VN')} vị trí nổi bật
          trong tổng số {company.jobs.length.toLocaleString('vi-VN')} tin tuyển
          dụng.
        </p>
      )}
    </section>
  );
}

function CompanyJobCard({ job }: { job: ApiJob }) {
  const status = getJobStatus(job);

  return (
    <article className="company-job-card">
      <div>
        {status && (
          <span className={`company-job-status ${status.tone}`}>
            {status.label}
          </span>
        )}
        <h3>
          <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
        </h3>
        <p>
          {joinMeta([salaryLabel(job), job.location, jobTypeLabel(job.type)])}
        </p>
        <small>
          {joinMeta([
            `Kinh nghiệm ${experienceLabel(job.experience)}`,
            `Hạn ${formatDate(job.deadline)}`,
          ])}
        </small>
      </div>
      <Link className="company-job-link" href={`/viec-lam/${job.id}`}>
        Xem việc làm
      </Link>
    </article>
  );
}

function CompanyJobsEmpty({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="company-jobs-empty">
      <Icon name="briefcase" />
      <h3>Doanh nghiệp hiện chưa có vị trí đang tuyển.</h3>
      {isOwner ? (
        <Link href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi">
          Đăng tin tuyển dụng
        </Link>
      ) : (
        <Link href="/viec-lam">Khám phá việc làm khác</Link>
      )}
    </div>
  );
}

function CompanyProfileSkeleton() {
  return (
    <>
      <section className="company-profile-hero skeleton" aria-busy="true">
        <div className="container company-profile-hero-inner">
          <span className="company-skeleton-breadcrumb" />
          <div className="content-card company-identity-card">
            <span className="company-identity-logo fallback" />
            <div className="company-identity-main">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
      <section className="container company-profile-body">
        <div className="company-profile-layout">
          <article className="content-card company-overview skeleton">
            <span />
            <span />
            <span />
            <span />
          </article>
          <aside className="company-profile-sidebar">
            <section className="content-card company-info-card skeleton">
              <span />
              <span />
              <span />
            </section>
          </aside>
        </div>
      </section>
    </>
  );
}

function CompanyProfileState({
  action,
  description,
  title,
}: {
  action: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="container company-profile-body">
      <div className="content-card company-profile-state" role="alert">
        <Icon name="alertCircle" />
        <h1>{title}</h1>
        <p>{description}</p>
        {action}
      </div>
    </section>
  );
}

function PublicCompanyFooter() {
  return (
    <footer className="portal-footer">
      <div className="container">
        <span>© 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</span>
        <span>Thông tin liên hệ · Điều khoản · Hỗ trợ</span>
      </div>
    </footer>
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
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <img
        alt={`Logo ${company}`}
        className={className}
        onError={() => setFailed(true)}
        src={logoUrl}
      />
    );
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

function CompanyVerificationBadge({
  label = 'Đã xác minh',
}: {
  label?: string;
}) {
  return (
    <span className="company-verification-badge" title={label}>
      <Icon name="checkCircle" />
      {label}
    </span>
  );
}

function isCompanyVerified(company: Company) {
  return company.trangThaiDuyet === approvedStatus;
}

function shellRoleFromAccount(role?: AccountRole): ShellRole | undefined {
  if (role === 'NHA_TUYEN_DUNG') return 'employer';
  if (role === 'QUAN_TRI' || role === 'QUAN_TRI_VIEN') return 'admin';
  if (role === 'NGUOI_LAO_DONG') return 'worker';
  return undefined;
}

function normalizeWebsite(value?: string | null) {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return {
      href: url.href,
      label: url.hostname.replace(/^www\./, ''),
    };
  } catch {
    return null;
  }
}

function splitContent(value?: string | null) {
  return (value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function companyInitials(company: string) {
  const source = company
    .replace(
      /\b(công ty|cong ty|tnhh|trách nhiệm hữu hạn|co\.?\s*ltd|ltd|cổ phần|co phan|cp|mtv|một thành viên)\b/gi,
      ' ',
    )
    .trim();
  const words = (source || company).split(/\s+/).filter(Boolean);

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

function openJobsLabel(count: number) {
  if (count === 1) return '1 vị trí đang mở';
  return `${count.toLocaleString('vi-VN')} vị trí đang mở`;
}

function getJobStatus(job: ApiJob) {
  if (isExpired(job.deadline)) return { label: 'Đã hết hạn', tone: 'warning' };
  if (job.displayStatus && job.displayStatus !== visibleStatus) {
    return { label: 'Đã đóng', tone: 'neutral' };
  }
  return null;
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

function isExpired(value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function joinMeta(items: Array<string | null | undefined>) {
  return items.filter(Boolean).join(' · ');
}

function isNotFoundMessage(value: string) {
  const normalized = normalizeText(value);
  return normalized.includes('khong tim thay') || normalized.includes('404');
}

type IconName =
  | 'alertCircle'
  | 'briefcase'
  | 'building'
  | 'checkCircle'
  | 'externalLink'
  | 'globe'
  | 'hash'
  | 'mapPin';

function Icon({
  name,
  height = 16,
  width = 16,
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
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2L15.8 9" />
      </>
    ),
    externalLink: <path d="M14 5h5v5M10 14 19 5M19 14v5H5V5h5" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    hash: <path d="M5 9h14M5 15h14M9 4 7 20M17 4l-2 16" />,
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
