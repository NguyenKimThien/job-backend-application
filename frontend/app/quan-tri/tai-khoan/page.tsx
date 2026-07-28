'use client';

import {
  AdminButton,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSelect,
  AdminLinkButton,
  AdminPagination,
  AdminRowActions,
  AdminSearchInput,
  AdminStatCard,
  AdminStatsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableSkeleton,
  AdminToolbar,
  AdminToolbarGroup,
  BadgeTone,
  ConfirmDialogState,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Role = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG' | 'QUAN_TRI_VIEN';
type Status = 'CHO_XAC_THUC_EMAIL' | 'HOAT_DONG' | 'TAM_KHOA' | 'DA_KHOA';

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
type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
type AccountListData = {
  items: Account[];
  summary: Summary;
  pagination: Pagination;
};

type ConfirmState = ConfirmDialogState & {
  account: Account;
  nextStatus: Status;
};

const roleLabels: Record<Role, string> = {
  NGUOI_LAO_DONG: 'Người lao động',
  NHA_TUYEN_DUNG: 'Nhà tuyển dụng',
  QUAN_TRI_VIEN: 'Quản trị viên',
};

const statusMeta: Record<Status, { label: string; tone: BadgeTone }> = {
  CHO_XAC_THUC_EMAIL: { label: 'Chờ xác thực', tone: 'warning' },
  HOAT_DONG: { label: 'Hoạt động', tone: 'success' },
  TAM_KHOA: { label: 'Tạm khóa', tone: 'warning' },
  DA_KHOA: { label: 'Đã khóa', tone: 'danger' },
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
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>(
    'success',
  );
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (status) params.set('status', status);

    try {
      const data = await portalFetch<AccountListData>(`/admin/users?${params}`);
      setItems(data.items);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (error) {
      setItems([]);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, role, search, status]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPagination((value) => ({ ...value, page: 1 }));
    setSearch(query.trim());
  }

  function resetFilters() {
    setQuery('');
    setSearch('');
    setRole('');
    setStatus('');
    setPagination((value) => ({ ...value, page: 1 }));
  }

  function requestStatusChange(account: Account, nextStatus: Status) {
    const actionLabel =
      nextStatus === 'HOAT_DONG'
        ? 'mở khóa'
        : nextStatus === 'TAM_KHOA'
          ? 'tạm khóa'
          : 'khóa';
    setConfirm({
      account,
      confirmLabel:
        nextStatus === 'HOAT_DONG'
          ? 'Xác nhận mở khóa'
          : nextStatus === 'TAM_KHOA'
            ? 'Xác nhận tạm khóa'
            : 'Xác nhận khóa',
      description:
        nextStatus === 'HOAT_DONG'
          ? 'Tài khoản sẽ có thể đăng nhập và sử dụng lại các chức năng phù hợp.'
          : 'Người dùng sẽ không thể sử dụng các chức năng yêu cầu tài khoản hoạt động.',
      nextStatus,
      title: `${capitalize(actionLabel)} tài khoản ${account.tenHienThi}?`,
      tone: nextStatus === 'HOAT_DONG' ? 'default' : 'danger',
    });
  }

  async function confirmStatusChange() {
    if (!confirm || saving) return;
    setSaving(true);
    setMessage('');

    try {
      await portalFetch(`/admin/users/${confirm.account.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: confirm.nextStatus }),
      });
      setMessage('Cập nhật tài khoản thành công.');
      setMessageType('success');
      setConfirm(null);
      await loadAccounts();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật tài khoản.',
      );
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  const hasFilters = Boolean(search || role || status);

  return (
    <SiteShell
      breadcrumb="Trang chủ / Quản lý tài khoản"
      pageClassName="admin-page"
      role="admin"
      subtitle="Tra cứu và kiểm soát trạng thái tài khoản người dùng."
      title="Quản lý tài khoản"
    >
      <section className="container portal-content admin-content">
        <AdminStatsGrid>
          <AdminStatCard
            icon="users"
            label="Tổng tài khoản"
            value={summary.total}
          />
          <AdminStatCard
            icon="checkCircle"
            label="Đang hoạt động"
            tone="success"
            value={summary.HOAT_DONG}
          />
          <AdminStatCard
            icon="shield"
            label="Chờ xác thực"
            tone="warning"
            value={summary.CHO_XAC_THUC_EMAIL}
          />
          <AdminStatCard
            icon="lock"
            label="Đang bị khóa"
            tone="danger"
            value={summary.TAM_KHOA + summary.DA_KHOA}
          />
        </AdminStatsGrid>

        <div className="content-card admin-table-card">
          <form onSubmit={submitSearch}>
            <AdminToolbar>
              <AdminToolbarGroup>
                <AdminSearchInput
                  label="Tìm tài khoản"
                  onChange={setQuery}
                  onClear={() => {
                    setQuery('');
                    setSearch('');
                    setPagination((value) => ({ ...value, page: 1 }));
                  }}
                  placeholder="Tìm tên, email, số điện thoại..."
                  value={query}
                />
                <AdminButton icon="search" tone="primary" type="submit">
                  Tìm kiếm
                </AdminButton>
              </AdminToolbarGroup>
              <AdminToolbarGroup>
                <AdminFilterSelect
                  label="Vai trò"
                  onChange={(value) => {
                    setRole(value);
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  options={[
                    { label: 'Tất cả vai trò', value: '' },
                    { label: 'Người lao động', value: 'NGUOI_LAO_DONG' },
                    { label: 'Nhà tuyển dụng', value: 'NHA_TUYEN_DUNG' },
                  ]}
                  value={role}
                />
                <AdminFilterSelect
                  label="Trạng thái"
                  onChange={(value) => {
                    setStatus(value);
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  options={[
                    { label: 'Tất cả trạng thái', value: '' },
                    { label: 'Hoạt động', value: 'HOAT_DONG' },
                    { label: 'Chờ xác thực', value: 'CHO_XAC_THUC_EMAIL' },
                    { label: 'Tạm khóa', value: 'TAM_KHOA' },
                    { label: 'Đã khóa', value: 'DA_KHOA' },
                  ]}
                  value={status}
                />
                {hasFilters && (
                  <AdminButton icon="refresh" onClick={resetFilters}>
                    Đặt lại
                  </AdminButton>
                )}
              </AdminToolbarGroup>
            </AdminToolbar>
          </form>

          {message && (
            <div
              className={`admin-inline-message ${messageType}`}
              role="status"
            >
              {message}
            </div>
          )}

          {messageType === 'error' && !loading && !items.length ? (
            <AdminErrorState
              message={message}
              onRetry={() => {
                void loadAccounts();
              }}
            />
          ) : (
            <AdminTable caption="Danh sách tài khoản">
              <thead>
                <tr>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <AdminTableSkeleton columns={5} />}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5}>
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
                            ? 'Không tìm thấy tài khoản phù hợp với điều kiện hiện tại.'
                            : 'Chưa có tài khoản nào trong hệ thống.'
                        }
                        icon="users"
                        title={
                          hasFilters
                            ? 'Không tìm thấy dữ liệu phù hợp'
                            : 'Chưa có tài khoản nào'
                        }
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((item) => {
                    const status = statusMeta[item.trangThaiTaiKhoan];
                    const menuActions = accountActions(
                      item,
                      requestStatusChange,
                    );

                    return (
                      <tr key={item.id}>
                        <td data-label="Tài khoản">
                          <strong>{item.tenHienThi}</strong>
                          <small>
                            {item.email}
                            {item.soDienThoai ? ` · ${item.soDienThoai}` : ''}
                            {' · '}@{item.tenDangNhap}
                          </small>
                        </td>
                        <td data-label="Vai trò">{roleLabels[item.vaiTro]}</td>
                        <td data-label="Ngày tạo">
                          {formatAdminDate(item.ngayTao)}
                        </td>
                        <td data-label="Trạng thái">
                          <AdminStatusBadge tone={status.tone}>
                            {status.label}
                          </AdminStatusBadge>
                        </td>
                        <td data-label="Thao tác">
                          <AdminRowActions
                            actions={menuActions}
                            label={item.tenHienThi}
                            primary={
                              <AdminLinkButton
                                href={`/quan-tri/tai-khoan/${item.id}`}
                                icon="eye"
                              >
                                Xem chi tiết
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

          <AdminPagination
            currentPage={pagination.page}
            onPageChange={(page) =>
              setPagination((value) => ({ ...value, page }))
            }
            pageCount={pagination.totalPages}
            total={pagination.total}
          />
        </div>
      </section>

      {confirm && (
        <AdminConfirmDialog
          confirmLabel={confirm.confirmLabel}
          description={confirm.description}
          isLoading={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            void confirmStatusChange();
          }}
          title={confirm.title}
          tone={confirm.tone}
        />
      )}
    </SiteShell>
  );
}

function accountActions(
  item: Account,
  requestStatusChange: (account: Account, nextStatus: Status) => void,
) {
  if (item.trangThaiTaiKhoan === 'HOAT_DONG') {
    return [
      {
        label: 'Tạm khóa',
        onSelect: () => requestStatusChange(item, 'TAM_KHOA'),
        tone: 'danger' as const,
      },
      {
        label: 'Khóa tài khoản',
        onSelect: () => requestStatusChange(item, 'DA_KHOA'),
        tone: 'danger' as const,
      },
    ];
  }

  if (item.trangThaiTaiKhoan === 'TAM_KHOA') {
    return [
      {
        label: 'Mở khóa',
        onSelect: () => requestStatusChange(item, 'HOAT_DONG'),
      },
      {
        label: 'Khóa tài khoản',
        onSelect: () => requestStatusChange(item, 'DA_KHOA'),
        tone: 'danger' as const,
      },
    ];
  }

  if (item.trangThaiTaiKhoan === 'DA_KHOA') {
    return [
      {
        label: 'Mở khóa',
        onSelect: () => requestStatusChange(item, 'HOAT_DONG'),
      },
    ];
  }

  return [
    {
      label: 'Kích hoạt tài khoản',
      onSelect: () => requestStatusChange(item, 'HOAT_DONG'),
    },
    {
      label: 'Khóa tài khoản',
      onSelect: () => requestStatusChange(item, 'DA_KHOA'),
      tone: 'danger' as const,
    },
  ];
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase('vi-VN') + value.slice(1);
}
