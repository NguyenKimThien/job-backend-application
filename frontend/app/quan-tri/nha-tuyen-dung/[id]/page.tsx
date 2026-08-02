'use client';

import {
  AdminButton,
  AdminIcon,
  AdminLinkButton,
  AdminStatusBadge,
  BadgeTone,
  formatAdminDate,
} from '@/components/admin/AdminUI';
import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type ApiEmployerDetail = {
  id: number;
  tenDonVi: string;
  maSoThue: string;
  diaChiTruSo: string;
  nguoiDaiDien?: string | null;
  soDienThoaiLienHe?: string | null;
  tepGiayPhepUrl?: string | null;
  trangThaiDuyet: string;
  ngayTao: string;
  taiKhoan?: { email?: string | null; soDienThoai?: string | null };
  linhVuc?: { tenLinhVuc?: string | null } | null;
};

type Profile = {
  id: number;
  diaChi: string;
  email: string;
  giayPhep: string;
  linhVuc: string;
  maSoThue: string;
  ngayTao: string;
  nguoiDaiDien: string;
  soDienThoai: string;
  tenDonVi: string;
  trangThaiDuyet: string;
};

const statusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  BAN_NHAP: { label: 'Bản nháp', tone: 'neutral' },
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
  DA_DUYET: { label: 'Đã duyệt', tone: 'success' },
  TU_CHOI: { label: 'Từ chối', tone: 'danger' },
  YEU_CAU_BO_SUNG: { label: 'Cần bổ sung', tone: 'info' },
};

export default function EmployerApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    portalFetch<ApiEmployerDetail>(`/admin/employers/${id}`)
      .then((data) => setProfile(fromApi(data)))
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
        ),
      );
  }, [id]);

  async function decide(action: 'approve' | 'reject') {
    if (action === 'reject' && !reason.trim()) {
      setMessage('Vui lòng nhập lý do từ chối.');
      return;
    }
    setSaving(true);
    try {
      const data = await portalFetch<ApiEmployerDetail>(
        `/admin/employers/${id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action, reason }),
        },
      );
      setMessage('Đã cập nhật kết quả kiểm duyệt.');
      setProfile((current) =>
        fromApi({
          ...data,
          linhVuc: { tenLinhVuc: current?.linhVuc },
          taiKhoan: {
            email: current?.email,
            soDienThoai: current?.soDienThoai,
          },
        }),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể cập nhật.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <SiteShell pageClassName="admin-page" role="admin">
        <section className="container portal-content admin-content">
          <div className="content-card detail-loading">
            {message || 'Đang tải dữ liệu...'}
          </div>
        </section>
      </SiteShell>
    );
  }

  const status = statusMeta[profile.trangThaiDuyet] ?? {
    label: profile.trangThaiDuyet,
    tone: 'neutral',
  };

  return (
    <SiteShell
      action={
        <AdminLinkButton href="/quan-tri/nha-tuyen-dung" icon="chevronLeft">
          Quay lại
        </AdminLinkButton>
      }
      breadcrumb="Trang chủ / Kiểm duyệt nhà tuyển dụng / Chi tiết"
      pageClassName="admin-page"
      role="admin"
      subtitle="Đối chiếu thông tin đăng ký và giấy tờ doanh nghiệp."
      title="Chi tiết hồ sơ nhà tuyển dụng"
    >
      <section className="container portal-content admin-content employer-review-layout">
        <article className="content-card company-profile-card">
          <div className="company-profile-head">
            <span className="company-profile-logo">
              {companyInitials(profile.tenDonVi)}
            </span>
            <div>
              <small>HỒ SƠ DOANH NGHIỆP</small>
              <h2>{profile.tenDonVi}</h2>
              <p>Đăng ký ngày {formatAdminDate(profile.ngayTao)}</p>
            </div>
            <AdminStatusBadge tone={status.tone}>
              {status.label}
            </AdminStatusBadge>
          </div>

          <section>
            <h3>Thông tin pháp lý</h3>
            <div className="detail-info-grid">
              <Info label="Mã số thuế" value={profile.maSoThue} />
              <Info label="Lĩnh vực hoạt động" value={profile.linhVuc} />
              <Info
                className="wide"
                label="Địa chỉ trụ sở"
                value={profile.diaChi}
              />
            </div>
          </section>

          <section>
            <h3>Người đại diện và liên hệ</h3>
            <div className="detail-info-grid">
              <Info label="Người đại diện" value={profile.nguoiDaiDien} />
              <Info label="Số điện thoại" value={profile.soDienThoai} />
              <Info label="Email tài khoản" value={profile.email} />
            </div>
          </section>

          <section>
            <h3>Giấy phép kinh doanh</h3>
            <div className="document-row">
              <span>
                <AdminIcon name="fileText" />
              </span>
              <div>
                <strong>{profile.giayPhep || 'Chưa tải tệp giấy phép'}</strong>
                <small>Tệp minh chứng do nhà tuyển dụng cung cấp</small>
              </div>
              {profile.giayPhep && (
                <AdminLinkButton href={profile.giayPhep} icon="eye">
                  Xem tệp
                </AdminLinkButton>
              )}
            </div>
          </section>
        </article>

        <aside className="content-card review-panel">
          <h3>Kết quả kiểm duyệt</h3>
          {message && <div className="form-message success">{message}</div>}
          <div className="review-checklist">
            <span>Thông tin đơn vị đầy đủ</span>
            <span>Mã số thuế hợp lệ</span>
            <span>Thông tin liên hệ rõ ràng</span>
            <span>Kiểm tra giấy phép kinh doanh</span>
          </div>
          <label className="form-group">
            <span>Lý do từ chối</span>
            <textarea
              onChange={(event) => setReason(event.target.value)}
              placeholder="Bắt buộc nhập khi từ chối..."
              value={reason}
            />
          </label>
          <AdminButton
            disabled={saving}
            icon="checkCircle"
            onClick={() => {
              void decide('approve');
            }}
            tone="primary"
          >
            Phê duyệt hồ sơ
          </AdminButton>
          <AdminButton
            disabled={saving}
            icon="x"
            onClick={() => {
              void decide('reject');
            }}
            tone="danger"
          >
            Từ chối hồ sơ
          </AdminButton>
          <p>
            Sau khi phê duyệt, tài khoản chuyển sang hoạt động và được phép đăng
            tin tuyển dụng.
          </p>
        </aside>
      </section>
    </SiteShell>
  );
}

function fromApi(item: ApiEmployerDetail): Profile {
  return {
    diaChi: item.diaChiTruSo,
    email: item.taiKhoan?.email ?? 'Chưa cập nhật',
    giayPhep: item.tepGiayPhepUrl ?? '',
    id: item.id,
    linhVuc: item.linhVuc?.tenLinhVuc ?? 'Chưa cập nhật',
    maSoThue: item.maSoThue,
    ngayTao: item.ngayTao,
    nguoiDaiDien: item.nguoiDaiDien ?? 'Chưa cập nhật',
    soDienThoai: item.soDienThoaiLienHe ?? item.taiKhoan?.soDienThoai ?? '',
    tenDonVi: item.tenDonVi,
    trangThaiDuyet:
      item.trangThaiDuyet === 'BAN_NHAP' ? 'CHO_DUYET' : item.trangThaiDuyet,
  };
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
      <strong>{value || 'Chưa cập nhật'}</strong>
    </div>
  );
}

function companyInitials(value: string) {
  return value
    .replace(/\b(công ty|tnhh|cổ phần|cp|mtv)\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
