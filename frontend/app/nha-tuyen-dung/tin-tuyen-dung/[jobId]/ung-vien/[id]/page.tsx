'use client';

import SiteShell from '@/components/SiteShell';
import { BACKEND_API_URL } from '@/lib/backend-api';
import { portalFetch, portalFetchBlob } from '@/lib/portal-api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MutableRefObject,
  ReactNode,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

type InterviewMode = 'TRUC_TIEP' | 'TRUC_TUYEN';

type InterviewInfo = {
  id: number;
  thoiGianBatDau: string;
  thoiGianKetThuc?: string | null;
  hinhThucPhongVan: InterviewMode;
  diaDiemPhongVan?: string | null;
  duongDanPhongVan?: string | null;
  nguoiLienHe: string;
  soDienThoaiLienHe: string;
  noiDungChuanBi?: string | null;
  ghiChuPhongVan?: string | null;
  ngayTao?: string | null;
  ngayCapNhat?: string | null;
};

type InterviewForm = {
  ngayPhongVan: string;
  gioBatDau: string;
  gioKetThuc: string;
  hinhThucPhongVan: InterviewMode;
  diaDiemPhongVan: string;
  duongDanPhongVan: string;
  nguoiLienHe: string;
  soDienThoaiLienHe: string;
  noiDungChuanBi: string;
  ghiChuPhongVan: string;
};

type InterviewFormErrors = Partial<Record<keyof InterviewForm, string>>;

type InterviewInvitationPayload = {
  thoiGianBatDau: string;
  thoiGianKetThuc?: string;
  hinhThucPhongVan: InterviewMode;
  diaDiemPhongVan?: string;
  duongDanPhongVan?: string;
  nguoiLienHe: string;
  soDienThoaiLienHe: string;
  noiDungChuanBi?: string;
  ghiChuPhongVan?: string;
};

type ApplicantDetail = {
  id: number;
  hoTenSnapshot: string;
  emailSnapshot: string;
  soDienThoaiSnapshot?: string | null;
  tepCvSnapshotUrl?: string | null;
  tenFileCvUngTuyen?: string | null;
  kichThuocCvUngTuyen?: number | null;
  ngayNopCv?: string | null;
  hasCv?: boolean;
  thuGioiThieu?: string | null;
  tinTuyenDungId?: number;
  tinTuyenDung?: {
    id?: number;
    viTriTuyenDung?: string | null;
    title?: string | null;
    diaDiemLamViec?: string | null;
    location?: string | null;
    nhaTuyenDung?: {
      tenDonVi?: string | null;
      nguoiDaiDien?: string | null;
      soDienThoaiLienHe?: string | null;
      taiKhoan?: { soDienThoai?: string | null } | null;
    } | null;
  } | null;
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
  thongTinPhongVan?: InterviewInfo | null;
};

type ApplicationStatusHistory =
  ApplicantDetail['lichSuTrangThaiUngTuyens'][number];

const statusMeta: Record<ApplicationStatus, { label: string; tone: string }> = {
  DA_NOP: { label: 'Hồ sơ mới', tone: 'info' },
  DA_XEM: { label: 'Đang xem xét', tone: 'warning' },
  DUOC_CHON_SO_BO: { label: 'Qua sơ tuyển', tone: 'primary' },
  MOI_PHONG_VAN: { label: 'Mời phỏng vấn', tone: 'primary' },
  DA_PHONG_VAN: { label: 'Đã phỏng vấn', tone: 'neutral' },
  TRUNG_TUYEN: { label: 'Trúng tuyển', tone: 'success' },
  KHONG_PHU_HOP: { label: 'Không phù hợp', tone: 'danger' },
  DA_RUT: { label: 'Đã rút hồ sơ', tone: 'neutral' },
};

