"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicAuthActions from "@/components/PublicAuthActions";
import {
  ApiJob,
  jobTypeLabel,
  portalFetch,
  salaryLabel,
} from "@/lib/portal-api";

type Job = {
  id: number;
  title: string;
  company: string;
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
  color: string;
  initials: string;
  tags: string[];
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

const defaults: Filters = {
  category: "Tất cả ngành nghề",
  location: "Tất cả địa điểm",
  salary: "Tất cả mức lương",
  experience: "Tất cả kinh nghiệm",
  type: "Tất cả hình thức",
};

const fallbackCategories = [
  "Marketing",
  "Công nghệ thông tin",
  "Nhân sự",
  "Kinh doanh",
  "Thiết kế",
  "Giáo dục",
  "Thực tập sinh",
  "Kế toán",
  "Dịch vụ khách hàng",
];

const locationOptions = [
  defaults.location,
  "Ba Đình",
  "Cầu Giấy",
  "Đống Đa",
  "Hai Bà Trưng",
  "Hoàn Kiếm",
  "Long Biên",
  "Nam Từ Liêm",
  "Thanh Xuân",
  "Hà Nội",
];

const salaryOptions = [
  defaults.salary,
  "Dưới 10 triệu",
  "10 - 20 triệu",
  "20 - 30 triệu",
  "Trên 30 triệu",
  "Thỏa thuận",
];

const experienceOptions = [
  defaults.experience,
  "Không yêu cầu",
  "Dưới 1 năm",
  "1 - 2 năm",
  "2 - 3 năm",
  "Trên 3 năm",
];

const workTypeOptions = [
  { label: defaults.type, value: defaults.type },
  { label: "Toàn thời gian", value: "TOAN_THOI_GIAN" },
  { label: "Bán thời gian", value: "BAN_THOI_GIAN" },
  { label: "Thực tập", value: "THUC_TAP" },
  { label: "Thời vụ", value: "THOI_VU" },
  { label: "Từ xa", value: "TU_XA" },
];

const logoColors = [
  "#0f67cf",
  "#16a34a",
  "#db2777",
  "#f97316",
  "#0f766e",
  "#7c3aed",
  "#0891b2",
  "#9333ea",
];

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
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>(defaults);
  const [saved, setSaved] = useState<number[]>([]);
  const [sort, setSort] = useState("Mới nhất");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(
    fallbackCategories.map((name, index) => ({ id: index + 1, name })),
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nextKeyword = searchParams.get("tuKhoa") ?? "";
    const nextFilters = {
      ...defaults,
      category: searchParams.get("nganh") || defaults.category,
      location: searchParams.get("diaDiem") || defaults.location,
      salary: searchParams.get("luong") || defaults.salary,
      experience: searchParams.get("kinhNghiem") || defaults.experience,
      type: searchParams.get("hinhThuc") || defaults.type,
    };

    setKeyword(nextKeyword);
    setSearchTerm(nextKeyword);
    setFilters(nextFilters);
  }, [searchKey]);

  useEffect(() => {
    portalFetch<CategoryOption[]>("/categories")
      .then((items) => {
        if (items.length) setCategories(items);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    portalFetch<ApiJob[]>("/worker/saved-jobs")
      .then((items) => setSaved(items.map((job) => job.id)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const query = buildJobsQuery(searchTerm, filters);
    let ignore = false;

    setLoading(true);
    setMessage("");
    portalFetch<ApiJob[]>(`/jobs${query}`)
      .then((items) => {
        if (ignore) return;
        setJobs(items.map(mapJob));
      })
      .catch((error) => {
        if (ignore) return;
        setJobs([]);
        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách việc làm.",
        );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [filters, searchTerm]);

  const shownJobs = useMemo(() => {
    const locallyFiltered = jobs.filter((job) => matchesLocalFilters(job, filters));

    if (sort === "Lương cao") {
      return [...locallyFiltered].sort((a, b) => b.salaryValue - a.salaryValue);
    }

    return [...locallyFiltered].sort((a, b) => b.postedAt - a.postedAt);
  }, [filters, jobs, sort]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearchTerm(keyword.trim());
    pushFiltersToUrl(keyword.trim(), filters);
  }

  function updateFilter(name: keyof Filters, value: string) {
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    pushFiltersToUrl(searchTerm, nextFilters);
  }

  function clearFilters() {
    setKeyword("");
    setSearchTerm("");
    setFilters(defaults);
    router.push("/viec-lam");
  }

  async function toggleSave(id: number) {
    const isSaved = saved.includes(id);

    try {
      await portalFetch(`/worker/saved-jobs/${id}`, {
        method: isSaved ? "DELETE" : "POST",
      });
      setSaved((list) =>
        isSaved ? list.filter((item) => item !== id) : [...list, id],
      );
    } catch {
      router.push("/dang-nhap");
    }
  }

  function pushFiltersToUrl(nextKeyword: string, nextFilters: Filters) {
    const params = new URLSearchParams();

    if (nextKeyword) params.set("tuKhoa", nextKeyword);
    if (nextFilters.category !== defaults.category) {
      params.set("nganh", nextFilters.category);
    }
    if (nextFilters.location !== defaults.location) {
      params.set("diaDiem", nextFilters.location);
    }
    if (nextFilters.salary !== defaults.salary) {
      params.set("luong", nextFilters.salary);
    }
    if (nextFilters.experience !== defaults.experience) {
      params.set("kinhNghiem", nextFilters.experience);
    }
    if (nextFilters.type !== defaults.type) {
      params.set("hinhThuc", nextFilters.type);
    }

    router.push(`/viec-lam${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const categoryOptions = [
    defaults.category,
    ...categories.map((item) => item.name),
  ];

  return (
    <main className="jobs-directory">
      <header className="site-header directory-header">
        <nav className="container nav">
          <Link className="brand" href="/" aria-label="Trang chủ">
            <span className="brand-mark">V</span>
            <span>
              <strong>VIỆC LÀM</strong>
              <small>THANH NIÊN HÀ NỘI</small>
            </span>
          </Link>
          <div className="nav-links">
            <Link href="/">Trang chủ</Link>
            <Link className="active" href="/viec-lam">
              Việc làm
            </Link>
            <Link href="/#nganh-nghe">Ngành nghề</Link>
            <Link href="/#cam-nang">Cẩm nang</Link>
            <Link href="/#lien-he">Liên hệ</Link>
          </div>
          <PublicAuthActions />
        </nav>
      </header>

      <section className="directory-search-section">
        <form
          className="container directory-search-form"
          onSubmit={submitSearch}
        >
          <label className="directory-search-input">
            <span>⌕</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tên công việc, vị trí hoặc công ty"
            />
          </label>
          <label className="directory-search-input">
            <span>⌖</span>
            <select
              value={filters.location}
              onChange={(event) => updateFilter("location", event.target.value)}
            >
              {locationOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button type="submit">Tìm kiếm</button>
        </form>
      </section>

      <section className="container directory-heading">
        <div>
          <span className="section-kicker">CƠ HỘI DÀNH CHO BẠN</span>
          <h1>Tất cả việc làm</h1>
          <p>
            Việc làm được kiểm duyệt và cập nhật thường xuyên tại Hà Nội.
          </p>
        </div>
        <Link href="/dang-nhap">♧ Tạo thông báo việc làm</Link>
      </section>

      <section className="container all-jobs-layout">
        <aside className="advanced-filter">
          <div className="advanced-filter-title">
            <span>◆</span>
            <h2>Lọc nâng cao</h2>
          </div>
          <FilterSelect
            label="Theo ngành nghề"
            value={filters.category}
            onChange={(value) => updateFilter("category", value)}
            options={categoryOptions}
          />
          <FilterSelect
            label="Địa điểm"
            value={filters.location}
            onChange={(value) => updateFilter("location", value)}
            options={locationOptions}
          />
          <FilterSelect
            label="Mức lương"
            value={filters.salary}
            onChange={(value) => updateFilter("salary", value)}
            options={salaryOptions}
          />
          <FilterSelect
            label="Kinh nghiệm"
            value={filters.experience}
            onChange={(value) => updateFilter("experience", value)}
            options={experienceOptions}
          />
          <FilterSelect
            label="Hình thức làm việc"
            value={filters.type}
            onChange={(value) => updateFilter("type", value)}
            options={workTypeOptions.map((item) => item.label)}
          />
          <button className="clear-filter" type="button" onClick={clearFilters}>
            Xóa tất cả bộ lọc
          </button>
        </aside>

        <div className="all-jobs-results">
          <div className="directory-results-bar">
            <span>
              {loading ? (
                "Đang tải việc làm..."
              ) : (
                <>
                  Tìm thấy <strong>{shownJobs.length}</strong> việc làm phù hợp
                </>
              )}
            </span>
            <label>
              Sắp xếp:
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option>Mới nhất</option>
                <option>Lương cao</option>
              </select>
            </label>
          </div>

          <div className="directory-job-list">
            {message && (
              <div className="form-message error">{message}</div>
            )}

            {!message &&
              shownJobs.map((job) => (
                <article
                  className="job-card directory-job-card"
                  key={job.id}
                >
                  <div
                    className="company-logo"
                    style={{ background: job.color }}
                  >
                    {job.initials}
                  </div>
                  <div className="job-main">
                    <div className="job-title-row">
                      <div>
                        <h3>
                          <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
                        </h3>
                        <p className="company-name">
                          {job.company}{" "}
                          <span title="Doanh nghiệp đã xác thực">✓</span>
                        </p>
                      </div>
                      <div className="job-title-actions">
                        <div className="job-card-actions">
                          <Link
                            className="btn btn-primary"
                            href={`/nop-ho-so/${job.id}`}
                          >
                            Ứng tuyển ngay
                          </Link>
                          <Link
                            className="btn btn-ghost"
                            href={`/viec-lam/${job.id}`}
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                        <button
                          className={`save-button ${
                            saved.includes(job.id) ? "saved" : ""
                          }`}
                          onClick={() => toggleSave(job.id)}
                          aria-label={
                            saved.includes(job.id)
                              ? "Bỏ lưu việc làm"
                              : "Lưu việc làm"
                          }
                          type="button"
                        >
                          {saved.includes(job.id) ? "♥" : "♡"}
                        </button>
                      </div>
                    </div>
                    <div className="job-meta">
                      <span>⌖ {job.location}</span>
                      <span className="salary">₫ {job.salary}</span>
                      <span>◷ {job.experience}</span>
                      <span>▣ {job.type}</span>
                    </div>
                    <div className="job-footer">
                      <div>
                        {job.tags.map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <small>Đăng {job.posted}</small>
                    </div>
                  </div>
                </article>
              ))}

            {!loading && !message && !shownJobs.length && (
              <div className="empty-state">
                <span>⌕</span>
                <h3>Chưa tìm thấy việc làm phù hợp</h3>
                <p>Hãy thử thay đổi từ khóa hoặc bộ lọc nâng cao.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {Array.from(new Set(options)).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function buildJobsQuery(searchTerm: string, filters: Filters) {
  const params = new URLSearchParams();
  const salaryRange = salaryQuery(filters.salary);
  const experienceMax = experienceQuery(filters.experience);
  const workType = workTypeOptions.find((item) => item.label === filters.type);

  if (searchTerm.trim()) params.set("keyword", searchTerm.trim());
  if (filters.category !== defaults.category) {
    params.set("category", filters.category);
  }
  if (filters.location !== defaults.location) {
    params.set("location", filters.location);
  }
  if (salaryRange.salaryMin !== undefined) {
    params.set("salaryMin", String(salaryRange.salaryMin));
  }
  if (salaryRange.salaryMax !== undefined) {
    params.set("salaryMax", String(salaryRange.salaryMax));
  }
  if (experienceMax !== undefined) {
    params.set("experienceMax", String(experienceMax));
  }
  if (workType && workType.value !== defaults.type) {
    params.set("type", workType.value);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function mapJob(job: ApiJob): Job {
  const salaryValue = getSalaryValue(job);
  const experienceValue =
    job.experience === null || job.experience === undefined
      ? null
      : Number(job.experience);

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    category: job.category,
    salary: salaryLabel(job),
    salaryValue,
    experience: experienceLabel(experienceValue),
    experienceValue,
    type: jobTypeLabel(job.type),
    typeValue: job.type,
    posted: relativeDate(job.postedAt),
    postedAt: new Date(job.postedAt).getTime(),
    color: logoColors[job.id % logoColors.length],
    initials: getInitials(job.company),
    tags: job.skills.length ? job.skills : [job.category],
  };
}

function matchesLocalFilters(job: Job, filters: Filters) {
  if (filters.salary === "Thỏa thuận" && job.salary !== "Thỏa thuận") {
    return false;
  }

  switch (filters.experience) {
    case "Không yêu cầu":
      return job.experienceValue === null || job.experienceValue === 0;
    case "Dưới 1 năm":
      return job.experienceValue !== null && job.experienceValue < 1;
    case "1 - 2 năm":
      return (
        job.experienceValue !== null &&
        job.experienceValue >= 1 &&
        job.experienceValue <= 2
      );
    case "2 - 3 năm":
      return (
        job.experienceValue !== null &&
        job.experienceValue >= 2 &&
        job.experienceValue <= 3
      );
    case "Trên 3 năm":
      return job.experienceValue !== null && job.experienceValue > 3;
    default:
      return true;
  }
}

function salaryQuery(label: string) {
  switch (label) {
    case "Dưới 10 triệu":
      return { salaryMax: 10_000_000 };
    case "10 - 20 triệu":
      return { salaryMin: 10_000_000, salaryMax: 20_000_000 };
    case "20 - 30 triệu":
      return { salaryMin: 20_000_000, salaryMax: 30_000_000 };
    case "Trên 30 triệu":
      return { salaryMin: 30_000_000 };
    default:
      return {};
  }
}

function experienceQuery(label: string) {
  switch (label) {
    case "Dưới 1 năm":
      return 1;
    case "1 - 2 năm":
      return 2;
    case "2 - 3 năm":
      return 3;
    default:
      return undefined;
  }
}

function experienceLabel(value: number | null) {
  if (value === null || value === 0) return "Không yêu cầu";
  if (value < 1) return "Dưới 1 năm";
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
    .replace(/công ty|tnhh|cổ phần|cp/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (words[0]?.[0] ?? "V")
    .concat(words[1]?.[0] ?? words[0]?.[1] ?? "L")
    .toUpperCase();
}

function relativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (Number.isNaN(date.getTime())) return "";
  if (diff < 60 * 60 * 1000) return "vừa xong";
  if (diff < day) return `${Math.floor(diff / (60 * 60 * 1000))} giờ trước`;
  if (diff < day * 2) return "hôm qua";
  if (diff < day * 7) return `${Math.floor(diff / day)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}
