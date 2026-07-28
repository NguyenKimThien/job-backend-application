'use client';

import Link from 'next/link';
import { ReactNode, SVGProps, useEffect, useRef, useState } from 'react';
import { ACCESS_TOKEN_KEY } from '@/lib/backend-api';
import { portalFetch } from '@/lib/portal-api';

export type NotificationRole = 'worker' | 'employer' | 'admin';

type Props = {
  className?: string;
  role?: NotificationRole;
  onOpen?: () => void;
};

type Notice = {
  id: number;
  tieuDe: string;
  noiDung: string;
  ngayTao: string;
  daDoc?: boolean;
};

export default function NavNotifications({
  className,
  role = 'worker',
  onOpen,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    setHasSession(Boolean(token));
    if (!token) return;

    portalFetch<Notice[]>('/notifications')
      .then(setNotices)
      .catch(() => setNotices([]));
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const unreadCount = notices.filter((item) => !item.daDoc).length;
  const notificationLabel = unreadCount
    ? `${unreadCount} thông báo chưa đọc`
    : 'Mở thông báo';
  const notificationHref = `/thong-bao?role=${role}`;
  const loginHref = `/dang-nhap?redirect=${encodeURIComponent(notificationHref)}`;

  return (
    <div
      className={`notification-anchor ${className ?? ''}`.trim()}
      ref={rootRef}
    >
      <button
        className="notification-button"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) onOpen?.();
            return next;
          });
        }}
        aria-label={notificationLabel}
        aria-expanded={open}
        type="button"
      >
        <NotificationIcon name="bell" />
        {unreadCount > 0 && <b>{unreadCount}</b>}
      </button>

      {open && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <div>
              <h3>Thông báo</h3>
              <small>
                {hasSession
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Đăng nhập để xem thông báo'}
              </small>
            </div>
            <Link href={hasSession ? notificationHref : loginHref}>
              {hasSession ? 'Xem tất cả' : 'Đăng nhập'}
            </Link>
          </div>

          {hasSession ? (
            <div className="notification-popover-list">
              {notices.slice(0, 3).map((item) => (
                <Link
                  className={
                    !item.daDoc ? 'popover-notice unread' : 'popover-notice'
                  }
                  href={notificationHref}
                  key={item.id}
                >
                  <span>
                    <NotificationIcon name="bell" />
                  </span>
                  <div>
                    <strong>{item.tieuDe}</strong>
                    <p>{item.noiDung}</p>
                    <small>
                      {new Date(item.ngayTao).toLocaleDateString('vi-VN')}
                    </small>
                  </div>
                  {!item.daDoc && <i />}
                </Link>
              ))}
              {notices.length === 0 && (
                <div className="notification-popover-empty">
                  Chưa có thông báo
                </div>
              )}
            </div>
          ) : (
            <div className="notification-popover-empty">
              Bạn cần đăng nhập để xem thông báo cá nhân.
            </div>
          )}

          <Link
            className="notification-popover-footer"
            href={hasSession ? notificationHref : loginHref}
          >
            {hasSession ? 'Xem toàn bộ thông báo ->' : 'Đăng nhập để xem ->'}
          </Link>
        </div>
      )}
    </div>
  );
}

type NotificationIconName = 'bell';

function NotificationIcon({
  name,
  ...props
}: { name: NotificationIconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<NotificationIconName, ReactNode> = {
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
