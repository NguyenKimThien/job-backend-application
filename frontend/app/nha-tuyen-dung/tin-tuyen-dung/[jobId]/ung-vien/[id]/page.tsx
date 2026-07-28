'use client';

import SiteShell from '@/components/SiteShell';
import { BACKEND_API_URL } from '@/lib/backend-api';
import { portalFetch } from '@/lib/portal-api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';

type ApplicationStatus =
  | 'DA_NOP'
  | 'DA_XEM'
  | 'DUOC_CHON_SO_BO'
  | 'MOI_PHONG_VAN'
  | 'DA_PHONG_VAN'
  | 'TRUNG_TUYEN'
  | 'KHONG_PHU_HOP'
  | 'DA_RUT';

type Education = {
  id: number;
  trinhDo: string;
  tenCoSoDaoTao: string;
  chuyenNganh?: string | null;
  namBatDau: number;
  namTotNghiep?: number | null;
  dangHoc: boolean;
  xepLoai?: string | null;
};

type Experience = {
  id: number;
  tenDonVi: string;
  viTriCongViec: string;
  ngayBatDau: string;
  ngayKetThuc?: string | null;
  dangLamViec: boolean;
  moTaCongViec?: string | null;
};

type ApplicantDetail = {
  id: number;
  hoTenSnapshot: string;
  emailSnapshot: string;
  soDienThoaiSnapshot?: string | null;
  tepCvSnapshotUrl?: string | null;
  thuGioiThieu?: string | null;
  trangThaiHienTai: ApplicationStatus;
  lyDoTuChoi?: string | null;
  ngayNop: string;
  ngayCapNhatTrangThai: string;
  hoSoNguoiLaoDong: {
    hoTen: string;
    ngaySinh?: string | null;
    gioiTinh?: string | null;
    diaChi?: string | null;
    anhDaiDienUrl?: string | null;
    gioiThieuBanThan?: string | null;
    mucLuongMongMuonTu?: string | number | null;
    mucLuongMongMuonDen?: string | number | null;
    diaDiemMongMuon?: string | null;
    tepCvUrl?: string | null;
    trangThaiTimViec?: string | null;
    taiKhoan: { email: string; soDienThoai?: string | null };
    hocVans: Education[];
    kinhNghiemLamViecs: Experience[];
    hoSoKyNangs: Array<{
      kyNang: { id: number; tenKyNang: string };
      mucDo?: string | null;
      soNamKinhNghiem?: string | number | null;
    }>;
  };
  lichSuTrangThaiUngTuyens: Array<{
    id: number;
    trangThaiTruoc?: ApplicationStatus | null;
    trangThaiSau: ApplicationStatus;
    ghiChu?: string | null;
    ngayThayDoi: string;
  }>;
};

const statusMeta: Record<
  ApplicationStatus,
  { label: string; tone: string }
> = {
  DA_NOP: { label: 'Hồ sơ mới', tone: 'info' },
  DA_XEM: { label: 'Đang xem xét', tone: 'warning' },
  DUOC_CHON_SO_BO: { label: 'Qua sơ tuyển', tone: 'primary' },
  MOI_PHONG_VAN: { label: 'Mời phỏng vấn', tone: 'primary' },
  DA_PHONG_VAN: { label: 'Đã phỏng vấn', tone: 'neutral' },
  TRUNG_TUYEN: { label: 'Trúng tuyển', tone: 'success' },
  KHONG_PHU_HOP: { label: 'Không phù hợp', tone: 'danger' },
  DA_RUT: { label: 'Đã rút hồ sơ', tone: 'neutral' },
};

const transitions: Partial<
  Record<ApplicationStatus, ApplicationStatus[]>
> = {
  DA_NOP: ['MOI_PHONG_VAN', 'KHONG_PHU_HOP'],
  DA_XEM: ['MOI_PHONG_VAN', 'KHONG_PHU_HOP'],
  DUOC_CHON_SO_BO: ['MOI_PHONG_VAN', 'KHONG_PHU_HOP'],
  MOI_PHONG_VAN: ['DA_PHONG_VAN', 'TRUNG_TUYEN', 'KHONG_PHU_HOP'],
  DA_PHONG_VAN: ['TRUNG_TUYEN', 'KHONG_PHU_HOP'],
};

