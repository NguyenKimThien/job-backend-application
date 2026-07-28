'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import { BACKEND_API_URL, getApiMessage } from '@/lib/backend-api';

type Category = {
  id: number;
  name: string;
  description?: string | null;
  jobCount?: number | null;
};

type CategoriesPayload = {
  data: Category[];
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${BACKEND_API_URL}/categories`)
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getApiMessage(payload, 'Không thể tải ngành nghề.'));
        }
        if (!isCategoriesPayload(payload)) return [];
        return payload.data;
      })
      .then(setItems)
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <main className="portal-page">
      <PublicHeader active="categories" />

      <section className="page-heading">
        <div className="container page-heading-inner">
          <div>
            <span className="breadcrumb">Trang chủ / Danh sách ngành nghề</span>
            <h1>Danh sách ngành nghề</h1>
            <p>Chọn lĩnh vực phù hợp để xem toàn bộ việc làm đang tuyển.</p>
          </div>
        </div>
      </section>

      <section className="container category-directory-content">
        {message && <div className="form-message error">{message}</div>}
        <div className="category-directory-heading">
          <div>
            <h2>Tất cả ngành nghề</h2>
            <p>Tìm thấy {items.length} nhóm ngành.</p>
          </div>
          <Link href="/viec-lam">Xem tất cả việc làm →</Link>
        </div>
        <div className="category-directory-grid">
          {items.map((item) => (
            <Link
              className="category-directory-card"
              href={`/viec-lam?nganh=${encodeURIComponent(item.name)}`}
              key={item.id}
            >
              <span className="category-icon blue">💼</span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.jobCount ?? 0} việc làm</small>
                <p>
                  {item.description ||
                    'Các cơ hội việc làm thuộc ngành nghề này.'}
                </p>
              </span>
              <b>→</b>
            </Link>
          ))}
        </div>
      </section>

      <footer className="portal-footer">
        <div className="container">
          <span>© 2026 Trung tâm Dịch vụ Việc làm Thanh niên Hà Nội</span>
          <span>Thông tin liên hệ · Điều khoản · Hỗ trợ</span>
        </div>
      </footer>
    </main>
  );
}

function isCategoriesPayload(payload: unknown): payload is CategoriesPayload {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    return false;
  }

  return Array.isArray(payload.data) && payload.data.every(isCategory);
}

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== 'object') return false;

  return (
    'id' in value &&
    'name' in value &&
    typeof value.id === 'number' &&
    typeof value.name === 'string'
  );
}
