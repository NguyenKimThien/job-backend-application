"use client";
import SiteShell from "@/components/SiteShell";
import { BACKEND_API_URL, getApiMessage } from "@/lib/backend-api";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function CategoriesPage() {
  const [items,setItems]=useState<any[]>([]); const [message,setMessage]=useState("");
  useEffect(()=>{fetch(`${BACKEND_API_URL}/categories`).then(async r=>{const p=await r.json();if(!r.ok)throw new Error(getApiMessage(p,"Không thể tải ngành nghề."));return p.data}).then(setItems).catch(e=>setMessage(e.message))},[]);
  return <SiteShell title="Danh sách ngành nghề" subtitle="Chọn lĩnh vực phù hợp để xem toàn bộ việc làm đang tuyển."><section className="container category-directory-content">
    {message&&<div className="form-message error">{message}</div>}
    <div className="category-directory-heading"><div><h2>Tất cả ngành nghề</h2><p>Tìm thấy {items.length} nhóm ngành.</p></div><Link href="/viec-lam">Xem tất cả việc làm →</Link></div>
    <div className="category-directory-grid">{items.map(x=><Link className="category-directory-card" href={`/viec-lam?nganh=${encodeURIComponent(x.name)}`} key={x.id}><span className="category-icon blue">💼</span><span><strong>{x.name}</strong><small>{x.jobCount??0} việc làm</small><p>{x.description||"Các cơ hội việc làm thuộc ngành nghề này."}</p></span><b>→</b></Link>)}</div>
  </section></SiteShell>
}
