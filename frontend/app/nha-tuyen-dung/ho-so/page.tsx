'use client';

import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import Link from 'next/link';
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  RefObject,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ApprovalStatus =
  'BAN_NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'YEU_CAU_BO_SUNG';

type ApprovalTone = 'danger' | 'neutral' | 'success' | 'warning';

type ApprovalMeta = {
  action?: 'create-job' | 'edit-profile';
  description: string;
  icon: IconName;
  label: string;
  tone: ApprovalTone;
};

type ApiField = {
  id: number;
  tenLinhVuc: string;
};

type BusinessField = {
  id: number;
  name: string;
};

type ApiEmployerProfile = {
  id: number;
  tenDonVi: string;
  linhVucId?: number | null;
  linhVuc?: { tenLinhVuc?: string | null } | null;
  maSoThue: string;
  diaChiTruSo: string;
  nguoiDaiDien?: string | null;
  chucVuNguoiDaiDien?: string | null;
  soDienThoaiLienHe?: string | null;
  emailLienHe?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  moTaDonVi?: string | null;
  tepGiayPhepUrl?: string | null;
  trangThaiDuyet: string;
  lyDoTuChoi?: string | null;
  ngayGuiDuyet?: string | null;
  ngayDuyet?: string | null;
  ngayCapNhat?: string | null;
  taiKhoan?: { email?: string | null } | null;
};

type EmployerProfileForm = {
  tenDonVi: string;
  linhVucId: string;
  linhVucName: string;
  maSoThue: string;
  diaChiTruSo: string;
  nguoiDaiDien: string;
  chucVuNguoiDaiDien: string;
  soDienThoaiLienHe: string;
  email: string;
  emailLienHe: string;
  logoUrl: string;
  tepGiayPhepKinhDoanh: string;
  selectedLicenseName: string;
  trangThai: ApprovalStatus;
  lyDoTuChoi: string;
  ngayGuiDuyet: string;
  ngayDuyet: string;
  ngayCapNhat: string;
};

type ValidationErrors = Partial<Record<keyof EmployerProfileForm, string>>;

const emptyProfile: EmployerProfileForm = {
  tenDonVi: '',
  linhVucId: '',
  linhVucName: '',
  maSoThue: '',
  diaChiTruSo: '',
  nguoiDaiDien: '',
  chucVuNguoiDaiDien: '',
  soDienThoaiLienHe: '',
  email: '',
  emailLienHe: '',
  logoUrl: '',
  tepGiayPhepKinhDoanh: '',
  selectedLicenseName: '',
  trangThai: 'BAN_NHAP',
  lyDoTuChoi: '',
  ngayGuiDuyet: '',
  ngayDuyet: '',
  ngayCapNhat: '',
};

const approvalMeta: Record<ApprovalStatus, ApprovalMeta> = {
  BAN_NHAP: {
    label: 'Bản nháp hồ sơ',
    tone: 'neutral',
    icon: 'file',
    description:
      'Hãy cập nhật đầy đủ thông tin pháp lý và giấy phép kinh doanh trước khi gửi xét duyệt.',
    action: 'edit-profile',
  },
  CHO_DUYET: {
    label: 'Đang chờ phê duyệt',
    tone: 'warning',
    icon: 'clock',
    description:
      'Bạn chưa thể đăng tin tuyển dụng cho đến khi quản trị viên hoàn tất xét duyệt.',
  },
  DA_DUYET: {
    label: 'Đã phê duyệt',
    tone: 'success',
    icon: 'checkCircle',
    description:
      'Hồ sơ doanh nghiệp đã được phê duyệt. Bạn có thể đăng và quản lý tin tuyển dụng.',
    action: 'create-job',
  },
  TU_CHOI: {
    label: 'Cần bổ sung thông tin',
    tone: 'danger',
    icon: 'alertCircle',
    description:
      'Hồ sơ chưa được phê duyệt. Vui lòng kiểm tra và cập nhật các nội dung được yêu cầu.',
    action: 'edit-profile',
  },
  YEU_CAU_BO_SUNG: {
    label: 'Cần bổ sung thông tin',
    tone: 'danger',
    icon: 'alertCircle',
    description:
      'Hồ sơ cần bổ sung trước khi tiếp tục xét duyệt. Vui lòng cập nhật thông tin còn thiếu.',
    action: 'edit-profile',
  },
};

