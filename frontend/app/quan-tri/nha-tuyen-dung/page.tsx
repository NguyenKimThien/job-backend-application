'use client';

import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSelect,
  AdminLinkButton,
  AdminSearchInput,
  AdminRowActions,
  AdminStatCard,
  AdminStatsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableSkeleton,
  BadgeTone,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type ApprovalStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'YEU_CAU_BO_SUNG';

type ApiEmployer = {
  id: number;
  tenDonVi: string;
  maSoThue: string;
  nguoiDaiDien?: string | null;
  soDienThoaiLienHe?: string | null;
  ngayTao: string;
  trangThaiDuyet: string;
  linhVucId?: number | null;
  linhVuc?: { id: number; tenLinhVuc: string } | null;
  taiKhoan?: {
    email?: string | null;
    soDienThoai?: string | null;
    trangThaiTaiKhoan?: string;
  };
  _count?: { tinTuyenDungs?: number };
};

type Field = { id: number; tenLinhVuc: string };

type Employer = {
  email: string;
  id: number;
  maSoThue: string;
  ngayTao: string;
  nguoiDaiDien: string;
  soDienThoai: string;
  tenDonVi: string;
  trangThaiDuyet: ApprovalStatus;
  accountStatus: string;
  fieldId: number | null;
  fieldName: string;
  jobCount: number;
};

const statusMeta: Record<ApprovalStatus, { label: string; tone: BadgeTone }> = {
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
  DA_DUYET: { label: 'Đã duyệt', tone: 'success' },
  TU_CHOI: { label: 'Từ chối', tone: 'danger' },
  YEU_CAU_BO_SUNG: { label: 'Cần bổ sung', tone: 'info' },
};

