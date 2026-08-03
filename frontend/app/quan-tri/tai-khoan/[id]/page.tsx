'use client';

import {
  AdminErrorState,
  AdminLinkButton,
  AdminStatusBadge,
  BadgeTone,
  formatAdminDate,
  formatAdminDateTime,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Detail = {
  id: number;
  tenDangNhap: string;
  email: string;
  soDienThoai: string | null;
  vaiTro: string;
  trangThaiTaiKhoan: string;
  emailXacThucLuc: string | null;
  lanDangNhapCuoi: string | null;
  ngayTao: string;
  hoSoNguoiLaoDong?: {
    hoTen: string;
    ngaySinh: string | null;
    gioiTinh: string | null;
    diaChi: string | null;
    mucLuongMongMuonTu: string | number | null;
    mucLuongMongMuonDen: string | number | null;
    diaDiemMongMuon: string | null;
    hocVans: Array<{
      tenCoSoDaoTao: string;
      chuyenNganh: string | null;
      trinhDo: string;
    }>;
    kinhNghiemLamViecs: Array<{
      tenDonVi: string;
      viTriCongViec: string;
    }>;
    hoSoKyNangs: Array<{ kyNang: { tenKyNang: string } }>;
  } | null;
  hoSoNhaTuyenDung?: {
    tenDonVi: string;
    maSoThue: string;
    diaChiTruSo: string;
    nguoiDaiDien: string | null;
    chucVuNguoiDaiDien: string | null;
    trangThaiDuyet: string;
    linhVuc: { tenLinhVuc: string } | null;
  } | null;
};

const accountStatusLabels: Record<string, { label: string; tone: BadgeTone }> =
  {
    CHO_XAC_THUC_EMAIL: { label: 'Chờ xác thực', tone: 'warning' },
    DA_KHOA: { label: 'Đã khóa', tone: 'danger' },
    HOAT_DONG: { label: 'Hoạt động', tone: 'success' },
    TAM_KHOA: { label: 'Tạm khóa', tone: 'warning' },
  };

const approvalStatusLabels: Record<string, { label: string; tone: BadgeTone }> =
  {
    BAN_NHAP: { label: 'Bản nháp', tone: 'neutral' },
    CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
    DA_DUYET: { label: 'Đã duyệt', tone: 'success' },
    TU_CHOI: { label: 'Từ chối', tone: 'danger' },
    YEU_CAU_BO_SUNG: { label: 'Cần bổ sung', tone: 'info' },
  };

const roleLabels: Record<string, string> = {
  NGUOI_LAO_DONG: 'Người lao động',
  NHA_TUYEN_DUNG: 'Nhà tuyển dụng',
  QUAN_TRI: 'Quản trị',
  QUAN_TRI_VIEN: 'Quản trị viên',
};

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Detail | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAccount();
  }, [params.id]);

  async function loadAccount() {
    setLoading(true);
    setMessage('');
    try {
      const data = await portalFetch<Detail>(`/admin/users/${params.id}`);
      setAccount(data);
    } catch (error) {
      setAccount(null);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
    } finally {
      setLoading(false);
    }
  }

  const displayName =
    account?.hoSoNguoiLaoDong?.hoTen ??
    account?.hoSoNhaTuyenDung?.tenDonVi ??
    account?.tenDangNhap ??
    '';

  return (
    <SiteShell
      action={
        <div className="admin-page-actions">
          <AdminLinkButton href="/quan-tri/tai-khoan" icon="chevronLeft">
            Quay lại
          </AdminLinkButton>
          <AdminLinkButton
            href={`/quan-tri/phan-quyen?taiKhoan=${params.id}`}
            icon="shield"
            tone="primary"
          >
            Phân quyền
          </AdminLinkButton>
        </div>
      }
      breadcrumb="Trang chủ / Quản lý tài khoản / Chi tiết"
      pageClassName="admin-page"
      role="admin"
      subtitle="Thông tin tài khoản và hồ sơ liên quan trong hệ thống."
      title="Chi tiết tài khoản"
    >
      <section className="container portal-content admin-content">
        {loading && (
          <div className="content-card detail-loading">Đang tải dữ liệu...</div>
        )}
        {!loading && message && (
          <div className="content-card admin-table-card">
            <AdminErrorState
              message={message}
              onRetry={() => {
                void loadAccount();
              }}
            />
          </div>
        )}
        {account && (
          <>
            <article className="content-card account-detail-card">
              <div className="account-detail-head">
                <span className="account-detail-avatar">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <small>MÃ TÀI KHOẢN #{account.id}</small>
                  <h2>{displayName}</h2>
                  <p>{account.email}</p>
                </div>
                <StatusBadge
                  meta={accountStatusLabels[account.trangThaiTaiKhoan]}
                  fallback={account.trangThaiTaiKhoan}
                />
              </div>
              <div className="detail-info-grid">
                <Info label="Tên đăng nhập" value={account.tenDangNhap} />
                <Info
                  label="Vai trò"
                  value={roleLabels[account.vaiTro] ?? account.vaiTro}
                />
                <Info
                  label="Số điện thoại"
                  value={value(account.soDienThoai)}
                />
                <Info
                  label="Ngày tạo"
                  value={formatAdminDateTime(account.ngayTao)}
                />
                <Info
                  label="Xác thực email lúc"
                  value={
                    account.emailXacThucLuc
                      ? formatAdminDateTime(account.emailXacThucLuc)
                      : 'Chưa xác thực'
                  }
                />
                <Info
                  label="Đăng nhập cuối"
                  value={
                    account.lanDangNhapCuoi
                      ? formatAdminDateTime(account.lanDangNhapCuoi)
                      : 'Chưa đăng nhập'
                  }
                />
              </div>
            </article>

            {account.hoSoNguoiLaoDong && (
              <article className="content-card account-detail-card">
                <h3>Hồ sơ người lao động</h3>
                <div className="detail-info-grid">
                  <Info label="Họ tên" value={account.hoSoNguoiLaoDong.hoTen} />
                  <Info
                    label="Ngày sinh"
                    value={formatAdminDate(account.hoSoNguoiLaoDong.ngaySinh)}
                  />
                  <Info
                    label="Giới tính"
                    value={value(account.hoSoNguoiLaoDong.gioiTinh)}
                  />
                  <Info
                    label="Địa chỉ"
                    value={value(account.hoSoNguoiLaoDong.diaChi)}
                  />
                  <Info
                    label="Mức lương mong muốn"
                    value={`${value(account.hoSoNguoiLaoDong.mucLuongMongMuonTu)} - ${value(
                      account.hoSoNguoiLaoDong.mucLuongMongMuonDen,
                    )}`}
                  />
                  <Info
                    label="Địa điểm mong muốn"
                    value={value(account.hoSoNguoiLaoDong.diaDiemMongMuon)}
                  />
                  <Info
                    className="wide"
                    label="Kỹ năng"
                    value={
                      account.hoSoNguoiLaoDong.hoSoKyNangs
                        .map((item) => item.kyNang.tenKyNang)
                        .join(', ') || 'Chưa cập nhật'
                    }
                  />
                  <Info
                    className="wide"
                    label="Học vấn"
                    value={
                      account.hoSoNguoiLaoDong.hocVans
                        .map(
                          (item) =>
                            `${item.trinhDo} - ${
                              item.chuyenNganh ?? 'Chưa ghi chuyên ngành'
                            }, ${item.tenCoSoDaoTao}`,
                        )
                        .join('; ') || 'Chưa cập nhật'
                    }
                  />
                  <Info
                    className="wide"
                    label="Kinh nghiệm"
                    value={
                      account.hoSoNguoiLaoDong.kinhNghiemLamViecs
                        .map(
                          (item) =>
                            `${item.viTriCongViec} tại ${item.tenDonVi}`,
                        )
                        .join('; ') || 'Chưa cập nhật'
                    }
                  />
                </div>
              </article>
            )}

            {account.hoSoNhaTuyenDung && (
              <article className="content-card account-detail-card">
                <h3>Hồ sơ nhà tuyển dụng</h3>
                <div className="detail-info-grid">
                  <Info
                    label="Tên đơn vị"
                    value={account.hoSoNhaTuyenDung.tenDonVi}
                  />
                  <Info
                    label="Mã số thuế"
                    value={account.hoSoNhaTuyenDung.maSoThue}
                  />
                  <Info
                    className="wide"
                    label="Địa chỉ trụ sở"
                    value={account.hoSoNhaTuyenDung.diaChiTruSo}
                  />
                  <Info
                    label="Lĩnh vực"
                    value={value(account.hoSoNhaTuyenDung.linhVuc?.tenLinhVuc)}
                  />
                  <div>
                    <small>Trạng thái duyệt</small>
                    <strong>
                      <StatusBadge
                        meta={
                          approvalStatusLabels[
                            account.hoSoNhaTuyenDung.trangThaiDuyet
                          ]
                        }
                        fallback={account.hoSoNhaTuyenDung.trangThaiDuyet}
                      />
                    </strong>
                  </div>
                  <Info
                    label="Người đại diện"
                    value={value(account.hoSoNhaTuyenDung.nguoiDaiDien)}
                  />
                  <Info
                    label="Chức vụ"
                    value={value(account.hoSoNhaTuyenDung.chucVuNguoiDaiDien)}
                  />
                </div>
              </article>
            )}
          </>
        )}
      </section>
    </SiteShell>
  );
}

function Info({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={className}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({
  fallback,
  meta,
}: {
  fallback: string;
  meta?: { label: string; tone: BadgeTone };
}) {
  return (
    <AdminStatusBadge tone={meta?.tone ?? 'neutral'}>
      {meta?.label ?? fallback}
    </AdminStatusBadge>
  );
}

function value(data: unknown) {
  if (data === null || data === undefined || data === '')
    return 'Chưa cập nhật';
  if (typeof data === 'string' || typeof data === 'number') return String(data);
  return 'Chưa cập nhật';
}
