'use client';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminStatCard,
  AdminStatsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableSkeleton,
  BadgeTone,
  formatAdminDateTime,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import {
  BACKEND_API_URL,
  getApiMessage,
  getAuthHeaders,
  handleUnauthorizedResponse,
} from '@/lib/backend-api';
import { portalFetch } from '@/lib/portal-api';
import { useEffect, useState } from 'react';

type StatisticsData = {
  workers: number;
  employers: number;
  jobs: number;
  applications: number;
  approvedJobs: number;
  users?: {
    byStatus?: Record<string, number>;
    total?: number;
  };
  jobStatistics?: {
    byStatus?: Record<string, number>;
    total?: number;
  };
  applicationStatistics?: {
    byStatus?: Record<string, number>;
    total?: number;
  };
};

type ReportRow = {
  group: string;
  label: string;
  tone: BadgeTone;
  value: number;
};

const accountStatusLabels: Record<string, string> = {
  CHO_XAC_THUC_EMAIL: 'Chờ xác thực',
  HOAT_DONG: 'Hoạt động',
  TAM_KHOA: 'Tạm khóa',
  DA_KHOA: 'Đã khóa',
};

const jobStatusLabels: Record<string, string> = {
  BAN_NHAP: 'Bản nháp',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  TU_CHOI: 'Từ chối',
  YEU_CAU_BO_SUNG: 'Cần chỉnh sửa',
};

const applicationStatusLabels: Record<string, string> = {
  DA_NOP: 'Đã nộp',
  DA_XEM: 'Đã xem',
  DUOC_CHON_SO_BO: 'Được chọn sơ bộ',
  MOI_PHONG_VAN: 'Mời phỏng vấn',
  DA_PHONG_VAN: 'Đã phỏng vấn',
  TRUNG_TUYEN: 'Trúng tuyển',
  KHONG_PHU_HOP: 'Không phù hợp',
  DA_RUT: 'Đã rút',
};