export default function EmployerApprovalListPage() {
  const [items, setItems] = useState<Employer[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadEmployers();
    portalFetch<Field[]>('/fields')
      .then(setFields)
      .catch(() => setFields([]));
  }, []);

  async function loadEmployers() {
    setLoading(true);
    setMessage('');
    try {
      const data = await portalFetch<ApiEmployer[]>('/admin/employers');
      setItems(data.map(fromApi));
    } catch (error) {
      setItems([]);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
    } finally {
      setLoading(false);
    }
  }

  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi-VN');
    return items
      .filter((item) => !status || item.trangThaiDuyet === status)
      .filter((item) => !fieldId || item.fieldId === Number(fieldId))
      .filter((item) => !accountStatus || item.accountStatus === accountStatus)
      .filter((item) => !from || item.ngayTao.slice(0, 10) >= from)
      .filter((item) => !to || item.ngayTao.slice(0, 10) <= to)
      .filter((item) => {
        if (!term) return true;
        return `${item.tenDonVi} ${item.maSoThue} ${item.nguoiDaiDien}`
          .toLocaleLowerCase('vi-VN')
          .includes(term);
      })
      .sort((a, b) =>
        sort === 'oldest'
          ? Date.parse(a.ngayTao) - Date.parse(b.ngayTao)
          : Date.parse(b.ngayTao) - Date.parse(a.ngayTao),
      );
  }, [accountStatus, fieldId, from, items, query, sort, status, to]);

  const hasFilters = Boolean(
    query || status || fieldId || accountStatus || from || to,
  );

  function resetFilters() {
    setSearchInput('');
    setQuery('');
    setStatus('');
    setFieldId('');
    setAccountStatus('');
    setFrom('');
    setTo('');
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  return (
    <SiteShell
      breadcrumb="Trang chủ / Kiểm duyệt nhà tuyển dụng"
      pageClassName="admin-page"
      role="admin"
      subtitle="Xác minh hồ sơ doanh nghiệp trước khi cho phép đăng tin tuyển dụng."
      title="Kiểm duyệt nhà tuyển dụng"
    >
      <section className="container portal-content admin-content">
        <AdminStatsGrid>
          <AdminStatCard
            icon="shield"
            label="Chờ duyệt"
            tone="warning"
            value={countByStatus(items, 'CHO_DUYET')}
          />
          <AdminStatCard
            icon="checkCircle"
            label="Đã duyệt"
            tone="success"
            value={countByStatus(items, 'DA_DUYET')}
          />
          <AdminStatCard
            icon="fileText"
            label="Cần bổ sung"
            tone="info"
            value={countByStatus(items, 'YEU_CAU_BO_SUNG')}
          />
          <AdminStatCard
            icon="building"
            label="Tổng hồ sơ"
            value={items.length}
          />
        </AdminStatsGrid>

        <div className="content-card admin-table-card">
          <form className="admin-search-row" onSubmit={submitSearch}>
            <AdminSearchInput
              label="Tìm hồ sơ nhà tuyển dụng"
              onChange={setSearchInput}
              onClear={() => {
                setSearchInput('');
                setQuery('');
              }}
              placeholder="Tìm tên đơn vị, mã số thuế..."
              value={searchInput}
            />
            <AdminButton icon="search" tone="primary" type="submit">
              Tìm kiếm
            </AdminButton>
          </form>
          <div className="admin-filter-row">
            <AdminFilterSelect
              label="Trạng thái"
              onChange={setStatus}
              options={[
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Chờ duyệt', value: 'CHO_DUYET' },
                { label: 'Đã duyệt', value: 'DA_DUYET' },
                { label: 'Cần bổ sung', value: 'YEU_CAU_BO_SUNG' },
                { label: 'Từ chối', value: 'TU_CHOI' },
              ]}
              value={status}
            />
            <AdminFilterSelect
              label="Lĩnh vực"
              onChange={setFieldId}
              options={[
                { label: 'Tất cả lĩnh vực', value: '' },
                ...fields.map((field) => ({
                  label: field.tenLinhVuc,
                  value: String(field.id),
                })),
              ]}
              value={fieldId}
            />
            <AdminFilterSelect
              label="Tài khoản"
              onChange={setAccountStatus}
              options={[
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Hoạt động', value: 'HOAT_DONG' },
                { label: 'Tạm khóa', value: 'TAM_KHOA' },
                { label: 'Đã khóa', value: 'DA_KHOA' },
                { label: 'Chờ xác thực', value: 'CHO_XAC_THUC_EMAIL' },
              ]}
              value={accountStatus}
            />
            <label className="admin-date-filter">
              <span>Từ ngày</span>
              <input
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                type="date"
                value={from}
              />
            </label>
            <label className="admin-date-filter">
              <span>Đến ngày</span>
              <input
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                type="date"
                value={to}
              />
            </label>
            <AdminFilterSelect
              label="Sắp xếp"
              onChange={setSort}
              options={[
                { label: 'Mới nhất', value: 'newest' },
                { label: 'Cũ nhất', value: 'oldest' },
              ]}
              value={sort}
            />
            {hasFilters && (
              <AdminButton icon="refresh" onClick={resetFilters}>
                Đặt lại
              </AdminButton>
            )}
          </div>

          {message && !loading ? (
            <AdminErrorState
              message={message}
              onRetry={() => {
                void loadEmployers();
              }}
            />
          ) : (
            <AdminTable caption="Danh sách hồ sơ nhà tuyển dụng">
              <thead>
                <tr>
                  <th scope="col">Đơn vị</th>
                  <th scope="col">Mã số thuế</th>
                  <th scope="col">Người đại diện</th>
                  <th scope="col">Lĩnh vực</th>
                  <th scope="col">Tin đã đăng</th>
                  <th scope="col">Ngày đăng ký</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <AdminTableSkeleton columns={8} />}
                {!loading && shown.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <AdminEmptyState
                        action={
                          hasFilters ? (
                            <AdminButton icon="refresh" onClick={resetFilters}>
                              Xóa bộ lọc
                            </AdminButton>
                          ) : undefined
                        }
                        description={
                          hasFilters
                            ? 'Không có hồ sơ phù hợp với bộ lọc hiện tại.'
                            : 'Chưa có hồ sơ nhà tuyển dụng nào.'
                        }
                        icon="building"
                        title={
                          hasFilters
                            ? 'Không tìm thấy dữ liệu phù hợp'
                            : 'Chưa có hồ sơ nhà tuyển dụng'
                        }
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  shown.map((item) => {
                    const status = statusMeta[item.trangThaiDuyet];
                    return (
                      <tr key={item.id}>
                        <td data-label="Đơn vị">
                          <strong>{item.tenDonVi}</strong>
                          <small>
                            {item.email}
                            {item.soDienThoai ? ` · ${item.soDienThoai}` : ''}
                          </small>
                        </td>
                        <td data-label="Mã số thuế">{item.maSoThue}</td>
                        <td data-label="Người đại diện">{item.nguoiDaiDien}</td>
                        <td data-label="Lĩnh vực">{item.fieldName}</td>
                        <td data-label="Tin đã đăng">
                          {item.jobCount.toLocaleString('vi-VN')}
                        </td>
                        <td data-label="Ngày đăng ký">
                          {formatAdminDate(item.ngayTao)}
                        </td>
                        <td data-label="Trạng thái">
                          <AdminStatusBadge tone={status.tone}>
                            {status.label}
                          </AdminStatusBadge>
                        </td>
                        <td data-label="Thao tác">
                          <AdminRowActions
                            actions={[]}
                            label={item.tenDonVi}
                            primary={
                              <AdminLinkButton
                                href={`/quan-tri/nha-tuyen-dung/${item.id}`}
                                icon="eye"
                              >
                                {actionLabel(item.trangThaiDuyet)}
                              </AdminLinkButton>
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </AdminTable>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function fromApi(item: ApiEmployer): Employer {
  return {
    email: item.taiKhoan?.email ?? 'Chưa cập nhật',
    id: item.id,
    maSoThue: item.maSoThue,
    ngayTao: item.ngayTao,
    nguoiDaiDien: item.nguoiDaiDien ?? 'Chưa cập nhật',
    soDienThoai: item.soDienThoaiLienHe ?? item.taiKhoan?.soDienThoai ?? '',
    tenDonVi: item.tenDonVi,
    trangThaiDuyet: normalizeStatus(item.trangThaiDuyet),
    accountStatus: item.taiKhoan?.trangThaiTaiKhoan ?? '',
    fieldId: item.linhVucId ?? item.linhVuc?.id ?? null,
    fieldName: item.linhVuc?.tenLinhVuc ?? 'Chưa cập nhật',
    jobCount: item._count?.tinTuyenDungs ?? 0,
  };
}

function normalizeStatus(value: string): ApprovalStatus {
  if (
    value === 'DA_DUYET' ||
    value === 'TU_CHOI' ||
    value === 'YEU_CAU_BO_SUNG'
  ) {
    return value;
  }
  return 'CHO_DUYET';
}

function countByStatus(items: Employer[], status: ApprovalStatus) {
  return items.filter((item) => item.trangThaiDuyet === status).length;
}

function actionLabel(status: ApprovalStatus) {
  if (status === 'CHO_DUYET') return 'Kiểm duyệt';
  if (status === 'YEU_CAU_BO_SUNG') return 'Xem yêu cầu';
  return 'Xem hồ sơ';
}
