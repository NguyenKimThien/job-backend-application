'use client';

import SiteShell from '@/components/SiteShell';
import { ACCOUNT_KEY } from '@/lib/backend-api';
import { ApiJob, portalFetch } from '@/lib/portal-api';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode, RefObject } from 'react';

type Category = { id: number; name: string };
type JobEditorMode = 'create' | 'edit';
type JobEditorProps = {
  jobId?: string;
  mode?: JobEditorMode;
};
type StoredAccount = {
  email?: string;
  hoTen?: string;
  tenDangNhap?: string;
  tenHienThi?: string;
};
type JobForm = {
  viTriTuyenDung: string;
  nganhNgheId: string;
  chuyenMon: string;
  hinhThucLamViec: string;
  phuongThucLamViec: string;
  soLuongTuyen: string;
  tinhThanhPho: string;
  quanHuyen: string;
  diaChiLamViecCuThe: string;
  mucLuongTu: string;
  mucLuongDen: string;
  coTheThoaThuan: boolean;
  soNamKinhNghiemToiThieu: string;
  trinhDoYeuCau: string;
  moTaCongViec: string;
  yeuCauUngVien: string;
  quyenLoi: string;
  thoiHanNhanHoSo: string;
  skills: string[];
};

type FormField = keyof JobForm;
type SectionKey = 'job' | 'compensation' | 'candidate' | 'content' | 'deadline';
type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type SectionProgress = {
  requiredCount: number;
  completedCount: number;
  isComplete: boolean;
  missingFields: string[];
};
type ValidationRequirement = {
  key: string;
  section: SectionKey;
  label: string;
  missingLabel: string | ((form: JobForm) => string);
  errorMessage: string | ((form: JobForm) => string);
  getField: (form: JobForm) => FormField;
  isApplicable?: (form: JobForm) => boolean;
  isComplete: (form: JobForm) => boolean;
};

const initialForm: JobForm = {
  viTriTuyenDung: '',
  nganhNgheId: '',
  chuyenMon: '',
  hinhThucLamViec: 'TOAN_THOI_GIAN',
  phuongThucLamViec: 'TAI_VAN_PHONG',
  soLuongTuyen: '1',
  tinhThanhPho: 'Hà Nội',
  quanHuyen: '',
  diaChiLamViecCuThe: '',
  mucLuongTu: '',
  mucLuongDen: '',
  coTheThoaThuan: false,
  soNamKinhNghiemToiThieu: '0',
  trinhDoYeuCau: '',
  moTaCongViec: '',
  yeuCauUngVien: '',
  quyenLoi: '',
  thoiHanNhanHoSo: '',
  skills: [],
};

const districts = [
  'Ba Đình',
  'Hoàn Kiếm',
  'Đống Đa',
  'Hai Bà Trưng',
  'Cầu Giấy',
  'Thanh Xuân',
  'Nam Từ Liêm',
  'Bắc Từ Liêm',
  'Long Biên',
  'Hà Đông',
  'Tây Hồ',
  'Hoàng Mai',
  'Sơn Tây',
  'Đông Anh',
  'Gia Lâm',
  'Hoài Đức',
  'Thanh Trì',
];

const educationOptions: ReadonlyArray<Readonly<[string, string]>> = [
  ['KHONG_YEU_CAU', 'Không yêu cầu'],
  ['THPT', 'Trung học phổ thông'],
  ['TRUNG_CAP', 'Trung cấp'],
  ['CAO_DANG', 'Cao đẳng'],
  ['DAI_HOC', 'Đại học'],
  ['SAU_DAI_HOC', 'Sau đại học'],
];

const sectionDefinitions: Array<{
  key: SectionKey;
  index: number;
  title: string;
  description: string;
}> = [
  {
    key: 'job',
    index: 1,
    title: 'Thông tin công việc',
    description: 'Tên vị trí, ngành nghề và loại hình làm việc.',
  },
  {
    key: 'compensation',
    index: 2,
    title: 'Địa điểm và mức lương',
    description: 'Địa điểm được tách để tìm kiếm và gợi ý chính xác hơn.',
  },
  {
    key: 'candidate',
    index: 3,
    title: 'Tiêu chí ứng viên',
    description: 'Kinh nghiệm, trình độ và kỹ năng dùng cho so khớp hồ sơ.',
  },
  {
    key: 'content',
    index: 4,
    title: 'Nội dung tuyển dụng',
    description: 'Mô tả ngắn gọn, rõ trách nhiệm, yêu cầu và quyền lợi.',
  },
  {
    key: 'deadline',
    index: 5,
    title: 'Thời hạn nhận hồ sơ',
    description: 'Thiết lập hạn cuối để người lao động nộp hồ sơ.',
  },
];

const fieldSections: Partial<Record<FormField, SectionKey>> = {
  viTriTuyenDung: 'job',
  nganhNgheId: 'job',
  chuyenMon: 'job',
  hinhThucLamViec: 'job',
  phuongThucLamViec: 'job',
  soLuongTuyen: 'job',
  tinhThanhPho: 'compensation',
  quanHuyen: 'compensation',
  diaChiLamViecCuThe: 'compensation',
  mucLuongTu: 'compensation',
  mucLuongDen: 'compensation',
  coTheThoaThuan: 'compensation',
  soNamKinhNghiemToiThieu: 'candidate',
  trinhDoYeuCau: 'candidate',
  skills: 'candidate',
  moTaCongViec: 'content',
  yeuCauUngVien: 'content',
  quyenLoi: 'content',
  thoiHanNhanHoSo: 'deadline',
};

const fieldLabels: Partial<Record<FormField, string>> = {
  viTriTuyenDung: 'Tiêu đề công việc',
  nganhNgheId: 'Ngành nghề',
  chuyenMon: 'Vị trí hoặc chuyên môn',
  hinhThucLamViec: 'Loại hình công việc',
  phuongThucLamViec: 'Phương thức làm việc',
  soLuongTuyen: 'Số lượng tuyển',
  tinhThanhPho: 'Tỉnh/Thành phố',
  quanHuyen: 'Quận/Huyện',
  diaChiLamViecCuThe: 'Địa chỉ làm việc cụ thể',
  mucLuongTu: 'Lương tối thiểu',
  mucLuongDen: 'Lương tối đa',
  soNamKinhNghiemToiThieu: 'Kinh nghiệm yêu cầu',
  trinhDoYeuCau: 'Trình độ yêu cầu',
  moTaCongViec: 'Mô tả công việc',
  yeuCauUngVien: 'Yêu cầu ứng viên',
  quyenLoi: 'Quyền lợi',
  thoiHanNhanHoSo: 'Hạn nộp hồ sơ',
  skills: 'Kỹ năng yêu cầu',
};

