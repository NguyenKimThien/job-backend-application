"use client";

import SiteShell from "@/components/SiteShell";
import { ApiJob, portalFetch, salaryLabel } from "@/lib/portal-api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Company = {
  id: number; tenDonVi: string; maSoThue: string; diaChiTruSo: string;
  website?: string | null; moTaDonVi?: string | null;
  linhVuc?: { tenLinhVuc: string } | null; jobs: ApiJob[];
};

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  useEffect(() => { portalFetch<Company>(`/companies/${params.id}`).then(setCompany).catch(() => undefined); }, [params.id]);
  if (!company) return <SiteShell><div className="container portal-content detail-loading">Đang tải thông tin doanh nghiệp...</div></SiteShell>;
  return (
    <SiteShell>
      <section className="company-page">
        <div className="container company-breadcrumb"><Link href="/">Trang chủ</Link><span>›</span><Link href="/viec-lam">Việc làm</Link><span>›</span><b>{company.tenDonVi}</b></div>
        <section className="content-card company-profile-hero">
          <div className="company-profile-logo">{company.tenDonVi.slice(0, 3).toUpperCase()}</div>
          <div className="company-profile-title"><span className="verified-label dark">✓ Doanh nghiệp đã xác thực</span><h1>{company.tenDonVi}</h1>{company.website && <div><a href={company.website} target="_blank" rel="noreferrer">🔗 {company.website}</a></div>}</div>
          <nav><a href="#tong-quan">Tổng quan</a><a href="#tin-tuyen-dung">Tin tuyển dụng ({company.jobs.length})</a></nav>
        </section>
        <div className="company-content-grid" id="tong-quan">
          <article className="content-card company-introduction">
            <h2>Giới thiệu công ty</h2><p>{company.moTaDonVi || `${company.tenDonVi} là doanh nghiệp đã được Trung tâm xác thực.`}</p>
            <h2 id="tin-tuyen-dung">Tin tuyển dụng đang mở</h2>
            {company.jobs.map((job) => <div className="company-open-job" key={job.id}><div><h3><Link href={`/viec-lam/${job.id}`}>{job.title}</Link></h3><p>⌖ {job.location} · ₫ {salaryLabel(job)}</p></div><Link className="btn btn-primary" href={`/viec-lam/${job.id}`}>Xem chi tiết</Link></div>)}
          </article>
          <aside className="content-card company-general-info"><h2>Thông tin chung</h2><dl><div><dt>⌘ Mã số thuế</dt><dd>{company.maSoThue}</dd></div><div><dt>▦ Lĩnh vực</dt><dd>{company.linhVuc?.tenLinhVuc || "Chưa cập nhật"}</dd></div><div><dt>⌖ Địa chỉ</dt><dd>{company.diaChiTruSo}</dd></div></dl></aside>
        </div>
      </section>
    </SiteShell>
  );
}
