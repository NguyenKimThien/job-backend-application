"use client";
import SiteShell from "@/components/SiteShell";
import { portalFetch } from "@/lib/portal-api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
const labels: Record<string,string> = { DA_NOP:"Đang chờ", DA_XEM:"Đã xem", DUOC_CHON_SO_BO:"Sơ bộ", MOI_PHONG_VAN:"Phỏng vấn", DA_PHONG_VAN:"Đã phỏng vấn", TRUNG_TUYEN:"Trúng tuyển", KHONG_PHU_HOP:"Từ chối", DA_RUT:"Đã rút" };
export default function AppliedJobsPage() {
  const [items,setItems]=useState<any[]>([]); const [filter,setFilter]=useState("Tất cả"); const [query,setQuery]=useState(""); const [message,setMessage]=useState("");
  useEffect(()=>{ portalFetch<any[]>("/worker/applications").then(setItems).catch(e=>setMessage(e.message)); },[]);
  const shown=useMemo(()=>items.filter(x=>{const s=labels[x.trangThaiHienTai]??x.trangThaiHienTai; return (filter==="Tất cả"||s===filter)&&`${x.job.title} ${x.job.company}`.toLowerCase().includes(query.toLowerCase());}),[items,filter,query]);
  return <SiteShell title="Việc làm đã ứng tuyển" subtitle="Theo dõi tiến trình xử lý hồ sơ theo thời gian thực."><section className="container portal-content">
    {message&&<div className="form-message error">{message}</div>}
    <div className="summary-grid compact"><div className="summary-card"><span>📄</span><div><b>{items.length}</b><small>Tổng hồ sơ</small></div></div></div>
    <div className="content-card table-card"><div className="table-toolbar"><div className="filter-tabs">{["Tất cả","Đang chờ","Phỏng vấn","Đã duyệt","Từ chối"].map(x=><button className={filter===x?"active":""} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><input className="table-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên công việc..." /></div>
    <div className="responsive-table"><table><thead><tr><th>Tên công việc</th><th>Công ty</th><th>Ngày nộp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{shown.map(x=><tr key={x.id}><td><strong>{x.job.title}</strong><small>{x.job.location}</small></td><td>{x.job.company}</td><td>{new Date(x.ngayNop).toLocaleDateString("vi-VN")}</td><td><span className="status info">{labels[x.trangThaiHienTai]??x.trangThaiHienTai}</span></td><td><Link className="table-link" href={`/viec-lam/${x.job.id}`}>Xem chi tiết</Link></td></tr>)}</tbody></table>{!shown.length&&<div className="empty-state"><h3>Không có hồ sơ phù hợp</h3></div>}</div></div>
  </section></SiteShell>;
}
