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
  activeJobs: number;
  hiredApplications: number;
  totalVacancies: number;
  recruitmentRate: number;
  approvalRate: number;
  activeJobRate: number;
  vacancyFulfillmentRate: number;
  trend?: Array<{
    period: string;
    accounts: number;
    jobs: number;
    applications: number;
  }>;
  users?: {
    byStatus?: Record<string, number>;
    total?: number;
  };
  employerStatistics?: {
    byStatus?: Record<string, number>;
    total?: number;
  };
  jobStatistics?: {
    byStatus?: Record<string, number>;
    byDisplayStatus?: Record<string, number>;
    byWorkType?: Record<string, number>;
    byCategory?: Record<string, number>;
    total?: number;
  };
  applicationStatistics?: {
    byStatus?: Record<string, number>;
    topJobs?: Array<{ label: string; value: number }>;
    total?: number;
  };
};

type ReportRow = {
  group: string;
  label: string;
  tone: BadgeTone;
  value: number;
};

type ReportType = 'summary' | 'users' | 'employers' | 'jobs' | 'applications';
type ReportFormat = 'xlsx' | 'pdf';

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

const employerStatusLabels: Record<string, string> = {
  BAN_NHAP: 'Bản nháp',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  TU_CHOI: 'Từ chối',
  YEU_CAU_BO_SUNG: 'Cần bổ sung',
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

const displayStatusLabels: Record<string, string> = {
  CHUA_DANG: 'Chưa đăng',
  DANG_HIEN_THI: 'Đang hiển thị',
  TAM_AN: 'Tạm ẩn',
  DA_DONG: 'Đã đóng',
  HET_HAN: 'Hết hạn',
};

const workTypeLabels: Record<string, string> = {
  TOAN_THOI_GIAN: 'Toàn thời gian',
  BAN_THOI_GIAN: 'Bán thời gian',
  THUC_TAP: 'Thực tập',
  THOI_VU: 'Thời vụ',
  TU_XA: 'Từ xa',
};

export default function StatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('xlsx');

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

  const rows = data ? buildRows(data, reportType) : [];

  async function exportReport() {
    setExporting(true);
    setMessage('');
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/admin/reports/export${reportQuery(
          from,
          to,
          reportType,
          reportFormat,
        )}`,
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
      link.download = `bao-cao-${reportFileNames[reportType]}-${new Date()
        .toISOString()
        .slice(0, 10)}.${reportFormat}`;
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
              <AdminStatCard
                icon="checkCircle"
                label="Tin đang tuyển"
                tone="success"
                value={data.activeJobs}
              />
              <AdminStatCard
                icon="users"
                label="Tổng nhu cầu tuyển"
                value={data.totalVacancies}
              />
              <AdminStatCard
                icon="checkCircle"
                label="Ứng viên trúng tuyển"
                tone="success"
                value={data.hiredApplications}
              />
              <AdminStatCard
                icon="fileText"
                label="Tỷ lệ trúng tuyển"
                tone="info"
                value={`${data.recruitmentRate.toLocaleString('vi-VN')}%`}
              />
            </AdminStatsGrid>

            <section
              className="admin-analytics-grid"
              aria-label="Chỉ số hiệu quả"
            >
              <EfficiencyCard
                label="Tỷ lệ tin được duyệt"
                note={`${data.approvedJobs.toLocaleString('vi-VN')} trên ${data.jobs.toLocaleString('vi-VN')} tin`}
                value={data.approvalRate}
              />
              <EfficiencyCard
                label="Tỷ lệ tin đang hoạt động"
                note={`${data.activeJobs.toLocaleString('vi-VN')} tin còn nhận hồ sơ`}
                value={data.activeJobRate}
              />
              <EfficiencyCard
                label="Tỷ lệ ứng tuyển thành công"
                note={`${data.hiredApplications.toLocaleString('vi-VN')} hồ sơ trúng tuyển`}
                value={data.recruitmentRate}
              />
              <EfficiencyCard
                label="Mức đáp ứng nhu cầu tuyển"
                note={`${data.hiredApplications.toLocaleString('vi-VN')} / ${data.totalVacancies.toLocaleString('vi-VN')} vị trí`}
                value={data.vacancyFulfillmentRate}
              />
            </section>

            <div className="admin-analytics-layout">
              <section className="content-card admin-trend-card">
                <div className="admin-section-heading">
                  <div>
                    <h2>Xu hướng hoạt động</h2>
                    <p>Tài khoản mới, tin đăng và lượt ứng tuyển theo tháng.</p>
                  </div>
                </div>
                <TrendChart items={data.trend ?? []} />
              </section>
              <section className="content-card admin-top-jobs-card">
                <div className="admin-section-heading">
                  <div>
                    <h2>Tin thu hút nhiều ứng viên</h2>
                    <p>Xếp hạng theo số hồ sơ đã tiếp nhận.</p>
                  </div>
                </div>
                {(data.applicationStatistics?.topJobs ?? []).length ? (
                  <ol>
                    {(data.applicationStatistics?.topJobs ?? [])
                      .slice(0, 5)
                      .map((item) => (
                        <li key={item.label}>
                          <span>{item.label}</span>
                          <strong>
                            {item.value.toLocaleString('vi-VN')} hồ sơ
                          </strong>
                        </li>
                      ))}
                  </ol>
                ) : (
                  <p className="admin-chart-empty">
                    Chưa có dữ liệu ứng tuyển.
                  </p>
                )}
              </section>
            </div>

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
                  <label>
                    <span>Loại báo cáo</span>
                    <select
                      onChange={(event) =>
                        setReportType(event.target.value as ReportType)
                      }
                      value={reportType}
                    >
                      <option value="summary">Báo cáo tổng hợp</option>
                      <option value="users">Báo cáo người dùng</option>
                      <option value="employers">Báo cáo nhà tuyển dụng</option>
                      <option value="jobs">Báo cáo tin tuyển dụng</option>
                      <option value="applications">Báo cáo ứng tuyển</option>
                    </select>
                  </label>
                  <label>
                    <span>Định dạng</span>
                    <select
                      onChange={(event) =>
                        setReportFormat(event.target.value as ReportFormat)
                      }
                      value={reportFormat}
                    >
                      <option value="xlsx">Excel (.xlsx)</option>
                      <option value="pdf">PDF</option>
                    </select>
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
                    {exporting
                      ? 'Đang xuất...'
                      : `Xuất báo cáo ${reportFormat.toUpperCase()}`}
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

function EfficiencyCard({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: number;
}) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return (
    <article className="content-card admin-efficiency-card">
      <div>
        <span>{label}</span>
        <strong>{safeValue.toLocaleString('vi-VN')}%</strong>
      </div>
      <i aria-hidden="true">
        <b style={{ width: `${Math.min(safeValue, 100)}%` }} />
      </i>
      <small>{note}</small>
    </article>
  );
}

function TrendChart({
  items,
}: {
  items: NonNullable<StatisticsData['trend']>;
}) {
  const maximum = Math.max(
    1,
    ...items.flatMap((item) => [item.accounts, item.jobs, item.applications]),
  );
  if (!items.length) {
    return (
      <p className="admin-chart-empty">Chưa có dữ liệu trong giai đoạn này.</p>
    );
  }
  return (
    <div className="admin-trend-chart">
      <div className="admin-chart-legend">
        <span>
          <i className="accounts" />
          Tài khoản
        </span>
        <span>
          <i className="jobs" />
          Tin tuyển dụng
        </span>
        <span>
          <i className="applications" />
          Ứng tuyển
        </span>
      </div>
      <div className="admin-trend-columns">
        {items.map((item) => (
          <div className="admin-trend-month" key={item.period}>
            <div className="admin-trend-bars">
              <i
                className="accounts"
                style={{ height: `${(item.accounts / maximum) * 100}%` }}
                title={`${item.accounts} tài khoản`}
              />
              <i
                className="jobs"
                style={{ height: `${(item.jobs / maximum) * 100}%` }}
                title={`${item.jobs} tin`}
              />
              <i
                className="applications"
                style={{ height: `${(item.applications / maximum) * 100}%` }}
                title={`${item.applications} ứng tuyển`}
              />
            </div>
            <span>{formatPeriod(item.period)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPeriod(value: string) {
  const [year, month] = value.split('-');
  return `${month}/${year.slice(-2)}`;
}

const reportFileNames: Record<ReportType, string> = {
  summary: 'tong-hop',
  users: 'nguoi-dung',
  employers: 'nha-tuyen-dung',
  jobs: 'tin-tuyen-dung',
  applications: 'ung-tuyen',
};

function reportQuery(
  from: string,
  to: string,
  type?: ReportType,
  format?: ReportFormat,
) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (type) params.set('type', type);
  if (format) params.set('format', format);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildRows(data: StatisticsData, type: ReportType): ReportRow[] {
  const sections: Record<ReportType, ReportRow[]> = {
    summary: [
      ...rowsFromRecord('Tài khoản', data.users?.byStatus, accountStatusLabels),
      ...rowsFromRecord(
        'Nhà tuyển dụng',
        data.employerStatistics?.byStatus,
        employerStatusLabels,
      ),
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
    ],
    users: rowsFromRecord(
      'Tài khoản',
      data.users?.byStatus,
      accountStatusLabels,
    ),
    employers: rowsFromRecord(
      'Nhà tuyển dụng',
      data.employerStatistics?.byStatus,
      employerStatusLabels,
    ),
    jobs: [
      ...rowsFromRecord(
        'Trạng thái kiểm duyệt',
        data.jobStatistics?.byStatus,
        jobStatusLabels,
      ),
      ...rowsFromRecord(
        'Trạng thái hiển thị',
        data.jobStatistics?.byDisplayStatus,
        displayStatusLabels,
      ),
      ...rowsFromRecord(
        'Hình thức làm việc',
        data.jobStatistics?.byWorkType,
        workTypeLabels,
      ),
      ...rowsFromRecord('Ngành nghề', data.jobStatistics?.byCategory, {}),
    ],
    applications: [
      ...rowsFromRecord(
        'Trạng thái ứng tuyển',
        data.applicationStatistics?.byStatus,
        applicationStatusLabels,
      ),
      ...(data.applicationStatistics?.topJobs ?? []).map((item) => ({
        group: 'Tin có nhiều ứng viên',
        label: item.label,
        tone: 'info' as BadgeTone,
        value: item.value,
      })),
    ],
  };

  return sections[type];
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