export default function EmployerProfilePage() {
  const [form, setForm] = useState<EmployerProfileForm>(emptyProfile);
  const [savedForm, setSavedForm] = useState<EmployerProfileForm>(emptyProfile);
  const [fields, setFields] = useState<BusinessField[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const firstErrorRef = useRef<HTMLInputElement | HTMLSelectElement | null>(
    null,
  );

  useEffect(() => {
    void loadProfile();
  }, []);

  const dirty = useMemo(
    () => serializeProfile(form) !== serializeProfile(savedForm),
    [form, savedForm],
  );

  const completionItems = useMemo(() => buildCompletion(form), [form]);
  const liveValidationErrors = useMemo(() => validateProfile(form), [form]);
  const completionPercent = Math.round(
    (completionItems.filter((item) => item.complete).length /
      completionItems.length) *
      100,
  );
  const meta = approvalMeta[form.trangThai] ?? approvalMeta.CHO_DUYET;
  const canSave =
    editing &&
    dirty &&
    !saving &&
    !Object.keys(liveValidationErrors).length &&
    !errors.tepGiayPhepKinhDoanh;

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue =
        'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?';
    }

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  async function loadProfile() {
    setLoading(true);
    setLoadError('');
    try {
      const [profile, fieldItems] = await Promise.all([
        portalFetch<ApiEmployerProfile>('/employer/profile'),
        portalFetch<ApiField[]>('/fields'),
      ]);
      const mappedFields = fieldItems.map((item) => ({
        id: item.id,
        name: item.tenLinhVuc,
      }));
      const nextForm = mapProfile(profile);

      setFields(mappedFields);
      setForm(nextForm);
      setSavedForm(nextForm);
      setErrors({});
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Không thể tải hồ sơ doanh nghiệp.',
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof EmployerProfileForm>(
    name: K,
    value: EmployerProfileForm[K],
  ) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setMessage('');
  }

  function cancelChanges() {
    setForm(savedForm);
    setErrors({});
    setMessage('');
    setEditing(false);
  }

  async function saveProfile(event?: FormEvent) {
    event?.preventDefault();
    if (saving) return;

    const nextErrors = validateProfile(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage('Vui lòng kiểm tra các trường cần bổ sung.');
      requestAnimationFrame(() => {
        firstErrorRef.current?.focus();
        firstErrorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      return;
    }

    setSaving(true);
    setMessage('Đang lưu thông tin doanh nghiệp...');
    try {
      const updated = await portalFetch<ApiEmployerProfile>(
        '/employer/profile',
        {
          method: 'PATCH',
          body: JSON.stringify(buildPayload(form)),
        },
      );
      const nextForm = mapProfile(updated, form);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditing(false);
      setMessage('Thông tin doanh nghiệp đã được cập nhật.');
    } catch {
      setMessage('Không thể lưu thông tin doanh nghiệp. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SiteShell
        breadcrumb="Trang chủ / Hồ sơ doanh nghiệp"
        pageClassName="employer-profile-page"
        role="employer"
        title="Hồ sơ doanh nghiệp"
        subtitle="Quản lý thông tin pháp lý và thông tin liên hệ của đơn vị."
      >
        <section className="container portal-content employer-profile-shell">
          <EmployerProfileSkeleton />
        </section>
      </SiteShell>
    );
  }

  if (loadError) {
    return (
      <SiteShell
        breadcrumb="Trang chủ / Hồ sơ doanh nghiệp"
        pageClassName="employer-profile-page"
        role="employer"
        title="Hồ sơ doanh nghiệp"
        subtitle="Quản lý thông tin pháp lý và thông tin liên hệ của đơn vị."
      >
        <section className="container portal-content">
          <div className="employer-profile-state" role="alert">
            <Icon name="alertCircle" />
            <h2>Không thể tải hồ sơ doanh nghiệp</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadProfile()}>
              Thử lại
            </button>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      breadcrumb="Trang chủ / Hồ sơ doanh nghiệp"
      pageClassName="employer-profile-page"
      role="employer"
      title="Hồ sơ doanh nghiệp"
      subtitle="Quản lý thông tin pháp lý và thông tin liên hệ của đơn vị."
    >
      <section className="container portal-content employer-profile-shell">
        <aside className="employer-profile-sidebar">
          <EmployerProfileSummary
            completionItems={completionItems}
            completionPercent={completionPercent}
            form={form}
            meta={meta}
          />
        </aside>

        <form
          className="employer-profile-main"
          onSubmit={(event) => {
            void saveProfile(event);
          }}
        >
          <EmployerApprovalStatus
            meta={meta}
            reason={form.lyDoTuChoi}
            onEdit={() => setEditing(true)}
          />

          {message && (
            <div
              aria-live="polite"
              className={`employer-profile-message ${
                message.startsWith('Thông tin') ||
                message.startsWith('Đang lưu')
                  ? 'success'
                  : 'error'
              }`}
            >
              {message}
            </div>
          )}

          <EmployerProfileSection
            description="Tên đơn vị, mã số thuế, lĩnh vực hoạt động và địa chỉ trụ sở."
            editing={editing}
            onEdit={() => setEditing(true)}
            title="Thông tin pháp lý"
          >
            {editing ? (
              <div className="employer-profile-form-grid">
                <TextField
                  error={errors.tenDonVi}
                  id="employer-name"
                  inputRef={firstFieldRef(firstErrorRef, errors, 'tenDonVi')}
                  label="Tên đơn vị"
                  onChange={(value) => updateField('tenDonVi', value)}
                  placeholder="Nhập tên doanh nghiệp hoặc đơn vị"
                  required
                  value={form.tenDonVi}
                  wide
                />
                <ReadonlyField
                  helper="Mã số thuế được sử dụng làm tên đăng nhập của doanh nghiệp. Liên hệ quản trị viên nếu cần điều chỉnh mã số thuế."
                  icon="lock"
                  label="Mã số thuế"
                  value={form.maSoThue}
                />
                <SelectField
                  error={errors.linhVucId}
                  fields={fields}
                  id="employer-field"
                  inputRef={firstFieldRef(firstErrorRef, errors, 'linhVucId')}
                  label="Lĩnh vực hoạt động"
                  onChange={(value) => updateField('linhVucId', value)}
                  required
                  value={form.linhVucId}
                />
                <TextField
                  error={errors.diaChiTruSo}
                  id="employer-address"
                  inputRef={firstFieldRef(firstErrorRef, errors, 'diaChiTruSo')}
                  label="Địa chỉ trụ sở"
                  onChange={(value) => updateField('diaChiTruSo', value)}
                  placeholder="Nhập địa chỉ trụ sở"
                  required
                  value={form.diaChiTruSo}
                  wide
                />
              </div>
            ) : (
              <dl className="employer-profile-info-grid">
                <InfoItem label="Tên đơn vị" value={form.tenDonVi} wide />
                <InfoItem
                  helper="Mã số thuế được dùng làm tên đăng nhập."
                  label="Mã số thuế"
                  value={form.maSoThue}
                />
                <InfoItem label="Lĩnh vực hoạt động" value={form.linhVucName} />
                <InfoItem
                  label="Địa chỉ trụ sở"
                  value={form.diaChiTruSo}
                  wide
                />
              </dl>
            )}
          </EmployerProfileSection>

          <EmployerProfileSection
            description="Thông tin người đại diện pháp lý hoặc đầu mối được ủy quyền."
            editing={editing}
            onEdit={() => setEditing(true)}
            title="Người đại diện"
          >
            {editing ? (
              <div className="employer-profile-form-grid">
                <TextField
                  error={errors.nguoiDaiDien}
                  id="employer-representative"
                  inputRef={firstFieldRef(
                    firstErrorRef,
                    errors,
                    'nguoiDaiDien',
                  )}
                  label="Người đại diện"
                  onChange={(value) => updateField('nguoiDaiDien', value)}
                  placeholder="Nhập họ và tên người đại diện"
                  required
                  value={form.nguoiDaiDien}
                />
                <TextField
                  error={errors.chucVuNguoiDaiDien}
                  id="employer-representative-title"
                  inputRef={firstFieldRef(
                    firstErrorRef,
                    errors,
                    'chucVuNguoiDaiDien',
                  )}
                  label="Chức vụ người đại diện"
                  onChange={(value) => updateField('chucVuNguoiDaiDien', value)}
                  placeholder="Nhập chức vụ"
                  required
                  value={form.chucVuNguoiDaiDien}
                />
              </div>
            ) : (
              <dl className="employer-profile-info-grid">
                <InfoItem label="Người đại diện" value={form.nguoiDaiDien} />
                <InfoItem
                  label="Chức vụ người đại diện"
                  value={form.chucVuNguoiDaiDien}
                />
              </dl>
            )}
          </EmployerProfileSection>

          <EmployerProfileSection
            description="Thông tin để hệ thống và người lao động liên hệ với doanh nghiệp."
            editing={editing}
            onEdit={() => setEditing(true)}
            title="Thông tin liên hệ"
          >
            {editing ? (
              <div className="employer-profile-form-grid">
                <TextField
                  error={errors.soDienThoaiLienHe}
                  id="employer-phone"
                  inputRef={firstFieldRef(
                    firstErrorRef,
                    errors,
                    'soDienThoaiLienHe',
                  )}
                  label="Số điện thoại liên hệ"
                  onChange={(value) => updateField('soDienThoaiLienHe', value)}
                  placeholder="024 3999 0001"
                  required
                  value={form.soDienThoaiLienHe}
                />
                <ReadonlyField
                  helper="Email này được dùng để đăng nhập và nhận thông báo hệ thống."
                  icon="lock"
                  label="Email tài khoản"
                  value={form.email}
                />
                <TextField
                  error={errors.emailLienHe}
                  id="employer-contact-email"
                  inputRef={firstFieldRef(firstErrorRef, errors, 'emailLienHe')}
                  label="Email liên hệ tuyển dụng"
                  onChange={(value) => updateField('emailLienHe', value)}
                  placeholder="tuyendung@congty.vn"
                  type="email"
                  value={form.emailLienHe}
                  wide
                />
              </div>
            ) : (
              <dl className="employer-profile-info-grid">
                <InfoItem
                  label="Số điện thoại liên hệ"
                  value={formatPhone(form.soDienThoaiLienHe)}
                />
                <InfoItem
                  helper="Email đăng nhập và nhận thông báo hệ thống."
                  label="Email tài khoản"
                  value={form.email}
                />
                <InfoItem
                  label="Email liên hệ tuyển dụng"
                  value={form.emailLienHe}
                  wide
                />
              </dl>
            )}
          </EmployerProfileSection>

          <EmployerProfileSection
            description="Tài liệu pháp lý giúp quản trị viên xác minh doanh nghiệp."
            editing={editing}
            onEdit={() => setEditing(true)}
            title="Giấy phép kinh doanh"
          >
            <BusinessLicensePanel
              editing={editing}
              error={errors.tepGiayPhepKinhDoanh}
              licenseValue={form.tepGiayPhepKinhDoanh}
              selectedName={form.selectedLicenseName}
              statusMeta={meta}
              updatedAt={form.ngayCapNhat}
              onFileError={(error) => {
                setErrors((current) => ({
                  ...current,
                  tepGiayPhepKinhDoanh: error,
                }));
              }}
              onFileChange={(fileName) => {
                updateField('tepGiayPhepKinhDoanh', fileName);
                updateField('selectedLicenseName', fileName);
              }}
            />
          </EmployerProfileSection>
        </form>
      </section>

      <EmployerProfileSaveBar
        canSave={canSave}
        dirty={dirty}
        editing={editing}
        message={message}
        onCancel={cancelChanges}
        onSave={() => void saveProfile()}
        saving={saving}
      />
    </SiteShell>
  );
}

function EmployerProfileSummary({
  completionItems,
  completionPercent,
  form,
  meta,
}: {
  completionItems: Array<{ complete: boolean; id: string; label: string }>;
  completionPercent: number;
  form: EmployerProfileForm;
  meta: ApprovalMeta;
}) {
  return (
    <div className="employer-summary-card">
      <div className="employer-logo-wrap">
        {form.logoUrl ? (
          <img alt={`Logo ${form.tenDonVi}`} src={form.logoUrl} />
        ) : (
          <span aria-label={`Logo ${form.tenDonVi || 'doanh nghiệp'}`}>
            {companyInitials(form.tenDonVi)}
          </span>
        )}
      </div>
      <h2 title={form.tenDonVi}>{form.tenDonVi || 'Doanh nghiệp'}</h2>
      <p title={form.email}>{form.email || 'Chưa có email'}</p>
      <ApprovalBadge meta={meta} />

      <div className="employer-completion">
        <div>
          <strong>Hồ sơ hoàn thiện {completionPercent}%</strong>
          <span>{completionItems.length} nhóm thông tin</span>
        </div>
        <i aria-label={`Hồ sơ hoàn thiện ${completionPercent}%`}>
          <em style={{ width: `${completionPercent}%` }} />
        </i>
      </div>

      <div className="employer-summary-list">
        {completionItems.map((item) => (
          <div key={item.id}>
            <span>{item.label}</span>
            <strong>{item.complete ? 'Hoàn tất' : 'Chưa cập nhật'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployerApprovalStatus({
  meta,
  onEdit,
  reason,
}: {
  meta: ApprovalMeta;
  onEdit: () => void;
  reason: string;
}) {
  return (
    <section className={`employer-approval-panel ${meta.tone}`}>
      <div>
        <ApprovalBadge meta={meta} />
        <p>{meta.description}</p>
        {reason && <p className="approval-reason">Lý do: {reason}</p>}
      </div>
      {meta.action === 'create-job' && (
        <Link
          className="employer-primary-action"
          href="/nha-tuyen-dung/tin-tuyen-dung/tao-moi"
        >
          <Icon name="plus" />
          Đăng tin tuyển dụng
        </Link>
      )}
      {meta.action === 'edit-profile' && (
        <button
          className="employer-secondary-action"
          onClick={onEdit}
          type="button"
        >
          <Icon name="edit" />
          Cập nhật hồ sơ
        </button>
      )}
    </section>
  );
}

function ApprovalBadge({ meta }: { meta: ApprovalMeta }) {
  return (
    <span className={`employer-status-badge ${meta.tone}`}>
      <Icon name={meta.icon} />
      {meta.label}
    </span>
  );
}

function EmployerProfileSection({
  children,
  description,
  editing,
  onEdit,
  title,
}: {
  children: ReactNode;
  description: string;
  editing: boolean;
  onEdit: () => void;
  title: string;
}) {
  return (
    <section className="employer-profile-section">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {!editing && (
          <button type="button" onClick={onEdit}>
            <Icon name="edit" />
            Chỉnh sửa
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function BusinessLicensePanel({
  editing,
  error,
  licenseValue,
  onFileChange,
  onFileError,
  selectedName,
  statusMeta,
  updatedAt,
}: {
  editing: boolean;
  error?: string;
  licenseValue: string;
  onFileChange: (fileName: string) => void;
  onFileError: (error: string) => void;
  selectedName: string;
  statusMeta: ApprovalMeta;
  updatedAt: string;
}) {
  const inputId = 'employer-license-file';
  const hasLicense = Boolean(licenseValue);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateLicenseFile(file);
    if (validationError) {
      onFileError(validationError);
      return;
    }

    onFileError('');
    onFileChange(file.name);
  }

  if (hasLicense) {
    return (
      <>
        <div className="business-license-card">
          <span>{fileExtension(licenseValue)}</span>
          <div>
            <strong title={fileName(licenseValue)}>
              {selectedName || fileName(licenseValue)}
            </strong>
            <small>
              {updatedAt
                ? `Cập nhật ngày ${formatDate(updatedAt)}`
                : 'Tệp minh chứng doanh nghiệp'}
            </small>
            <ApprovalBadge meta={statusMeta} />
          </div>
          <div>
            {isDownloadableUrl(licenseValue) && (
              <a href={licenseValue} target="_blank" rel="noreferrer">
                Xem tài liệu
              </a>
            )}
            {editing && (
              <label htmlFor={inputId}>
                <Icon name="upload" />
                Thay thế
                <input
                  accept=".pdf,.jpg,.jpeg,.png"
                  id={inputId}
                  onChange={handleFileChange}
                  type="file"
                />
              </label>
            )}
          </div>
        </div>
        <FieldError id="employer-license-error" value={error} />
      </>
    );
  }

  if (!editing) {
    return (
      <div className="employer-empty-document">
        <Icon name="file" />
        <strong>Chưa cập nhật giấy phép kinh doanh</strong>
        <p>Nhấn “Chỉnh sửa” để chọn tài liệu pháp lý của doanh nghiệp.</p>
      </div>
    );
  }

  return (
    <label
      className={`business-license-dropzone ${error ? 'error' : ''}`}
      htmlFor={inputId}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          document.getElementById(inputId)?.click();
        }
      }}
    >
      <input
        accept=".pdf,.jpg,.jpeg,.png"
        aria-describedby={error ? 'employer-license-error' : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
        onChange={handleFileChange}
        type="file"
      />
      <Icon name="upload" />
      <strong>Kéo thả hoặc chọn giấy phép kinh doanh</strong>
      <small>PDF, JPG hoặc PNG · Tối đa 5 MB</small>
      <FieldError id="employer-license-error" value={error} />
    </label>
  );
}

function EmployerProfileSaveBar({
  canSave,
  dirty,
  editing,
  message,
  onCancel,
  onSave,
  saving,
}: {
  canSave: boolean;
  dirty: boolean;
  editing: boolean;
  message: string;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!editing && !dirty) return null;

  return (
    <div className={`employer-save-bar ${dirty ? 'visible' : ''}`}>
      <div aria-live="polite">
        <strong>Bạn có thay đổi chưa được lưu.</strong>
        <span>
          {message || 'Kiểm tra thông tin trước khi gửi lại xét duyệt.'}
        </span>
      </div>
      <div>
        <button onClick={onCancel} disabled={saving} type="button">
          Hủy thay đổi
        </button>
        <button onClick={onSave} disabled={!canSave} type="button">
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </div>
    </div>
  );
}

function TextField({
  error,
  id,
  inputRef,
  label,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
  wide,
}: {
  error?: string;
  id: string;
  inputRef?: RefObject<HTMLInputElement | HTMLSelectElement | null>;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
  wide?: boolean;
}) {
  const errorId = `${id}-error`;

  return (
    <label className={`employer-field ${wide ? 'wide' : ''}`} htmlFor={id}>
      <span>
        {label}
        {required && <b aria-label="bắt buộc"> *</b>}
      </span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef as RefObject<HTMLInputElement> | undefined}
        type={type}
        value={value}
      />
      <FieldError id={errorId} value={error} />
    </label>
  );
}

function SelectField({
  error,
  fields,
  id,
  inputRef,
  label,
  onChange,
  required,
  value,
}: {
  error?: string;
  fields: BusinessField[];
  id: string;
  inputRef?: RefObject<HTMLInputElement | HTMLSelectElement | null>;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const errorId = `${id}-error`;

  return (
    <label className="employer-field employer-select-field" htmlFor={id}>
      <span>
        {label}
        {required && <b aria-label="bắt buộc"> *</b>}
      </span>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        ref={inputRef as RefObject<HTMLSelectElement> | undefined}
        value={value}
      >
        <option value="">Chọn lĩnh vực</option>
        {fields.map((field) => (
          <option value={field.id} key={field.id}>
            {field.name}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" />
      <FieldError id={errorId} value={error} />
    </label>
  );
}

function ReadonlyField({
  helper,
  icon,
  label,
  value,
}: {
  helper?: string;
  icon?: IconName;
  label: string;
  value: string;
}) {
  return (
    <div className="employer-readonly-field">
      <span>
        {icon && <Icon name={icon} />}
        {label}
      </span>
      <strong>{value || 'Chưa cập nhật'}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}

function InfoItem({
  helper,
  label,
  value,
  wide,
}: {
  helper?: string;
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'wide' : undefined}>
      <dt>{label}</dt>
      <dd>{value || 'Chưa cập nhật'}</dd>
      {helper && <small>{helper}</small>}
    </div>
  );
}

function FieldError({ id, value }: { id: string; value?: string }) {
  if (!value) return null;
  return (
    <small className="employer-field-error" id={id}>
      {value}
    </small>
  );
}

function EmployerProfileSkeleton() {
  return (
    <>
      <aside className="employer-summary-card skeleton">
        <span />
        <span />
        <span />
      </aside>
      <div className="employer-profile-main">
        {['status', 'legal', 'representative', 'contact'].map((item) => (
          <section className="employer-profile-section skeleton" key={item}>
            <span />
            <span />
            <span />
          </section>
        ))}
        <span className="sr-only">Đang tải hồ sơ doanh nghiệp...</span>
      </div>
    </>
  );
}

function mapProfile(
  profile: ApiEmployerProfile,
  fallback?: EmployerProfileForm,
): EmployerProfileForm {
  const status = normalizeApprovalStatus(profile.trangThaiDuyet);

  return {
    tenDonVi: profile.tenDonVi ?? '',
    linhVucId: profile.linhVucId ? String(profile.linhVucId) : '',
    linhVucName: profile.linhVuc?.tenLinhVuc ?? fallback?.linhVucName ?? '',
    maSoThue: profile.maSoThue ?? '',
    diaChiTruSo: profile.diaChiTruSo ?? '',
    nguoiDaiDien: profile.nguoiDaiDien ?? '',
    chucVuNguoiDaiDien: profile.chucVuNguoiDaiDien ?? '',
    soDienThoaiLienHe: profile.soDienThoaiLienHe ?? '',
    email: profile.taiKhoan?.email ?? fallback?.email ?? '',
    emailLienHe: profile.emailLienHe ?? '',
    logoUrl: profile.logoUrl ?? '',
    tepGiayPhepKinhDoanh: profile.tepGiayPhepUrl ?? '',
    selectedLicenseName: '',
    trangThai: status,
    lyDoTuChoi: profile.lyDoTuChoi ?? '',
    ngayGuiDuyet: profile.ngayGuiDuyet ?? '',
    ngayDuyet: profile.ngayDuyet ?? '',
    ngayCapNhat: profile.ngayCapNhat ?? '',
  };
}

function buildPayload(form: EmployerProfileForm) {
  return {
    tenDonVi: form.tenDonVi.trim(),
    linhVucId: form.linhVucId ? Number(form.linhVucId) : null,
    diaChiTruSo: form.diaChiTruSo.trim(),
    nguoiDaiDien: form.nguoiDaiDien.trim() || null,
    chucVuNguoiDaiDien: form.chucVuNguoiDaiDien.trim() || null,
    soDienThoaiLienHe: form.soDienThoaiLienHe.trim() || null,
    emailLienHe: form.emailLienHe.trim() || null,
    logoUrl: form.logoUrl || null,
    tepGiayPhepKinhDoanh: form.tepGiayPhepKinhDoanh || null,
  };
}

function serializeProfile(form: EmployerProfileForm) {
  return JSON.stringify(buildPayload(form));
}

function validateProfile(form: EmployerProfileForm) {
  const nextErrors: ValidationErrors = {};

  if (!form.tenDonVi.trim()) {
    nextErrors.tenDonVi = 'Vui lòng nhập tên đơn vị.';
  }
  if (!form.linhVucId) {
    nextErrors.linhVucId = 'Vui lòng chọn lĩnh vực hoạt động.';
  }
  if (!form.diaChiTruSo.trim()) {
    nextErrors.diaChiTruSo = 'Vui lòng nhập địa chỉ trụ sở.';
  }
  if (!form.nguoiDaiDien.trim()) {
    nextErrors.nguoiDaiDien = 'Vui lòng nhập người đại diện.';
  }
  if (!form.chucVuNguoiDaiDien.trim()) {
    nextErrors.chucVuNguoiDaiDien = 'Vui lòng nhập chức vụ người đại diện.';
  }
  if (!isValidPhone(form.soDienThoaiLienHe)) {
    nextErrors.soDienThoaiLienHe = 'Số điện thoại liên hệ không hợp lệ.';
  }
  if (form.emailLienHe && !isValidEmail(form.emailLienHe)) {
    nextErrors.emailLienHe = 'Email không đúng định dạng.';
  }

  return nextErrors;
}

function validateLicenseFile(file: File) {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const lowerName = file.name.toLowerCase();
  const validExtension =
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png');

  if (!allowedTypes.includes(file.type) && !validExtension) {
    return 'File giấy phép phải có định dạng PDF, JPG hoặc PNG.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Dung lượng file không được vượt quá 5 MB.';
  }

  return '';
}

function buildCompletion(form: EmployerProfileForm) {
  return [
    {
      id: 'legal',
      label: 'Thông tin pháp lý',
      complete: Boolean(
        form.tenDonVi && form.maSoThue && form.linhVucId && form.diaChiTruSo,
      ),
    },
    {
      id: 'representative',
      label: 'Người đại diện',
      complete: Boolean(form.nguoiDaiDien && form.chucVuNguoiDaiDien),
    },
    {
      id: 'contact',
      label: 'Thông tin liên hệ',
      complete: Boolean(form.soDienThoaiLienHe && form.email),
    },
    {
      id: 'license',
      label: 'Giấy phép kinh doanh',
      complete: Boolean(form.tepGiayPhepKinhDoanh),
    },
  ];
}

function normalizeApprovalStatus(value: string): ApprovalStatus {
  if (
    value === 'BAN_NHAP' ||
    value === 'CHO_DUYET' ||
    value === 'DA_DUYET' ||
    value === 'TU_CHOI' ||
    value === 'YEU_CAU_BO_SUNG'
  ) {
    return value;
  }

  return 'CHO_DUYET';
}

function firstFieldRef<K extends keyof EmployerProfileForm>(
  ref: RefObject<HTMLInputElement | HTMLSelectElement | null>,
  errors: ValidationErrors,
  key: K,
) {
  return Object.keys(errors)[0] === key ? ref : undefined;
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return value;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fileName(value: string) {
  if (!value) return 'giay-phep-kinh-doanh.pdf';
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split('/').pop() || value);
  } catch {
    return value.split(/[\\/]/).pop() || value;
  }
}

function fileExtension(value: string) {
  const extension = fileName(value).split('.').pop()?.toUpperCase();
  return extension && extension.length <= 4 ? extension : 'FILE';
}

function isDownloadableUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

function companyInitials(value: string) {
  const source =
    value
      .replace(
        /\b(công ty|cong ty|tnhh|mtv|cp|cổ phần|co phan|doanh nghiệp)\b/gi,
        ' ',
      )
      .trim() || value;
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return initials || 'DN';
}

type IconName =
  | 'alertCircle'
  | 'checkCircle'
  | 'chevronDown'
  | 'clock'
  | 'edit'
  | 'file'
  | 'lock'
  | 'plus'
  | 'upload';

function Icon({
  name,
  height = 18,
  width = 18,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </>
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    chevronDown: <path d="m6 9 6 6 6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    edit: <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Zm11-12 3 3" />,
    file: <path d="M6 3h8l4 4v14H6V3Zm8 0v5h5" />,
    lock: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    upload: <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />,
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