const transitions: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
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
  const [rejectError, setRejectError] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewForm, setInterviewForm] =
    useState<InterviewForm>(emptyInterviewForm());
  const [interviewErrors, setInterviewErrors] = useState<InterviewFormErrors>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<ApplicationStatus | null>(null);
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [cvBusy, setCvBusy] = useState<'view' | 'download' | null>(null);
  const rejectTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rejectButtonRef = useRef<HTMLButtonElement | null>(null);
  const interviewFieldRefs = useRef<
    Partial<Record<keyof InterviewForm, HTMLElement | null>>
  >({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    portalFetch<ApplicantDetail>(`/employer/jobs/${jobId}/applicants/${id}`)
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
    () => (item ? (transitions[item.trangThaiHienTai] ?? []) : []),
    [item],
  );

  useEffect(() => {
    if (!rejectDialogOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && updating !== 'KHONG_PHU_HOP') {
        closeRejectDialog();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [rejectDialogOpen, updating]);

  useEffect(() => {
    if (!interviewDialogOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !interviewSaving) closeInterviewDialog();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [interviewDialogOpen, interviewSaving]);

  async function updateStatus(status: ApplicationStatus) {
    if (!item || !allowedTransitions.includes(status)) return false;
    if (status === 'KHONG_PHU_HOP' && !note.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối hồ sơ.');
      requestAnimationFrame(() => rejectTextareaRef.current?.focus());
      return false;
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
      setRejectError('');
      setMessage(`Đã chuyển hồ sơ sang “${statusMeta[status].label}”.`);
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể cập nhật trạng thái hồ sơ.',
      );
      return false;
    } finally {
      setUpdating(null);
    }
  }

  function handleNoteChange(value: string) {
    setNote(value);
    if (value.trim()) setRejectError('');
  }

  function requestReject() {
    if (updating !== null) return;
    if (!note.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối hồ sơ.');
      requestAnimationFrame(() => rejectTextareaRef.current?.focus());
      return;
    }
    setError('');
    setRejectDialogOpen(true);
  }

  function closeRejectDialog() {
    if (updating === 'KHONG_PHU_HOP') return;
    setRejectDialogOpen(false);
    requestAnimationFrame(() => rejectButtonRef.current?.focus());
  }

  async function confirmReject() {
    const success = await updateStatus('KHONG_PHU_HOP');
    if (success) closeRejectDialog();
  }

  function requestInterview() {
    if (!item || interviewSaving) return;
    setError('');
    setInterviewErrors({});
    setInterviewForm(createInterviewForm(item));
    setInterviewDialogOpen(true);
  }

  function closeInterviewDialog() {
    if (interviewSaving) return;
    setInterviewDialogOpen(false);
    setInterviewErrors({});
  }

  function changeInterviewField<K extends keyof InterviewForm>(
    field: K,
    value: InterviewForm[K],
  ) {
    setInterviewForm((current) => ({ ...current, [field]: value }));
    setInterviewErrors((current) => {
      if (!current[field]) return current;
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  async function submitInterviewInvitation() {
    if (!item || interviewSaving) return;
    const validation = validateInterviewForm(interviewForm);
    setInterviewErrors(validation.errors);
    if (!validation.isValid || !validation.payload) {
      const firstField = validation.firstError;
      requestAnimationFrame(() =>
        firstField ? interviewFieldRefs.current[firstField]?.focus() : null,
      );
      return;
    }

    try {
      setInterviewSaving(true);
      setError('');
      setMessage('');
      const updated = await portalFetch<ApplicantDetail>(
        `/employer/jobs/${jobId}/applicants/${id}/interview`,
        {
          method: 'POST',
          body: JSON.stringify(validation.payload),
        },
      );
      setItem(updated);
      setInterviewDialogOpen(false);
      setInterviewForm(emptyInterviewForm());
      setInterviewErrors({});
      setMessage('Đã gửi lời mời phỏng vấn đến ứng viên.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể gửi lời mời phỏng vấn. Vui lòng thử lại.',
      );
    } finally {
      setInterviewSaving(false);
    }
  }

  async function viewCv() {
    if (cvBusy) return;
    setCvBusy('view');
    setError('');
    try {
      const { blob } = await portalFetchBlob(
        `/employer/jobs/${jobId}/applicants/${id}/cv/view`,
      );
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể mở CV. Vui lòng thử lại.',
      );
    } finally {
      setCvBusy(null);
    }
  }

  async function downloadCv() {
    if (cvBusy) return;
    setCvBusy('download');
    setError('');
    try {
      const { blob, fileName } = await portalFetchBlob(
        `/employer/jobs/${jobId}/applicants/${id}/cv/download`,
      );
      downloadBlob(
        blob,
        fileName || item?.tenFileCvUngTuyen || 'CV_Ung_Vien.pdf',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể tải CV. Vui lòng thử lại.',
      );
    } finally {
      setCvBusy(null);
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
  const hasCv = Boolean(item.hasCv || item.tenFileCvUngTuyen);
  const avatarUrl = documentUrl(profile.anhDaiDienUrl);
  const email = item.emailSnapshot || profile.taiKhoan.email;
  const phone =
    item.soDienThoaiSnapshot ||
    profile.taiKhoan.soDienThoai ||
    'Chưa có số điện thoại';
  const submittedJob = item.tinTuyenDung;
  const submittedJobTitle =
    submittedJob?.viTriTuyenDung || submittedJob?.title || null;
  const submittedJobLocation =
    submittedJob?.diaDiemLamViec || submittedJob?.location || null;
  const jobCode = formatJobCode(item.tinTuyenDungId ?? jobId);
  const visibleStatusHistory = getVisibleStatusHistory(
    item.lichSuTrangThaiUngTuyens,
  );
  const interviewInfo = item.thongTinPhongVan ?? null;
  const canInviteInterview = allowedTransitions.includes('MOI_PHONG_VAN');
  const canEditInterview =
    item.trangThaiHienTai === 'MOI_PHONG_VAN' && Boolean(interviewInfo);

  return (
    <SiteShell
      breadcrumb={`Trang chủ / Danh sách ứng viên / ${displayName}`}
      pageClassName="applicant-detail-page-shell"
      role="employer"
      title={`Chi tiết ứng viên: ${displayName}`}
      action={
        <Link
          className="btn btn-light applicant-detail-back"
          href={`/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien`}
        >
          <DetailIcon name="arrowLeft" />
          Quay lại danh sách ứng viên
        </Link>
      }
    >
      <section className="container portal-content applicant-detail-page">
        <div className="applicant-layout">
          <article className="content-card cv-preview applicant-profile-card">
            <header className="cv-header applicant-detail-header">
              <div className="applicant-identity">
                {avatarUrl ? (
                  <img
                    className="profile-avatar"
                    src={avatarUrl}
                    alt={`Ảnh đại diện của ${displayName}`}
                  />
                ) : (
                  <div className="profile-avatar">{initials(displayName)}</div>
                )}
                <div className="applicant-identity-main">
                  <h2>{displayName}</h2>
                  <div className="applicant-contact-list">
                    <span title={email}>
                      <DetailIcon name="mail" />
                      <span>{email}</span>
                    </span>
                    <span title={phone}>
                      <DetailIcon name="phone" />
                      <span>{phone}</span>
                    </span>
                  </div>
                  <div className="applicant-header-meta">
                    <span
                      className={`job-applicant-status ${currentStatus.tone}`}
                    >
                      {currentStatus.label}
                    </span>
                    <span>Nộp hồ sơ lúc {formatDateTime(item.ngayNop)}</span>
                  </div>
                </div>
              </div>
              {hasCv && (
                <div className="applicant-cv-actions">
                  <button
                    className="btn btn-primary applicant-cv-button"
                    disabled={Boolean(cvBusy)}
                    onClick={() => {
                      void viewCv();
                    }}
                    type="button"
                  >
                    <DetailIcon name="eye" />
                    {cvBusy === 'view' ? 'Đang mở...' : 'Xem CV'}
                  </button>
                  <button
                    className="btn btn-light applicant-cv-button"
                    disabled={Boolean(cvBusy)}
                    onClick={() => {
                      void downloadCv();
                    }}
                    type="button"
                  >
                    <DetailIcon name="download" />
                    {cvBusy === 'download' ? 'Đang tải...' : 'Tải CV'}
                  </button>
                </div>
              )}
            </header>

            <ProfileSection title="CV ứng tuyển">
              {hasCv ? (
                <div className="applicant-file-row">
                  <span className="applicant-file-icon">
                    <DetailIcon name="fileText" />
                  </span>
                  <div>
                    <strong title={item.tenFileCvUngTuyen ?? undefined}>
                      {item.tenFileCvUngTuyen || 'CV ứng tuyển'}
                    </strong>
                    <span>
                      {formatFileSize(item.kichThuocCvUngTuyen)}
                      {' · '}
                      Nộp lúc {formatDateTime(item.ngayNopCv)}
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyText text="Ứng viên chưa đính kèm CV." />
              )}
            </ProfileSection>

            <ProfileSection title="Thông tin ứng tuyển">
              <dl className="applicant-info-grid applicant-application-grid">
                {submittedJobTitle && (
                  <Info label="Vị trí ứng tuyển" value={submittedJobTitle} />
                )}
                <Info label="Mã tin tuyển dụng" value={jobCode} />
                <Info
                  label="Ngày ứng tuyển"
                  value={formatDateTime(item.ngayNop)}
                />
                {submittedJobLocation && (
                  <Info
                    label="Địa điểm làm việc"
                    value={submittedJobLocation}
                  />
                )}
              </dl>
            </ProfileSection>

            <ProfileSection title="Giới thiệu bản thân">
              <p>
                {profile.gioiThieuBanThan ||
                  'Ứng viên chưa cập nhật phần giới thiệu.'}
              </p>
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
              <p>
                {item.thuGioiThieu || 'Ứng viên không gửi kèm thư giới thiệu.'}
              </p>
            </ProfileSection>

            <ProfileSection title="Lịch sử xử lý hồ sơ">
              {visibleStatusHistory.length ? (
                <ol className="applicant-status-history">
                  {visibleStatusHistory.map((history) => (
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
            <div className="applicant-current-status">
              <span>Trạng thái hồ sơ</span>
              <strong className={`job-applicant-status ${currentStatus.tone}`}>
                {currentStatus.label}
              </strong>
            </div>
            {message && <div className="form-message success">{message}</div>}
            {error && <div className="form-message error">{error}</div>}

            {interviewInfo && (
              <InterviewInfoCard
                info={interviewInfo}
                onEdit={canEditInterview ? requestInterview : undefined}
              />
            )}

            {canInviteInterview && !interviewInfo && (
              <button
                className="decision interview"
                disabled={updating !== null || interviewSaving}
                onClick={requestInterview}
                type="button"
              >
                <DetailIcon name="calendar" />
                Mời phỏng vấn
              </button>
            )}
            {allowedTransitions.includes('DA_PHONG_VAN') && (
              <button
                className="decision interview"
                disabled={updating !== null}
                onClick={() => {
                  void updateStatus('DA_PHONG_VAN');
                }}
              >
                <DetailIcon name="checkCircle" />
                {updating === 'DA_PHONG_VAN'
                  ? 'Đang cập nhật...'
                  : 'Xác nhận đã phỏng vấn'}
              </button>
            )}
            {allowedTransitions.includes('TRUNG_TUYEN') && (
              <button
                className="decision approve"
                disabled={updating !== null}
                onClick={() => {
                  void updateStatus('TRUNG_TUYEN');
                }}
              >
                <DetailIcon name="checkCircle" />
                {updating === 'TRUNG_TUYEN'
                  ? 'Đang cập nhật...'
                  : 'Xác nhận trúng tuyển'}
              </button>
            )}

            {allowedTransitions.includes('KHONG_PHU_HOP') && (
              <>
                <label
                  className="form-group applicant-note-field"
                  htmlFor="reject-note"
                >
                  <span>Lý do từ chối</span>
                  <small
                    className={rejectError ? 'applicant-note-help error' : ''}
                  >
                    Bắt buộc nhập khi từ chối hồ sơ.
                  </small>
                  <textarea
                    aria-describedby={
                      rejectError ? 'reject-note-error' : undefined
                    }
                    aria-invalid={Boolean(rejectError)}
                    id="reject-note"
                    ref={rejectTextareaRef}
                    value={note}
                    onChange={(event) => handleNoteChange(event.target.value)}
                    placeholder="Nhập lý do từ chối hồ sơ ứng viên..."
                    rows={4}
                  />
                  {rejectError && (
                    <span
                      className="applicant-note-error"
                      id="reject-note-error"
                    >
                      {rejectError}
                    </span>
                  )}
                </label>
                <button
                  className="decision reject"
                  disabled={updating !== null}
                  onClick={requestReject}
                  ref={rejectButtonRef}
                >
                  <DetailIcon name="xCircle" />
                  {updating === 'KHONG_PHU_HOP'
                    ? 'Đang xử lý...'
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
            <small className="applicant-updated-time">
              Cập nhật lần cuối: {formatDateTime(item.ngayCapNhatTrangThai)}
            </small>
          </aside>
        </div>
      </section>
      {rejectDialogOpen && (
        <RejectConfirmDialog
          isSaving={updating === 'KHONG_PHU_HOP'}
          note={note}
          onCancel={closeRejectDialog}
          onConfirm={() => {
            void confirmReject();
          }}
        />
      )}
      {interviewDialogOpen && (
        <InterviewInvitationDialog
          errors={interviewErrors}
          fieldRefs={interviewFieldRefs}
          form={interviewForm}
          isSaving={interviewSaving}
          onCancel={closeInterviewDialog}
          onChange={changeInterviewField}
          onSubmit={() => {
            void submitInterviewInvitation();
          }}
        />
      )}
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

function Info({ label, value }: { label: string; value?: string | null }) {
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

function InterviewInfoCard({
  info,
  onEdit,
}: {
  info: InterviewInfo;
  onEdit?: () => void;
}) {
  const isOnline = info.hinhThucPhongVan === 'TRUC_TUYEN';
  const hasValidUrl = isValidHttpUrl(info.duongDanPhongVan);

  return (
    <section className="applicant-interview-info">
      <div className="applicant-interview-info-header">
        <div>
          <span>Thông tin phỏng vấn</span>
          <strong>{formatInterviewTimeRange(info)}</strong>
        </div>
        {onEdit && (
          <button onClick={onEdit} type="button">
            <DetailIcon name="edit" />
            Chỉnh sửa
          </button>
        )}
      </div>
      <div className="applicant-interview-detail-list">
        <InterviewDetail
          icon="calendar"
          label="Hình thức"
          value={interviewModeLabel(info.hinhThucPhongVan)}
        />
        {isOnline ? (
          hasValidUrl && (
            <div className="applicant-interview-detail">
              <DetailIcon name="link" />
              <div>
                <span>Đường dẫn tham gia</span>
                <a
                  href={info.duongDanPhongVan ?? undefined}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {info.duongDanPhongVan}
                </a>
              </div>
            </div>
          )
        ) : (
          <InterviewDetail
            icon="mapPin"
            label="Địa điểm"
            value={info.diaDiemPhongVan}
          />
        )}
        <InterviewDetail
          icon="user"
          label="Người liên hệ"
          value={info.nguoiLienHe}
        />
        <InterviewDetail
          icon="phone"
          label="Số điện thoại"
          value={info.soDienThoaiLienHe}
        />
        <InterviewDetail
          icon="fileText"
          label="Nội dung chuẩn bị"
          value={info.noiDungChuanBi}
        />
        <InterviewDetail
          icon="fileText"
          label="Ghi chú"
          value={info.ghiChuPhongVan}
        />
      </div>
    </section>
  );
}

function InterviewDetail({
  icon,
  label,
  value,
}: {
  icon: DetailIconName;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="applicant-interview-detail">
      <DetailIcon name={icon} />
      <div>
        <span>{label}</span>
        <p>{value}</p>
      </div>
    </div>
  );
}

function InterviewInvitationDialog({
  errors,
  fieldRefs,
  form,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  errors: InterviewFormErrors;
  fieldRefs: MutableRefObject<
    Partial<Record<keyof InterviewForm, HTMLElement | null>>
  >;
  form: InterviewForm;
  isSaving: boolean;
  onCancel: () => void;
  onChange: <K extends keyof InterviewForm>(
    field: K,
    value: InterviewForm[K],
  ) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="job-applicant-dialog-backdrop applicant-interview-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onCancel();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="applicant-interview-dialog-title"
        aria-modal="true"
        className="job-applicant-dialog applicant-interview-dialog"
        role="dialog"
      >
        <div className="applicant-interview-dialog-header">
          <div>
            <h2 id="applicant-interview-dialog-title">
              Mời ứng viên phỏng vấn
            </h2>
            <p>
              Vui lòng nhập đầy đủ thông tin để ứng viên có thể tham gia phỏng
              vấn đúng thời gian và địa điểm.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại mời phỏng vấn"
            className="job-applicant-dialog-close"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            <DetailIcon name="xCircle" />
          </button>
        </div>

        <div className="applicant-interview-form">
          <InterviewField error={errors.ngayPhongVan} label="Ngày phỏng vấn">
            <input
              aria-invalid={Boolean(errors.ngayPhongVan)}
              ref={(element) => {
                fieldRefs.current.ngayPhongVan = element;
              }}
              type="date"
              value={form.ngayPhongVan}
              onChange={(event) => onChange('ngayPhongVan', event.target.value)}
            />
          </InterviewField>
          <InterviewField error={errors.gioBatDau} label="Giờ bắt đầu">
            <input
              aria-invalid={Boolean(errors.gioBatDau)}
              ref={(element) => {
                fieldRefs.current.gioBatDau = element;
              }}
              type="time"
              value={form.gioBatDau}
              onChange={(event) => onChange('gioBatDau', event.target.value)}
            />
          </InterviewField>
          <InterviewField error={errors.gioKetThuc} label="Giờ kết thúc">
            <input
              aria-invalid={Boolean(errors.gioKetThuc)}
              ref={(element) => {
                fieldRefs.current.gioKetThuc = element;
              }}
              type="time"
              value={form.gioKetThuc}
              onChange={(event) => onChange('gioKetThuc', event.target.value)}
            />
          </InterviewField>
          <InterviewField
            error={errors.hinhThucPhongVan}
            label="Hình thức phỏng vấn"
          >
            <select
              aria-invalid={Boolean(errors.hinhThucPhongVan)}
              ref={(element) => {
                fieldRefs.current.hinhThucPhongVan = element;
              }}
              value={form.hinhThucPhongVan}
              onChange={(event) =>
                onChange(
                  'hinhThucPhongVan',
                  event.target.value as InterviewMode,
                )
              }
            >
              <option value="TRUC_TIEP">Phỏng vấn trực tiếp</option>
              <option value="TRUC_TUYEN">Phỏng vấn trực tuyến</option>
            </select>
          </InterviewField>

          {form.hinhThucPhongVan === 'TRUC_TIEP' ? (
            <InterviewField
              className="span-full"
              error={errors.diaDiemPhongVan}
              label="Địa điểm phỏng vấn"
            >
              <textarea
                aria-invalid={Boolean(errors.diaDiemPhongVan)}
                placeholder="Ví dụ: Tầng 5, số 123 phố X, quận Y, Hà Nội"
                ref={(element) => {
                  fieldRefs.current.diaDiemPhongVan = element;
                }}
                rows={3}
                value={form.diaDiemPhongVan}
                onChange={(event) =>
                  onChange('diaDiemPhongVan', event.target.value)
                }
              />
            </InterviewField>
          ) : (
            <InterviewField
              className="span-full"
              error={errors.duongDanPhongVan}
              label="Đường dẫn tham gia phỏng vấn trực tuyến"
            >
              <input
                aria-invalid={Boolean(errors.duongDanPhongVan)}
                placeholder="https://meet.google.com/..."
                ref={(element) => {
                  fieldRefs.current.duongDanPhongVan = element;
                }}
                type="url"
                value={form.duongDanPhongVan}
                onChange={(event) =>
                  onChange('duongDanPhongVan', event.target.value)
                }
              />
            </InterviewField>
          )}

          <InterviewField error={errors.nguoiLienHe} label="Người liên hệ">
            <input
              aria-invalid={Boolean(errors.nguoiLienHe)}
              ref={(element) => {
                fieldRefs.current.nguoiLienHe = element;
              }}
              value={form.nguoiLienHe}
              onChange={(event) => onChange('nguoiLienHe', event.target.value)}
            />
          </InterviewField>
          <InterviewField
            error={errors.soDienThoaiLienHe}
            label="Số điện thoại liên hệ"
          >
            <input
              aria-invalid={Boolean(errors.soDienThoaiLienHe)}
              inputMode="tel"
              ref={(element) => {
                fieldRefs.current.soDienThoaiLienHe = element;
              }}
              value={form.soDienThoaiLienHe}
              onChange={(event) =>
                onChange(
                  'soDienThoaiLienHe',
                  event.target.value.replace(/[^\d+\s().-]/g, ''),
                )
              }
            />
          </InterviewField>
          <InterviewField
            className="span-full"
            error={errors.noiDungChuanBi}
            label="Nội dung cần chuẩn bị"
          >
            <textarea
              aria-invalid={Boolean(errors.noiDungChuanBi)}
              placeholder="Ví dụ: Mang theo CCCD, bản in CV, hồ sơ năng lực hoặc máy tính cá nhân..."
              ref={(element) => {
                fieldRefs.current.noiDungChuanBi = element;
              }}
              rows={3}
              value={form.noiDungChuanBi}
              onChange={(event) =>
                onChange('noiDungChuanBi', event.target.value)
              }
            />
          </InterviewField>
          <InterviewField
            className="span-full"
            error={errors.ghiChuPhongVan}
            label="Ghi chú bổ sung"
          >
            <textarea
              aria-invalid={Boolean(errors.ghiChuPhongVan)}
              placeholder="Nhập thêm hướng dẫn dành cho ứng viên..."
              ref={(element) => {
                fieldRefs.current.ghiChuPhongVan = element;
              }}
              rows={3}
              value={form.ghiChuPhongVan}
              onChange={(event) =>
                onChange('ghiChuPhongVan', event.target.value)
              }
            />
          </InterviewField>
        </div>

        <div className="applicant-interview-dialog-footer">
          <button disabled={isSaving} onClick={onCancel} type="button">
            Hủy
          </button>
          <button
            className="primary"
            disabled={isSaving}
            onClick={onSubmit}
            type="button"
          >
            {isSaving ? 'Đang gửi lời mời...' : 'Gửi lời mời phỏng vấn'}
          </button>
        </div>
      </section>
    </div>
  );
}

function InterviewField({
  children,
  className,
  error,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  label: string;
}) {
  const id = `interview-${label
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label className={`applicant-interview-field ${className ?? ''}`.trim()}>
      <span>{label}</span>
      {children}
      {error && (
        <small id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

function RejectConfirmDialog({
  isSaving,
  note,
  onCancel,
  onConfirm,
}: {
  isSaving: boolean;
  note: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="job-applicant-dialog-backdrop applicant-reject-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onCancel();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="applicant-reject-dialog-title"
        aria-modal="true"
        className="job-applicant-dialog applicant-reject-dialog"
        role="dialog"
      >
        <button
          aria-label="Đóng hộp thoại xác nhận"
          className="job-applicant-dialog-close"
          disabled={isSaving}
          onClick={onCancel}
          type="button"
        >
          <DetailIcon name="xCircle" />
        </button>
        <h2 id="applicant-reject-dialog-title">Xác nhận từ chối hồ sơ</h2>
        <p>
          Ứng viên sẽ nhận được thông báo về kết quả xử lý hồ sơ. Vui lòng kiểm
          tra lại lý do trước khi xác nhận.
        </p>
        <div className="applicant-reject-preview">
          <span>Lý do từ chối</span>
          <p>{note}</p>
        </div>
        <div>
          <button
            disabled={isSaving}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Hủy
          </button>
          <button
            className="danger"
            disabled={isSaving}
            onClick={onConfirm}
            type="button"
          >
            {isSaving ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </div>
      </section>
    </div>
  );
}

function documentUrl(value?: string | null) {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${BACKEND_API_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  const parts = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('hour')}:${part('minute')}, ${part('day')}/${part(
    'month',
  )}/${part('year')}`;
}

function formatFileSize(size?: number | null) {
  if (!size) return 'Chưa cập nhật';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function formatMonth(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyInterviewForm(): InterviewForm {
  return {
    ngayPhongVan: '',
    gioBatDau: '',
    gioKetThuc: '',
    hinhThucPhongVan: 'TRUC_TIEP',
    diaDiemPhongVan: '',
    duongDanPhongVan: '',
    nguoiLienHe: '',
    soDienThoaiLienHe: '',
    noiDungChuanBi: '',
    ghiChuPhongVan: '',
  };
}

function createInterviewForm(item: ApplicantDetail): InterviewForm {
  const interview = item.thongTinPhongVan;
  const employer = item.tinTuyenDung?.nhaTuyenDung;
  return {
    ngayPhongVan: interview ? toDateInputValue(interview.thoiGianBatDau) : '',
    gioBatDau: interview ? toTimeInputValue(interview.thoiGianBatDau) : '',
    gioKetThuc: interview?.thoiGianKetThuc
      ? toTimeInputValue(interview.thoiGianKetThuc)
      : '',
    hinhThucPhongVan: interview?.hinhThucPhongVan ?? 'TRUC_TIEP',
    diaDiemPhongVan: interview?.diaDiemPhongVan ?? '',
    duongDanPhongVan: interview?.duongDanPhongVan ?? '',
    nguoiLienHe:
      interview?.nguoiLienHe ||
      employer?.nguoiDaiDien ||
      employer?.tenDonVi ||
      '',
    soDienThoaiLienHe:
      interview?.soDienThoaiLienHe ||
      employer?.soDienThoaiLienHe ||
      employer?.taiKhoan?.soDienThoai ||
      '',
    noiDungChuanBi: interview?.noiDungChuanBi ?? '',
    ghiChuPhongVan: interview?.ghiChuPhongVan ?? '',
  };
}

function validateInterviewForm(form: InterviewForm): {
  errors: InterviewFormErrors;
  firstError?: keyof InterviewForm;
  isValid: boolean;
  payload?: InterviewInvitationPayload;
} {
  const errors: InterviewFormErrors = {};
  const fields: Array<keyof InterviewForm> = [
    'ngayPhongVan',
    'gioBatDau',
    'gioKetThuc',
    'hinhThucPhongVan',
    'diaDiemPhongVan',
    'duongDanPhongVan',
    'nguoiLienHe',
    'soDienThoaiLienHe',
  ];

  if (!form.ngayPhongVan) {
    errors.ngayPhongVan = 'Vui lòng chọn ngày phỏng vấn.';
  }
  if (!form.gioBatDau) {
    errors.gioBatDau = 'Vui lòng chọn giờ bắt đầu.';
  }

  const start = getLocalDateTime(form.ngayPhongVan, form.gioBatDau);
  const end = form.gioKetThuc
    ? getLocalDateTime(form.ngayPhongVan, form.gioKetThuc)
    : null;
  if (start && start <= new Date()) {
    errors.ngayPhongVan =
      'Thời gian phỏng vấn phải lớn hơn thời gian hiện tại.';
  }
  if (start && end && end <= start) {
    errors.gioKetThuc = 'Giờ kết thúc phải sau giờ bắt đầu.';
  }
  if (!form.hinhThucPhongVan) {
    errors.hinhThucPhongVan = 'Vui lòng chọn hình thức phỏng vấn.';
  }
  if (form.hinhThucPhongVan === 'TRUC_TIEP' && !form.diaDiemPhongVan.trim()) {
    errors.diaDiemPhongVan = 'Vui lòng nhập địa điểm phỏng vấn trực tiếp.';
  }
  if (form.hinhThucPhongVan === 'TRUC_TUYEN') {
    if (!form.duongDanPhongVan.trim()) {
      errors.duongDanPhongVan = 'Vui lòng nhập đường dẫn tham gia phỏng vấn.';
    } else if (!isValidHttpUrl(form.duongDanPhongVan)) {
      errors.duongDanPhongVan = 'Đường dẫn phỏng vấn không hợp lệ.';
    }
  }
  if (!form.nguoiLienHe.trim()) {
    errors.nguoiLienHe = 'Vui lòng nhập tên người liên hệ.';
  }
  const phone = normalizePhoneInput(form.soDienThoaiLienHe);
  if (!phone) {
    errors.soDienThoaiLienHe = 'Vui lòng nhập số điện thoại liên hệ.';
  } else if (!/^\+84\d{9}$/.test(phone)) {
    errors.soDienThoaiLienHe = 'Số điện thoại liên hệ không hợp lệ.';
  }

  const firstError = fields.find((field) => errors[field]);
  if (firstError || !start) {
    return { errors, firstError, isValid: false };
  }

  const payload: InterviewInvitationPayload = {
    thoiGianBatDau: toLocalIsoString(start),
    hinhThucPhongVan: form.hinhThucPhongVan,
    nguoiLienHe: form.nguoiLienHe.trim(),
    soDienThoaiLienHe: phone,
  };
  if (end) payload.thoiGianKetThuc = toLocalIsoString(end);
  if (form.hinhThucPhongVan === 'TRUC_TIEP') {
    payload.diaDiemPhongVan = form.diaDiemPhongVan.trim();
  } else {
    payload.duongDanPhongVan = form.duongDanPhongVan.trim();
  }
  if (form.noiDungChuanBi.trim()) {
    payload.noiDungChuanBi = form.noiDungChuanBi.trim();
  }
  if (form.ghiChuPhongVan.trim()) {
    payload.ghiChuPhongVan = form.ghiChuPhongVan.trim();
  }

  return { errors, isValid: true, payload };
}

function getLocalDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInputValue(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;
}

function toTimeInputValue(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '';
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function toLocalIsoString(date: Date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  const hours = padDatePart(Math.floor(absolute / 60));
  const minutes = padDatePart(absolute % 60);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}T${padDatePart(date.getHours())}:${padDatePart(
    date.getMinutes(),
  )}:00${sign}${hours}:${minutes}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function normalizePhoneInput(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!compact) return '';
  if (/^0\d{9}$/.test(compact)) return `+84${compact.slice(1)}`;
  if (/^84\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

function interviewModeLabel(value: InterviewMode) {
  return value === 'TRUC_TIEP' ? 'Phỏng vấn trực tiếp' : 'Phỏng vấn trực tuyến';
}

function formatInterviewTimeRange(info: InterviewInfo) {
  const start = formatDateTime(info.thoiGianBatDau);
  const end = info.thoiGianKetThuc ? formatDateTime(info.thoiGianKetThuc) : '';
  return end ? `${start} - ${end}` : start;
}

function isValidHttpUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getVisibleStatusHistory(histories: ApplicationStatusHistory[]) {
  return [...histories]
    .sort(
      (a, b) =>
        getDateTimeValue(b.ngayThayDoi) - getDateTimeValue(a.ngayThayDoi),
    )
    .filter((history, index, sortedHistories) => {
      const previous = sortedHistories[index - 1];
      return !previous || !isDuplicateStatusHistory(previous, history);
    });
}

function isDuplicateStatusHistory(
  previous: ApplicationStatusHistory,
  current: ApplicationStatusHistory,
) {
  return (
    previous.trangThaiSau === current.trangThaiSau &&
    previous.trangThaiTruoc === current.trangThaiTruoc &&
    normalizeHistoryNote(previous.ghiChu) ===
      normalizeHistoryNote(current.ghiChu) &&
    getDateMinuteBucket(previous.ngayThayDoi) ===
      getDateMinuteBucket(current.ngayThayDoi)
  );
}

function normalizeHistoryNote(value?: string | null) {
  return value?.trim() ?? '';
}

function getDateTimeValue(value?: string | null) {
  return parseDate(value)?.getTime() ?? 0;
}

function getDateMinuteBucket(value?: string | null) {
  const time = getDateTimeValue(value);
  return time ? Math.floor(time / 60000) : 0;
}

function formatJobCode(value?: number | string | null) {
  if (value === null || value === undefined || value === '')
    return 'Chưa cập nhật';
  return `#${value}`;
}

function genderLabel(value?: string | null) {
  const labels: Record<string, string> = {
    NAM: 'Nam',
    NU: 'Nữ',
    KHAC: 'Khác',
  };
  return value ? (labels[value] ?? value) : 'Chưa cập nhật';
}

function jobSeekingLabel(value?: string | null) {
  const labels: Record<string, string> = {
    DANG_TIM_VIEC: 'Đang tìm việc',
    DANG_DI_LAM: 'Đang đi làm',
    KHONG_TIM_VIEC: 'Chưa có nhu cầu',
  };
  return value ? (labels[value] ?? value) : 'Chưa cập nhật';
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

type DetailIconName =
  | 'arrowLeft'
  | 'calendar'
  | 'checkCircle'
  | 'download'
  | 'edit'
  | 'eye'
  | 'fileText'
  | 'link'
  | 'mail'
  | 'mapPin'
  | 'phone'
  | 'user'
  | 'xCircle';

function DetailIcon({
  name,
  height = 16,
  width = 16,
  ...props
}: { name: DetailIconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<DetailIconName, ReactNode> = {
    arrowLeft: <path d="M19 12H5m6-7-7 7 7 7" />,
    calendar: (
      <path d="M7 3v4M17 3v4M4 9h16M5 5h14v15H5V5Zm4 8h2m3 0h2m-7 4h2" />
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />,
    edit: <path d="M12 20h9M16.5 3.5l4 4L8 20H4v-4L16.5 3.5Z" />,
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    fileText: <path d="M6 3h8l4 4v14H6V3Zm8 0v5h5M9 13h6M9 17h6" />,
    link: (
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    ),
    mail: <path d="M4 6h16v12H4V6Zm0 1 8 6 8-6" />,
    mapPin: (
      <>
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    phone: (
      <path d="M6 4h4l2 5-3 2a11 11 0 0 0 4 4l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    xCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6m0-6-6 6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="detail-icon"
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
