'use client';

import SiteShell from '@/components/SiteShell';
import { NOTIFICATIONS_UPDATED_EVENT } from '@/components/NavNotifications';
import { formatPortalNotificationText } from '@/lib/notification-format';
import { portalFetch } from '@/lib/portal-api';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ReactNode,
  KeyboardEvent,
  MouseEvent,
  SVGProps,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type NotificationRole = 'admin' | 'employer' | 'worker';
type NotificationType =
  'HE_THONG' | 'TAI_KHOAN' | 'KIEM_DUYET' | 'TUYEN_DUNG' | 'UNG_TUYEN';
type NotificationFilter =
  'all' | 'unread' | 'application' | 'recruitment' | 'system';
type PageState = 'error' | 'loading' | 'ready';

type PortalNotification = {
  daDoc: boolean;
  duongDanDich?: string | null;
  id: number;
  loaiThongBao: string;
  ngayDoc?: string | null;
  ngayTao: string;
  noiDung: string;
  tieuDe: string;
};

type NotificationTypeMeta = {
  actionLabel: string;
  category: NotificationFilter;
  icon: NotificationIconName;
  label: string;
};

type NotificationFilterOption = {
  key: NotificationFilter;
  label: string;
  match: (item: PortalNotification) => boolean;
};

type NotificationAction = {
  href: string;
  label: string;
};

const pageSize = 8;

const notificationTypeMeta: Record<NotificationType, NotificationTypeMeta> = {
  HE_THONG: {
    actionLabel: 'Xem thông tin',
    category: 'system',
    icon: 'bell',
    label: 'Hệ thống',
  },
  TAI_KHOAN: {
    actionLabel: 'Xem tài khoản',
    category: 'system',
    icon: 'user',
    label: 'Tài khoản',
  },
  KIEM_DUYET: {
    actionLabel: 'Xem chi tiết',
    category: 'recruitment',
    icon: 'checkCircle',
    label: 'Kiểm duyệt',
  },
  TUYEN_DUNG: {
    actionLabel: 'Quản lý tuyển dụng',
    category: 'recruitment',
    icon: 'briefcase',
    label: 'Tuyển dụng',
  },
  UNG_TUYEN: {
    actionLabel: 'Xem hồ sơ',
    category: 'application',
    icon: 'fileUser',
    label: 'Ứng tuyển',
  },
};

const filters: NotificationFilterOption[] = [
  { key: 'all', label: 'Tất cả', match: () => true },
  { key: 'unread', label: 'Chưa đọc', match: (item) => !item.daDoc },
  {
    key: 'application',
    label: 'Ứng tuyển',
    match: (item) => getTypeMeta(item.loaiThongBao).category === 'application',
  },
  {
    key: 'recruitment',
    label: 'Tuyển dụng',
    match: (item) => getTypeMeta(item.loaiThongBao).category === 'recruitment',
  },
  {
    key: 'system',
    label: 'Hệ thống',
    match: (item) => getTypeMeta(item.loaiThongBao).category === 'system',
  },
];

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <SiteShell
          breadcrumb="Trang chủ / Thông báo"
          pageClassName="notifications-page"
          role="worker"
          title="Thông báo"
          subtitle="Theo dõi những cập nhật mới liên quan đến tài khoản của bạn."
        >
          <section className="container portal-content notifications-content">
            <NotificationsSkeleton />
          </section>
        </SiteShell>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}

function NotificationsContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = parseRole(searchParams.get('role'));
  const filter = parseFilter(searchParams.get('filter'));
  const page = parsePage(searchParams.get('page'));
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<PageState>('loading');
  const [markAllState, setMarkAllState] = useState<'idle' | 'saving'>('idle');
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    void loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.daDoc).length,
    [items],
  );
  const counts = useMemo(() => getFilterCounts(items), [items]);
  const visibleFilters = useMemo(
    () =>
      filters.filter(
        (item) =>
          item.key === 'all' || item.key === 'unread' || counts[item.key] > 0,
      ),
    [counts],
  );
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        filters.find((entry) => entry.key === filter)?.match(item),
      ),
    [filter, items],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    if (page > pageCount) updateUrl({ page: String(pageCount) }, true);
  }, [page, pageCount]);

  async function loadNotifications() {
    setState('loading');
    setMessage('');
    try {
      const data = await portalFetch<PortalNotification[]>('/notifications');
      setItems(data);
      syncHeaderBadge(data);
      setState('ready');
    } catch {
      setState('error');
      setMessage('Vui lòng thử lại sau.');
    }
  }

  function updateUrl(
    updates: Partial<Record<'filter' | 'page', string>>,
    replace = false,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    if (!params.get('role')) params.set('role', role);
    const nextUrl = `${pathname}?${params.toString()}`;
    if (replace) router.replace(nextUrl, { scroll: false });
    else router.push(nextUrl, { scroll: false });
  }

  function changeFilter(nextFilter: NotificationFilter) {
    updateUrl({ filter: nextFilter, page: '1' });
  }

  function changePage(nextPage: number) {
    updateUrl({ page: String(nextPage) });
    document
      .getElementById('notifications-list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function markRead(id: number) {
    const current = items.find((item) => item.id === id);
    if (!current || current.daDoc || pendingIds.has(id)) return;

    const previousItems = items;
    const nextItems = items.map((item) =>
      item.id === id
        ? { ...item, daDoc: true, ngayDoc: new Date().toISOString() }
        : item,
    );
    setItems(nextItems);
    syncHeaderBadge(nextItems);
    setPendingIds((value) => new Set(value).add(id));

    try {
      await portalFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      setItems(previousItems);
      syncHeaderBadge(previousItems);
      setMessage('Không thể cập nhật trạng thái thông báo. Vui lòng thử lại.');
    } finally {
      setPendingIds((value) => {
        const next = new Set(value);
        next.delete(id);
        return next;
      });
    }
  }

  async function markAllRead() {
    if (!unreadCount || markAllState === 'saving') return;
    const previousItems = items;
    const readAt = new Date().toISOString();
    const nextItems = items.map((item) =>
      item.daDoc ? item : { ...item, daDoc: true, ngayDoc: readAt },
    );
    setMarkAllState('saving');
    setMessage('');
    setItems(nextItems);
    syncHeaderBadge(nextItems);

    try {
      await portalFetch('/notifications/read-all', { method: 'PATCH' });
    } catch {
      setItems(previousItems);
      syncHeaderBadge(previousItems);
      setMessage('Không thể đánh dấu tất cả đã đọc. Vui lòng thử lại.');
    } finally {
      setMarkAllState('idle');
    }
  }

  return (
    <SiteShell
      breadcrumb="Trang chủ / Thông báo"
      pageClassName="notifications-page"
      role={role}
      title="Thông báo"
      subtitle={roleSubtitle(role)}
    >
      <section
        className="container portal-content notifications-content"
        aria-labelledby="notifications-title"
      >
        {state === 'loading' && <NotificationsSkeleton />}
        {state === 'error' && (
          <NotificationsError
            message={message}
            onRetry={() => {
              void loadNotifications();
            }}
          />
        )}
        {state === 'ready' && (
          <div className="notifications-panel" id="notifications-list">
            <NotificationsToolbar
              isSaving={markAllState === 'saving'}
              total={items.length}
              unreadCount={unreadCount}
              onMarkAll={() => {
                void markAllRead();
              }}
            />
            {message && (
              <div className="notifications-inline-alert" role="alert">
                {message}
              </div>
            )}
            <NotificationFilterTabs
              counts={counts}
              filter={filter}
              filters={visibleFilters}
              onChange={changeFilter}
            />
            <NotificationList
              filter={filter}
              items={pageItems}
              pendingIds={pendingIds}
              totalItems={items.length}
              onChangeFilter={changeFilter}
              onMarkRead={(id) => {
                void markRead(id);
              }}
            />
            <NotificationsPagination
              currentPage={currentPage}
              pageCount={pageCount}
              total={filteredItems.length}
              onPageChange={changePage}
            />
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function NotificationsToolbar({
  isSaving,
  onMarkAll,
  total,
  unreadCount,
}: {
  isSaving: boolean;
  onMarkAll: () => void;
  total: number;
  unreadCount: number;
}) {
  return (
    <div className="notifications-toolbar">
      <div>
        <h2 id="notifications-title">Thông báo</h2>
        <p aria-live="polite">
          {total.toLocaleString('vi-VN')} thông báo ·{' '}
          {unreadCount.toLocaleString('vi-VN')} chưa đọc
        </p>
      </div>
      {unreadCount > 0 && (
        <button disabled={isSaving} onClick={onMarkAll} type="button">
          <NotificationIcon name="checkCircle" />
          {isSaving ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}
        </button>
      )}
    </div>
  );
}

function NotificationFilterTabs({
  counts,
  filter,
  filters,
  onChange,
}: {
  counts: Record<NotificationFilter, number>;
  filter: NotificationFilter;
  filters: NotificationFilterOption[];
  onChange: (filter: NotificationFilter) => void;
}) {
  return (
    <div
      className="notifications-tabs"
      role="tablist"
      aria-label="Lọc thông báo"
    >
      {filters.map((item) => (
        <button
          aria-selected={filter === item.key}
          className={filter === item.key ? 'active' : ''}
          key={item.key}
          onClick={() => onChange(item.key)}
          role="tab"
          type="button"
        >
          {item.label}
          <span>{counts[item.key].toLocaleString('vi-VN')}</span>
        </button>
      ))}
    </div>
  );
}

function NotificationList({
  filter,
  items,
  onChangeFilter,
  onMarkRead,
  pendingIds,
  totalItems,
}: {
  filter: NotificationFilter;
  items: PortalNotification[];
  onChangeFilter: (filter: NotificationFilter) => void;
  onMarkRead: (id: number) => void;
  pendingIds: Set<number>;
  totalItems: number;
}) {
  if (!totalItems) return <NotificationsEmptyState />;
  if (!items.length && filter === 'unread') {
    return (
      <NotificationsUnreadEmptyState onShowAll={() => onChangeFilter('all')} />
    );
  }
  if (!items.length) {
    const label =
      filters.find((item) => item.key === filter)?.label ?? 'đã chọn';
    return (
      <NotificationsFilterEmptyState
        label={label}
        onShowAll={() => onChangeFilter('all')}
      />
    );
  }

  return (
    <div className="notifications-list" aria-live="polite">
      {items.map((item) => (
        <NotificationItem
          item={item}
          isPending={pendingIds.has(item.id)}
          key={item.id}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
}

function NotificationItem({
  isPending,
  item,
  onMarkRead,
}: {
  isPending: boolean;
  item: PortalNotification;
  onMarkRead: (id: number) => void;
}) {
  const router = useRouter();
  const meta = getTypeMeta(item.loaiThongBao);
  const action = getNotificationAction(item, meta);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const timeLabel = formatNotificationTime(item.ngayTao);
  const fullTime = formatFullDateTime(item.ngayTao);
  const title = formatPortalNotificationText(item.tieuDe);
  const content = formatPortalNotificationText(item.noiDung);

  function closeMenu() {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function handleArticleClick() {
    if (!item.daDoc) onMarkRead(item.id);
    if (action) router.push(action.href);
  }

  function handleArticleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    handleArticleClick();
  }

  function handleActionClick(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    if (!item.daDoc) onMarkRead(item.id);
  }

  return (
    <article
      aria-label={`${item.daDoc ? 'Thông báo đã đọc' : 'Thông báo chưa đọc'}: ${
        title
      }`}
      className={item.daDoc ? 'notification-row' : 'notification-row unread'}
      onClick={handleArticleClick}
      onKeyDown={handleArticleKeyDown}
      role={action ? 'link' : 'button'}
      tabIndex={0}
    >
      <span className="notification-row-icon">
        <NotificationIcon name={meta.icon} />
      </span>
      <div className="notification-row-body">
        <div className="notification-row-meta">
          <span>{meta.label}</span>
          <time dateTime={item.ngayTao} title={fullTime}>
            {timeLabel}
          </time>
        </div>
        <h3>{title}</h3>
        <p>{content}</p>
        {action ? (
          <Link
            className="notification-row-action"
            href={action.href}
            onClick={handleActionClick}
          >
            {action.label}
          </Link>
        ) : (
          <span className="notification-row-missing">
            Nội dung liên quan hiện chưa có đường dẫn.
          </span>
        )}
      </div>
      {!item.daDoc && (
        <span className="notification-unread-indicator">
          <span className="sr-only">Thông báo chưa đọc</span>
        </span>
      )}
      <div
        className="notification-row-menu"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeMenu();
        }}
      >
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Mở menu thao tác cho thông báo ${title}`}
          onClick={() => setMenuOpen((value) => !value)}
          ref={menuButtonRef}
          type="button"
        >
          <NotificationIcon name="more" />
        </button>
        {menuOpen && (
          <div role="menu">
            {!item.daDoc ? (
              <button
                disabled={isPending}
                onClick={() => {
                  onMarkRead(item.id);
                  closeMenu();
                }}
                role="menuitem"
                type="button"
              >
                {isPending ? 'Đang cập nhật...' : 'Đánh dấu đã đọc'}
              </button>
            ) : (
              <span>Không có thao tác khả dụng</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function NotificationsPagination({
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
  if (pageCount <= 1) return null;

  return (
    <nav className="notifications-pagination" aria-label="Phân trang thông báo">
      <span>
        Trang {currentPage}/{pageCount} · {total.toLocaleString('vi-VN')} thông
        báo
      </span>
      <div>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </nav>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="notifications-panel skeleton" aria-busy="true">
      <div className="notifications-skeleton-toolbar">
        <span />
        <span />
      </div>
      <div className="notifications-skeleton-tabs">
        <span />
        <span />
        <span />
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <div className="notification-skeleton-row" key={index}>
          <span />
          <div>
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsEmptyState() {
  return (
    <div className="notifications-state">
      <NotificationIcon name="bell" />
      <h3>Bạn chưa có thông báo nào</h3>
      <p>Các cập nhật mới liên quan đến tài khoản sẽ xuất hiện tại đây.</p>
    </div>
  );
}

function NotificationsUnreadEmptyState({
  onShowAll,
}: {
  onShowAll: () => void;
}) {
  return (
    <div className="notifications-state">
      <NotificationIcon name="checkCircle" />
      <h3>Bạn đã đọc tất cả thông báo</h3>
      <p>Không có thông báo mới cần xử lý.</p>
      <button onClick={onShowAll} type="button">
        Xem tất cả thông báo
      </button>
    </div>
  );
}

function NotificationsFilterEmptyState({
  label,
  onShowAll,
}: {
  label: string;
  onShowAll: () => void;
}) {
  return (
    <div className="notifications-state">
      <NotificationIcon name="filter" />
      <h3>Không có thông báo thuộc loại {label.toLowerCase()}</h3>
      <p>Hãy quay lại tất cả thông báo để xem các cập nhật khác.</p>
      <button onClick={onShowAll} type="button">
        Xem tất cả
      </button>
    </div>
  );
}

function NotificationsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="notifications-panel">
      <div className="notifications-state error" role="alert">
        <NotificationIcon name="alertCircle" />
        <h3>Không thể tải thông báo</h3>
        <p>{message || 'Vui lòng thử lại sau.'}</p>
        <button onClick={onRetry} type="button">
          Thử lại
        </button>
      </div>
    </div>
  );
}

function getFilterCounts(items: PortalNotification[]) {
  return filters.reduce<Record<NotificationFilter, number>>(
    (result, item) => {
      result[item.key] = items.filter(item.match).length;
      return result;
    },
    {
      all: 0,
      application: 0,
      recruitment: 0,
      system: 0,
      unread: 0,
    },
  );
}

function isInteractiveTarget(target: EventTarget) {
  return target instanceof Element
    ? Boolean(target.closest('a, button, input, select, textarea'))
    : false;
}

function getTypeMeta(value: string): NotificationTypeMeta {
  if (
    value === 'HE_THONG' ||
    value === 'TAI_KHOAN' ||
    value === 'KIEM_DUYET' ||
    value === 'TUYEN_DUNG' ||
    value === 'UNG_TUYEN'
  ) {
    return notificationTypeMeta[value];
  }
  return {
    actionLabel: 'Xem thông tin',
    category: 'system',
    icon: 'bell',
    label: 'Thông báo hệ thống',
  };
}

function getNotificationAction(
  item: PortalNotification,
  meta: NotificationTypeMeta,
): NotificationAction | null {
  const href = normalizeDestination(item.duongDanDich);
  if (!href) return null;
  return {
    href,
    label: actionLabelForHref(href, meta.actionLabel),
  };
}

function normalizeDestination(value?: string | null) {
  if (!value || !value.startsWith('/')) return null;
  if (value === '/nguoi-lao-dong/ung-tuyen') return '/viec-lam-da-ung-tuyen';
  return value;
}

function actionLabelForHref(href: string, fallback: string) {
  if (href.includes('/ung-vien')) return 'Xem hồ sơ ứng viên';
  if (href === '/viec-lam-da-ung-tuyen') return 'Theo dõi hồ sơ';
  if (href.includes('/tin-tuyen-dung')) return 'Quản lý tin tuyển dụng';
  if (href.includes('/ho-so')) return 'Xem hồ sơ';
  if (href.includes('/viec-lam')) return 'Xem việc làm';
  return fallback;
}

function roleSubtitle(role: NotificationRole) {
  if (role === 'employer') {
    return 'Theo dõi các cập nhật mới về hồ sơ ứng viên và hoạt động tuyển dụng.';
  }
  if (role === 'worker') {
    return 'Theo dõi các cập nhật mới về hồ sơ ứng tuyển và cơ hội việc làm.';
  }
  return 'Theo dõi những cập nhật mới liên quan đến tài khoản của bạn.';
}

function parseRole(value: string | null): NotificationRole {
  if (value === 'admin' || value === 'employer' || value === 'worker') {
    return value;
  }
  return 'worker';
}

function parseFilter(value: string | null): NotificationFilter {
  return filters.some((item) => item.key === value)
    ? (value as NotificationFilter)
    : 'all';
}

function parsePage(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

function formatNotificationTime(value: string) {
  const date = parseDate(value);
  if (!date) return 'Không rõ thời gian';
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff >= 0 && diff < minute) return 'Vừa xong';
  if (diff >= 0 && diff < hour)
    return `${Math.floor(diff / minute)} phút trước`;
  if (diff >= 0 && diff < day) return `${Math.floor(diff / hour)} giờ trước`;
  if (diff >= 0 && diff < 7 * day)
    return `${Math.floor(diff / day)} ngày trước`;
  return formatFullDateTime(value);
}

function formatFullDateTime(value: string) {
  const date = parseDate(value);
  if (!date) return 'Không rõ thời gian';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function syncHeaderBadge(items: PortalNotification[]) {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { notifications: items },
    }),
  );
}

type NotificationIconName =
  | 'alertCircle'
  | 'bell'
  | 'briefcase'
  | 'checkCircle'
  | 'fileUser'
  | 'filter'
  | 'more'
  | 'user';

function NotificationIcon({
  name,
  height = 18,
  width = 18,
  ...props
}: { name: NotificationIconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<NotificationIconName, ReactNode> = {
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </>
    ),
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4" />,
    briefcase: <path d="M10 6V5h4v1m-9 3h14v10H5V9Zm0 4h14" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    fileUser: (
      <path d="M6 3h8l4 4v14H6V3Zm8 0v5h5M10 17c0-1.1.9-2 2-2s2 .9 2 2M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    more: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
    user: (
      <path d="M19 20c0-2.8-3.1-5-7-5s-7 2.2-7 5M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    ),
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