export default function ApplicantDetailPage() {
  const { jobId, id } = useParams<{ jobId: string; id: string }>();
  const [item, setItem] = useState<ApplicantDetail | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    portalFetch<ApplicantDetail>(
      `/employer/jobs/${jobId}/applicants/${id}`,
    )
      .then((data) => {
        if (active) setItem(data);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tải thông tin ứng viên.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId, id]);

  const allowedTransitions = useMemo(
    () => (item ? transitions[item.trangThaiHienTai] ?? [] : []),
    [item],
  );

  async function updateStatus(status: ApplicationStatus) {
    if (!item || !allowedTransitions.includes(status)) return;
    if (status === 'KHONG_PHU_HOP' && !note.trim()) {
      setError('Vui lòng nhập lý do từ chối hồ sơ.');
      return;
    }
    try {
      setUpdating(status);
      setError('');
      setMessage('');
      const updated = await portalFetch<ApplicantDetail>(
        `/employer/jobs/${jobId}/applicants/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            note: note.trim() || undefined,
            reason: status === 'KHONG_PHU_HOP' ? note.trim() : undefined,
          }),
        },
      );
      setItem((current) =>
        current
          ? {
              ...current,
              trangThaiHienTai: updated.trangThaiHienTai ?? status,
              lyDoTuChoi: updated.lyDoTuChoi,
              ngayCapNhatTrangThai:
                updated.ngayCapNhatTrangThai ?? new Date().toISOString(),
            }
          : current,
      );
      setNote('');
      setMessage(`Đã chuyển hồ sơ sang “${statusMeta[status].label}”.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể cập nhật trạng thái hồ sơ.',
      );
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <SiteShell role="employer">
        <div className="container portal-content applicant-detail-state">
          Đang tải thông tin ứng viên...
        </div>
      </SiteShell>
    );
  }

  if (!item) {
    return (
      <SiteShell role="employer">
        <div className="container portal-content applicant-detail-state error">
          <h2>Không thể mở hồ sơ ứng viên</h2>
          <p>{error || 'Không tìm thấy hồ sơ ứng viên.'}</p>
          <Link
            className="btn btn-primary"
            href={`/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien`}
          >
            Quay lại danh sách
          </Link>
        </div>
      </SiteShell>
    );
  }

  const profile = item.hoSoNguoiLaoDong;
  const displayName = item.hoTenSnapshot || profile.hoTen;
  const currentStatus = statusMeta[item.trangThaiHienTai];
  const cvUrl = documentUrl(item.tepCvSnapshotUrl || profile.tepCvUrl);
  const avatarUrl = documentUrl(profile.anhDaiDienUrl);

  return (
    <SiteShell
      role="employer"
      title={`Chi tiết ứng viên: ${displayName}`}
      action={
        <Link
          className="btn btn-light"
          href={`/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien`}
        >
          ← Danh sách ứng viên
        </Link>
      }
    >
      <section className="container portal-content applicant-detail-page">
        <div className="applicant-layout">
          <article className="content-card cv-preview applicant-profile-card">
            <header className="cv-header applicant-detail-header">
              {avatarUrl ? (
                <img
                  className="profile-avatar"
                  src={avatarUrl}
                  alt={`Ảnh đại diện của ${displayName}`}
                />
              ) : (
                <div className="profile-avatar">
                  {initials(displayName)}
                </div>
              )}
              <div>
                <h2>{displayName}</h2>
                <p>
                  {item.emailSnapshot || profile.taiKhoan.email}
                  {' · '}
                  {item.soDienThoaiSnapshot ||
                    profile.taiKhoan.soDienThoai ||
                    'Chưa có số điện thoại'}
                </p>
                <div className="applicant-header-meta">
                  <span className={`job-applicant-status ${currentStatus.tone}`}>
                    {currentStatus.label}
                  </span>
                  <span>Nộp hồ sơ {formatDateTime(item.ngayNop)}</span>
                </div>
              </div>
              {cvUrl && (
                <a
                  className="btn btn-primary applicant-cv-button"
                  href={cvUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem CV đính kèm
                </a>
              )}
            </header>

            <ProfileSection title="Giới thiệu bản thân">
              <p>{profile.gioiThieuBanThan || 'Ứng viên chưa cập nhật phần giới thiệu.'}</p>
            </ProfileSection>

            <ProfileSection title="Thông tin cá nhân">
              <dl className="applicant-info-grid">
                <Info label="Ngày sinh" value={formatDate(profile.ngaySinh)} />
                <Info label="Giới tính" value={genderLabel(profile.gioiTinh)} />
                <Info label="Địa chỉ" value={profile.diaChi} />
                <Info
                  label="Trạng thái tìm việc"
                  value={jobSeekingLabel(profile.trangThaiTimViec)}
                />
              </dl>
            </ProfileSection>

            <ProfileSection title="Nguyện vọng việc làm">
              <dl className="applicant-info-grid">
                <Info
                  label="Mức lương mong muốn"
                  value={salaryRange(
                    profile.mucLuongMongMuonTu,
                    profile.mucLuongMongMuonDen,
                  )}
                />
                <Info
                  label="Địa điểm mong muốn"
                  value={profile.diaDiemMongMuon}
                />
              </dl>
            </ProfileSection>

            <ProfileSection title="Học vấn">
              {profile.hocVans.length ? (
                <div className="applicant-timeline">
                  {profile.hocVans.map((education) => (
                    <div className="timeline-item" key={education.id}>
                      <b>
                        {education.namBatDau} –{' '}
                        {education.dangHoc
                          ? 'Hiện tại'
                          : education.namTotNghiep || '—'}
                      </b>
                      <div>
                        <strong>{education.tenCoSoDaoTao}</strong>
                        <span>
                          {[education.trinhDo, education.chuyenNganh]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {education.xepLoai && (
                          <p>Xếp loại: {education.xepLoai}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText text="Ứng viên chưa cập nhật học vấn." />
              )}
            </ProfileSection>

            <ProfileSection title="Kinh nghiệm làm việc">
              {profile.kinhNghiemLamViecs.length ? (
                <div className="applicant-timeline">
                  {profile.kinhNghiemLamViecs.map((experience) => (
                    <div className="timeline-item" key={experience.id}>
                      <b>
                        {formatMonth(experience.ngayBatDau)} –{' '}
                        {experience.dangLamViec
                          ? 'Hiện tại'
                          : formatMonth(experience.ngayKetThuc)}
                      </b>
                      <div>
                        <strong>{experience.viTriCongViec}</strong>
                        <span>{experience.tenDonVi}</span>
                        {experience.moTaCongViec && (
                          <p>{experience.moTaCongViec}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText text="Ứng viên chưa cập nhật kinh nghiệm làm việc." />
              )}
            </ProfileSection>

            <ProfileSection title="Kỹ năng">
              {profile.hoSoKyNangs.length ? (
                <div className="skill-list applicant-skill-list">
                  {profile.hoSoKyNangs.map((item) => (
                    <span key={item.kyNang.id}>
                      {item.kyNang.tenKyNang}
                      {item.mucDo ? ` · ${item.mucDo}` : ''}
                      {item.soNamKinhNghiem
                        ? ` · ${item.soNamKinhNghiem} năm`
                        : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyText text="Ứng viên chưa cập nhật kỹ năng." />
              )}
            </ProfileSection>

            <ProfileSection title="Thư giới thiệu">
              <p>{item.thuGioiThieu || 'Ứng viên không gửi kèm thư giới thiệu.'}</p>
            </ProfileSection>

            <ProfileSection title="Lịch sử xử lý hồ sơ">
              {item.lichSuTrangThaiUngTuyens.length ? (
                <ol className="applicant-status-history">
                  {[...item.lichSuTrangThaiUngTuyens]
                    .sort(
                      (a, b) =>
                        new Date(b.ngayThayDoi).getTime() -
                        new Date(a.ngayThayDoi).getTime(),
                    )
                    .map((history) => (
                      <li key={history.id}>
                        <div>
                          <strong>
                            {statusMeta[history.trangThaiSau]?.label ??
                              history.trangThaiSau}
                          </strong>
                          <time>{formatDateTime(history.ngayThayDoi)}</time>
                        </div>
                        {history.ghiChu && <p>{history.ghiChu}</p>}
                      </li>
                    ))}
                </ol>
              ) : (
                <EmptyText text="Chưa có lịch sử xử lý hồ sơ." />
              )}
            </ProfileSection>
          </article>

          <aside className="content-card decision-panel applicant-decision-panel">
            <h3>Xử lý hồ sơ</h3>
            <p>
              Trạng thái hiện tại:{' '}
              <strong>{currentStatus.label}</strong>
            </p>
            {message && <div className="form-message success">{message}</div>}
            {error && <div className="form-message error">{error}</div>}

            {allowedTransitions.includes('MOI_PHONG_VAN') && (
              <button
                className="decision interview"
                disabled={updating !== null}
                onClick={() => updateStatus('MOI_PHONG_VAN')}
              >
                {updating === 'MOI_PHONG_VAN'
                  ? 'Đang cập nhật...'
                  : 'Mời phỏng vấn'}
              </button>
            )}
            {allowedTransitions.includes('DA_PHONG_VAN') && (
              <button
                className="decision interview"
                disabled={updating !== null}
                onClick={() => updateStatus('DA_PHONG_VAN')}
              >
                {updating === 'DA_PHONG_VAN'
                  ? 'Đang cập nhật...'
                  : 'Xác nhận đã phỏng vấn'}
              </button>
            )}
            {allowedTransitions.includes('TRUNG_TUYEN') && (
              <button
                className="decision approve"
                disabled={updating !== null}
                onClick={() => updateStatus('TRUNG_TUYEN')}
              >
                {updating === 'TRUNG_TUYEN'
                  ? 'Đang cập nhật...'
                  : 'Xác nhận trúng tuyển'}
              </button>
            )}

            {allowedTransitions.includes('KHONG_PHU_HOP') && (
              <>
                <label className="form-group">
                  <span>
                    Ghi chú / lý do từ chối
                    <small> Bắt buộc khi từ chối</small>
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Nhập nhận xét dành cho ứng viên..."
                    rows={4}
                  />
                </label>
                <button
                  className="decision reject"
                  disabled={updating !== null}
                  onClick={() => updateStatus('KHONG_PHU_HOP')}
                >
                  {updating === 'KHONG_PHU_HOP'
                    ? 'Đang cập nhật...'
                    : 'Từ chối hồ sơ'}
                </button>
              </>
            )}

            {!allowedTransitions.length && (
              <div className="applicant-final-state">
                Hồ sơ đã ở trạng thái kết thúc và không còn thao tác xử lý.
              </div>
            )}

            {item.lyDoTuChoi && (
              <div className="applicant-rejection-reason">
                <strong>Lý do từ chối</strong>
                <p>{item.lyDoTuChoi}</p>
              </div>
            )}
            <small>
              Cập nhật lần cuối {formatDateTime(item.ngayCapNhatTrangThai)}
            </small>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

function ProfileSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="applicant-profile-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'Chưa cập nhật'}</dd>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="applicant-empty-text">{text}</p>;
}

function documentUrl(value?: string | null) {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${BACKEND_API_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMonth(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function genderLabel(value?: string | null) {
  const labels: Record<string, string> = {
    NAM: 'Nam',
    NU: 'Nữ',
    KHAC: 'Khác',
  };
  return value ? labels[value] ?? value : 'Chưa cập nhật';
}

function jobSeekingLabel(value?: string | null) {
  const labels: Record<string, string> = {
    DANG_TIM_VIEC: 'Đang tìm việc',
    DANG_DI_LAM: 'Đang đi làm',
    KHONG_TIM_VIEC: 'Chưa có nhu cầu',
  };
  return value ? labels[value] ?? value : 'Chưa cập nhật';
}

function salaryRange(
  from?: string | number | null,
  to?: string | number | null,
) {
  const start = Number(from || 0);
  const end = Number(to || 0);
  if (!start && !end) return 'Thỏa thuận';
  const money = (value: number) =>
    new Intl.NumberFormat('vi-VN').format(value) + ' đồng';
  if (start && end) return `${money(start)} – ${money(end)}`;
  return start ? `Từ ${money(start)}` : `Đến ${money(end)}`;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
