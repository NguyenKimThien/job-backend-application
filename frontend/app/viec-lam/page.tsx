"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiJob, jobTypeLabel, portalFetch, salaryLabel } from "@/lib/portal-api";
import PublicAuthActions from "@/components/PublicAuthActions";

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  category: string;
  salary: string;
  salaryBand: string;
  experience: string;
  type: string;
  posted: string;
  color: string;
  initials: string;
  tags: string[];
};

const fallbackJobs: Job[] = [
  { id: 1, title: "Chuyên viên Marketing", company: "Công ty Cổ phần Truyền thông Sáng Tạo", location: "Cầu Giấy, Hà Nội", category: "Marketing", salary: "12 - 18 triệu", salaryBand: "10 - 20 triệu", experience: "1 - 2 năm", type: "Toàn thời gian", posted: "2 giờ trước", color: "#f97316", initials: "ST", tags: ["Content Marketing", "Facebook Ads"] },
  { id: 2, title: "Lập trình viên Front-end", company: "Công ty TNHH Công nghệ Bluewave", location: "Nam Từ Liêm, Hà Nội", category: "Công nghệ thông tin", salary: "18 - 28 triệu", salaryBand: "20 - 30 triệu", experience: "1 - 2 năm", type: "Toàn thời gian", posted: "5 giờ trước", color: "#2563eb", initials: "BW", tags: ["ReactJS", "TypeScript"] },
  { id: 3, title: "Thực tập sinh Nhân sự", company: "Tập đoàn Giáo dục Ánh Dương", location: "Đống Đa, Hà Nội", category: "Thực tập sinh", salary: "3 - 5 triệu", salaryBand: "Dưới 10 triệu", experience: "Không yêu cầu", type: "Thực tập", posted: "Hôm nay", color: "#7c3aed", initials: "AD", tags: ["Tuyển dụng", "Đào tạo"] },
  { id: 4, title: "Nhân viên Kinh doanh", company: "Công ty Cổ phần Green House", location: "Hai Bà Trưng, Hà Nội", category: "Kinh doanh", salary: "10 - 25 triệu", salaryBand: "10 - 20 triệu", experience: "Dưới 1 năm", type: "Toàn thời gian", posted: "1 ngày trước", color: "#16a34a", initials: "GH", tags: ["B2B", "Tư vấn khách hàng"] },
  { id: 5, title: "Nhân viên Thiết kế đồ họa", company: "Hanoi Creative Studio", location: "Ba Đình, Hà Nội", category: "Thiết kế", salary: "10 - 15 triệu", salaryBand: "10 - 20 triệu", experience: "1 - 2 năm", type: "Toàn thời gian", posted: "1 ngày trước", color: "#db2777", initials: "HC", tags: ["Figma", "Illustrator"] },
  { id: 6, title: "Cộng tác viên Tư vấn tuyển sinh", company: "Trung tâm Ngoại ngữ Horizon", location: "Thanh Xuân, Hà Nội", category: "Giáo dục", salary: "6 - 10 triệu", salaryBand: "Dưới 10 triệu", experience: "Không yêu cầu", type: "Bán thời gian", posted: "2 ngày trước", color: "#0891b2", initials: "HZ", tags: ["Part-time", "Giao tiếp"] },
  { id: 7, title: "Kế toán tổng hợp", company: "Công ty Thương mại MNO", location: "Hoàn Kiếm, Hà Nội", category: "Kế toán", salary: "14 - 18 triệu", salaryBand: "10 - 20 triệu", experience: "2 - 3 năm", type: "Toàn thời gian", posted: "3 ngày trước", color: "#0f766e", initials: "MN", tags: ["Thuế", "Báo cáo tài chính"] },
  { id: 8, title: "Chuyên viên Chăm sóc khách hàng", company: "Công ty Dịch vụ Thủ Đô", location: "Long Biên, Hà Nội", category: "Dịch vụ khách hàng", salary: "8 - 12 triệu", salaryBand: "Dưới 10 triệu", experience: "Dưới 1 năm", type: "Theo ca", posted: "3 ngày trước", color: "#9333ea", initials: "TD", tags: ["Tổng đài", "CRM"] },
];

