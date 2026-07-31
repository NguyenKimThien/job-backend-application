'use client';

import {
  FormEvent,
  ReactElement,
  SVGProps,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { ACCESS_TOKEN_KEY, ACCOUNT_KEY } from '@/lib/backend-api';
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from '@/lib/portal-api';

type AccountRole = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI_VIEN';

type Account = {
  email?: string;
  hoTen?: string;
  tenDangNhap?: string;
  tenHienThi?: string;
  vaiTro?: AccountRole;
};

type Category = {
  id: number;
  name: string;
  description?: string | null;
  jobCount?: number;
  updatedAt?: string;
};

type EmployerSummary = {
  trangThaiDuyet?: string | null;
};

type Job = {
  id: number;
  title: string;
  companyId: number;
  company: string;
  companyLogo?: string | null;
  location: string;
  salary: string;
  experience: string;
  category: string;
  type: string;
  posted: string;
  postedAt: number;
  deadline: string;
  deadlineLabel: string;
  verified: boolean;
  initials: string;
  tags: string[];
  matchScore?: number;
  matchReasons?: string[];
};

type RecommendedJobsResponse = {
  needsPreferences: boolean;
  message?: string;
  items: ApiJob[];
  total: number;
};

const defaultCategory = 'Tất cả ngành nghề';
const defaultLocation = 'Tất cả địa điểm';
const popularKeywords = [
  'Thực tập sinh',
  'Marketing',
  'Công nghệ thông tin',
  'Bán thời gian',
];

const categoryIcons = [
  'code',
  'megaphone',
  'briefcase',
  'palette',
  'users',
  'graduation',
  'calculator',
  'headphones',
] as const;

export default function Home() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [location, setLocation] = useState(defaultLocation);
  const [saved, setSaved] = useState<number[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [recommendedMessage, setRecommendedMessage] = useState('');
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const stored = window.localStorage.getItem(ACCOUNT_KEY);

    if (!token || !stored) {
      setAccount(null);
      return;
    }

    try {
      setAccount(JSON.parse(stored) as Account);
    } catch {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(ACCOUNT_KEY);
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    portalFetch<Category[]>('/categories')
      .then((items) => setCategories(items))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let ignore = false;

    setJobsLoading(true);
    setJobsError('');
    portalFetch<ApiJob[]>('/jobs')
      .then((items) => {
        if (!ignore) setJobs(items.map(mapJob));
      })
      .catch((error) => {
        if (ignore) return;
        setJobs([]);
        setJobsError(
          error instanceof Error ? error.message : 'Không thể tải việc làm.',
        );
      })
      .finally(() => {
        if (!ignore) setJobsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const hasWorkerSession =
      window.localStorage.getItem(ACCESS_TOKEN_KEY) &&
      account?.vaiTro === 'NGUOI_LAO_DONG';

    if (!hasWorkerSession) return;

    portalFetch<ApiJob[]>('/worker/saved-jobs')
      .then((items) => setSaved(items.map((job) => job.id)))
      .catch(() => undefined);

    setRecommendedLoading(true);
    portalFetch<RecommendedJobsResponse>('/jobs/recommended?pageSize=6')
      .then((data) => {
        setRecommendedJobs(
          data.items.map((job) => ({
            ...mapJob(job),
            matchScore: job.diemPhuHop,
            matchReasons: job.lyDoPhuHop ?? [],
          })),
        );
        setRecommendedMessage(data.needsPreferences ? data.message ?? '' : '');
      })
      .catch(() => {
        setRecommendedJobs([]);
        setRecommendedMessage('Chưa thể tải việc làm phù hợp với bạn.');
      })
      .finally(() => setRecommendedLoading(false));
  }, [account]);

  const featuredJobs = useMemo(() => jobs.slice(0, 6), [jobs]);
  const visibleCategories = useMemo(
    () =>
      categories
        .filter((item) => (item.jobCount ?? 0) > 0)
        .sort((a, b) => (b.jobCount ?? 0) - (a.jobCount ?? 0))
        .slice(0, 8),
    [categories],
  );
  const categoryOptions = useMemo(
    () => [defaultCategory, ...categories.map((item) => item.name)],
    [categories],
  );
  const locationOptions = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set(jobs.map((job) => job.location).filter(Boolean)),
    ).slice(0, 8);

    return [defaultLocation, ...uniqueLocations];
  }, [jobs]);
  const verifiedCompanyCount = useMemo(
    () =>
      new Set(jobs.filter((job) => job.verified).map((job) => job.companyId))
        .size,
    [jobs],
  );
  const latestUpdate = useMemo(() => {
    const newest = jobs.reduce((time, job) => Math.max(time, job.postedAt), 0);
    return newest ? new Date(newest).toLocaleDateString('vi-VN') : '';
  }, [jobs]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (searching) return;

    const params = new URLSearchParams();
    if (keyword.trim()) params.set('tuKhoa', keyword.trim());
    if (category !== defaultCategory) params.set('nganh', category);
    if (location !== defaultLocation) params.set('diaDiem', location);

    setSearching(true);
    router.push(`/viec-lam${params.size ? `?${params.toString()}` : ''}`);
  }

  function selectPopularKeyword(value: string) {
    setKeyword(value);
    const params = new URLSearchParams({ tuKhoa: value });
    router.push(`/viec-lam?${params.toString()}`);
  }

  async function toggleSave(id: number) {
    if (account?.vaiTro !== 'NGUOI_LAO_DONG') {
      router.push('/dang-nhap');
      return;
    }

    const isSaved = saved.includes(id);

    try {
      await portalFetch(`/worker/saved-jobs/${id}`, {
        method: isSaved ? 'DELETE' : 'POST',
      });
      setSaved((list) =>
        isSaved ? list.filter((item) => item !== id) : [...list, id],
      );
    } catch {
      router.push('/dang-nhap');
    }
  }

  const primaryCta = getPrimaryCta(account);
  const secondaryCta =
    account?.vaiTro === 'NHA_TUYEN_DUNG'
      ? '/nha-tuyen-dung/tin-tuyen-dung'
      : '/viec-lam';

  return (
    <main className="home-page">
      <PublicHeader active="home" />

      <section className="home-hero">
        <div className="home-container home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-kicker">Cổng thông tin việc làm chính thống</p>
            <h1>Tìm việc phù hợp tại Hà Nội</h1>
            <p>
              Kết nối với các doanh nghiệp đã xác thực và cơ hội việc làm được
              kiểm duyệt.
            </p>
          </div>

          <form className="home-search" onSubmit={handleSearch}>
            <label className="home-search-field home-search-keyword">
              <span>Từ khóa, chức danh hoặc công ty</span>
              <span>
                <Icon name="search" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Ví dụ: Nhân viên kinh doanh"
                />
              </span>
            </label>
            <label className="home-search-field">
              <span>Ngành nghề</span>
              <span>
                <Icon name="grid" />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categoryOptions.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="home-search-field">
              <span>Địa điểm</span>
              <span>
                <Icon name="mapPin" />
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  {locationOptions.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button
              className="home-search-button"
              type="submit"
              disabled={searching}
            >
              {searching ? 'Đang tìm...' : 'Tìm việc'}
            </button>
          </form>

          <div className="home-popular">
            <span>Phổ biến:</span>
            {popularKeywords.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => selectPopularKeyword(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {(jobs.length > 0 || verifiedCompanyCount > 0) && (
        <section className="home-stats" aria-label="Thống kê nền tảng">
          <div className="home-container home-stats-inner">
            <div>
              <strong>{jobs.length.toLocaleString('vi-VN')}</strong>
              <span>Việc làm đang tuyển</span>
            </div>
            {verifiedCompanyCount > 0 && (
              <div>
                <strong>{verifiedCompanyCount.toLocaleString('vi-VN')}</strong>
                <span>Doanh nghiệp đã xác thực</span>
              </div>
            )}
            {latestUpdate && <small>Cập nhật gần nhất: {latestUpdate}</small>}
          </div>
        </section>
      )}

      {account?.vaiTro === 'NGUOI_LAO_DONG' && (
        <section className="home-section home-jobs-section">
          <div className="home-container">
            <div className="home-section-heading">
              <div>
                <p className="home-kicker">Đề xuất theo hồ sơ</p>
                <h2>Việc làm phù hợp với bạn</h2>
                <p>
                  Kết quả được chấm điểm theo ngành nghề, vị trí, kỹ năng, địa
                  điểm, mức lương và hình thức làm việc.
                </p>
              </div>
              <Link className="home-section-link" href="/ho-so">
                Cập nhật nhu cầu tìm việc
                <Icon name="arrowRight" />
              </Link>
            </div>

            {recommendedLoading && (
              <div className="home-job-grid">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    className="home-job-skeleton"
                    key={`recommended-skeleton-${index}`}
                  />
                ))}
              </div>
            )}

            {!recommendedLoading && recommendedMessage && (
              <div className="home-empty">
                <h3>Chưa có đề xuất phù hợp</h3>
                <p>{recommendedMessage}</p>
                <Link className="home-primary-link" href="/ho-so">
                  Cập nhật nhu cầu tìm việc
                </Link>
              </div>
            )}

            {!recommendedLoading &&
              !recommendedMessage &&
              recommendedJobs.length > 0 && (
                <div className="home-job-grid">
                  {recommendedJobs.map((job) => (
                    <article
                      className="home-job-card"
                      key={`recommended-${job.id}`}
                    >
                      <div className="home-job-top">
                        <CompanyLogo job={job} />
                        <div className="home-job-title">
                          <h3>
                            <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
                          </h3>
                          <p>{job.company}</p>
                        </div>
                      </div>
                      <div className="home-match-score">
                        <strong>Phù hợp {job.matchScore ?? 0}%</strong>
                        <span>
                          {(job.matchScore ?? 0) >= 80
                            ? 'Rất phù hợp'
                            : (job.matchScore ?? 0) >= 60
                              ? 'Phù hợp'
                              : 'Có thể phù hợp'}
                        </span>
                      </div>
                      <div className="home-job-meta">
                        <span>
                          <Icon name="wallet" />
                          {job.salary}
                        </span>
                        <span>
                          <Icon name="mapPin" />
                          {job.location}
                        </span>
                      </div>
                      <ul className="home-match-reasons">
                        {(job.matchReasons ?? []).slice(0, 3).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      <div className="home-job-bottom">
                        <small>Hạn nộp {job.deadlineLabel}</small>
                        <Link href={`/viec-lam/${job.id}`}>
                          Xem chi tiết
                          <Icon name="arrowRight" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
          </div>
        </section>
      )}

      <section className="home-section home-jobs-section" id="viec-lam">
        <div className="home-container">
          <div className="home-section-heading">
            <div>
              <p className="home-kicker">Tin tuyển dụng mới</p>
              <h2>Cơ hội việc làm mới nhất</h2>
              <p>
                Các tin đang hiển thị được lấy trực tiếp từ hệ thống tuyển dụng.
              </p>
            </div>
            <Link className="home-section-link" href="/viec-lam">
              Xem tất cả việc làm
              <Icon name="arrowRight" />
            </Link>
          </div>

          {jobsError && <div className="home-message error">{jobsError}</div>}

          {jobsLoading && (
            <div className="home-job-grid" aria-label="Đang tải việc làm">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="home-job-skeleton"
                  key={`job-skeleton-${index}`}
                />
              ))}
            </div>
          )}

          {!jobsLoading && !jobsError && featuredJobs.length > 0 && (
            <div className="home-job-grid">
              {featuredJobs.map((job) => (
                <article className="home-job-card" key={job.id}>
                  <div className="home-job-top">
                    <CompanyLogo job={job} />
                    <div className="home-job-title">
                      <h3>
                        <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
                      </h3>
                      <p>
                        {job.company}
                        {job.verified && (
                          <span className="home-verified">
                            <Icon name="shieldCheck" />
                            Đã xác thực
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      className={`home-save ${saved.includes(job.id) ? 'saved' : ''}`}
                      onClick={() => {
                        void toggleSave(job.id);
                      }}
                      aria-label={
                        saved.includes(job.id)
                          ? 'Bỏ lưu việc làm'
                          : 'Lưu việc làm'
                      }
                      type="button"
                    >
                      <Icon name="bookmark" />
                    </button>
                  </div>

                  <div className="home-job-meta">
                    <span>
                      <Icon name="wallet" />
                      {job.salary}
                    </span>
                    <span>
                      <Icon name="mapPin" />
                      {job.location}
                    </span>
                    <span>
                      <Icon name="clock" />
                      {job.experience}
                    </span>
                  </div>

                  <div className="home-tags">
                    {job.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="home-job-bottom">
                    <small>
                      Đăng {job.posted} · Hạn nộp {job.deadlineLabel}
                    </small>
                    <Link href={`/viec-lam/${job.id}`}>
                      Xem chi tiết
                      <Icon name="arrowRight" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!jobsLoading && !jobsError && featuredJobs.length === 0 && (
            <div className="home-empty">
              <h3>Chưa có tin tuyển dụng đang hiển thị</h3>
              <p>
                Khi hệ thống có dữ liệu mới, các cơ hội phù hợp sẽ xuất hiện tại
                đây.
              </p>
            </div>
          )}
        </div>
      </section>

      {visibleCategories.length > 0 && (
        <section className="home-section home-category-section" id="nganh-nghe">
          <div className="home-container">
            <div className="home-section-heading">
              <div>
                <p className="home-kicker">Ngành nghề nổi bật</p>
                <h2>Khám phá theo lĩnh vực</h2>
                <p>
                  Số lượng việc làm được tổng hợp từ danh mục hiện có của hệ
                  thống.
                </p>
              </div>
              <Link className="home-section-link" href="/nganh-nghe">
                Xem tất cả ngành nghề
                <Icon name="arrowRight" />
              </Link>
            </div>

            <div className="home-category-grid">
              {visibleCategories.map((item, index) => (
                <Link
                  className="home-category-card"
                  href={`/viec-lam?nganh=${encodeURIComponent(item.name)}`}
                  key={item.id}
                >
                  <span className="home-category-icon">
                    <Icon name={categoryIcons[index % categoryIcons.length]} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {(item.jobCount ?? 0).toLocaleString('vi-VN')} việc làm
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-section home-onboarding" id="cam-nang">
        <div className="home-container home-onboarding-inner">
          <div className="home-onboarding-copy">
            <p className="home-kicker">Quy trình ứng tuyển</p>
            <h2>Bắt đầu tìm việc trong 3 bước</h2>
            <p>
              Chuẩn bị hồ sơ, lọc cơ hội phù hợp và theo dõi trạng thái ứng
              tuyển tại một nơi.
            </p>
            <div className="home-onboarding-actions">
              <Link className="home-primary-link" href={primaryCta.href}>
                {primaryCta.label}
              </Link>
              <Link className="home-secondary-link" href={secondaryCta}>
                Khám phá việc làm
              </Link>
            </div>
          </div>

          <div className="home-step-list">
            {[
              ['Hoàn thiện hồ sơ', 'Cập nhật kỹ năng và kinh nghiệm của bạn.'],
              [
                'Tìm cơ hội phù hợp',
                'Lọc theo ngành nghề, địa điểm và mức lương.',
              ],
              [
                'Ứng tuyển và theo dõi',
                'Theo dõi trạng thái hồ sơ tại một nơi.',
              ],
            ].map(([title, description], index) => (
              <article className="home-step" key={title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="home-footer" id="lien-he">
        <div className="home-container home-footer-grid">
          <div className="home-footer-brand">
            <Link className="home-brand home-brand-light" href="/">
              <span className="home-brand-mark">V</span>
              <span>
                <strong>VIỆC LÀM</strong>
                <small>THANH NIÊN HÀ NỘI</small>
              </span>
            </Link>
            <p>
              Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội vận hành nền tảng kết
              nối cung cầu lao động dành cho người lao động và doanh nghiệp trên
              địa bàn.
            </p>
          </div>
          <div>
            <h2>Đơn vị vận hành</h2>
            <p>Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</p>
            <p>14A Phan Chu Trinh, Hoàn Kiếm, Hà Nội</p>
          </div>
          <div>
            <h2>Dành cho người lao động</h2>
            <Link href="/viec-lam">Tìm việc làm</Link>
            <Link href="/ho-so">Hồ sơ cá nhân</Link>
            <Link href="/viec-lam-da-luu">Việc làm đã lưu</Link>
          </div>
          <div>
            <h2>Dành cho nhà tuyển dụng</h2>
            <Link href="/dang-ky-nha-tuyen-dung">Tạo tài khoản tuyển dụng</Link>
            <Link href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi">
              Đăng tin tuyển dụng
            </Link>
            <Link href="/nha-tuyen-dung/tin-tuyen-dung">
              Quản lý tin tuyển dụng
            </Link>
          </div>
          <div>
            <h2>Hỗ trợ và liên hệ</h2>
            <a href="tel:02438582525">024 3858 2525</a>
            <a href="mailto:hotro@vieclamthanhnien.vn">
              hotro@vieclamthanhnien.vn
            </a>
            <p>Thứ Hai - Thứ Sáu, 8:00 - 17:00</p>
          </div>
        </div>
        <div className="home-container home-copyright">
          <span>© 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</span>
          <span>
            <Link href="/#lien-he">Điều khoản sử dụng</Link>
            <Link href="/#lien-he">Chính sách bảo mật</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}

function CompanyLogo({ job }: { job: Job }) {
  if (job.companyLogo) {
    return (
      <img
        className="home-company-logo"
        src={job.companyLogo}
        alt={`Logo ${job.company}`}
      />
    );
  }

  return <span className="home-company-logo fallback">{job.initials}</span>;
}

function mapJob(job: ApiJob): Job {
  const postedAt = new Date(job.postedAt).getTime();
  const employer = job.employer as EmployerSummary | undefined;

  return {
    id: job.id,
    title: job.title,
    companyId: job.companyId,
    company: job.company,
    companyLogo: job.companyLogo,
    location: job.location,
    salary: salaryLabel(job),
    experience: experienceLabel(job.experience),
    category: job.category,
    type: jobTypeLabel(job.type),
    posted: relativeDate(job.postedAt),
    postedAt: Number.isNaN(postedAt) ? 0 : postedAt,
    deadline: job.deadline,
    deadlineLabel: formatDate(job.deadline),
    verified: employer?.trangThaiDuyet === 'DA_DUYET',
    initials: getInitials(job.company),
    tags: job.skills.length ? job.skills : [job.category],
  };
}

function getPrimaryCta(account: Account | null) {
  if (account?.vaiTro === 'NHA_TUYEN_DUNG') {
    return {
      href: '/nha-tuyen-dung/tin-tuyen-dung/tao-moi',
      label: 'Đăng tin tuyển dụng',
    };
  }

  if (account?.vaiTro === 'NGUOI_LAO_DONG') {
    return { href: '/ho-so', label: 'Hoàn thiện hồ sơ' };
  }

  if (account?.vaiTro === 'QUAN_TRI_VIEN') {
    return { href: '/quan-tri/thong-ke', label: 'Vào trang quản trị' };
  }

  return { href: '/dang-ky', label: 'Tạo tài khoản' };
}

function experienceLabel(value: ApiJob['experience']) {
  if (value === null || value === undefined || Number(value) === 0) {
    return 'Không yêu cầu';
  }

  const years = Number(value);
  if (!Number.isFinite(years)) return 'Không yêu cầu';
  if (years < 1) return 'Dưới 1 năm';
  return `${years} năm`;
}

function getInitials(value: string) {
  const words = value
    .replace(/công ty|tnhh|cổ phần|cp|mtv/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (words[0]?.[0] ?? 'V')
    .concat(words[1]?.[0] ?? words[0]?.[1] ?? 'L')
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'chưa cập nhật';

  const diff = Date.now() - date.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diff < hour) return 'vừa xong';
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} giờ trước`;
  if (diff < day * 2) return 'hôm qua';
  if (diff < day * 7) return `${Math.floor(diff / day)} ngày trước`;
  return formatDate(value);
}

type IconName =
  | 'arrowRight'
  | 'bookmark'
  | 'briefcase'
  | 'calculator'
  | 'clock'
  | 'code'
  | 'graduation'
  | 'grid'
  | 'headphones'
  | 'mapPin'
  | 'megaphone'
  | 'palette'
  | 'search'
  | 'shieldCheck'
  | 'users'
  | 'wallet';

function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactElement> = {
    arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
    bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />,
    briefcase: (
      <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 0h14v12H5V6Zm0 5h14" />
    ),
    calculator: (
      <path d="M7 3h10v18H7V3Zm2 4h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01" />
    ),
    clock: <path d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    code: <path d="m8 9-4 3 4 3m8-6 4 3-4 3m-2-9-4 12" />,
    graduation: <path d="m3 8 9-4 9 4-9 4-9-4Zm4 3v4c2 2 8 2 10 0v-4" />,
    grid: (
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
    ),
    headphones: (
      <path d="M4 13a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-7h4M4 13h4v7H6a2 2 0 0 1-2-2v-5Z" />
    ),
    mapPin: (
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    ),
    megaphone: <path d="M4 13h3l10 4V5L7 9H4v4Zm3 0 1 5h3l-1-4" />,
    palette: (
      <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.2-3.6 1.4 1.4 0 0 1 .8-2.4H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 10h.01M10 7h.01M14 7h.01M16.5 10h.01" />
    ),
    search: (
      <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
    ),
    shieldCheck: (
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-5" />
    ),
    users: (
      <path d="M16 19a4 4 0 0 0-8 0m8-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm2 10a3 3 0 0 0-2-2.8m1-10.8a3 3 0 0 1 0 5.2" />
    ),
    wallet: (
      <path d="M4 7h15a1 1 0 0 1 1 1v10H4V7Zm0 0V6a2 2 0 0 1 2-2h10v3m12 4h-5a2 2 0 0 0 0 4h5" />
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
