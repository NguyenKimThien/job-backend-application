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
  AdminToolbar,
  AdminToolbarGroup,
  BadgeTone,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { useEffect, useMemo, useState } from 'react';

type ApprovalStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'YEU_CAU_BO_SUNG';

type ApiEmployer = {
  id: number;
  tenDonVi: string;
  maSoThue: string;
  nguoiDaiDien?: string | null;
  soDienThoaiLienHe?: string | null;
  ngayTao: string;
  trangThaiDuyet: string;
  taiKhoan?: { email?: string | null; soDienThoai?: string | null };
};

type Employer = {
  email: string;
  id: number;
  maSoThue: string;
  ngayTao: string;
  nguoiDaiDien: string;
  soDienThoai: string;
  tenDonVi: string;
  trangThaiDuyet: ApprovalStatus;
};

const statusMeta: Record<ApprovalStatus, { label: string; tone: BadgeTone }> = {
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
  DA_DUYET: { label: 'Đã duyệt', tone: 'success' },
  TU_CHOI: { label: 'Từ chối', tone: 'danger' },
  YEU_CAU_BO_SUNG: { label: 'Cần bổ sung', tone: 'info' },
};

export default function EmployerApprovalListPage() {
  const [items, setItems] = useState<Employer[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadEmployers();
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
  }, [items, query, sort, status]);

  const hasFilters = Boolean(query || status);

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
          <AdminToolbar>
            <AdminToolbarGroup>
              <AdminSearchInput
                label="Tìm hồ sơ nhà tuyển dụng"
                onChange={setQuery}
                onClear={() => setQuery('')}
                placeholder="Tìm tên đơn vị, mã số thuế..."
                value={query}
              />
            </AdminToolbarGroup>
            <AdminToolbarGroup>
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
                label="Sắp xếp"
                onChange={setSort}
                options={[
                  { label: 'Mới nhất', value: 'newest' },
                  { label: 'Cũ nhất', value: 'oldest' },
                ]}
                value={sort}
              />
              {hasFilters && (
                <AdminButton
                  icon="refresh"
                  onClick={() => {
                    setQuery('');
                    setStatus('');
                  }}
                >
                  Đặt lại
                </AdminButton>
              )}
            </AdminToolbarGroup>
          </AdminToolbar>

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
                  <th scope="col">Ngày đăng ký</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <AdminTableSkeleton columns={6} />}
                {!loading && shown.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <AdminEmptyState
                        action={
                          hasFilters ? (
                            <AdminButton
                              icon="refresh"
                              onClick={() => {
                                setQuery('');
                                setStatus('');
                              }}
                            >
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
