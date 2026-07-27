"use client";
import SiteShell from "@/components/SiteShell";
import { portalFetch } from "@/lib/portal-api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
const label: Record<string,string> = { DA_NOP:"Đợi đọc", DA_XEM:"Đã xem", MOI_PHONG_VAN:"Phỏng vấn", TRUNG_TUYEN:"Đã duyệt", KHONG_PHU_HOP:"Từ chối" };
export default function Page(){
 const {jobId}=useParams<{jobId:string}>(); const [items,setItems]=useState<any[]>([]); const [message,setMessage]=useState("");
 useEffect(()=>{portalFetch<any[]>(`/employer/jobs/${jobId}/applicants`).then(setItems).catch(e=>setMessage(e.message))},[jobId]);
 async function update(id:number,status:string){try{await portalFetch(`/employer/jobs/${jobId}/applicants/${id}/status`,{method:"PATCH",body:JSON.stringify({status})});setItems(v=>v.map(x=>x.id===id?{...x,trangThaiHienTai:status}:x))}catch(e){setMessage(e instanceof Error?e.message:"Không thể cập nhật.")}}
 return <SiteShell role="employer" title="Ứng viên đã ứng tuyển" action={<Link className="btn btn-light" href="/nha-tuyen-dung/tin-tuyen-dung">← Quay lại</Link>}><section className="container portal-content">{message&&<div className="form-message error">{message}</div>}<div className="content-card table-card"><div className="responsive-table"><table><thead><tr><th>Ứng viên</th><th>Ngày nộp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>{x.hoSoNguoiLaoDong.hoTen}</strong><small>{x.tepCvSnapshotUrl||"Chưa có CV"}</small></td><td>{new Date(x.ngayNop).toLocaleDateString("vi-VN")}</td><td>{label[x.trangThaiHienTai]??x.trangThaiHienTai}</td><td><Link className="table-link" href={`/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien/${x.id}`}>Chi tiết</Link><button className="table-link" onClick={()=>update(x.id,"MOI_PHONG_VAN")}>Phỏng vấn</button><button className="table-link danger-text" onClick={()=>update(x.id,"KHONG_PHU_HOP")}>Từ chối</button></td></tr>)}</tbody></table>{!items.length&&<div className="empty-state"><h3>Chưa có ứng viên</h3></div>}</div></div></section></SiteShell>
}