const defaults = {
  category: "Tất cả ngành nghề",
  location: "Tất cả địa điểm",
  salary: "Tất cả mức lương",
  experience: "Tất cả kinh nghiệm",
  type: "Tất cả hình thức",
};

export default function JobsPage() {
  return <Suspense fallback={<div className="page-loading">Đang tải danh sách việc làm...</div>}><JobsPageContent /></Suspense>;
}

function JobsPageContent() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("nganh");
  const keywordFromUrl = searchParams.get("tuKhoa") ?? "";
  const salaryFromUrl = searchParams.get("luong");
  const experienceFromUrl = searchParams.get("kinhNghiem");
  const [keyword, setKeyword] = useState(keywordFromUrl);
  const [searchTerm, setSearchTerm] = useState(keywordFromUrl);
  const [filters, setFilters] = useState(() => ({
    ...defaults,
    category: categoryFromUrl || defaults.category,
    salary: salaryFromUrl || defaults.salary,
    experience: experienceFromUrl || defaults.experience,
  }));
  const [saved, setSaved] = useState<number[]>([]);
  const [sort, setSort] = useState("Mới nhất");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (categoryFromUrl) query.set("category", categoryFromUrl);
    if (keywordFromUrl) query.set("keyword", keywordFromUrl);
    portalFetch<ApiJob[]>(`/jobs${query.size ? `?${query}` : ""}`)
      .then((items) => setJobs(items.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        category: job.category,
        salary: salaryLabel(job),
        salaryBand: "Tất cả mức lương",
        experience: job.experience ? `${job.experience} năm` : "Không yêu cầu",
        type: jobTypeLabel(job.type),
        posted: new Date(job.postedAt).toLocaleDateString("vi-VN"),
        color: "#0f67cf",
        initials: job.company.slice(0, 2).toUpperCase(),
        tags: job.skills,
      }))))
      .catch(() => setJobs(fallbackJobs));
  }, [categoryFromUrl, keywordFromUrl]);
  useEffect(() => {
    portalFetch<ApiJob[]>("/worker/saved-jobs").then((items) => setSaved(items.map((job) => job.id))).catch(() => undefined);
  }, []);
  async function toggleSave(id: number) {
    const isSaved = saved.includes(id);
    try {
      await portalFetch(`/worker/saved-jobs/${id}`, { method: isSaved ? "DELETE" : "POST" });
      setSaved((list) => isSaved ? list.filter((item) => item !== id) : [...list, id]);
    } catch {
      window.location.href = "/dang-nhap";
    }
  }

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("vi");
    const result = jobs.filter((job) => {
      const text = `${job.title} ${job.company} ${job.tags.join(" ")}`.toLocaleLowerCase("vi");
      return (!term || text.includes(term))
        && (filters.category === defaults.category || job.category === filters.category)
        && (filters.location === defaults.location || job.location.includes(filters.location))
        && (filters.salary === defaults.salary || job.salaryBand === filters.salary)
        && (filters.experience === defaults.experience || job.experience === filters.experience)
        && (filters.type === defaults.type || job.type === filters.type);
    });
    return sort === "Lương cao" ? [...result].sort((a, b) => b.salary.localeCompare(a.salary)) : result;
  }, [filters, searchTerm, sort]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearchTerm(keyword);
  }

  function updateFilter(name: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <main className="jobs-directory">
      <header className="site-header directory-header">
        <nav className="container nav">
          <Link className="brand" href="/" aria-label="Trang chủ">
            <span className="brand-mark">V</span>
            <span><strong>VIỆC LÀM</strong><small>THANH NIÊN HÀ NỘI</small></span>
          </Link>
          <div className="nav-links">
            <Link href="/">Trang chủ</Link>
            <Link className="active" href="/viec-lam">Việc làm</Link>
            <Link href="/#nganh-nghe">Ngành nghề</Link>
            <Link href="/#cam-nang">Cẩm nang</Link>
            <Link href="/#lien-he">Liên hệ</Link>
          </div>
          <PublicAuthActions />
        </nav>
      </header>

      <section className="directory-search-section">
        <form className="container directory-search-form" onSubmit={submitSearch}>
          <label className="directory-search-input">
            <span>⌕</span>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên công việc, vị trí hoặc công ty" />
          </label>
          <label className="directory-search-input">
            <span>⌖</span>
            <select value={filters.location} onChange={(event) => updateFilter("location", event.target.value)}>
              <option>Tất cả địa điểm</option>
              <option>Cầu Giấy</option><option>Nam Từ Liêm</option><option>Đống Đa</option>
              <option>Hai Bà Trưng</option><option>Ba Đình</option><option>Thanh Xuân</option>
            </select>
          </label>
          <button type="submit">Tìm kiếm</button>
        </form>
      </section>

      <section className="container directory-heading">
        <div>
          <span className="section-kicker">CƠ HỘI DÀNH CHO BẠN</span>
          <h1>Tất cả việc làm</h1>
          <p>Việc làm được kiểm duyệt và cập nhật thường xuyên tại Hà Nội.</p>
        </div>
        <Link href="/dang-nhap">♧ Tạo thông báo việc làm</Link>
      </section>

      <section className="container all-jobs-layout">
        <aside className="advanced-filter">
          <div className="advanced-filter-title"><span>◆</span><h2>Lọc nâng cao</h2></div>
          <FilterSelect label="Theo ngành nghề" value={filters.category} onChange={(value) => updateFilter("category", value)} options={["Tất cả ngành nghề", "Marketing", "Công nghệ thông tin", "Nhân sự", "Kinh doanh", "Thiết kế", "Giáo dục", "Thực tập sinh", "Kế toán", "Dịch vụ khách hàng"]} />
          <FilterSelect label="Địa điểm" value={filters.location} onChange={(value) => updateFilter("location", value)} options={["Tất cả địa điểm", "Cầu Giấy", "Nam Từ Liêm", "Đống Đa", "Hai Bà Trưng", "Ba Đình", "Thanh Xuân", "Hoàn Kiếm", "Long Biên"]} />
          <FilterSelect label="Mức lương" value={filters.salary} onChange={(value) => updateFilter("salary", value)} options={["Tất cả mức lương", "Dưới 10 triệu", "10 - 20 triệu", "20 - 30 triệu"]} />
          <FilterSelect label="Kinh nghiệm" value={filters.experience} onChange={(value) => updateFilter("experience", value)} options={["Tất cả kinh nghiệm", "Không yêu cầu", "Dưới 1 năm", "1 - 2 năm", "2 - 3 năm"]} />
          <FilterSelect label="Hình thức làm việc" value={filters.type} onChange={(value) => updateFilter("type", value)} options={["Tất cả hình thức", "Toàn thời gian", "Bán thời gian", "Thực tập", "Theo ca"]} />
          <button className="clear-filter" onClick={() => { setFilters(defaults); setKeyword(""); setSearchTerm(""); }}>Xóa tất cả bộ lọc</button>
        </aside>

        <div className="all-jobs-results">
          <div className="directory-results-bar">
            <span>Tìm thấy <strong>{filteredJobs.length}</strong> việc làm phù hợp</span>
            <label>Sắp xếp:
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option>Mới nhất</option><option>Lương cao</option>
              </select>
            </label>
          </div>
          <div className="directory-job-list">
            {filteredJobs.map((job) => (
              <article className="job-card directory-job-card" key={job.id}>
                <div className="company-logo" style={{ background: job.color }}>{job.initials}</div>
                <div className="job-main">
                  <div className="job-title-row">
                    <div>
                      <h3><Link href={`/viec-lam/${job.id}`}>{job.title}</Link></h3>
                      <p className="company-name">{job.company} <span title="Doanh nghiệp đã xác thực">✓</span></p>
                    </div>
                    <button className={`save-button ${saved.includes(job.id) ? "saved" : ""}`} onClick={() => toggleSave(job.id)} aria-label="Lưu việc làm">
                      {saved.includes(job.id) ? "♥" : "♡"}
                    </button>
                  </div>
                  <div className="job-meta"><span>⌖ {job.location}</span><span className="salary">₫ {job.salary}</span><span>◷ {job.experience}</span><span>▣ {job.type}</span></div>
                  <div className="job-footer"><div>{job.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div><small>Đăng {job.posted}</small></div>
                </div>
              </article>
            ))}
            {!filteredJobs.length && <div className="empty-state"><span>⌕</span><h3>Chưa tìm thấy việc làm phù hợp</h3><p>Hãy thử thay đổi từ khóa hoặc bộ lọc nâng cao.</p></div>}
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="filter-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
