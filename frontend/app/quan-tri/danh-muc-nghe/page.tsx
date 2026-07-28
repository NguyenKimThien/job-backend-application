'use client';

import {
  AdminButton,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminRowActions,
  AdminSearchInput,
  AdminStatCard,
  AdminStatsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableSkeleton,
  AdminToolbar,
  AdminToolbarGroup,
  ConfirmDialogState,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Category = {
  id: number;
  name: string;
  description: string;
  visible: boolean;
  updatedAt?: string;
};

type ApiCategory = {
  id: number;
  name: string;
  description: string | null;
  visible: boolean;
  updatedAt?: string;
};

type ConfirmState = ConfirmDialogState & {
  action: 'delete' | 'toggle';
  item: Category;
};

const emptyForm = { description: '', name: '' };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>(
    'success',
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldError, setFieldError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setMessage('');
    try {
      const data = await portalFetch<ApiCategory[]>('/admin/categories');
      setItems(data.map(fromApi));
    } catch (error) {
      setItems([]);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi-VN');
    if (!term) return items;
    return items.filter((item) =>
      `${item.name} ${item.description}`
        .toLocaleLowerCase('vi-VN')
        .includes(term),
    );
  }, [items, query]);

  function openForm(item?: Category) {
    setEditing(item ?? null);
    setForm({
      description: item?.description ?? '',
      name: item?.name ?? '',
    });
    setFieldError('');
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFieldError('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFieldError('Vui lòng nhập tên nghề.');
      return;
    }

    setSaving(true);
    setFieldError('');
    setMessage('');

    try {
      const data = await portalFetch<ApiCategory>(
        editing ? `/admin/categories/${editing.id}` : '/admin/categories',
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify({
            description: form.description.trim(),
            name,
            visible: editing?.visible ?? true,
          }),
        },
      );
      const category = fromApi(data);
      setItems((list) =>
        editing
          ? list.map((item) => (item.id === editing.id ? category : item))
          : [category, ...list],
      );
      setMessage(editing ? 'Đã lưu thay đổi danh mục.' : 'Đã thêm danh mục.');
      setMessageType('success');
      closeForm();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể lưu danh mục.',
      );
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  function requestToggle(item: Category) {
    setConfirm({
      action: 'toggle',
      confirmLabel: item.visible ? 'Xác nhận ẩn' : 'Xác nhận hiện',
      description: item.visible
        ? 'Danh mục sẽ không còn hiển thị cho người dùng khi chọn ngành nghề mới.'
        : 'Danh mục sẽ được hiển thị lại cho người dùng trong các danh sách chọn.',
      item,
      title: `${item.visible ? 'Ẩn' : 'Hiện'} danh mục "${item.name}"?`,
      tone: item.visible ? 'danger' : 'default',
    });
  }

  function requestDelete(item: Category) {
    setConfirm({
      action: 'delete',
      confirmLabel: 'Xác nhận ẩn danh mục',
      description:
        'Backend hiện giữ dữ liệu liên kết và chuyển danh mục sang trạng thái ẩn thay vì xóa cứng.',
      item,
      title: `Xóa danh mục "${item.name}"?`,
      tone: 'danger',
    });
  }

  async function confirmAction() {
    if (!confirm || saving) return;
    setSaving(true);
    setMessage('');

    try {
      if (confirm.action === 'delete') {
        await portalFetch(`/admin/categories/${confirm.item.id}`, {
          method: 'DELETE',
        });
        setItems((list) =>
          list.map((item) =>
            item.id === confirm.item.id ? { ...item, visible: false } : item,
          ),
        );
        setMessage('Đã ẩn danh mục. Dữ liệu liên kết được giữ nguyên.');
      } else {
        const nextVisible = !confirm.item.visible;
        const data = await portalFetch<ApiCategory>(
          `/admin/categories/${confirm.item.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              description: confirm.item.description,
              name: confirm.item.name,
              visible: nextVisible,
            }),
          },
        );
        const category = fromApi(data);
        setItems((list) =>
          list.map((item) => (item.id === category.id ? category : item)),
        );
        setMessage(nextVisible ? 'Đã hiện danh mục.' : 'Đã ẩn danh mục.');
      }
      setMessageType('success');
      setConfirm(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể cập nhật danh mục.',
      );
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  const hasSearch = Boolean(query.trim());

  return (
    <SiteShell
      action={
        <AdminButton icon="edit" onClick={() => openForm()} tone="primary">
          Thêm danh mục
        </AdminButton>
      }
      breadcrumb="Trang chủ / Quản lý danh mục ngành nghề"
      pageClassName="admin-page"
      role="admin"
      subtitle="Quản lý danh mục ngành nghề dùng chung trên hệ thống."
      title="Quản lý danh mục ngành nghề"
    >
      <section className="container portal-content admin-content">
        <AdminStatsGrid>
          <AdminStatCard
            icon="fileText"
            label="Tổng danh mục"
            value={items.length}
          />
          <AdminStatCard
            icon="checkCircle"
            label="Đang hiển thị"
            tone="success"
            value={items.filter((item) => item.visible).length}
          />
          <AdminStatCard
            icon="lock"
            label="Đang ẩn"
            tone="neutral"
            value={items.filter((item) => !item.visible).length}
          />
        </AdminStatsGrid>

        <div className="content-card admin-table-card category-admin-table-card">
          <AdminToolbar>
            <AdminToolbarGroup>
              <AdminSearchInput
                label="Tìm danh mục nghề"
                onChange={setQuery}
                onClear={() => setQuery('')}
                placeholder="Tìm theo tên nghề hoặc mô tả..."
                value={query}
              />
            </AdminToolbarGroup>
            <AdminToolbarGroup>
              <span className="admin-record-count">
                {filteredItems.length.toLocaleString('vi-VN')}/
                {items.length.toLocaleString('vi-VN')} danh mục
              </span>
            </AdminToolbarGroup>
          </AdminToolbar>

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
                void loadCategories();
              }}
            />
          ) : (
            <AdminTable caption="Danh sách danh mục nghề">
              <colgroup>
                <col className="admin-category-col-code" />
                <col className="admin-category-col-name" />
                <col className="admin-category-col-description" />
                <col className="admin-category-col-updated" />
                <col className="admin-category-col-status" />
                <col className="admin-category-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Mã</th>
                  <th scope="col">Tên nghề</th>
                  <th scope="col">Mô tả</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && <AdminTableSkeleton columns={6} />}
                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <AdminEmptyState
                        action={
                          hasSearch ? (
                            <AdminButton
                              icon="refresh"
                              onClick={() => setQuery('')}
                            >
                              Xóa bộ lọc
                            </AdminButton>
                          ) : (
                            <AdminButton
                              icon="edit"
                              onClick={() => openForm()}
                              tone="primary"
                            >
                              Thêm danh mục
                            </AdminButton>
                          )
                        }
                        description={
                          hasSearch
                            ? 'Không có danh mục phù hợp với từ khóa hiện tại.'
                            : 'Chưa có danh mục nghề nào trong hệ thống.'
                        }
                        icon="fileText"
                        title={
                          hasSearch
                            ? 'Không tìm thấy dữ liệu phù hợp'
                            : 'Chưa có danh mục nghề'
                        }
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Mã">
                        DM{String(item.id).padStart(3, '0')}
                      </td>
                      <td data-label="Tên nghề">
                        <strong>{item.name}</strong>
                      </td>
                      <td data-label="Mô tả">
                        {item.description || 'Chưa cập nhật'}
                      </td>
                      <td data-label="Cập nhật">
                        {formatAdminDate(item.updatedAt)}
                      </td>
                      <td data-label="Trạng thái">
                        <AdminStatusBadge
                          tone={item.visible ? 'success' : 'neutral'}
                        >
                          {item.visible ? 'Đang hiển thị' : 'Đang ẩn'}
                        </AdminStatusBadge>
                      </td>
                      <td data-label="Thao tác">
                        <AdminRowActions
                          actions={[
                            {
                              label: item.visible
                                ? 'Ẩn danh mục'
                                : 'Hiện danh mục',
                              onSelect: () => requestToggle(item),
                              tone: item.visible ? 'danger' : 'default',
                            },
                            {
                              label: 'Xóa danh mục',
                              onSelect: () => requestDelete(item),
                              tone: 'danger',
                            },
                          ]}
                          label={item.name}
                          primary={
                            <AdminButton
                              icon="edit"
                              onClick={() => openForm(item)}
                            >
                              Chỉnh sửa
                            </AdminButton>
                          }
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </AdminTable>
          )}
        </div>
      </section>

      {formOpen && (
        <div className="admin-dialog-backdrop" role="presentation">
          <form
            aria-labelledby="category-form-title"
            aria-modal="true"
            className="admin-form-dialog"
            onSubmit={(event) => {
              void save(event);
            }}
            role="dialog"
          >
            <header>
              <div>
                <h2 id="category-form-title">
                  {editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
                </h2>
                <p>
                  Cùng một biểu mẫu được dùng cho tạo mới và cập nhật danh mục.
                </p>
              </div>
              <button
                aria-label="Đóng biểu mẫu"
                disabled={saving}
                onClick={closeForm}
                type="button"
              >
                ×
              </button>
            </header>
            <label className="admin-form-field">
              <span>Tên nghề *</span>
              <input
                aria-invalid={Boolean(fieldError)}
                onChange={(event) =>
                  setForm((value) => ({ ...value, name: event.target.value }))
                }
                value={form.name}
              />
              {fieldError && <small>{fieldError}</small>}
            </label>
            <label className="admin-form-field">
              <span>Mô tả</span>
              <textarea
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
                rows={4}
                value={form.description}
              />
            </label>
            <footer>
              <AdminButton disabled={saving} onClick={closeForm}>
                Hủy
              </AdminButton>
              <AdminButton disabled={saving} tone="primary" type="submit">
                {saving
                  ? 'Đang lưu...'
                  : editing
                    ? 'Lưu thay đổi'
                    : 'Thêm danh mục'}
              </AdminButton>
            </footer>
          </form>
        </div>
      )}

      {confirm && (
        <AdminConfirmDialog
          confirmLabel={confirm.confirmLabel}
          description={confirm.description}
          isLoading={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            void confirmAction();
          }}
          title={confirm.title}
          tone={confirm.tone}
        />
      )}
    </SiteShell>
  );
}

function fromApi(item: ApiCategory): Category {
  return {
    description: item.description ?? '',
    id: item.id,
    name: item.name,
    updatedAt: item.updatedAt,
    visible: item.visible,
  };
}
