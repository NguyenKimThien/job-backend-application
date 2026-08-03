'use client';

import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Summary = {
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  closedJobs: number;
  expiringSoon: number;
  totalApplications: number;
  newApplications: number;
  interviewed: number;
  hired: number;
  processingRate: number;
  hiringRate: number;
};

type Statistics = {
  employerName: string;
  period: { days: number; from: string; to: string };
  summary: Summary;
  applicationStatuses: Array<{
    status: string;
    label: string;
    count: number;
    percent: number;
  }>;
  monthlyTrend: Array<{
    key: string;
    label: string;
    applications: number;
    hired: number;
  }>;
  jobPerformance: Array<{
    id: number;
    title: string;
    applications: number;
    saved: number;
    hired: number;
    quota: number;
    fillRate: number;
    status: string;
    reviewStatus: string;
    deadline: string;
  }>;
  recentApplications: Array<{
    id: number;
    applicantName: string;
    jobId: number;
    jobTitle: string;
    status: string;
    statusLabel: string;
    appliedAt: string;
  }>;
};

const periods = [
  { value: 30, label: '30 ngày gần đây' },
  { value: 90, label: '90 ngày gần đây' },
  { value: 180, label: '6 tháng gần đây' },
  { value: 365, label: '12 tháng gần đây' },
];

export default function EmployerStatisticsPage() {
  const [days, setDays] = useState(180);
  const [data, setData] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await portalFetch<Statistics>(`/employer/statistics?days=${days}`),
      );
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải số liệu tuyển dụng.',
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTrend = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.monthlyTrend.map((item) => item.applications) ?? []),
      ),
    [data],
  );

  return (
    <SiteShell
      action={
        <Link
          className="employer-statistics-link"
          href="/nha-tuyen-dung/tin-tuyen-dung"
        >
          Quản lý tin tuyển dụng
        </Link>
      }
      breadcrumb="Trang chủ / Nhà tuyển dụng / Thống kê"
      pageClassName="employer-statistics-page"
      role="employer"
      subtitle="Theo dõi hiệu quả tin đăng, nguồn hồ sơ và tiến độ tuyển dụng."
      title="Thống kê tuyển dụng"
    >
      <section className="container portal-content employer-statistics-content">
        <header className="employer-statistics-toolbar">
          <div>
            <strong>{data?.employerName ?? 'Doanh nghiệp của bạn'}</strong>
            <span>
              Số liệu hồ sơ ứng tuyển được tính theo khoảng thời gian đã chọn.
            </span>
          </div>
          <label>
            <span>Khoảng thời gian</span>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {periods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>
        </header>

        {loading && <StatisticsSkeleton />}
        {!loading && error && (
          <div className="employer-statistics-state error" role="alert">
            <strong>Không thể tải thống kê</strong>
            <p>{error}</p>
            <button onClick={() => void load()} type="button">
              Thử lại
            </button>
          </div>
        )}
        {!loading && data && (
          <StatisticsContent data={data} maxTrend={maxTrend} />
        )}
      </section>
    </SiteShell>
  );
}

