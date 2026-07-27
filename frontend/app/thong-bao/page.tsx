"use client";
import SiteShell from "@/components/SiteShell";
import { portalFetch } from "@/lib/portal-api";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
export default function NotificationsPage(){return <Suspense fallback={<div>Đang tải...</div>}><Content/></Suspense>}
function Content(){
 const q=useSearchParams(); const role=(q.get("role")==="admin"?"admin":q.get("role")==="employer"?"employer":"worker") as "admin"|"employer"|"worker"; const [items,setItems]=useState<any[]>([]); const [message,setMessage]=useState("");
 useEffect(()=>{portalFetch<any[]>("/notifications").then(setItems).catch(e=>setMessage(e.message));},[]);
 async function read(id:number){try{await portalFetch(`/notifications/${id}/read`,{method:"PATCH"});setItems(v=>v.map(x=>x.id===id?{...x,daDoc:true}:x));}catch{}}
 return <SiteShell role={role} title="Thông báo" subtitle="Thông báo riêng theo tài khoản và vai trò đang đăng nhập."><section className="container portal-content"><div className="content-card notification-list"><div className="notification-list-head"><div><h2>Tất cả thông báo</h2><p>{items.filter(x=>!x.daDoc).length} thông báo chưa đọc</p></div></div>{message&&<div className="form-message error">{message}</div>}{items.map(x=><article className={!x.daDoc?"notification-item unread":"notification-item"} key={x.id} onClick={()=>read(x.id)}><span className="notification-icon">🔔</span><div><small>{x.loaiThongBao} · {new Date(x.ngayTao).toLocaleString("vi-VN")}</small><h3>{x.tieuDe}</h3><p>{x.noiDung}</p></div>{!x.daDoc&&<i/>}</article>)}{!items.length&&!message&&<div className="empty-state"><h3>Chưa có thông báo</h3></div>}</div></section></SiteShell>
}