export default function StatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    void loadStatistics();
  }, []);

  async function loadStatistics() {
    setLoading(true);
    setMessage('');
    try {
      const result = await portalFetch<StatisticsData>(
        `/admin/statistics${reportQuery(from, to)}`,
      );
      setData(result);
      setUpdatedAt(new Date().toISOString());
    } catch (error) {
      setData(null);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
    } finally {
      setLoading(false);
    }
  }

  const rows = data ? buildRows(data) : [];

  async function exportReport() {
    setExporting(true);
    setMessage('');
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/admin/reports/export${reportQuery(from, to)}`,
        { headers: getAuthHeaders() },
      );
      handleUnauthorizedResponse(response);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getApiMessage(payload, 'Không thể xuất báo cáo.'));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-viec-lam-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể xuất báo cáo.',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <SiteShell
      breadcrumb="Trang chủ / Thống kê và báo cáo"
      pageClassName="admin-page"
      role="admin"
      subtitle="Tổng quan vận hành dựa trên dữ liệu thật từ backend."
      title="Thống kê và báo cáo"
    >
      <section className="container portal-content admin-content">
        {loading && (
          <>
            <AdminStatsGrid>
              <AdminStatCard icon="users" label="Tổng người dùng" value="..." />
              <AdminStatCard
                icon="building"
                label="Nhà tuyển dụng"
                value="..."
              />
              <AdminStatCard
                icon="briefcase"
                label="Tin tuyển dụng"
                value="..."
              />
              <AdminStatCard
                icon="fileText"
                label="Hồ sơ ứng tuyển"
                value="..."
              />
            </AdminStatsGrid>
            <div className="content-card admin-table-card">
              <AdminTable caption="Skeleton thống kê">
                <thead>
                  <tr>
                    <th scope="col">Nhóm</th>
                    <th scope="col">Chỉ tiêu</th>
                    <th scope="col">Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  <AdminTableSkeleton columns={3} rows={6} />
                </tbody>
              </AdminTable>
            </div>
          </>
        )}

        {!loading && message && (
          <div className="content-card admin-table-card">
            <AdminErrorState
              message={message}
              onRetry={() => {
                void loadStatistics();
              }}
            />
          </div>
        )}

        {!loading && data && (
          <>
            <AdminStatsGrid>
              <AdminStatCard
                icon="users"
                label="Tổng người dùng"
                value={data.workers + data.employers}
              />
              <AdminStatCard
                icon="building"
                label="Nhà tuyển dụng"
                value={data.employers}
              />
              <AdminStatCard
                icon="briefcase"
                label="Tin tuyển dụng"
                value={data.jobs}
              />
              <AdminStatCard
                icon="fileText"
                label="Hồ sơ ứng tuyển"
                value={data.applications}
              />
            </AdminStatsGrid>

            <div className="content-card admin-table-card admin-report-panel">
              <header className="admin-report-head">
                <div>
                  <h2>Tổng quan hệ thống</h2>
                  <p>
                    Dữ liệu cập nhật lúc{' '}
                    {updatedAt
                      ? formatAdminDateTime(updatedAt)
                      : 'Chưa có dữ liệu'}
                    .
                  </p>
                </div>
                <div className="admin-report-actions">
                  <label>
                    <span>Từ ngày</span>
                    <input
                      max={to || undefined}
                      onChange={(event) => setFrom(event.target.value)}
                      type="date"
                      value={from}
                    />
                  </label>
                  <label>
                    <span>Đến ngày</span>
                    <input
                      min={from || undefined}
                      onChange={(event) => setTo(event.target.value)}
                      type="date"
                      value={to}
                    />
                  </label>
                  <button
                    className="btn btn-outline"
                    onClick={() => void loadStatistics()}
                    type="button"
                  >
                    Lọc số liệu
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={exporting}
                    onClick={() => void exportReport()}
                    type="button"
                  >
                    {exporting ? 'Đang xuất...' : 'Xuất báo cáo CSV'}
                  </button>
                </div>
              </header>

              {rows.length ? (
                <AdminTable caption="Phân bổ số liệu hệ thống">
                  <thead>
                    <tr>
                      <th scope="col">Nhóm</th>
                      <th scope="col">Chỉ tiêu</th>
                      <th scope="col">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.group}-${row.label}`}>
                        <td data-label="Nhóm">{row.group}</td>
                        <td data-label="Chỉ tiêu">
                          <AdminStatusBadge tone={row.tone}>
                            {row.label}
                          </AdminStatusBadge>
                        </td>
                        <td data-label="Số lượng">
                          <strong>{row.value.toLocaleString('vi-VN')}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              ) : (
                <AdminEmptyState
                  description="Backend hiện chưa trả dữ liệu phân bổ trạng thái."
                  icon="fileText"
                  title="Chưa có dữ liệu phân bổ"
                />
              )}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}

function reportQuery(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildRows(data: StatisticsData): ReportRow[] {
  return [
    ...rowsFromRecord('Tài khoản', data.users?.byStatus, accountStatusLabels),
    ...rowsFromRecord(
      'Tin tuyển dụng',
      data.jobStatistics?.byStatus,
      jobStatusLabels,
    ),
    ...rowsFromRecord(
      'Ứng tuyển',
      data.applicationStatistics?.byStatus,
      applicationStatusLabels,
    ),
  ];
}

function rowsFromRecord(
  group: string,
  record: Record<string, number> | undefined,
  labels: Record<string, string>,
): ReportRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({
    group,
    label: labels[key] ?? key,
    tone: toneForStatus(key),
    value,
  }));
}

function toneForStatus(status: string): BadgeTone {
  if (['HOAT_DONG', 'DA_DUYET', 'TRUNG_TUYEN'].includes(status)) {
    return 'success';
  }
  if (['CHO_XAC_THUC_EMAIL', 'CHO_DUYET', 'MOI_PHONG_VAN'].includes(status)) {
    return 'warning';
  }
  if (['TU_CHOI', 'DA_KHOA', 'KHONG_PHU_HOP'].includes(status)) {
    return 'danger';
  }
  if (['YEU_CAU_BO_SUNG', 'DUOC_CHON_SO_BO', 'DA_XEM'].includes(status)) {
    return 'info';
  }
  return 'neutral';
}