const validationRequirements: ValidationRequirement[] = [
  textRequirement({
    key: 'job-title',
    section: 'job',
    field: 'viTriTuyenDung',
    label: 'Tiêu đề công việc',
    missingLabel: 'Chưa nhập tiêu đề công việc',
  }),
  textRequirement({
    key: 'job-category',
    section: 'job',
    field: 'nganhNgheId',
    label: 'Ngành nghề',
    missingLabel: 'Chưa chọn ngành nghề',
  }),
  textRequirement({
    key: 'job-type',
    section: 'job',
    field: 'hinhThucLamViec',
    label: 'Loại hình công việc',
    missingLabel: 'Chưa chọn loại hình công việc',
  }),
  textRequirement({
    key: 'work-mode',
    section: 'job',
    field: 'phuongThucLamViec',
    label: 'Phương thức làm việc',
    missingLabel: 'Chưa chọn phương thức làm việc',
  }),
  {
    key: 'headcount',
    section: 'job',
    label: 'Số lượng tuyển',
    missingLabel: 'Số lượng tuyển phải lớn hơn 0',
    errorMessage: 'Số lượng tuyển phải lớn hơn 0.',
    getField: () => 'soLuongTuyen',
    isComplete: (form) => Number(form.soLuongTuyen) >= 1,
  },
  textRequirement({
    key: 'province',
    section: 'compensation',
    field: 'tinhThanhPho',
    label: 'Tỉnh/Thành phố',
    missingLabel: 'Chưa chọn tỉnh/thành phố',
    isApplicable: requiresWorkLocation,
  }),
  textRequirement({
    key: 'district',
    section: 'compensation',
    field: 'quanHuyen',
    label: 'Quận/Huyện',
    missingLabel: 'Chưa chọn quận/huyện',
    isApplicable: requiresWorkLocation,
  }),
  textRequirement({
    key: 'work-address',
    section: 'compensation',
    field: 'diaChiLamViecCuThe',
    label: 'Địa chỉ làm việc cụ thể',
    missingLabel: 'Chưa nhập địa chỉ làm việc cụ thể',
    isApplicable: requiresWorkLocation,
  }),
  {
    key: 'salary',
    section: 'compensation',
    label: 'Mức lương',
    missingLabel: salaryMissingLabel,
    errorMessage: salaryErrorMessage,
    getField: salaryErrorField,
    isComplete: hasValidSalary,
  },
  {
    key: 'experience',
    section: 'candidate',
    label: 'Kinh nghiệm yêu cầu',
    missingLabel: 'Kinh nghiệm yêu cầu không hợp lệ',
    errorMessage: 'Kinh nghiệm yêu cầu không được nhỏ hơn 0.',
    getField: () => 'soNamKinhNghiemToiThieu',
    isComplete: (form) => Number(form.soNamKinhNghiemToiThieu) >= 0,
  },
  textRequirement({
    key: 'job-description',
    section: 'content',
    field: 'moTaCongViec',
    label: 'Mô tả công việc',
    missingLabel: 'Chưa nhập mô tả công việc',
  }),
  textRequirement({
    key: 'candidate-requirements',
    section: 'content',
    field: 'yeuCauUngVien',
    label: 'Yêu cầu ứng viên',
    missingLabel: 'Chưa nhập yêu cầu ứng viên',
  }),
  {
    key: 'deadline',
    section: 'deadline',
    label: 'Hạn nộp hồ sơ',
    missingLabel: deadlineMissingLabel,
    errorMessage: deadlineErrorMessage,
    getField: () => 'thoiHanNhanHoSo',
    isComplete: hasValidDeadline,
  },
];

export default function CreateJobEditorPage() {
  return <JobEditorPage mode="create" />;
}

