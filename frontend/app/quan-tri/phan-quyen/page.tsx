'use client';

import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSelect,
  AdminIcon,
  AdminPagination,
  AdminSearchInput,
  AdminStatusBadge,
  AdminTable,
  AdminTableSkeleton,
  BadgeTone,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Role = 'NGUOI_LAO_DONG' | 'NHA_TUYEN_DUNG';
type Status = 'CHO_XAC_THUC_EMAIL' | 'HOAT_DONG' | 'TAM_KHOA' | 'DA_KHOA';

type Account = {
  id: number;
  tenDangNhap: string;
  tenHienThi?: string | null;
  email: string;
  vaiTro: Role;
  trangThaiTaiKhoan: Status;
};

type PermissionItem = {
  code: string;
  action: string;
  allowed: boolean;
  inherited: boolean;
};

type AccountDetail = Account & {
  hoSoNguoiLaoDong?: { hoTen?: string | null } | null;
  hoSoNhaTuyenDung?: { tenDonVi?: string | null } | null;
  permissionGroups: Array<{
    resource: string;
    permissions: PermissionItem[];
  }>;
};

type ListData = {
  items: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const roleLabels: Record<Role, string> = {
  NGUOI_LAO_DONG: 'Người lao động',
  NHA_TUYEN_DUNG: 'Nhà tuyển dụng',
};

const statusMeta: Record<Status, { label: string; tone: BadgeTone }> = {
  CHO_XAC_THUC_EMAIL: { label: 'Chờ xác thực', tone: 'warning' },
  HOAT_DONG: { label: 'Hoạt động', tone: 'success' },
  TAM_KHOA: { label: 'Tạm khóa', tone: 'warning' },
  DA_KHOA: { label: 'Đã khóa', tone: 'danger' },
};

function accountDisplayName(account: Account | AccountDetail) {
  const detail = account as AccountDetail;
  return (
    account.tenHienThi?.trim() ||
    detail.hoSoNguoiLaoDong?.hoTen?.trim() ||
    detail.hoSoNhaTuyenDung?.tenDonVi?.trim() ||
    account.tenDangNhap?.trim() ||
    account.email?.trim() ||
    `Tài khoản #${account.id}`
  );
}

export default function PermissionManagementPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState<AccountDetail | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialAccountId, setInitialAccountId] = useState<number | null>(null);
  const selectedDisplayName = selected ? accountDisplayName(selected) : '';

  useEffect(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get('taiKhoan'),
    );
    if (Number.isInteger(value) && value > 0) setInitialAccountId(value);
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (search) params.set('search', search);
    if (role) params.set('role', role);

    try {
      const data = await portalFetch<ListData>(`/admin/users?${params}`);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      setItems([]);
      setListError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách tài khoản.',
      );
    } finally {
      setLoadingList(false);
    }
  }, [pagination.limit, pagination.page, role, search]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!initialAccountId) return;
    void selectAccount(initialAccountId);
    setInitialAccountId(null);
  }, [initialAccountId]);

  async function selectAccount(id: number) {
    setLoadingDetail(true);
    setDetailError('');
    setMessage('');
    try {
      const data = await portalFetch<AccountDetail>(`/admin/users/${id}`);
      setSelected(data);
      setPermissions(
        Object.fromEntries(
          data.permissionGroups.flatMap((group) =>
            group.permissions.map((permission) => [
              permission.code,
              permission.allowed,
            ]),
          ),
        ),
      );
      window.history.replaceState(
        {},
        '',
        `/quan-tri/phan-quyen?taiKhoan=${id}`,
      );
    } catch (error) {
      setSelected(null);
      setDetailError(
        error instanceof Error
          ? error.message
          : 'Không thể tải thông tin phân quyền.',
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPagination((current) => ({ ...current, page: 1 }));
    setSearch(query.trim());
  }

  function toggleGroup(group: AccountDetail['permissionGroups'][number]) {
    const shouldEnable = group.permissions.some(
      (permission) => !permissions[permission.code],
    );
    setPermissions((current) => ({
      ...current,
      ...Object.fromEntries(
        group.permissions.map((permission) => [permission.code, shouldEnable]),
      ),
    }));
  }

  function setAllPermissions(allowed: boolean) {
    if (!selected) return;
    setPermissions(
      Object.fromEntries(
        selected.permissionGroups.flatMap((group) =>
          group.permissions.map((permission) => [permission.code, allowed]),
        ),
      ),
    );
  }

  async function savePermissions() {
    if (!selected || saving) return;
    setSaving(true);
    setMessage('');
    try {
      await portalFetch(`/admin/users/${selected.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({
          permissions: Object.entries(permissions).map(([code, allowed]) => ({
            code,
            allowed,
          })),
        }),
      });
      setMessage('Đã lưu quyền truy cập cho tài khoản thành công.');
      await selectAccount(selected.id);
      setMessage('Đã lưu quyền truy cập cho tài khoản thành công.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể lưu phân quyền.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteShell
      breadcrumb="Trang chủ / Phân quyền người dùng"
      pageClassName="admin-page"
      role="admin"
      subtitle="Cấp hoặc giới hạn quyền xem, thêm, sửa và xóa theo từng tài khoản."
      title="Phân quyền người dùng"
    >
      <section className="container portal-content admin-content">
        <div className="permission-admin-layout">
          <article className="content-card admin-table-card permission-account-panel">
            <header className="permission-panel-head">
              <div>
                <h2>Chọn tài khoản</h2>
                <p>Vai trò và hồ sơ người dùng sẽ không bị thay đổi.</p>
              </div>
              <span>{pagination.total.toLocaleString('vi-VN')} tài khoản</span>
            </header>

            <form className="admin-search-row" onSubmit={submitSearch}>
              <AdminSearchInput
                label="Tìm tài khoản"
                onChange={setQuery}
                onClear={() => {
                  setQuery('');
                  setSearch('');
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                placeholder="Tên, email, số điện thoại..."
                value={query}
              />
              <AdminButton icon="search" tone="primary" type="submit">
                Tìm kiếm
              </AdminButton>
            </form>

            <div className="admin-filter-row permission-filter-row">
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
            </div>

            {listError ? (
              <AdminErrorState
                message={listError}
                onRetry={() => void loadAccounts()}
              />
            ) : (
              <AdminTable caption="Danh sách tài khoản để phân quyền">
                <thead>
                  <tr>
                    <th scope="col">Tài khoản</th>
                    <th scope="col">Vai trò</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Chọn</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList && <AdminTableSkeleton columns={4} rows={6} />}
                  {!loadingList && items.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <AdminEmptyState
                          description="Không tìm thấy tài khoản phù hợp."
                          icon="users"
                          title="Chưa có dữ liệu"
                        />
                      </td>
                    </tr>
                  )}
                  {!loadingList &&
                    items.map((item) => {
                      const status = statusMeta[item.trangThaiTaiKhoan];
                      const active = selected?.id === item.id;
                      const displayName = accountDisplayName(item);
                      return (
                        <tr
                          className={active ? 'selected-row' : ''}
                          key={item.id}
                        >
                          <td data-label="Tài khoản">
                            <strong>{displayName}</strong>
                            <small>{item.email}</small>
                          </td>
                          <td data-label="Vai trò">
                            {roleLabels[item.vaiTro]}
                          </td>
                          <td data-label="Trạng thái">
                            <AdminStatusBadge tone={status.tone}>
                              {status.label}
                            </AdminStatusBadge>
                          </td>
                          <td data-label="Chọn">
                            <AdminButton
                              icon={active ? 'checkCircle' : 'shield'}
                              onClick={() => void selectAccount(item.id)}
                              tone={active ? 'primary' : 'secondary'}
                            >
                              {active ? 'Đang chọn' : 'Phân quyền'}
                            </AdminButton>
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
                setPagination((current) => ({ ...current, page }))
              }
              pageCount={pagination.totalPages}
              total={pagination.total}
            />
          </article>

          <article className="content-card permission-editor-panel">
            {loadingDetail && (
              <div className="permission-editor-state">
                <span className="admin-loading-spinner" />
                <p>Đang tải quyền tài khoản...</p>
              </div>
            )}

            {!loadingDetail && detailError && (
              <AdminErrorState
                message={detailError}
                onRetry={() => {
                  window.location.reload();
                }}
              />
            )}

            {!loadingDetail && !detailError && !selected && (
              <div className="permission-editor-state empty">
                <span className="permission-empty-icon">
                  <AdminIcon name="shield" />
                </span>
                <h2>Chưa chọn tài khoản</h2>
                <p>
                  Chọn một tài khoản trong danh sách để xem và cập nhật quyền.
                </p>
              </div>
            )}

            {!loadingDetail && selected && (
              <>
                <header className="permission-editor-head">
                  <div className="permission-account-identity">
                    <span>{selectedDisplayName.charAt(0).toUpperCase()}</span>
                    <div>
                      <small>TÀI KHOẢN #{selected.id}</small>
                      <h2>{selectedDisplayName}</h2>
                      <p>{selected.email}</p>
                    </div>
                  </div>
                  <div className="permission-role-badge">
                    <small>Nhóm quyền</small>
                    <strong>{roleLabels[selected.vaiTro]}</strong>
                  </div>
                </header>

                <div className="permission-toolbar">
                  <p>
                    Quyền được tắt sẽ bị backend chặn ngay cả khi người dùng gọi
                    API trực tiếp.
                  </p>
                  <div>
                    <AdminButton onClick={() => setAllPermissions(true)}>
                      Cấp tất cả
                    </AdminButton>
                    <AdminButton
                      onClick={() => setAllPermissions(false)}
                      tone="danger"
                    >
                      Thu hồi tất cả
                    </AdminButton>
                  </div>
                </div>

                {message && (
                  <div
                    className={`admin-inline-message ${
                      message.startsWith('Đã') ? 'success' : 'error'
                    }`}
                    role="status"
                  >
                    {message}
                  </div>
                )}

                <div className="permission-resource-list">
                  {selected.permissionGroups.map((group) => {
                    const enabledCount = group.permissions.filter(
                      (permission) => permissions[permission.code],
                    ).length;
                    return (
                      <section
                        className="permission-resource-card"
                        key={group.resource}
                      >
                        <header>
                          <div>
                            <h3>{group.resource}</h3>
                            <small>
                              {enabledCount}/{group.permissions.length} quyền
                              được cấp
                            </small>
                          </div>
                          <button
                            onClick={() => toggleGroup(group)}
                            type="button"
                          >
                            {enabledCount === group.permissions.length
                              ? 'Thu hồi nhóm'
                              : 'Cấp cả nhóm'}
                          </button>
                        </header>
                        <div>
                          {group.permissions.map((permission) => (
                            <label key={permission.code}>
                              <input
                                checked={permissions[permission.code] ?? false}
                                onChange={(event) =>
                                  setPermissions((current) => ({
                                    ...current,
                                    [permission.code]: event.target.checked,
                                  }))
                                }
                                type="checkbox"
                              />
                              <span>
                                <strong>{permission.action}</strong>
                                <small>
                                  {permission.code.replaceAll('_', ' ')}
                                </small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>

                <footer className="permission-editor-footer">
                  <span>
                    Thay đổi quyền không xóa hồ sơ hoặc thay đổi vai trò tài
                    khoản.
                  </span>
                  <AdminButton
                    disabled={saving}
                    icon="shield"
                    onClick={() => void savePermissions()}
                    tone="primary"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
                  </AdminButton>
                </footer>
              </>
            )}
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
