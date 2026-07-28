'use client';

import Link from 'next/link';
import {
  ButtonHTMLAttributes,
  ReactNode,
  SVGProps,
  useEffect,
  useRef,
  useState,
} from 'react';

export type AdminIconName =
  | 'alertCircle'
  | 'briefcase'
  | 'building'
  | 'calendar'
  | 'checkCircle'
  | 'chevronLeft'
  | 'chevronRight'
  | 'edit'
  | 'eye'
  | 'filter'
  | 'fileText'
  | 'lock'
  | 'more'
  | 'refresh'
  | 'search'
  | 'shield'
  | 'trash'
  | 'unlock'
  | 'user'
  | 'users'
  | 'x';

export type BadgeTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

export type RowActionItem = {
  disabled?: boolean;
  label: string;
  onSelect: () => void;
  tone?: 'danger' | 'default';
};

export type ConfirmDialogState = {
  confirmLabel: string;
  description: string;
  title: string;
  tone?: 'danger' | 'default';
};

export function AdminIcon({
  name,
  height = 18,
  width = 18,
  ...props
}: { name: AdminIconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<AdminIconName, ReactNode> = {
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </>
    ),
    briefcase: <path d="M10 6V5h4v1m-9 3h14v10H5V9Zm0 4h14" />,
    building: (
      <path d="M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M4 20h16" />
    ),
    calendar: (
      <path d="M7 3v4M17 3v4M4 9h16M5 5h14v15H5V5Zm4 8h.01M13 13h.01M17 13h.01M9 17h.01M13 17h.01" />
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    edit: <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Zm10-12 3 3" />,
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    fileText: <path d="M6 3h8l4 4v14H6V3Zm8 0v5h5M9 13h6M9 17h6" />,
    lock: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z" />,
    more: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
    refresh: (
      <path d="M20 6v5h-5M4 18v-5h5M18 11a6 6 0 0 0-10-4.5L4 10M6 13a6 6 0 0 0 10 4.5L20 14" />
    ),
    search: (
      <path d="m21 21-4.5-4.5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    ),
    shield: (
      <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Zm-3 9 2 2 4-4" />
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    unlock: <path d="M8 11V8a4 4 0 0 1 7.6-1.8M6 11h12v9H6v-9Z" />,
    user: (
      <path d="M19 20c0-2.8-3.1-5-7-5s-7 2.2-7 5M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    ),
    users: (
      <path d="M16 19c0-2.2-2.7-4-6-4s-6 1.8-6 4M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 6c0-1.7-1.4-3.1-3.5-3.7M15 4.4a3.4 3.4 0 0 1 0 6.2" />
    ),
    x: <path d="M6 6 18 18M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={width}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export function AdminStatsGrid({ children }: { children: ReactNode }) {
  return <div className="admin-stats-grid">{children}</div>;
}

export function AdminStatCard({
  icon,
  label,
  value,
  tone = 'info',
}: {
  icon: AdminIconName;
  label: string;
  value: number | string;
  tone?: BadgeTone;
}) {
  const displayValue =
    typeof value === 'number' ? value.toLocaleString('vi-VN') : value;

  return (
    <article className={`admin-stat-card ${tone}`}>
      <span>
        <AdminIcon name={icon} />
      </span>
      <div>
        <strong>{displayValue}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className="admin-toolbar">{children}</div>;
}

export function AdminToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="admin-toolbar-group">{children}</div>;
}

export function AdminSearchInput({
  label,
  onChange,
  onClear,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="admin-search-field">
      <span className="sr-only">{label}</span>
      <AdminIcon name="search" />
      <input
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {value && onClear && (
        <button
          aria-label="Xóa từ khóa tìm kiếm"
          onClick={onClear}
          type="button"
        >
          <AdminIcon name="x" />
        </button>
      )}
    </label>
  );
}

export function AdminFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="admin-filter-select">
      <span>{label}</span>
      <select
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminButton({
  children,
  className,
  icon,
  tone = 'secondary',
  type = 'button',
  ...props
}: {
  children: ReactNode;
  icon?: AdminIconName;
  tone?: 'danger' | 'primary' | 'secondary';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={joinClassNames('admin-button', tone, className)}
      type={type}
    >
      {icon && <AdminIcon name={icon} />}
      {children}
    </button>
  );
}

export function AdminLinkButton({
  children,
  href,
  icon,
  tone = 'secondary',
}: {
  children: ReactNode;
  href: string;
  icon?: AdminIconName;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <Link className={`admin-link-button ${tone}`} href={href}>
      {icon && <AdminIcon name={icon} />}
      {children}
    </Link>
  );
}

export function AdminStatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: BadgeTone;
}) {
  return (
    <span className={`admin-status-badge ${tone}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}

export function AdminTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function AdminTableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr className="admin-skeleton-row" key={`skeleton-${rowIndex}`}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={`${rowIndex}-${columnIndex}`}>
              <span />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminEmptyState({
  action,
  description,
  icon = 'search',
  title,
}: {
  action?: ReactNode;
  description: string;
  icon?: AdminIconName;
  title: string;
}) {
  return (
    <div className="admin-empty-state">
      <AdminIcon name={icon} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function AdminErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="admin-empty-state error" role="alert">
      <AdminIcon name="alertCircle" />
      <h3>Không thể tải dữ liệu</h3>
      <p>{message || 'Vui lòng thử lại sau.'}</p>
      <AdminButton icon="refresh" onClick={onRetry}>
        Thử lại
      </AdminButton>
    </div>
  );
}

export function AdminPagination({
  currentPage,
  onPageChange,
  pageCount,
  total,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
  total: number;
}) {
  return (
    <nav className="admin-pagination" aria-label="Phân trang">
      <span>{total.toLocaleString('vi-VN')} bản ghi</span>
      <div>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <AdminIcon name="chevronLeft" />
          Trước
        </button>
        <strong>
          Trang {currentPage}/{pageCount}
        </strong>
        <button
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Sau
          <AdminIcon name="chevronRight" />
        </button>
      </div>
    </nav>
  );
}

export function AdminRowActions({
  actions,
  label,
  primary,
}: {
  actions: RowActionItem[];
  label: string;
  primary?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    function close(event: MouseEvent) {
      if (!(event.target as Element).closest('.admin-row-actions')) {
        setOpen(false);
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }

    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className="admin-row-actions">
      {primary}
      {actions.length > 0 && (
        <>
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={`Mở menu thao tác cho ${label}`}
            className="admin-row-menu-trigger"
            onClick={() => setOpen((value) => !value)}
            ref={triggerRef}
            type="button"
          >
            <AdminIcon name="more" />
          </button>
          {open && (
            <div role="menu">
              {actions.map((action) => (
                <button
                  className={action.tone === 'danger' ? 'danger' : undefined}
                  disabled={action.disabled}
                  key={action.label}
                  onClick={() => {
                    action.onSelect();
                    setOpen(false);
                    requestAnimationFrame(() => triggerRef.current?.focus());
                  }}
                  role="menuitem"
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AdminConfirmDialog({
  cancelLabel = 'Hủy',
  confirmLabel,
  description,
  isLoading,
  onCancel,
  onConfirm,
  title,
  tone = 'default',
}: ConfirmDialogState & {
  cancelLabel?: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) onCancel();
    }

    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [isLoading, onCancel]);

  return (
    <div className="admin-dialog-backdrop" role="presentation">
      <section
        aria-modal="true"
        className="admin-confirm-dialog"
        role="dialog"
        aria-labelledby="admin-confirm-title"
      >
        <h2 id="admin-confirm-title">{title}</h2>
        <p>{description}</p>
        <div>
          <button disabled={isLoading} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={tone === 'danger' ? 'danger' : undefined}
            disabled={isLoading}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            {isLoading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function formatAdminDate(value?: string | null) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function formatAdminDateTime(value?: string | null) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