function StatisticsContent({
  data,
  maxTrend,
}: {
  data: Statistics;
  maxTrend: number;
}) {
  const summaryCards = [
    ['Tổng tin tuyển dụng', data.summary.totalJobs, 'Tất cả tin đã tạo'],
    [
      'Tin đang hiển thị',
      data.summary.activeJobs,
      `${data.summary.expiringSoon} tin sắp hết hạn`,
    ],
    [
      'Tổng hồ sơ',
      data.summary.totalApplications,
      `${data.summary.newApplications} hồ sơ mới`,
    ],
    ['Đã phỏng vấn', data.summary.interviewed, 'Gồm đã mời và đã phỏng vấn'],
    ['Đã tuyển', data.summary.hired, `Tỷ lệ tuyển ${data.summary.hiringRate}%`],
    [
      'Tỷ lệ xử lý',
      `${data.summary.processingRate}%`,
      'Hồ sơ đã được nhà tuyển dụng xem',
    ],
  ];

  return (
    <>
      <div className="employer-statistics-summary">
        {summaryCards.map(([label, value, note]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>
              {typeof value === 'number'
                ? value.toLocaleString('vi-VN')
                : value}
            </strong>
            <small>{note}</small>
          </article>
        ))}
      </div>

      <div className="employer-statistics-grid">
        <article className="employer-statistics-card status-card">
          <header>
            <div>
              <h2>Trạng thái hồ sơ</h2>
              <p>Phân bố hồ sơ trong kỳ thống kê</p>
            </div>
          </header>
          <div className="employer-status-list">
            {data.applicationStatuses.map((item) => (
              <div key={item.status}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
                <span>
                  <i style={{ width: `${item.percent}%` }} />
                </span>
                <small>{item.percent}% tổng hồ sơ</small>
              </div>
            ))}
          </div>
        </article>

        <article className="employer-statistics-card trend-card">
          <header>
            <div>
              <h2>Xu hướng hồ sơ</h2>
              <p>Số hồ sơ và số người trúng tuyển theo tháng</p>
            </div>
          </header>
          <div className="employer-trend-chart">
            {data.monthlyTrend.map((item) => (
              <div key={item.key}>
                <span>{item.applications}</span>
                <div className="employer-trend-bars">
                  <i
                    style={{
                      height: `${Math.max(4, (item.applications / maxTrend) * 100)}%`,
                    }}
                  />
                  <b
                    style={{
                      height: `${Math.max(3, (item.hired / maxTrend) * 100)}%`,
                    }}
                  />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
          <div className="employer-trend-legend">
            <span>Hồ sơ</span>
            <span>Trúng tuyển</span>
          </div>
        </article>
      </div>

      <article className="employer-statistics-card performance-card">
        <header>
          <div>
            <h2>Hiệu quả từng tin tuyển dụng</h2>
            <p>Xếp theo số hồ sơ nhận được trong kỳ</p>
          </div>
        </header>
        <div className="employer-performance-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vị trí tuyển dụng</th>
                <th>Hồ sơ</th>
                <th>Lượt lưu</th>
                <th>Đã tuyển</th>
                <th>Chỉ tiêu</th>
                <th>Tiến độ</th>
                <th>Hạn nộp</th>
              </tr>
            </thead>
            <tbody>
              {data.jobPerformance.length ? (
                data.jobPerformance.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/viec-lam/${job.id}`}>{job.title}</Link>
                      <small>{statusLabel(job.status)}</small>
                    </td>
                    <td>{job.applications}</td>
                    <td>{job.saved}</td>
                    <td>{job.hired}</td>
                    <td>{job.quota}</td>
                    <td>
                      <div className="employer-fill-rate">
                        <span>
                          <i style={{ width: `${job.fillRate}%` }} />
                        </span>
                        <small>{job.fillRate}%</small>
                      </div>
                    </td>
                    <td>{formatDate(job.deadline)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>Chưa có tin tuyển dụng để thống kê.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="employer-statistics-card recent-card">
        <header>
          <div>
            <h2>Hồ sơ mới gần đây</h2>
            <p>8 hồ sơ mới nhất trong khoảng thời gian đã chọn</p>
          </div>
        </header>
        <div className="employer-recent-applications">
          {data.recentApplications.length ? (
            data.recentApplications.map((item) => (
              <Link
                href={`/nha-tuyen-dung/tin-tuyen-dung/${item.jobId}/ung-vien/${item.id}`}
                key={item.id}
              >
                <span>{item.applicantName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{item.applicantName}</strong>
                  <small>{item.jobTitle}</small>
                </div>
                <em>{item.statusLabel}</em>
                <time>{formatDateTime(item.appliedAt)}</time>
              </Link>
            ))
          ) : (
            <p className="employer-statistics-empty">
              Chưa có hồ sơ ứng tuyển trong kỳ.
            </p>
          )}
        </div>
      </article>
    </>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="employer-statistics-skeleton">
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    DANG_HIEN_THI: 'Đang hiển thị',
    DA_DONG: 'Đã đóng',
    HET_HAN: 'Hết hạn',
    CHUA_DANG: 'Chưa đăng',
    TAM_AN: 'Tạm ẩn',
    DA_DU_CHI_TIEU: 'Đủ chỉ tiêu',
  };
  return labels[value] ?? value;
}