export function JobEditorPage({ jobId, mode = 'create' }: JobEditorProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const [form, setForm] = useState<JobForm>(initialForm);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [editJob, setEditJob] = useState<ApiJob | null>(null);
  const [jobLoading, setJobLoading] = useState(isEditMode);
  const [jobLoadMessage, setJobLoadMessage] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('job');
  const fieldRefs = useRef<Partial<Record<FormField, FieldElement | null>>>({});
  const previewButtonRef = useRef<HTMLButtonElement | null>(null);
  const previewDialogRef = useRef<HTMLElement | null>(null);
  const remainingEdits = Math.max(0, 3 - (editJob?.editCount ?? 0));
  const pageTitle = isEditMode
    ? 'Chỉnh sửa tin tuyển dụng'
    : 'Tạo tin tuyển dụng';
  const pageSubtitle = isEditMode
    ? 'Cập nhật thông tin theo yêu cầu kiểm duyệt và gửi lại cho quản trị viên.'
    : 'Chuẩn hóa thông tin để hệ thống có thể gợi ý việc làm phù hợp cho người lao động.';

  useEffect(() => {
    portalFetch<Category[]>('/categories')
      .then(setCategories)
      .catch((error) => setMessage(error.message))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setJobLoading(false);
      return;
    }
    if (!jobId) {
      setJobLoadMessage('Không tìm thấy tin tuyển dụng cần chỉnh sửa.');
      setJobLoading(false);
      return;
    }

    let active = true;
    setJobLoading(true);
    setJobLoadMessage('');
    portalFetch<ApiJob>(`/employer/jobs/${jobId}`)
      .then((jobData) => {
        if (!active) return;
        setEditJob(jobData);
        setForm(jobToForm(jobData));
        setEmployerName((current) => current || jobData.company || '');
      })
      .catch((error) => {
        if (!active) return;
        setJobLoadMessage(
          error instanceof Error
            ? error.message
            : 'Không thể tải tin tuyển dụng.',
        );
      })
      .finally(() => {
        if (active) setJobLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isEditMode, jobId]);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACCOUNT_KEY);
    if (!stored) return;

    try {
      const account = JSON.parse(stored) as StoredAccount;
      setEmployerName(
        account.tenHienThi ??
          account.hoTen ??
          account.tenDangNhap ??
          account.email ??
          '',
      );
    } catch {
      setEmployerName('');
    }
  }, []);

  useEffect(() => {
    if (!previewOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => previewDialogRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePreview();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = getFocusableElements(previewDialogRef.current);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewOpen]);

  const progress = useMemo(() => getFormProgress(form), [form]);
  const completion = progress.overall;
  const sectionStatus = progress.sections;

  const errorList = useMemo(
    () =>
      Object.entries(errors).map(([field, error]) => ({
        field: field as FormField,
        label: fieldLabels[field as FormField] ?? 'Thông tin',
        error,
      })),
    [errors],
  );

  function registerField(field: FormField) {
    return (element: FieldElement | null) => {
      fieldRefs.current[field] = element;
    };
  }

  function scrollToSection(section: SectionKey) {
    setActiveSection(section);
    document
      .getElementById(`job-create-section-${section}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function focusField(field: FormField) {
    const section = fieldSections[field];
    if (section) setActiveSection(section);

    const element = fieldRefs.current[field];
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => element?.focus({ preventScroll: true }), 220);
  }

  function update<K extends FormField>(field: K, value: JobForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'mucLuongTu' || field === 'mucLuongDen') {
        delete next.mucLuongTu;
        delete next.mucLuongDen;
      }
      return next;
    });
  }

  function toggleSalaryNegotiable(checked: boolean) {
    setForm((current) => ({
      ...current,
      coTheThoaThuan: checked,
      mucLuongTu: checked ? '' : current.mucLuongTu,
      mucLuongDen: checked ? '' : current.mucLuongDen,
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.mucLuongTu;
      delete next.mucLuongDen;
      return next;
    });
  }

  function addSkill() {
    const value = skillInput.trim().replace(/\s+/g, ' ');
    const duplicate = form.skills.some(
      (skill) => skill.toLowerCase() === value.toLowerCase(),
    );
    if (!value) return;
    if (value.length < 2 || value.length > 50) {
      setErrors((current) => ({
        ...current,
        skills: 'Mỗi kỹ năng cần từ 2 đến 50 ký tự.',
      }));
      return;
    }
    if (duplicate) {
      setErrors((current) => ({ ...current, skills: 'Kỹ năng đã tồn tại.' }));
      return;
    }
    if (form.skills.length >= 15) {
      setErrors((current) => ({
        ...current,
        skills: 'Chỉ được thêm tối đa 15 kỹ năng.',
      }));
      return;
    }
    setForm((current) => ({ ...current, skills: [...current.skills, value] }));
    setSkillInput('');
    setErrors((current) => {
      const next = { ...current };
      delete next.skills;
      return next;
    });
  }

  function validateSubmit() {
    const currentProgress = getFormProgress(form);
    const nextErrors = currentProgress.errors;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      if (currentProgress.firstInvalidField) {
        window.setTimeout(
          () => focusField(currentProgress.firstInvalidField!),
          0,
        );
      }
      return false;
    }
    return true;
  }

  async function save(action: 'draft' | 'submit') {
    if (saving) return;
    if (action === 'submit' && !validateSubmit()) return;

    setSaving(action);
    setMessage(
      action === 'draft' ? 'Đang lưu bản nháp...' : 'Đang gửi kiểm duyệt...',
    );
    try {
      await portalFetch(
        isEditMode && jobId ? `/employer/jobs/${jobId}` : '/employer/jobs',
        {
          method: isEditMode ? 'PATCH' : 'POST',
          body: JSON.stringify(buildPayload(form, action)),
        },
      );
      if (action === 'submit') {
        setMessage('');
        setPreviewOpen(false);
        setConfirmOpen(false);
        setSuccessOpen(true);
      } else {
        setMessage('Tin tuyển dụng đã được lưu dưới dạng bản nháp.');
        window.setTimeout(
          () => router.push('/nha-tuyen-dung/tin-tuyen-dung'),
          700,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu tin tuyển dụng.',
      );
    } finally {
      setSaving(null);
      setConfirmOpen(false);
    }
  }

  function openPreview() {
    setPreviewing(true);
    window.setTimeout(() => {
      setPreviewOpen(true);
      setPreviewing(false);
    }, 120);
  }

  function closePreview() {
    setPreviewOpen(false);
    window.setTimeout(() => previewButtonRef.current?.focus(), 0);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validateSubmit()) setConfirmOpen(true);
  }

  if (jobLoading) {
    return (
      <SiteShell
        pageClassName="job-create-page"
        role="employer"
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        <section className="container portal-content editor-layout">
          <div className="content-card detail-loading">Đang tải dữ liệu...</div>
        </section>
      </SiteShell>
    );
  }

  if (isEditMode && (jobLoadMessage || !editJob)) {
    return (
      <SiteShell
        pageClassName="job-create-page"
        role="employer"
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        <section className="container portal-content editor-layout">
          <div className="content-card employer-edit-limit-message">
            <strong>Không thể tải tin tuyển dụng</strong>
            <p>{jobLoadMessage || 'Không tìm thấy tin tuyển dụng cần chỉnh sửa.'}</p>
          </div>
        </section>
      </SiteShell>
    );
  }

  if (isEditMode && editJob?.status !== 'TU_CHOI') {
    return (
      <SiteShell
        pageClassName="job-create-page"
        role="employer"
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        <section className="container portal-content editor-layout">
          <div className="content-card employer-edit-limit-message">
            <strong>Tin tuyển dụng không được phép chỉnh sửa</strong>
            <p>
              Chỉ tin tuyển dụng ở trạng thái Từ chối mới được chỉnh sửa và gửi
              lại để kiểm duyệt.
            </p>
          </div>
        </section>
      </SiteShell>
    );
  }

  if (isEditMode && remainingEdits === 0) {
    return (
      <SiteShell
        pageClassName="job-create-page"
        role="employer"
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        <section className="container portal-content editor-layout">
          <div className="content-card employer-edit-limit-message">
            <strong>Đã hết lượt chỉnh sửa tin tuyển dụng</strong>
            <p>
              Tin này đã được chỉnh sửa đủ 3 lần nên không thể tiếp tục thay
              đổi. Bạn có thể quay lại danh sách tin tuyển dụng để theo dõi
              trạng thái kiểm duyệt.
            </p>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      pageClassName="job-create-page"
      role="employer"
      title={pageTitle}
      subtitle={pageSubtitle}
    >
      <section className="container portal-content editor-layout">
        <form
          className="content-card editor-form"
          noValidate
          onSubmit={submitForm}
        >
          <div className="job-editor-intro">
            <div>
              <span className="job-editor-kicker">
                {isEditMode ? 'Gửi lại kiểm duyệt' : 'Tin mới'}
              </span>
              <h2>
                {isEditMode
                  ? 'Chỉnh sửa thông tin tuyển dụng'
                  : 'Điền thông tin tuyển dụng'}
              </h2>
            </div>
            <p>
              Các trường có dấu <span className="required-mark">*</span> là bắt
              buộc trước khi gửi kiểm duyệt.
            </p>
          </div>

          {isEditMode && editJob && (
            <div className="form-message info employer-edit-quota-message">
              Bạn còn <strong>{remainingEdits}/3 lượt chỉnh sửa</strong> cho tin
              tuyển dụng này. Sau khi gửi lại, số lượt còn lại sẽ giảm 1.
            </div>
          )}
          {isEditMode && editJob?.rejectionReason && (
            <div className="form-message error">
              Yêu cầu từ quản trị viên: {editJob.rejectionReason}
            </div>
          )}
          {message && (
            <div
              className={`form-message ${message.includes('đã') ? 'success' : 'info'}`}
              role="status"
            >
              {message}
            </div>
          )}

          {errorList.length > 0 && (
            <div
              className="job-error-summary"
              role="alert"
              aria-live="assertive"
            >
              <div>
                <Icon name="alert" />
                <strong>Cần kiểm tra {errorList.length} mục</strong>
              </div>
              <ul>
                {errorList.map(({ field, label, error }) => (
                  <li key={field}>
                    <button type="button" onClick={() => focusField(field)}>
                      <span>{label}</span>
                      <small>{error}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EditorSection
            active={activeSection === 'job'}
            complete={sectionStatus.job.isComplete}
            definition={sectionDefinitions[0]}
            missingCount={sectionStatus.job.missingFields.length}
            onFocus={() => setActiveSection('job')}
          >
            <div className="form-grid">
              <TextInput
                error={errors.viTriTuyenDung}
                field="viTriTuyenDung"
                inputRef={registerField('viTriTuyenDung')}
                label="Tiêu đề công việc"
                placeholder="Ví dụ: Nhân viên kinh doanh B2B"
                required
                value={form.viTriTuyenDung}
                onChange={(value) => update('viTriTuyenDung', value)}
              />
              <SelectInput
                error={errors.nganhNgheId}
                field="nganhNgheId"
                helper={
                  categoriesLoading
                    ? 'Đang tải danh sách ngành nghề...'
                    : undefined
                }
                inputRef={registerField('nganhNgheId')}
                label="Ngành nghề"
                required
                value={form.nganhNgheId}
                onChange={(value) => update('nganhNgheId', value)}
                options={[
                  ['', categoriesLoading ? 'Đang tải...' : 'Chọn ngành nghề'],
                  ...categories.map(
                    (item) => [String(item.id), item.name] as const,
                  ),
                ]}
              />
              <TextInput
                field="chuyenMon"
                inputRef={registerField('chuyenMon')}
                label="Vị trí hoặc chuyên môn"
                placeholder="Ví dụ: Sales, kế toán tổng hợp"
                value={form.chuyenMon}
                onChange={(value) => update('chuyenMon', value)}
              />
              <SelectInput
                error={errors.hinhThucLamViec}
                field="hinhThucLamViec"
                inputRef={registerField('hinhThucLamViec')}
                label="Loại hình công việc"
                required
                value={form.hinhThucLamViec}
                onChange={(value) => update('hinhThucLamViec', value)}
                options={[
                  ['TOAN_THOI_GIAN', 'Toàn thời gian'],
                  ['BAN_THOI_GIAN', 'Bán thời gian'],
                  ['THUC_TAP', 'Thực tập'],
                  ['THOI_VU', 'Thời vụ'],
                ]}
              />
              <SelectInput
                error={errors.phuongThucLamViec}
                field="phuongThucLamViec"
                inputRef={registerField('phuongThucLamViec')}
                label="Phương thức làm việc"
                required
                value={form.phuongThucLamViec}
                onChange={(value) => update('phuongThucLamViec', value)}
                options={[
                  ['TAI_VAN_PHONG', 'Làm việc tại văn phòng'],
                  ['TU_XA', 'Làm việc từ xa'],
                  ['KET_HOP', 'Làm việc kết hợp'],
                ]}
              />
              <TextInput
                error={errors.soLuongTuyen}
                field="soLuongTuyen"
                helper="Số hồ sơ được duyệt vẫn phải tuân theo số lượng tuyển của tin."
                inputRef={registerField('soLuongTuyen')}
                label="Số lượng tuyển"
                min={1}
                required
                type="number"
                value={form.soLuongTuyen}
                onChange={(value) => update('soLuongTuyen', value)}
              />
            </div>
          </EditorSection>

          <EditorSection
            active={activeSection === 'compensation'}
            complete={sectionStatus.compensation.isComplete}
            definition={sectionDefinitions[1]}
            missingCount={sectionStatus.compensation.missingFields.length}
            onFocus={() => setActiveSection('compensation')}
          >
            <div className="form-grid">
              <SelectInput
                error={errors.tinhThanhPho}
                field="tinhThanhPho"
                inputRef={registerField('tinhThanhPho')}
                label="Tỉnh/Thành phố"
                required={form.phuongThucLamViec !== 'TU_XA'}
                value={form.tinhThanhPho}
                onChange={(value) => update('tinhThanhPho', value)}
                options={[['Hà Nội', 'Hà Nội']]}
              />
              <SelectInput
                field="quanHuyen"
                inputRef={registerField('quanHuyen')}
                label="Quận/Huyện"
                value={form.quanHuyen}
                onChange={(value) => update('quanHuyen', value)}
                options={[
                  ['', 'Chọn quận/huyện'],
                  ...districts.map((item) => [item, item] as const),
                ]}
              />
              <TextInput
                error={errors.diaChiLamViecCuThe}
                field="diaChiLamViecCuThe"
                inputRef={registerField('diaChiLamViecCuThe')}
                label="Địa chỉ làm việc cụ thể"
                placeholder="Số nhà, đường/phố, tòa nhà"
                required={form.phuongThucLamViec !== 'TU_XA'}
                value={form.diaChiLamViecCuThe}
                onChange={(value) => update('diaChiLamViecCuThe', value)}
              />
              <MoneyInput
                disabled={form.coTheThoaThuan}
                error={errors.mucLuongTu}
                field="mucLuongTu"
                inputRef={registerField('mucLuongTu')}
                label="Lương tối thiểu"
                placeholder="8.000.000"
                value={form.mucLuongTu}
                onChange={(value) => update('mucLuongTu', value)}
              />
              <MoneyInput
                disabled={form.coTheThoaThuan}
                error={errors.mucLuongDen}
                field="mucLuongDen"
                inputRef={registerField('mucLuongDen')}
                label="Lương tối đa"
                placeholder="15.000.000"
                value={form.mucLuongDen}
                onChange={(value) => update('mucLuongDen', value)}
              />
              <label className="form-group full checkbox-line">
                <input
                  checked={form.coTheThoaThuan}
                  onChange={(event) =>
                    toggleSalaryNegotiable(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>Lương thỏa thuận</span>
              </label>
            </div>
          </EditorSection>

          <EditorSection
            active={activeSection === 'candidate'}
            complete={sectionStatus.candidate.isComplete}
            definition={sectionDefinitions[2]}
            missingCount={sectionStatus.candidate.missingFields.length}
            onFocus={() => setActiveSection('candidate')}
          >
            <div className="form-grid">
              <SelectInput
                error={errors.soNamKinhNghiemToiThieu}
                field="soNamKinhNghiemToiThieu"
                inputRef={registerField('soNamKinhNghiemToiThieu')}
                label="Kinh nghiệm yêu cầu"
                value={form.soNamKinhNghiemToiThieu}
                onChange={(value) => update('soNamKinhNghiemToiThieu', value)}
                options={[
                  ['0', 'Không yêu cầu kinh nghiệm'],
                  ['1', 'Dưới 1 năm hoặc 1 năm'],
                  ['2', '2 năm'],
                  ['3', '3 năm'],
                  ['4', '4 năm'],
                  ['5', '5 năm'],
                  ['6', 'Trên 5 năm'],
                ]}
              />
              <SelectInput
                field="trinhDoYeuCau"
                inputRef={registerField('trinhDoYeuCau')}
                label="Trình độ yêu cầu"
                value={form.trinhDoYeuCau}
                onChange={(value) => update('trinhDoYeuCau', value)}
                options={educationOptions}
              />
              <div className="form-group full">
                <span>Kỹ năng yêu cầu</span>
                <div className="tag-editor">
                  <input
                    aria-describedby={
                      errors.skills ? 'field-skills-error' : undefined
                    }
                    aria-invalid={Boolean(errors.skills)}
                    placeholder="Nhập kỹ năng rồi bấm Enter"
                    ref={
                      registerField('skills') as (
                        element: HTMLInputElement | null,
                      ) => void
                    }
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <button
                    className="tag-add-button"
                    type="button"
                    onClick={addSkill}
                  >
                    <Icon name="plus" />
                    <span>Thêm</span>
                  </button>
                </div>
                {errors.skills && (
                  <small className="field-error" id="field-skills-error">
                    {errors.skills}
                  </small>
                )}
                <div className="tag-list" aria-label="Kỹ năng đã thêm">
                  {form.skills.map((skill) => (
                    <button
                      aria-label={`Xóa kỹ năng ${skill}`}
                      key={skill}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          skills: current.skills.filter(
                            (item) => item !== skill,
                          ),
                        }))
                      }
                    >
                      {skill}
                      <Icon name="x" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            active={activeSection === 'content'}
            complete={sectionStatus.content.isComplete}
            definition={sectionDefinitions[3]}
            missingCount={sectionStatus.content.missingFields.length}
            onFocus={() => setActiveSection('content')}
          >
            <TextareaInput
              error={errors.moTaCongViec}
              field="moTaCongViec"
              inputRef={registerField('moTaCongViec')}
              label="Mô tả công việc"
              placeholder="Mô tả nhiệm vụ chính, phạm vi công việc và mục tiêu của vị trí."
              required
              value={form.moTaCongViec}
              onChange={(value) => update('moTaCongViec', value)}
            />
            <TextareaInput
              error={errors.yeuCauUngVien}
              field="yeuCauUngVien"
              inputRef={registerField('yeuCauUngVien')}
              label="Yêu cầu ứng viên chi tiết"
              placeholder="Nêu rõ kinh nghiệm, kỹ năng, thái độ và các điều kiện cần có."
              required
              value={form.yeuCauUngVien}
              onChange={(value) => update('yeuCauUngVien', value)}
            />
            <TextareaInput
              field="quyenLoi"
              inputRef={registerField('quyenLoi')}
              label="Quyền lợi"
              placeholder="Lương thưởng, phúc lợi, đào tạo, môi trường làm việc."
              value={form.quyenLoi}
              onChange={(value) => update('quyenLoi', value)}
            />
          </EditorSection>

          <EditorSection
            active={activeSection === 'deadline'}
            complete={sectionStatus.deadline.isComplete}
            definition={sectionDefinitions[4]}
            missingCount={sectionStatus.deadline.missingFields.length}
            onFocus={() => setActiveSection('deadline')}
          >
            <div className="form-grid">
              <TextInput
                error={errors.thoiHanNhanHoSo}
                field="thoiHanNhanHoSo"
                inputRef={registerField('thoiHanNhanHoSo')}
                label="Hạn nộp hồ sơ"
                required
                type="date"
                value={form.thoiHanNhanHoSo}
                onChange={(value) => update('thoiHanNhanHoSo', value)}
              />
            </div>
          </EditorSection>

          <div className="job-editor-actionbar">
            <span className="actionbar-note">
              {completion.missing.length
                ? `Còn ${completion.missing.length} trường bắt buộc cần hoàn thiện`
                : 'Đã đủ trường bắt buộc để gửi kiểm duyệt'}
            </span>
            <button
              className="btn btn-outline"
              disabled={previewing}
              onClick={openPreview}
              ref={previewButtonRef}
              type="button"
            >
              <Icon name="eye" />
              <span>{previewing ? 'Đang mở...' : 'Xem trước'}</span>
            </button>
            <button
              className="btn btn-primary"
              disabled={Boolean(saving)}
              type="submit"
            >
              <Icon name="send" />
              <span>
                {saving === 'submit'
                  ? 'Đang gửi...'
                  : isEditMode
                    ? 'Lưu và gửi kiểm duyệt'
                    : 'Gửi kiểm duyệt'}
              </span>
            </button>
          </div>
        </form>

        <aside
          className="editor-tips content-card"
          aria-label="Tiến độ tạo tin tuyển dụng"
        >
          <div className="sidebar-progress-header">
            <h3>Mức độ hoàn thiện</h3>
            <strong>{completion.percent}%</strong>
          </div>
          <div className="completion-meter" aria-hidden="true">
            <span style={{ width: `${completion.percent}%` }} />
          </div>
          <p>
            Đã hoàn thành {completion.count}/{completion.total} trường bắt buộc.
          </p>
          <nav className="completion-nav" aria-label="Các phần của form">
            {sectionDefinitions.map((section) => {
              const status = sectionStatus[section.key];
              const complete = status.isComplete;
              return (
                <button
                  className={[
                    activeSection === section.key ? 'active' : '',
                    complete ? 'complete' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={section.key}
                  type="button"
                  onClick={() => scrollToSection(section.key)}
                >
                  <span>
                    {complete ? <Icon name="check" /> : section.index}
                  </span>
                  <strong>{section.title}</strong>
                  <small>
                    {status.requiredCount
                      ? `${status.completedCount}/${status.requiredCount} bắt buộc`
                      : 'Không có trường bắt buộc'}
                  </small>
                </button>
              );
            })}
          </nav>
          {completion.missing.length > 0 && (
            <ul className="missing-list">
              {completion.missing.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="sidebar-note">
            Tin sẽ được quản trị viên kiểm duyệt trước khi hiển thị.
          </p>
        </aside>
      </section>

      {previewOpen && (
        <PreviewDialog
          category={
            categories.find((item) => String(item.id) === form.nganhNgheId)
              ?.name
          }
          dialogRef={previewDialogRef}
          employerName={employerName}
          form={form}
          progress={progress}
          saving={saving === 'submit'}
          submitLabel={isEditMode ? 'Lưu và gửi kiểm duyệt' : 'Gửi kiểm duyệt'}
          onClose={closePreview}
          onEditField={(field) => {
            closePreview();
            window.setTimeout(() => focusField(field), 80);
          }}
          onSubmit={() => void save('submit')}
        />
      )}
      {confirmOpen && (
        <div className="preview-layer" role="dialog" aria-modal="true">
          <div className="content-card preview-dialog">
            <h2>
              {isEditMode
                ? 'Gửi lại tin tuyển dụng để kiểm duyệt?'
                : 'Gửi tin tuyển dụng để kiểm duyệt?'}
            </h2>
            <p>
              {isEditMode
                ? 'Sau khi gửi lại, tin sẽ chờ quản trị viên kiểm duyệt và số lượt chỉnh sửa còn lại sẽ giảm 1.'
                : 'Sau khi gửi, tin sẽ chờ quản trị viên kiểm duyệt trước khi hiển thị.'}
            </p>
            <div className="form-footer">
              <button
                className="btn btn-outline"
                disabled={Boolean(saving)}
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                Kiểm tra lại
              </button>
              <button
                className="btn btn-primary"
                disabled={Boolean(saving)}
                onClick={() => void save('submit')}
                type="button"
              >
                Xác nhận gửi
              </button>
            </div>
          </div>
        </div>
      )}
      {successOpen && (
        <SubmitSuccessDialog
          description={
            isEditMode
              ? 'Thông tin tuyển dụng đã được cập nhật và gửi lại kiểm duyệt. Tin sẽ hiển thị sau khi được quản trị viên phê duyệt.'
              : 'Thông tin tuyển dụng đã được gửi kiểm duyệt. Tin sẽ hiển thị sau khi được quản trị viên phê duyệt.'
          }
          title={isEditMode ? 'Gửi lại tin thành công' : 'Đăng tin thành công'}
          onBackToJobs={() => router.push('/nha-tuyen-dung/tin-tuyen-dung')}
        />
      )}
    </SiteShell>
  );
}

function SubmitSuccessDialog({
  description,
  onBackToJobs,
  title,
}: {
  description: string;
  onBackToJobs: () => void;
  title: string;
}) {
  return (
    <div
      aria-labelledby="job-submit-success-title"
      aria-modal="true"
      className="preview-layer job-submit-success-layer"
      role="dialog"
    >
      <div className="content-card preview-dialog job-submit-success-dialog">
        <div className="job-submit-success-icon">
          <Icon name="check" />
        </div>
        <h2 id="job-submit-success-title">{title}</h2>
        <p>{description}</p>
        <button className="btn btn-primary" onClick={onBackToJobs} type="button">
          Quay về trang tin tuyển dụng
        </button>
      </div>
    </div>
  );
}

function EditorSection({
  active,
  children,
  complete,
  definition,
  missingCount,
  onFocus,
}: {
  active: boolean;
  children: ReactNode;
  complete: boolean;
  definition: (typeof sectionDefinitions)[number];
  missingCount: number;
  onFocus: () => void;
}) {
  return (
    <section
      className={[
        'job-editor-section',
        active ? 'active' : '',
        complete ? 'complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`job-create-section-${definition.key}`}
      onFocusCapture={onFocus}
    >
      <div className="card-title numbered">
        <b>{complete ? <Icon name="check" /> : definition.index}</b>
        <div>
          <h2>{definition.title}</h2>
          <p>{definition.description}</p>
        </div>
        <span className={complete ? 'section-badge complete' : 'section-badge'}>
          {complete ? 'Hoàn tất' : `${missingCount} còn thiếu`}
        </span>
      </div>
      {children}
    </section>
  );
}

function TextInput({
  error,
  field,
  helper,
  inputRef,
  label,
  min,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
}: {
  error?: string;
  field: FormField;
  helper?: string;
  inputRef?: (element: HTMLInputElement | null) => void;
  label: string;
  min?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  const id = `field-${field}`;
  const describedBy = describedByIds(id, helper, error);
  return (
    <label className="form-group" htmlFor={id}>
      <span>
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        id={id}
        min={min}
        placeholder={placeholder}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper && (
        <small className="field-helper" id={`${id}-helper`}>
          {helper}
        </small>
      )}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

function SelectInput({
  error,
  field,
  helper,
  inputRef,
  label,
  onChange,
  options,
  required,
  value,
}: {
  error?: string;
  field: FormField;
  helper?: string;
  inputRef?: (element: HTMLSelectElement | null) => void;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<Readonly<[string, string]>>;
  required?: boolean;
  value: string;
}) {
  const id = `field-${field}`;
  const describedBy = describedByIds(id, helper, error);
  return (
    <label className="form-group" htmlFor={id}>
      <span>
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      <select
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        id={id}
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={`${field}-${optionValue}`} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      {helper && (
        <small className="field-helper" id={`${id}-helper`}>
          {helper}
        </small>
      )}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

function MoneyInput({
  disabled,
  error,
  field,
  inputRef,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  error?: string;
  field: FormField;
  inputRef?: (element: HTMLInputElement | null) => void;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const id = `field-${field}`;
  const describedBy = describedByIds(id, undefined, error);
  return (
    <label className="form-group" htmlFor={id}>
      <span>{label}</span>
      <span className="money-field">
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          id={id}
          inputMode="numeric"
          placeholder={placeholder}
          ref={inputRef}
          value={formatMoneyInput(value)}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        />
        <small>VNĐ</small>
      </span>
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

function TextareaInput({
  error,
  field,
  inputRef,
  label,
  maxLength = 2000,
  onChange,
  placeholder,
  required,
  value,
}: {
  error?: string;
  field: FormField;
  inputRef?: (element: HTMLTextAreaElement | null) => void;
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const id = `field-${field}`;
  const helper = `Tối đa ${maxLength.toLocaleString('vi-VN')} ký tự.`;
  const describedBy = describedByIds(id, helper, error);
  const remaining = maxLength - value.length;
  return (
    <label className="form-group full" htmlFor={id}>
      <span>
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      <textarea
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        id={id}
        maxLength={maxLength}
        placeholder={placeholder}
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="textarea-meta">
        <small className="field-helper" id={`${id}-helper`}>
          {helper}
        </small>
        <small
          className={
            remaining <= 120 ? 'textarea-counter warning' : 'textarea-counter'
          }
        >
          {value.length.toLocaleString('vi-VN')}/
          {maxLength.toLocaleString('vi-VN')} ký tự
        </small>
      </span>
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

function PreviewDialog({
  category,
  dialogRef,
  employerName,
  form,
  progress,
  saving,
  submitLabel,
  onClose,
  onEditField,
  onSubmit,
}: {
  category?: string;
  dialogRef: RefObject<HTMLElement | null>;
  employerName: string;
  form: JobForm;
  progress: ReturnType<typeof getFormProgress>;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onEditField: (field: FormField) => void;
  onSubmit: () => void;
}) {
  const titleId = 'job-preview-title';
  const descriptionId = 'job-preview-description';
  const invalidEntries = Object.entries(progress.errors).map(
    ([field, error]) => ({
      field: field as FormField,
      label: fieldLabels[field as FormField] ?? 'Thông tin',
      error,
    }),
  );
  const canSubmit = invalidEntries.length === 0 && !saving;
  const companyName = employerName.trim();
  const displayCompanyName = companyName || 'Nhà tuyển dụng';
  const overviewItems = [
    {
      icon: 'location',
      label: 'Địa điểm',
      value: formatPreviewLocation(form),
    },
    {
      icon: 'money',
      label: 'Mức lương',
      value: formatPreviewSalary(form),
    },
    {
      icon: 'users',
      label: 'Số lượng tuyển',
      value: formatQuantity(form.soLuongTuyen),
    },
    {
      icon: 'briefcase',
      label: 'Kinh nghiệm yêu cầu',
      value: experienceLabel(form.soNamKinhNghiemToiThieu),
    },
    {
      icon: 'education',
      label: 'Trình độ yêu cầu',
      value: educationLabel(form.trinhDoYeuCau),
      optional: true,
    },
    {
      icon: 'calendar',
      label: 'Hạn nộp hồ sơ',
      value: formatDateInput(form.thoiHanNhanHoSo),
    },
  ].filter((item) => item.value || !item.optional);

  return (
    <div className="preview-layer job-preview-layer">
      <article
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="content-card preview-dialog job-preview-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="job-preview-header">
          <div>
            <h2 id={titleId}>Xem trước tin tuyển dụng</h2>
            <p id={descriptionId}>
              Kiểm tra nội dung và cách hiển thị trước khi gửi kiểm duyệt.
            </p>
          </div>
          <button
            aria-label="Đóng bản xem trước"
            className="preview-close"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" />
          </button>
        </header>

        <div className="job-preview-body">
          {invalidEntries.length > 0 && (
            <section className="job-preview-warning" aria-live="polite">
              <div>
                <Icon name="alert" />
                <strong>
                  Tin tuyển dụng còn {invalidEntries.length} thông tin bắt buộc
                  chưa hoàn thiện.
                </strong>
              </div>
              <p>
                Bạn có thể xem trước nhưng chưa thể gửi kiểm duyệt cho đến khi
                hoàn thiện các trường bắt buộc.
              </p>
              <ul>
                {invalidEntries.slice(0, 5).map((item) => (
                  <li key={item.field}>
                    <button
                      type="button"
                      onClick={() => onEditField(item.field)}
                    >
                      <span>{item.label}</span>
                      <small>{item.error}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="job-preview-hero">
            <div className="job-preview-logo" aria-hidden="true">
              {initials(displayCompanyName)}
            </div>
            <div className="job-preview-title-block">
              <h1>
                {form.viTriTuyenDung.trim() || 'Tin tuyển dụng chưa có tiêu đề'}
              </h1>
              <p>{displayCompanyName}</p>
              <div className="job-preview-meta">
                {category ? (
                  <span>{category}</span>
                ) : (
                  <span>Chưa chọn ngành nghề</span>
                )}
                <span>{workTypeLabel(form.hinhThucLamViec)}</span>
                <span>{workModeLabel(form.phuongThucLamViec)}</span>
              </div>
            </div>
          </section>

          <section className="job-preview-section">
            <h3>Thông tin tổng quan</h3>
            <div className="job-preview-overview">
              {overviewItems.map((item) => (
                <div className="job-preview-overview-item" key={item.label}>
                  <Icon name={item.icon as IconName} />
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value || 'Chưa cập nhật'}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <PreviewTextSection
            required
            title="Mô tả công việc"
            value={form.moTaCongViec}
          />
          <PreviewTextSection
            required
            title="Yêu cầu ứng viên"
            value={form.yeuCauUngVien}
          />

          <section className="job-preview-section">
            <h3>Kỹ năng yêu cầu</h3>
            {form.skills.length > 0 ? (
              <div className="tag-list job-preview-skills">
                {dedupeSkills(form.skills).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            ) : (
              <p className="job-preview-empty">
                Chưa cập nhật kỹ năng yêu cầu.
              </p>
            )}
          </section>

          {form.quyenLoi.trim() && (
            <PreviewTextSection title="Quyền lợi" value={form.quyenLoi} />
          )}

          <section className="job-preview-section">
            <h3>Thời hạn nhận hồ sơ</h3>
            <div className="job-preview-detail-list">
              <div>
                <span>Hạn nộp hồ sơ</span>
                <strong>{formatDateInput(form.thoiHanNhanHoSo)}</strong>
              </div>
            </div>
          </section>
        </div>

        <footer className="job-preview-footer">
          <button className="btn btn-outline" onClick={onClose} type="button">
            <Icon name="back" />
            <span>Quay lại chỉnh sửa</span>
          </button>
          <div className="job-preview-submit-group">
            {!canSubmit && (
              <small>Hoàn thiện các trường bắt buộc trước khi gửi.</small>
            )}
            <button
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={onSubmit}
              type="button"
            >
              <Icon name="send" />
              <span>{saving ? 'Đang gửi...' : submitLabel}</span>
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}

function PreviewTextSection({
  required,
  title,
  value,
}: {
  required?: boolean;
  title: string;
  value: string;
}) {
  const content = value.trim();
  if (!content && !required) return null;

  return (
    <section className="job-preview-section">
      <h3>{title}</h3>
      {content ? (
        <p className="job-preview-preline">{content}</p>
      ) : (
        <p className="job-preview-empty">Chưa cập nhật</p>
      )}
    </section>
  );
}

function dedupeSkills(skills: string[]) {
  return Array.from(
    new Map(
      skills
        .map((skill) => skill.trim())
        .filter(Boolean)
        .map((skill) => [skill.toLowerCase(), skill]),
    ).values(),
  );
}

function formatPreviewSalary(form: JobForm) {
  if (form.coTheThoaThuan) return 'Thỏa thuận';

  const salaryFrom = numberFromMoney(form.mucLuongTu);
  const salaryTo = numberFromMoney(form.mucLuongDen);
  if (salaryFrom && salaryTo) {
    return `${formatMoneyInput(String(salaryFrom))} – ${formatMoneyInput(
      String(salaryTo),
    )} VNĐ`;
  }
  if (salaryFrom) return `Từ ${formatMoneyInput(String(salaryFrom))} VNĐ`;
  if (salaryTo) return `Đến ${formatMoneyInput(String(salaryTo))} VNĐ`;
  return 'Chưa cập nhật';
}

function formatPreviewLocation(form: JobForm) {
  if (form.phuongThucLamViec === 'TU_XA') return 'Làm việc từ xa';
  return (
    [form.diaChiLamViecCuThe, form.quanHuyen, form.tinhThanhPho]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ') || 'Chưa cập nhật'
  );
}

function formatQuantity(value: string) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) return 'Chưa cập nhật';
  return `${quantity.toLocaleString('vi-VN')} người`;
}

function formatDateInput(value: string) {
  if (!value.trim()) return 'Chưa cập nhật';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return 'Chưa cập nhật';
  return `${day}/${month}/${year}`;
}

function experienceLabel(value: string) {
  const years = Number(value);
  if (!Number.isFinite(years) || years < 0) return 'Chưa cập nhật';
  if (years === 0) return 'Không yêu cầu kinh nghiệm';
  if (years === 1) return 'Dưới 1 năm hoặc 1 năm';
  if (years === 6) return 'Trên 5 năm';
  return `${years} năm`;
}

function educationLabel(value: string) {
  return (
    Object.fromEntries(educationOptions)[value] ?? (value.trim() ? value : '')
  );
}

function initials(value: string) {
  const letters = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
  return letters || 'NTD';
}

function describedByIds(id: string, helper?: string, error?: string) {
  const ids = [];
  if (helper) ids.push(`${id}-helper`);
  if (error) ids.push(`${id}-error`);
  return ids.length ? ids.join(' ') : undefined;
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'));
}

function getFormProgress(form: JobForm) {
  const sections = sectionDefinitions.reduce(
    (result, section) => {
      result[section.key] = {
        requiredCount: 0,
        completedCount: 0,
        isComplete: true,
        missingFields: [],
      };
      return result;
    },
    {} as Record<SectionKey, SectionProgress>,
  );
  const errors: Record<string, string> = {};
  let firstInvalidField: FormField | undefined;

  for (const requirement of validationRequirements) {
    if (requirement.isApplicable && !requirement.isApplicable(form)) {
      continue;
    }

    const section = sections[requirement.section];
    const isComplete = requirement.isComplete(form);
    section.requiredCount += 1;
    if (isComplete) {
      section.completedCount += 1;
      continue;
    }

    const field = requirement.getField(form);
    section.isComplete = false;
    section.missingFields.push(
      resolveRequirementText(requirement.missingLabel, form),
    );
    errors[field] = resolveRequirementText(requirement.errorMessage, form);
    firstInvalidField ??= field;
  }

  for (const section of Object.values(sections)) {
    section.isComplete =
      section.requiredCount === 0 ||
      section.completedCount === section.requiredCount;
  }

  const count = Object.values(sections).reduce(
    (total, section) => total + section.completedCount,
    0,
  );
  const total = Object.values(sections).reduce(
    (sum, section) => sum + section.requiredCount,
    0,
  );
  const missing = Object.values(sections).flatMap(
    (section) => section.missingFields,
  );

  return {
    sections,
    overall: {
      count,
      total,
      percent: total ? Math.round((count / total) * 100) : 100,
      missing,
    },
    errors,
    firstInvalidField,
  };
}

function textRequirement({
  field,
  errorMessage,
  isApplicable,
  key,
  label,
  missingLabel,
  section,
}: {
  field: FormField;
  errorMessage?: string;
  isApplicable?: (form: JobForm) => boolean;
  key: string;
  label: string;
  missingLabel: string;
  section: SectionKey;
}): ValidationRequirement {
  return {
    key,
    section,
    label,
    missingLabel,
    errorMessage: errorMessage ?? `Vui lòng nhập ${label.toLowerCase()}.`,
    getField: () => field,
    isApplicable,
    isComplete: (form) => hasTextValue(form[field]),
  };
}

function resolveRequirementText(
  value: string | ((form: JobForm) => string),
  form: JobForm,
) {
  return typeof value === 'function' ? value(form) : value;
}

function hasTextValue(value: JobForm[FormField]) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requiresWorkLocation(form: JobForm) {
  return form.phuongThucLamViec !== 'TU_XA';
}

function hasValidSalary(form: JobForm) {
  if (form.coTheThoaThuan) return true;

  const salaryFrom = numberFromMoney(form.mucLuongTu);
  const salaryTo = numberFromMoney(form.mucLuongDen);
  return Boolean(
    salaryFrom && salaryFrom > 0 && (!salaryTo || salaryTo >= salaryFrom),
  );
}

function salaryErrorField(form: JobForm): FormField {
  const salaryFrom = numberFromMoney(form.mucLuongTu);
  const salaryTo = numberFromMoney(form.mucLuongDen);
  if (salaryFrom && salaryTo && salaryTo < salaryFrom) return 'mucLuongDen';
  return 'mucLuongTu';
}

function salaryMissingLabel(form: JobForm) {
  const salaryFrom = numberFromMoney(form.mucLuongTu);
  const salaryTo = numberFromMoney(form.mucLuongDen);
  if (salaryFrom && salaryTo && salaryTo < salaryFrom) {
    return 'Lương tối đa nhỏ hơn lương tối thiểu';
  }
  return 'Chưa nhập mức lương hoặc chọn lương thỏa thuận';
}

function salaryErrorMessage(form: JobForm) {
  const salaryFrom = numberFromMoney(form.mucLuongTu);
  const salaryTo = numberFromMoney(form.mucLuongDen);
  if (salaryFrom && salaryTo && salaryTo < salaryFrom) {
    return 'Lương tối đa không được nhỏ hơn lương tối thiểu.';
  }
  return 'Nhập mức lương tối thiểu hợp lệ hoặc chọn lương thỏa thuận.';
}

function hasValidDeadline(form: JobForm) {
  if (!form.thoiHanNhanHoSo.trim()) return false;
  return new Date(`${form.thoiHanNhanHoSo}T23:59:59`) > new Date();
}

function deadlineMissingLabel(form: JobForm) {
  if (!form.thoiHanNhanHoSo.trim()) return 'Chưa nhập hạn nộp hồ sơ';
  return 'Hạn nộp hồ sơ phải sau ngày hiện tại';
}

function deadlineErrorMessage(form: JobForm) {
  if (!form.thoiHanNhanHoSo.trim()) {
    return 'Vui lòng nhập hạn nộp hồ sơ.';
  }
  return 'Hạn nộp hồ sơ phải sau ngày hiện tại.';
}

function buildPayload(form: JobForm, action: 'draft' | 'submit') {
  return {
    action,
    viTriTuyenDung: form.viTriTuyenDung.trim(),
    nganhNgheId: form.nganhNgheId ? Number(form.nganhNgheId) : null,
    chuyenMon: form.chuyenMon.trim() || null,
    hinhThucLamViec: form.hinhThucLamViec,
    phuongThucLamViec: form.phuongThucLamViec,
    soLuongTuyen: Number(form.soLuongTuyen || 1),
    tinhThanhPho: form.phuongThucLamViec === 'TU_XA' ? null : form.tinhThanhPho,
    quanHuyen: form.quanHuyen || null,
    diaChiLamViecCuThe:
      form.phuongThucLamViec === 'TU_XA'
        ? null
        : form.diaChiLamViecCuThe.trim() || null,
    diaDiemLamViec: locationLabel(form),
    mucLuongTu: form.coTheThoaThuan ? null : numberFromMoney(form.mucLuongTu),
    mucLuongDen: form.coTheThoaThuan ? null : numberFromMoney(form.mucLuongDen),
    coTheThoaThuan: form.coTheThoaThuan,
    soNamKinhNghiemToiThieu: Number(form.soNamKinhNghiemToiThieu || 0),
    trinhDoYeuCau: form.trinhDoYeuCau || null,
    moTaCongViec: form.moTaCongViec.trim(),
    yeuCauUngVien: form.yeuCauUngVien.trim(),
    quyenLoi: form.quyenLoi.trim() || null,
    thoiHanNhanHoSo: form.thoiHanNhanHoSo || null,
    skills: form.skills,
  };
}

function locationLabel(form: JobForm) {
  if (form.phuongThucLamViec === 'TU_XA') return 'Làm việc từ xa';
  return [form.diaChiLamViecCuThe, form.quanHuyen, form.tinhThanhPho]
    .filter(Boolean)
    .join(', ');
}

function numberFromMoney(value: string) {
  const number = Number(String(value).replace(/\D/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatMoneyInput(value: string) {
  const number = Number(String(value).replace(/\D/g, ''));
  if (!number) return '';
  return number.toLocaleString('vi-VN');
}

function workTypeLabel(value: string) {
  return (
    {
      TOAN_THOI_GIAN: 'Toàn thời gian',
      BAN_THOI_GIAN: 'Bán thời gian',
      THUC_TAP: 'Thực tập',
      THOI_VU: 'Thời vụ',
    }[value] ?? value
  );
}

function workModeLabel(value: string) {
  return (
    {
      TAI_VAN_PHONG: 'Tại văn phòng',
      TU_XA: 'Từ xa',
      KET_HOP: 'Kết hợp',
    }[value] ?? value
  );
}

function jobToForm(job: ApiJob): JobForm {
  return {
    viTriTuyenDung: job.title ?? '',
    nganhNgheId: job.categoryId ? String(job.categoryId) : '',
    chuyenMon: job.specialization ?? '',
    hinhThucLamViec: job.type || 'TOAN_THOI_GIAN',
    phuongThucLamViec: job.workMode || 'TAI_VAN_PHONG',
    soLuongTuyen: String(job.quantity ?? 1),
    tinhThanhPho: job.province ?? 'Hà Nội',
    quanHuyen: job.district ?? '',
    diaChiLamViecCuThe: job.specificAddress ?? job.location ?? '',
    mucLuongTu: numberToMoneyInput(job.salaryFrom),
    mucLuongDen: numberToMoneyInput(job.salaryTo),
    coTheThoaThuan: Boolean(job.negotiable),
    soNamKinhNghiemToiThieu: String(job.experience ?? 0),
    trinhDoYeuCau: job.requiredEducation ?? '',
    moTaCongViec: job.description ?? '',
    yeuCauUngVien: job.requirements ?? '',
    quyenLoi: job.benefits ?? '',
    thoiHanNhanHoSo: dateToInputValue(job.deadline),
    skills: job.skills ?? [],
  };
}

function numberToMoneyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return String(Math.trunc(number));
}

function dateToInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

type IconName =
  | 'alert'
  | 'back'
  | 'briefcase'
  | 'calendar'
  | 'check'
  | 'education'
  | 'eye'
  | 'location'
  | 'money'
  | 'plus'
  | 'save'
  | 'send'
  | 'users'
  | 'x';

function Icon({
  name,
  height = 18,
  width = 18,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    back: <path d="M19 12H5M12 19l-7-7 7-7" />,
    briefcase: (
      <>
        <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />
        <path d="M4 7h16v12H4V7Z" />
        <path d="M4 12h16" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4M17 3v4" />
        <path d="M4 7h16v13H4V7Z" />
        <path d="M4 11h16" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    education: (
      <>
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 12v4c2.8 2 7.2 2 10 0v-4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    location: (
      <>
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    money: (
      <>
        <path d="M4 7h16v10H4V7Z" />
        <circle cx="12" cy="12" r="2" />
        <path d="M7 10v4M17 10v4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    save: (
      <>
        <path d="M5 3h12l2 2v16H5V3Z" />
        <path d="M8 3v6h8V3" />
        <path d="M8 21v-7h8v7" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
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
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      width={width}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
