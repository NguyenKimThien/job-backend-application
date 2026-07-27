"use client";

import SiteShell from "@/components/SiteShell";
import {
  BACKEND_API_URL,
  getApiMessage,
  getAuthHeaders,
} from "@/lib/backend-api";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Role = "NGUOI_LAO_DONG" | "NHA_TUYEN_DUNG" | "QUAN_TRI_VIEN";
type Status = "CHO_XAC_THUC_EMAIL" | "HOAT_DONG" | "TAM_KHOA" | "DA_KHOA";
type Account = {
  id: number;
  tenDangNhap: string;
  tenHienThi: string;
  email: string;
  soDienThoai: string | null;
  vaiTro: Role;
  trangThaiTaiKhoan: Status;
  ngayTao: string;
};
type Summary = Record<Status, number> & { total: number };
type Pagination = { page: number; limit: number; total: number; totalPages: number };

const roleLabels: Record<Role, string> = {
  NGUOI_LAO_DONG: "Người lao động",
  NHA_TUYEN_DUNG: "Nhà tuyển dụng",
  QUAN_TRI_VIEN: "Quản trị viên",
};
const statusLabels: Record<Status, string> = {
  CHO_XAC_THUC_EMAIL: "Chờ xác thực",
  HOAT_DONG: "Hoạt động",
  TAM_KHOA: "Tạm khóa",
  DA_KHOA: "Đã khóa",
};
const emptySummary: Summary = {
  total: 0,
  CHO_XAC_THUC_EMAIL: 0,
  HOAT_DONG: 0,
  TAM_KHOA: 0,
  DA_KHOA: 0,
};

export default function AccountManagementPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`${BACKEND_API_URL}/admin/users?${params}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(getApiMessage(payload, "Không thể tải danh sách tài khoản."));
      }
      setItems(payload.data.items);
      setSummary(payload.data.summary);
      setPagination(payload.data.pagination);
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, role, search, status]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function updateStatus(id: number, nextStatus: Status) {
    const action = nextStatus === "HOAT_DONG" ? "mở khóa" : nextStatus === "TAM_KHOA" ? "tạm khóa" : "khóa";
    if (!window.confirm(`Bạn chắc chắn muốn ${action} tài khoản này?`)) return;
    setMessage("");
    try {
      const response = await fetch(`${BACKEND_API_URL}/admin/users/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getApiMessage(payload, "Cập nhật thất bại."));
      setMessage(payload.message ?? "Cập nhật tài khoản thành công.");
      await loadAccounts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPagination((value) => ({ ...value, page: 1 }));
    setSearch(query.trim());
  }

  return (
    <SiteShell role="admin" title="Quản lý tài khoản" subtitle="Tra cứu, xem chi tiết và kiểm soát quyền truy cập người dùng.">
      <section className="container portal-content">
        <div className="summary-grid compact">
          <div className="summary-card"><span>👥</span><div><b>{summary.total}</b><small>Tổng tài khoản</small></div></div>
          <div className="summary-card"><span>✓</span><div><b>{summary.HOAT_DONG}</b><small>Đang hoạt động</small></div></div>
          <div className="summary-card"><span>⏳</span><div><b>{summary.CHO_XAC_THUC_EMAIL}</b><small>Chờ xác thực</small></div></div>
          <div className="summary-card"><span>🔒</span><div><b>{summary.TAM_KHOA + summary.DA_KHOA}</b><small>Đang bị khóa</small></div></div>
        </div>

        <div className="content-card table-card">
          <form className="table-toolbar user-toolbar" onSubmit={submitSearch}>
            <input className="table-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, email, số điện thoại..." />
            <button className="btn primary small-btn" type="submit">Tìm kiếm</button>
            <select className="filter-select" value={role} onChange={(event) => { setRole(event.target.value); setPagination((value) => ({ ...value, page: 1 })); }}>
              <option value="">Tất cả vai trò</option>
              <option value="NGUOI_LAO_DONG">Người lao động</option>
              <option value="NHA_TUYEN_DUNG">Nhà tuyển dụng</option>
            </select>
            <select className="filter-select second-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPagination((value) => ({ ...value, page: 1 })); }}>
              <option value="">Tất cả trạng thái</option>
              <option value="HOAT_DONG">Hoạt động</option>
              <option value="CHO_XAC_THUC_EMAIL">Chờ xác thực</option>
              <option value="TAM_KHOA">Tạm khóa</option>
              <option value="DA_KHOA">Đã khóa</option>
            </select>
          </form>

          {message && <div className="admin-message">{message}</div>}
          <div className="responsive-table">
            <table>
              <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="table-state">Đang tải dữ liệu...</td></tr>}
                {!loading && items.length === 0 && <tr><td colSpan={5} className="table-state">Không tìm thấy tài khoản phù hợp.</td></tr>}
                {!loading && items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.tenHienThi}</strong><small>{item.email} · @{item.tenDangNhap}</small></td>
                    <td>{roleLabels[item.vaiTro]}</td>
                    <td>{new Intl.DateTimeFormat("vi-VN").format(new Date(item.ngayTao))}</td>
                    <td><span className={`status ${item.trangThaiTaiKhoan === "HOAT_DONG" ? "success" : item.trangThaiTaiKhoan === "CHO_XAC_THUC_EMAIL" ? "warning" : "danger"}`}>{statusLabels[item.trangThaiTaiKhoan]}</span></td>
                    <td className="account-actions">
                      <Link className="table-link" href={`/quan-tri/tai-khoan/${item.id}`}>Chi tiết</Link>
                      {item.trangThaiTaiKhoan === "HOAT_DONG" ? <>
                        <button className="table-link warning-text" onClick={() => updateStatus(item.id, "TAM_KHOA")}>Tạm khóa</button>
                        <button className="table-link danger-text" onClick={() => updateStatus(item.id, "DA_KHOA")}>Khóa</button>
                      </> : <button className="table-link success-text" onClick={() => updateStatus(item.id, "HOAT_DONG")}>Mở khóa</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-pagination">
            <span>Hiển thị {items.length}/{pagination.total} tài khoản</span>
            <div>
              <button disabled={pagination.page <= 1} onClick={() => setPagination((value) => ({ ...value, page: value.page - 1 }))}>← Trước</button>
              <b>Trang {pagination.page}/{pagination.totalPages}</b>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((value) => ({ ...value, page: value.page + 1 }))}>Sau →</button>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
