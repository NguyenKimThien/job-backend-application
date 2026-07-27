"use client";

import SiteShell from "@/components/SiteShell";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { portalFetch } from "@/lib/portal-api";

type Category = { ma_danh_muc: number; ten_nghe: string; mo_ta: string; trang_thai_hien_thi: boolean; ngay_cap_nhat?: string };
type ApiCategory = { id: number; name: string; description: string | null; visible: boolean; updatedAt?: string };
const fromApi = (item: ApiCategory): Category => ({
  ma_danh_muc: item.id,
  ten_nghe: item.name,
  mo_ta: item.description ?? "",
  trang_thai_hien_thi: item.visible,
  ngay_cap_nhat: item.updatedAt,
});

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [query, setQuery] = useState("");
  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    if (!term) return items;
    return items.filter((item) =>
      `${item.ten_nghe} ${item.mo_ta ?? ""}`.toLocaleLowerCase("vi").includes(term),
    );
  }, [items, query]);

  useEffect(() => {
    portalFetch<ApiCategory[]>("/admin/categories")
      .then((data) => setItems(data.map(fromApi)))
      .catch((error) => { setMessage(error.message); setMessageType("error"); });
  }, []);
  function open(item?: Category) { setEditing(item ?? null); setName(item?.ten_nghe ?? ""); setDescription(item?.mo_ta ?? ""); setMessage(""); }
  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await portalFetch<ApiCategory>(editing ? `/admin/categories/${editing.ma_danh_muc}` : "/admin/categories", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name, description, visible: editing?.trang_thai_hien_thi ?? true }),
      });
      const category = fromApi(data);
      setMessage(editing ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
      setMessageType("success");
      setItems((list) => editing ? list.map((x) => x.ma_danh_muc === editing.ma_danh_muc ? category : x) : [...list, category]);
      setEditing(null);
      setName("");
      setDescription("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu danh mục.");
      setMessageType("error");
    }
  }
  async function toggle(item: Category) {
    const local = { ...item, trang_thai_hien_thi: !item.trang_thai_hien_thi };
    setItems((list) => list.map((x) => x.ma_danh_muc === item.ma_danh_muc ? local : x));
    await portalFetch(`/admin/categories/${item.ma_danh_muc}`, { method: "PATCH", body: JSON.stringify({ name: item.ten_nghe, description: item.mo_ta, visible: local.trang_thai_hien_thi }) });
  }

  async function remove(item: Category) {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục “${item.ten_nghe}”?`)) return;
    try {
      await portalFetch(`/admin/categories/${item.ma_danh_muc}`, { method: "DELETE" });
      setMessage("Đã xóa danh mục.");
      setMessageType("success");
      setItems((list) => list.filter((x) => x.ma_danh_muc !== item.ma_danh_muc));
      if (editing?.ma_danh_muc === item.ma_danh_muc) open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa danh mục.");
      setMessageType("error");
    }
  }

  return (
    <SiteShell role="admin" title="Quản lý danh mục nghề" subtitle="Thêm, sửa, xóa và tìm kiếm danh mục dùng chung trên hệ thống.">
      <section className="container portal-content category-admin-layout">
        <div className="content-card table-card"><div className="table-toolbar"><input className="table-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên nghề hoặc mô tả..." /><span className="record-count">{filteredItems.length}/{items.length} danh mục</span></div><div className="responsive-table"><table><thead><tr><th>Mã</th><th>Tên nghề</th><th>Mô tả</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filteredItems.map((item) => <tr key={item.ma_danh_muc}><td>DM{String(item.ma_danh_muc).padStart(3, "0")}</td><td><strong>{item.ten_nghe}</strong></td><td>{item.mo_ta}</td><td><span className={`status ${item.trang_thai_hien_thi ? "success" : "neutral"}`}>{item.trang_thai_hien_thi ? "Đang hiển thị" : "Đã ẩn"}</span></td><td><button className="table-link" onClick={() => open(item)}>Sửa</button><button className="table-link" onClick={() => toggle(item)}>{item.trang_thai_hien_thi ? "Ẩn" : "Hiện"}</button><button className="table-link danger-text" onClick={() => remove(item)}>Xóa</button></td></tr>)}</tbody></table>{!filteredItems.length && <div className="empty-state"><span>⌕</span><h3>Không tìm thấy danh mục</h3><p>Thử nhập tên hoặc mô tả khác.</p></div>}</div></div>
        <form className="content-card category-form" onSubmit={save}><h2>{editing ? "Cập nhật danh mục nghề" : "Thêm nghề mới"}</h2><p>Danh mục đang được dữ liệu khác sử dụng sẽ không thể xóa để bảo vệ liên kết.</p>{message && <div className={`form-message ${messageType}`}>{message}</div>}<label className="form-group"><span>Tên nghề *</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="form-group"><span>Mô tả</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label><div className="form-footer"><button type="button" className="btn btn-ghost" onClick={() => open()}>Làm mới</button><button className="btn btn-primary">{editing ? "Lưu cập nhật" : "Thêm danh mục"}</button></div></form>
      </section>
    </SiteShell>
  );
}
