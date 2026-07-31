'use client';

import Link from 'next/link';
import {
  ChangeEvent,
  KeyboardEvent,
  ReactNode,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SiteShell from '@/components/SiteShell';
import { portalFetch, portalFetchBlob } from '@/lib/portal-api';

type SectionId =
  'personal' | 'education' | 'experience' | 'skills' | 'preferences' | 'cv';

type Gender = '' | 'NAM' | 'NU' | 'KHAC';

type ApiAccount = {
  email?: string | null;
  soDienThoai?: string | null;
};

type ApiEducation = {
  id?: number;
  trinhDo?: string | null;
  tenCoSoDaoTao?: string | null;
  chuyenNganh?: string | null;
  namBatDau?: number | string | null;
  namTotNghiep?: number | string | null;
  dangHoc?: boolean | null;
  xepLoai?: string | null;
};

type ApiExperience = {
  id?: number;
  tenDonVi?: string | null;
  viTriCongViec?: string | null;
  ngayBatDau?: string | null;
  ngayKetThuc?: string | null;
  dangLamViec?: boolean | null;
  moTaCongViec?: string | null;
};

type ApiSkill = {
  kyNang?: {
    tenKyNang?: string | null;
  } | null;
};

type CategoryOption = { id: number; name: string };

type ApiWorkerProfile = {
  id: number;
  hoTen?: string | null;
  ngaySinh?: string | null;
  gioiTinh?: Gender | null;
  diaChi?: string | null;
  anhDaiDienUrl?: string | null;
  gioiThieuBanThan?: string | null;
  mucLuongMongMuonTu?: string | number | null;
  mucLuongMongMuonDen?: string | number | null;
  diaDiemMongMuon?: string | null;
  nganhNgheMongMuonId?: number | string | null;
  viTriMongMuon?: string | null;
  tinhThanhPhoMongMuon?: string | null;
  quanHuyenMongMuon?: string | null;
  chapNhanLamTuXa?: boolean | null;
  hinhThucLamViecMongMuon?: string | null;
  phuongThucLamViecMongMuon?: string | null;
  nganhNgheMongMuon?: { tenNganhNghe?: string | null } | null;
  tepCvUrl?: string | null;
  tenFileCv?: string | null;
  loaiFileCv?: string | null;
  kichThuocCv?: number | null;
  ngayTaiCv?: string | null;
  cv?: ApiCvMetadata | null;
  ngayCapNhat?: string | null;
  taiKhoan?: ApiAccount | null;
  hocVans?: ApiEducation[];
  kinhNghiemLamViecs?: ApiExperience[];
  hoSoKyNangs?: ApiSkill[];
};

type ApiCvMetadata = {
  hasCv: boolean;
  tenFileCv?: string | null;
  loaiFileCv?: string | null;
  kichThuocCv?: number | null;
  ngayTaiCv?: string | null;
};

type Education = {
  clientId: string;
  id?: number;
  trinhDo: string;
  tenCoSoDaoTao: string;
  chuyenNganh: string;
  namBatDau: string;
  namTotNghiep: string;
  dangHoc: boolean;
  xepLoai: string;
};

type Experience = {
  clientId: string;
  id?: number;
  tenDonVi: string;
  viTriCongViec: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  dangLamViec: boolean;
  moTaCongViec: string;
};

type ProfileForm = {
  id?: number;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: Gender;
  diaChi: string;
  anhDaiDienUrl: string;
  gioiThieuBanThan: string;
  mucLuongMongMuon: string;
  diaDiemMongMuon: string;
  nganhNgheMongMuonId: string;
  viTriMongMuon: string;
  tinhThanhPhoMongMuon: string;
  quanHuyenMongMuon: string;
  chapNhanLamTuXa: boolean;
  hinhThucLamViecMongMuon: string;
  phuongThucLamViecMongMuon: string;
  tepCvUrl: string;
  tenFileCv: string;
  loaiFileCv: string;
  kichThuocCv: number | null;
  ngayTaiCv: string;
  email: string;
  soDienThoai: string;
  ngayCapNhat: string;
  educations: Education[];
  experiences: Experience[];
  skills: string[];
};

type ValidationErrors = Record<string, string>;

type CompletionItem = {
  id: SectionId;
  label: string;
  complete: boolean;
};

type SectionMeta = {
  id: SectionId;
  label: string;
  description: string;
};

const sections: SectionMeta[] = [
  {
    id: 'personal',
    label: 'Thông tin cá nhân',
    description: 'Thông tin cơ bản hiển thị với nhà tuyển dụng.',
  },
  {
    id: 'education',
    label: 'Học vấn',
    description: 'Quá trình đào tạo, chuyên ngành và thời gian học.',
  },
  {
    id: 'experience',
    label: 'Kinh nghiệm làm việc',
    description: 'Các vị trí đã làm và mô tả công việc liên quan.',
  },
  {
    id: 'skills',
    label: 'Kỹ năng',
    description: 'Những kỹ năng giúp hồ sơ dễ được tìm thấy hơn.',
  },
  {
    id: 'preferences',
    label: 'Nguyện vọng việc làm',
    description: 'Mức lương và địa điểm làm việc mong muốn.',
  },
  {
    id: 'cv',
    label: 'CV đính kèm',
    description: 'Tệp CV dùng khi ứng tuyển vào tin tuyển dụng.',
  },
];

const emptyProfile: ProfileForm = {
  hoTen: '',
  ngaySinh: '',
  gioiTinh: '',
  diaChi: '',
  anhDaiDienUrl: '',
  gioiThieuBanThan: '',
  mucLuongMongMuon: '',
  diaDiemMongMuon: '',
  nganhNgheMongMuonId: '',
  viTriMongMuon: '',
  tinhThanhPhoMongMuon: 'Hà Nội',
  quanHuyenMongMuon: '',
  chapNhanLamTuXa: false,
  hinhThucLamViecMongMuon: '',
  phuongThucLamViecMongMuon: '',
  tepCvUrl: '',
  tenFileCv: '',
  loaiFileCv: '',
  kichThuocCv: null,
  ngayTaiCv: '',
  email: '',
  soDienThoai: '',
  ngayCapNhat: '',
  educations: [],
  experiences: [],
  skills: [],
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [savedForm, setSavedForm] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [editingSection, setEditingSection] = useState<SectionId | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('personal');
  const [expandedEducation, setExpandedEducation] = useState<string | null>(
    null,
  );
  const [expandedExperience, setExpandedExperience] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [cvBusy, setCvBusy] = useState(false);
  const firstErrorRef = useRef<HTMLInputElement | HTMLSelectElement | null>(
    null,
  );

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    portalFetch<CategoryOption[]>('/categories')
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;

      event.preventDefault();
      event.returnValue =
        'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      { rootMargin: '-110px 0px -55% 0px', threshold: [0.2, 0.55] },
    );

    sections.forEach((section) => {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [loading]);

  const isDirty = useMemo(
    () => serializeProfile(form) !== serializeProfile(savedForm),
    [form, savedForm],
  );

  const completionItems = useMemo(() => buildCompletion(form), [form]);
  const completionPercent = Math.round(
    (completionItems.filter((item) => item.complete).length /
      completionItems.length) *
      100,
  );
  const missingItems = completionItems.filter((item) => !item.complete);

  async function loadProfile() {
    setLoading(true);
    setLoadError('');
    setMessage('');

    try {
      const data = await portalFetch<ApiWorkerProfile>('/worker/profile');
      const nextForm = mapProfile(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setLastSavedAt(formatDateTime(data.ngayCapNhat));
    } catch {
      setLoadError('Không thể tải hồ sơ');
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateEducation(
    clientId: string,
    field: keyof Education,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      educations: current.educations.map((item) => {
        if (item.clientId !== clientId) return item;
        const next = { ...item, [field]: value };
        if (field === 'dangHoc' && value === true) next.namTotNghiep = '';
        return next;
      }),
    }));
  }

  function updateExperience(
    clientId: string,
    field: keyof Experience,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      experiences: current.experiences.map((item) => {
        if (item.clientId !== clientId) return item;
        const next = { ...item, [field]: value };
        if (field === 'dangLamViec' && value === true) next.ngayKetThuc = '';
        return next;
      }),
    }));
  }

  function addEducation() {
    const item = createEducation();
    setForm((current) => ({
      ...current,
      educations: [...current.educations, item],
    }));
    setExpandedEducation(item.clientId);
    setEditingSection('education');
  }

  function removeEducation(item: Education) {
    const label = educationTitle(item);
    if (item.id && !window.confirm(`Xóa thông tin học vấn tại ${label}?`)) {
      return;
    }

    setForm((current) => ({
      ...current,
      educations: current.educations.filter(
        (education) => education.clientId !== item.clientId,
      ),
    }));
  }

  function addExperience() {
    const item = createExperience();
    setForm((current) => ({
      ...current,
      experiences: [...current.experiences, item],
    }));
    setExpandedExperience(item.clientId);
    setEditingSection('experience');
  }

  function removeExperience(item: Experience) {
    const title = item.viTriCongViec || 'kinh nghiệm này';
    const company = item.tenDonVi ? ` tại ${item.tenDonVi}` : '';
    if (item.id && !window.confirm(`Xóa kinh nghiệm "${title}"${company}?`)) {
      return;
    }

    setForm((current) => ({
      ...current,
      experiences: current.experiences.filter(
        (experience) => experience.clientId !== item.clientId,
      ),
    }));
  }

  function addSkill() {
    const value = skillInput.trim();
    if (!value) return;

    if (
      form.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())
    ) {
      setErrors((current) => ({
        ...current,
        skills: 'Kỹ năng này đã tồn tại.',
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

  function handleSkillKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    addSkill();
  }

  function removeSkill(skill: string) {
    setForm((current) => ({
      ...current,
      skills: current.skills.filter((item) => item !== skill),
    }));
  }

  async function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) return;

    const validationError = validateCvFile(selectedFile);
    if (validationError) {
      setErrors((current) => ({ ...current, cv: validationError }));
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    setCvBusy(true);
    setMessage('Đang tải CV lên...');

    try {
      const metadata = await portalFetch<ApiCvMetadata>('/worker/profile/cv', {
        method: 'POST',
        body: formData,
      });
      applyCvMetadata(metadata);
      setErrors((current) => {
        const next = { ...current };
        delete next.cv;
        return next;
      });
      setMessage('CV cá nhân đã được cập nhật.');
    } catch (reason) {
      setErrors((current) => ({
        ...current,
        cv:
          reason instanceof Error
            ? reason.message
            : 'Không thể tải CV lên. Vui lòng thử lại.',
      }));
      setMessage('Không thể tải CV lên. Vui lòng thử lại.');
    } finally {
      setCvBusy(false);
    }
  }

  async function removeCv() {
    if (!window.confirm('Xóa CV đang đính kèm khỏi hồ sơ?')) return;
    setCvBusy(true);
    setMessage('Đang xóa CV...');

    try {
      const metadata = await portalFetch<ApiCvMetadata>('/worker/profile/cv', {
        method: 'DELETE',
      });
      applyCvMetadata(metadata);
      setMessage('CV cá nhân đã được xóa.');
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : 'Không thể xóa CV. Vui lòng thử lại.',
      );
    } finally {
      setCvBusy(false);
    }
  }

  async function viewCv() {
    if (cvBusy) return;
    setCvBusy(true);
    setMessage('');
    try {
      const { blob } = await portalFetchBlob('/worker/profile/cv/view');
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : 'Không thể mở CV. Vui lòng thử lại.',
      );
    } finally {
      setCvBusy(false);
    }
  }

  async function downloadCv() {
    if (cvBusy) return;
    setCvBusy(true);
    setMessage('');
    try {
      const { blob, fileName: downloadedName } = await portalFetchBlob(
        '/worker/profile/cv/download',
      );
      downloadBlob(blob, downloadedName || form.tenFileCv || 'CV.pdf');
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : 'Không thể tải CV. Vui lòng thử lại.',
      );
    } finally {
      setCvBusy(false);
    }
  }

  function applyCvMetadata(metadata: ApiCvMetadata) {
    setForm((current) => applyCvToForm(current, metadata));
    setSavedForm((current) => applyCvToForm(current, metadata));
  }

  function startEdit(section: SectionId) {
    setEditingSection(section);
  }

  function cancelEdit() {
    setForm(savedForm);
    setErrors({});
    setEditingSection(null);
    setSkillInput('');
  }

  async function saveProfile() {
    if (saving) return;

    const validationErrors = validateProfile(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      focusFirstError(validationErrors);
      setMessage('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return;
    }

    setSaving(true);
    setMessage('Đang lưu hồ sơ...');

    try {
      const updated = await portalFetch<ApiWorkerProfile>('/worker/profile', {
        method: 'PATCH',
        body: JSON.stringify(buildPayload(form)),
      });
      const nextForm = mapProfile(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditingSection(null);
      setMessage('Hồ sơ đã được cập nhật.');
      setLastSavedAt(formatDateTime(updated.ngayCapNhat));
    } catch {
      setMessage('Không thể cập nhật hồ sơ. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  }

  function handleSectionSave() {
    void saveProfile();
  }

  function scrollToSection(sectionId: SectionId) {
    const node = document.getElementById(sectionId);
    if (!node) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    node.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function focusFirstError(validationErrors: ValidationErrors) {
    const firstKey = Object.keys(validationErrors)[0];
    const section = fieldToSection(firstKey);
    if (section) {
      setEditingSection(section);
      scrollToSection(section);
    }

    window.setTimeout(() => {
      firstErrorRef.current?.focus();
    }, 120);
  }

  if (loading) {
    return (
      <SiteShell
        pageClassName="profile-management-page"
        title="Quản lý hồ sơ"
        subtitle="Cập nhật thông tin để tăng cơ hội được nhà tuyển dụng liên hệ."
      >
        <section className="container portal-content profile-management-layout">
          <ProfileSkeleton />
        </section>
      </SiteShell>
    );
  }

  if (loadError) {
    return (
      <SiteShell
        pageClassName="profile-management-page"
        title="Quản lý hồ sơ"
        subtitle="Cập nhật thông tin để tăng cơ hội được nhà tuyển dụng liên hệ."
      >
        <section className="container portal-content">
          <div className="profile-state-panel" role="alert">
            <Icon name="alertCircle" />
            <h2>{loadError}</h2>
            <p>Vui lòng thử lại sau.</p>
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
      pageClassName="profile-management-page"
      title="Quản lý hồ sơ"
      subtitle="Cập nhật thông tin để tăng cơ hội được nhà tuyển dụng liên hệ."
    >
      <section className="container portal-content profile-management-layout">
        <ProfileSidebar
          activeSection={activeSection}
          completionItems={completionItems}
          completionPercent={completionPercent}
          errors={errors}
          form={form}
          missingItems={missingItems}
          onNavigate={scrollToSection}
        />

        <div className="profile-section-stack">
          <ProfileSection
            id="personal"
            editing={editingSection === 'personal'}
            errors={errors}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onSave={handleSectionSave}
            saving={saving}
            title="Thông tin cá nhân"
            description="Thông tin cơ bản hiển thị với nhà tuyển dụng."
          >
            {editingSection === 'personal' ? (
              <PersonalEditor
                errors={errors}
                firstErrorRef={firstErrorRef}
                form={form}
                onUpdate={updateField}
              />
            ) : (
              <PersonalPreview form={form} />
            )}
          </ProfileSection>

          <ProfileSection
            id="education"
            editing={editingSection === 'education'}
            errors={errors}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onSave={handleSectionSave}
            saving={saving}
            title="Học vấn"
            description="Quá trình đào tạo, chuyên ngành và thời gian học."
            action={
              <button
                className="profile-secondary-button"
                onClick={addEducation}
                type="button"
              >
                <Icon name="plus" />
                Thêm học vấn
              </button>
            }
          >
            <EducationList
              editing={editingSection === 'education'}
              errors={errors}
              expandedId={expandedEducation}
              items={form.educations}
              onRemove={removeEducation}
              onToggle={setExpandedEducation}
              onUpdate={updateEducation}
            />
          </ProfileSection>

          <ProfileSection
            id="experience"
            editing={editingSection === 'experience'}
            errors={errors}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onSave={handleSectionSave}
            saving={saving}
            title="Kinh nghiệm làm việc"
            description="Các vị trí đã làm và mô tả công việc liên quan."
            action={
              <button
                className="profile-secondary-button"
                onClick={addExperience}
                type="button"
              >
                <Icon name="plus" />
                Thêm kinh nghiệm
              </button>
            }
          >
            <ExperienceList
              editing={editingSection === 'experience'}
              errors={errors}
              expandedId={expandedExperience}
              items={form.experiences}
              onRemove={removeExperience}
              onToggle={setExpandedExperience}
              onUpdate={updateExperience}
            />
          </ProfileSection>

          <ProfileSection
            id="skills"
            editing={editingSection === 'skills'}
            errors={errors}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onSave={handleSectionSave}
            saving={saving}
            title="Kỹ năng"
            description="Những kỹ năng giúp hồ sơ dễ được tìm thấy hơn."
          >
            <SkillSection
              editing={editingSection === 'skills'}
              error={errors.skills}
              onAdd={addSkill}
              onInput={setSkillInput}
              onKeyDown={handleSkillKeyDown}
              onRemove={removeSkill}
              skillInput={skillInput}
              skills={form.skills}
            />
          </ProfileSection>

          <ProfileSection
            id="preferences"
            editing={editingSection === 'preferences'}
            errors={errors}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onSave={handleSectionSave}
            saving={saving}
            title="Nguyện vọng việc làm"
            description="Mức lương và địa điểm làm việc mong muốn."
          >
            {editingSection === 'preferences' ? (
              <PreferenceEditor
                categories={categories}
                errors={errors}
                form={form}
                onUpdate={updateField}
              />
            ) : (
              <PreferencePreview categories={categories} form={form} />
            )}
          </ProfileSection>

          <ProfileSection
            id="cv"
            editing={editingSection === 'cv'}
            errors={errors}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onSave={handleSectionSave}
            saving={saving}
            title="CV đính kèm"
            description="PDF hoặc DOCX, tối đa 5 MB."
          >
            <CvSection
              busy={cvBusy}
              editing={editingSection === 'cv'}
              error={errors.cv}
              form={form}
              onChange={handleCvChange}
              onDownload={downloadCv}
              onRemove={removeCv}
              onView={viewCv}
            />
          </ProfileSection>
        </div>
      </section>

      <ProfileSaveBar
        dirty={isDirty}
        lastSavedAt={lastSavedAt}
        message={message}
        onCancel={cancelEdit}
        onSave={() => void saveProfile()}
        saving={saving}
      />
    </SiteShell>
  );
}

function ProfileSidebar({
  activeSection,
  completionItems,
  completionPercent,
  errors,
  form,
  missingItems,
  onNavigate,
}: {
  activeSection: SectionId;
  completionItems: CompletionItem[];
  completionPercent: number;
  errors: ValidationErrors;
  form: ProfileForm;
  missingItems: CompletionItem[];
  onNavigate: (section: SectionId) => void;
}) {
  const position = form.diaDiemMongMuon || 'Chưa cập nhật vị trí mong muốn';

  return (
    <aside className="profile-management-sidebar">
      <div className="profile-identity">
        {form.anhDaiDienUrl ? (
          <img alt={`Ảnh đại diện ${form.hoTen}`} src={form.anhDaiDienUrl} />
        ) : (
          <span>{getInitials(form.hoTen)}</span>
        )}
        <h2>{form.hoTen || 'Chưa cập nhật họ tên'}</h2>
        <p>{position}</p>
      </div>

      <div className="profile-completion">
        <div>
          <strong>Hồ sơ hoàn thiện {completionPercent}%</strong>
          <span>{completionItems.length} mục hồ sơ</span>
        </div>
        <div
          className="profile-progress"
          role="progressbar"
          aria-valuenow={completionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Mức độ hoàn thiện hồ sơ"
        >
          <span style={{ width: `${completionPercent}%` }} />
        </div>
        {missingItems.length ? (
          <p>
            Còn thiếu:{' '}
            {missingItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                {item.label}
                {index < missingItems.length - 1 ? ', ' : ''}
              </button>
            ))}
          </p>
        ) : (
          <p>Hồ sơ đã có đủ các nội dung chính.</p>
        )}
      </div>

      <nav className="profile-section-nav" aria-label="Điều hướng hồ sơ">
        {sections.map((section) => {
          const hasError = sectionHasError(section.id, errors);
          const complete = completionItems.find(
            (item) => item.id === section.id,
          )?.complete;
          const active = activeSection === section.id;

          return (
            <button
              aria-current={active ? 'location' : undefined}
              className={active ? 'active' : ''}
              key={section.id}
              onClick={() => onNavigate(section.id)}
              type="button"
            >
              <span>{section.label}</span>
              <small>
                {hasError ? 'Có lỗi' : complete ? 'Hoàn thành' : 'Chưa đủ'}
              </small>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function ProfileSection({
  action,
  children,
  description,
  editing,
  errors,
  id,
  onCancel,
  onEdit,
  onSave,
  saving,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  editing: boolean;
  errors: ValidationErrors;
  id: SectionId;
  onCancel: () => void;
  onEdit: (section: SectionId) => void;
  onSave: () => void;
  saving: boolean;
  title: string;
}) {
  return (
    <section className="profile-section" id={id}>
      <header className="profile-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div>
          {action}
          {editing ? (
            <>
              <button
                className="profile-text-button"
                onClick={onCancel}
                type="button"
              >
                Hủy
              </button>
              <button
                className="profile-primary-button"
                disabled={saving}
                onClick={onSave}
                type="button"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <button
              className="profile-secondary-button"
              onClick={() => onEdit(id)}
              type="button"
            >
              <Icon name="edit" />
              Chỉnh sửa
            </button>
          )}
        </div>
      </header>
      {sectionHasError(id, errors) && (
        <p className="profile-section-error">
          Mục này có thông tin cần kiểm tra.
        </p>
      )}
      {children}
    </section>
  );
}

function PersonalPreview({ form }: { form: ProfileForm }) {
  return (
    <dl className="profile-info-grid">
      <InfoItem label="Họ và tên" value={form.hoTen} />
      <InfoItem label="Ngày sinh" value={formatDate(form.ngaySinh)} />
      <InfoItem label="Giới tính" value={genderLabel(form.gioiTinh)} />
      <InfoItem label="Địa chỉ" value={form.diaChi} />
      <InfoItem label="Email" value={form.email} />
      <InfoItem label="Số điện thoại" value={form.soDienThoai} />
      <div className="profile-readonly-note">
        Thông tin liên hệ được quản lý trong tài khoản.
        <Link href="/doi-mat-khau"> Cài đặt tài khoản</Link>
      </div>
    </dl>
  );
}

function PersonalEditor({
  errors,
  firstErrorRef,
  form,
  onUpdate,
}: {
  errors: ValidationErrors;
  firstErrorRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  form: ProfileForm;
  onUpdate: <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) => void;
}) {
  return (
    <div className="profile-form-grid">
      <TextField
        error={errors.hoTen}
        id="profile-ho-ten"
        inputRef={errors.hoTen ? firstErrorRef : undefined}
        label="Họ và tên"
        required
        value={form.hoTen}
        onChange={(value) => onUpdate('hoTen', value)}
      />
      <TextField
        error={errors.ngaySinh}
        id="profile-ngay-sinh"
        label="Ngày sinh"
        type="date"
        value={form.ngaySinh}
        onChange={(value) => onUpdate('ngaySinh', value)}
      />
      <label className="profile-field" htmlFor="profile-gioi-tinh">
        <span>Giới tính</span>
        <select
          id="profile-gioi-tinh"
          value={form.gioiTinh}
          onChange={(event) =>
            onUpdate('gioiTinh', event.target.value as Gender)
          }
        >
          <option value="">Chưa cập nhật</option>
          <option value="NAM">Nam</option>
          <option value="NU">Nữ</option>
          <option value="KHAC">Khác</option>
        </select>
      </label>
      <TextField
        id="profile-dia-chi"
        label="Địa chỉ"
        placeholder="Nhập địa chỉ hiện tại"
        value={form.diaChi}
        onChange={(value) => onUpdate('diaChi', value)}
      />
      <ReadonlyField label="Email" value={form.email} />
      <ReadonlyField label="Số điện thoại" value={form.soDienThoai} />
      <p className="profile-field-note">
        Thông tin liên hệ được quản lý trong tài khoản.
      </p>
    </div>
  );
}

function EducationList({
  editing,
  errors,
  expandedId,
  items,
  onRemove,
  onToggle,
  onUpdate,
}: {
  editing: boolean;
  errors: ValidationErrors;
  expandedId: string | null;
  items: Education[];
  onRemove: (item: Education) => void;
  onToggle: (id: string | null) => void;
  onUpdate: (
    clientId: string,
    field: keyof Education,
    value: string | boolean,
  ) => void;
}) {
  if (!items.length) {
    return (
      <div className="profile-empty-section">
        Bạn chưa thêm thông tin học vấn.
      </div>
    );
  }

  return (
    <div className="profile-accordion-list">
      {items.map((item, index) => {
        const open = editing || expandedId === item.clientId;
        const panelId = `education-panel-${item.clientId}`;

        return (
          <article className="profile-accordion-item" key={item.clientId}>
            <button
              className="profile-accordion-head"
              aria-controls={panelId}
              aria-expanded={open}
              onClick={() => onToggle(open ? null : item.clientId)}
              type="button"
            >
              <span>
                <strong>{educationTitle(item)}</strong>
                <small>{educationSubtitle(item)}</small>
              </span>
              <Icon name="chevronDown" />
            </button>
            {open && (
              <div className="profile-accordion-body" id={panelId}>
                {editing ? (
                  <EducationEditor
                    errors={errors}
                    index={index}
                    item={item}
                    onRemove={onRemove}
                    onUpdate={onUpdate}
                  />
                ) : (
                  <EducationPreview item={item} />
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function EducationEditor({
  errors,
  index,
  item,
  onRemove,
  onUpdate,
}: {
  errors: ValidationErrors;
  index: number;
  item: Education;
  onRemove: (item: Education) => void;
  onUpdate: (
    clientId: string,
    field: keyof Education,
    value: string | boolean,
  ) => void;
}) {
  const prefix = `educations.${index}`;

  return (
    <div className="profile-form-grid">
      <label className="profile-field" htmlFor={`${item.clientId}-trinh-do`}>
        <span>Bậc học *</span>
        <select
          id={`${item.clientId}-trinh-do`}
          value={item.trinhDo}
          aria-invalid={Boolean(errors[`${prefix}.trinhDo`])}
          aria-describedby={
            errors[`${prefix}.trinhDo`]
              ? `${item.clientId}-trinh-do-error`
              : undefined
          }
          onChange={(event) =>
            onUpdate(item.clientId, 'trinhDo', event.target.value)
          }
        >
          <option value="">Chọn bậc học</option>
          <option>Trung cấp</option>
          <option>Cao đẳng</option>
          <option>Đại học</option>
          <option>Sau đại học</option>
        </select>
        <FieldError
          id={`${item.clientId}-trinh-do-error`}
          value={errors[`${prefix}.trinhDo`]}
        />
      </label>
      <TextField
        error={errors[`${prefix}.tenCoSoDaoTao`]}
        id={`${item.clientId}-school`}
        label="Cơ sở đào tạo"
        required
        value={item.tenCoSoDaoTao}
        onChange={(value) => onUpdate(item.clientId, 'tenCoSoDaoTao', value)}
      />
      <TextField
        id={`${item.clientId}-major`}
        label="Chuyên ngành"
        value={item.chuyenNganh}
        onChange={(value) => onUpdate(item.clientId, 'chuyenNganh', value)}
      />
      <TextField
        id={`${item.clientId}-grade`}
        label="Xếp loại"
        value={item.xepLoai}
        onChange={(value) => onUpdate(item.clientId, 'xepLoai', value)}
      />
      <TextField
        error={errors[`${prefix}.namBatDau`]}
        id={`${item.clientId}-start`}
        label="Năm bắt đầu"
        type="number"
        value={item.namBatDau}
        onChange={(value) => onUpdate(item.clientId, 'namBatDau', value)}
      />
      <TextField
        error={errors[`${prefix}.namTotNghiep`]}
        id={`${item.clientId}-end`}
        label="Năm tốt nghiệp"
        type="number"
        value={item.namTotNghiep}
        disabled={item.dangHoc}
        onChange={(value) => onUpdate(item.clientId, 'namTotNghiep', value)}
      />
      <label className="profile-check-field">
        <input
          type="checkbox"
          checked={item.dangHoc}
          onChange={(event) =>
            onUpdate(item.clientId, 'dangHoc', event.target.checked)
          }
        />
        Tôi vẫn đang học tại đây
      </label>
      <button
        className="profile-danger-button"
        onClick={() => onRemove(item)}
        type="button"
      >
        <Icon name="trash" />
        Xóa học vấn
      </button>
    </div>
  );
}

function EducationPreview({ item }: { item: Education }) {
  return (
    <dl className="profile-info-grid compact">
      <InfoItem label="Bậc học" value={item.trinhDo} />
      <InfoItem label="Cơ sở đào tạo" value={item.tenCoSoDaoTao} />
      <InfoItem label="Chuyên ngành" value={item.chuyenNganh} />
      <InfoItem label="Thời gian" value={educationSubtitle(item)} />
      <InfoItem label="Xếp loại" value={item.xepLoai} />
    </dl>
  );
}

function ExperienceList({
  editing,
  errors,
  expandedId,
  items,
  onRemove,
  onToggle,
  onUpdate,
}: {
  editing: boolean;
  errors: ValidationErrors;
  expandedId: string | null;
  items: Experience[];
  onRemove: (item: Experience) => void;
  onToggle: (id: string | null) => void;
  onUpdate: (
    clientId: string,
    field: keyof Experience,
    value: string | boolean,
  ) => void;
}) {
  if (!items.length) {
    return (
      <div className="profile-empty-section">
        Bạn chưa thêm kinh nghiệm làm việc.
      </div>
    );
  }

  return (
    <div className="profile-accordion-list">
      {items.map((item, index) => {
        const open = editing || expandedId === item.clientId;
        const panelId = `experience-panel-${item.clientId}`;

        return (
          <article className="profile-accordion-item" key={item.clientId}>
            <button
              className="profile-accordion-head"
              aria-controls={panelId}
              aria-expanded={open}
              onClick={() => onToggle(open ? null : item.clientId)}
              type="button"
            >
              <span>
                <strong>{item.viTriCongViec || 'Chưa cập nhật vị trí'}</strong>
                <small>{experienceSubtitle(item)}</small>
              </span>
              <Icon name="chevronDown" />
            </button>
            {open && (
              <div className="profile-accordion-body" id={panelId}>
                {editing ? (
                  <ExperienceEditor
                    errors={errors}
                    index={index}
                    item={item}
                    onRemove={onRemove}
                    onUpdate={onUpdate}
                  />
                ) : (
                  <ExperiencePreview item={item} />
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ExperienceEditor({
  errors,
  index,
  item,
  onRemove,
  onUpdate,
}: {
  errors: ValidationErrors;
  index: number;
  item: Experience;
  onRemove: (item: Experience) => void;
  onUpdate: (
    clientId: string,
    field: keyof Experience,
    value: string | boolean,
  ) => void;
}) {
  const prefix = `experiences.${index}`;

  return (
    <div className="profile-form-grid">
      <TextField
        error={errors[`${prefix}.tenDonVi`]}
        id={`${item.clientId}-company`}
        label="Tên đơn vị đã làm việc"
        required
        value={item.tenDonVi}
        onChange={(value) => onUpdate(item.clientId, 'tenDonVi', value)}
      />
      <TextField
        error={errors[`${prefix}.viTriCongViec`]}
        id={`${item.clientId}-role`}
        label="Vị trí công việc"
        required
        value={item.viTriCongViec}
        onChange={(value) => onUpdate(item.clientId, 'viTriCongViec', value)}
      />
      <TextField
        error={errors[`${prefix}.ngayBatDau`]}
        id={`${item.clientId}-start-date`}
        label="Ngày bắt đầu"
        required
        type="date"
        value={item.ngayBatDau}
        onChange={(value) => onUpdate(item.clientId, 'ngayBatDau', value)}
      />
      <TextField
        error={errors[`${prefix}.ngayKetThuc`]}
        id={`${item.clientId}-end-date`}
        label="Ngày kết thúc"
        type="date"
        value={item.ngayKetThuc}
        disabled={item.dangLamViec}
        onChange={(value) => onUpdate(item.clientId, 'ngayKetThuc', value)}
      />
      <label className="profile-check-field">
        <input
          type="checkbox"
          checked={item.dangLamViec}
          onChange={(event) =>
            onUpdate(item.clientId, 'dangLamViec', event.target.checked)
          }
        />
        Tôi đang làm việc tại đây
      </label>
      <label className="profile-field full" htmlFor={`${item.clientId}-desc`}>
        <span>Mô tả công việc</span>
        <textarea
          id={`${item.clientId}-desc`}
          value={item.moTaCongViec}
          onChange={(event) =>
            onUpdate(item.clientId, 'moTaCongViec', event.target.value)
          }
        />
      </label>
      <button
        className="profile-danger-button"
        onClick={() => onRemove(item)}
        type="button"
      >
        <Icon name="trash" />
        Xóa kinh nghiệm
      </button>
    </div>
  );
}

function ExperiencePreview({ item }: { item: Experience }) {
  return (
    <dl className="profile-info-grid compact">
      <InfoItem label="Đơn vị" value={item.tenDonVi} />
      <InfoItem label="Vị trí" value={item.viTriCongViec} />
      <InfoItem label="Thời gian" value={experienceTime(item)} />
      <InfoItem label="Mô tả" value={item.moTaCongViec} />
    </dl>
  );
}

function SkillSection({
  editing,
  error,
  onAdd,
  onInput,
  onKeyDown,
  onRemove,
  skillInput,
  skills,
}: {
  editing: boolean;
  error?: string;
  onAdd: () => void;
  onInput: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onRemove: (skill: string) => void;
  skillInput: string;
  skills: string[];
}) {
  return (
    <>
      {editing && (
        <div className="profile-skill-entry">
          <label className="profile-field" htmlFor="profile-skill-input">
            <span>Tìm hoặc nhập kỹ năng</span>
            <input
              id="profile-skill-input"
              value={skillInput}
              onChange={(event) => onInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Tìm hoặc nhập kỹ năng..."
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'profile-skill-error' : undefined}
            />
            <FieldError id="profile-skill-error" value={error} />
          </label>
          <button
            className="profile-secondary-button"
            onClick={onAdd}
            type="button"
          >
            <Icon name="plus" />
            Thêm
          </button>
        </div>
      )}
      {skills.length ? (
        <div className="profile-skill-list">
          {skills.map((skill) => (
            <span key={skill}>
              {skill}
              {editing && (
                <button
                  aria-label={`Xóa kỹ năng ${skill}`}
                  onClick={() => onRemove(skill)}
                  type="button"
                >
                  <Icon name="x" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <div className="profile-empty-section">Bạn chưa thêm kỹ năng.</div>
      )}
    </>
  );
}

function PreferencePreview({
  categories,
  form,
}: {
  categories: CategoryOption[];
  form: ProfileForm;
}) {
  const category = categories.find(
    (item) => String(item.id) === form.nganhNgheMongMuonId,
  );
  const preferenceExtra = (
    <>
      <InfoItem
        label="Ngành nghề mong muốn"
        value={category?.name || form.nganhNgheMongMuonId}
      />
      <InfoItem label="Vị trí mong muốn" value={form.viTriMongMuon} />
      <InfoItem
        label="Phương thức làm việc"
        value={workModeLabel(form.phuongThucLamViecMongMuon)}
      />
    </>
  );
  return (
    <dl className="profile-info-grid">
      {preferenceExtra}
      <InfoItem
        label="Mức lương mong muốn"
        value={formatCurrency(form.mucLuongMongMuon)}
      />
      <InfoItem label="Địa điểm mong muốn" value={form.diaDiemMongMuon} />
      <InfoItem
        label="Tỉnh/Thành phố mong muốn"
        value={form.tinhThanhPhoMongMuon}
      />
      <InfoItem label="Quận/Huyện mong muốn" value={form.quanHuyenMongMuon} />
    </dl>
  );
  return (
    <dl className="profile-info-grid">
      <InfoItem
        label="Mức lương mong muốn"
        value={formatCurrency(form.mucLuongMongMuon)}
      />
      <InfoItem label="Địa điểm mong muốn" value={form.diaDiemMongMuon} />
    </dl>
  );
}

function PreferenceEditor({
  categories,
  errors,
  form,
  onUpdate,
}: {
  categories: CategoryOption[];
  errors: ValidationErrors;
  form: ProfileForm;
  onUpdate: <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) => void;
}) {
  return (
    <div className="profile-form-grid">
      <label className="profile-field" htmlFor="profile-preferred-category">
        <span>Ngành nghề mong muốn</span>
        <select
          id="profile-preferred-category"
          value={form.nganhNgheMongMuonId}
          onChange={(event) =>
            onUpdate('nganhNgheMongMuonId', event.target.value)
          }
        >
          <option value="">Chọn ngành nghề</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <TextField
        id="profile-preferred-position"
        label="Vị trí mong muốn"
        value={form.viTriMongMuon}
        onChange={(value) => onUpdate('viTriMongMuon', value)}
      />
      <TextField
        error={errors.mucLuongMongMuon}
        helper="Mức lương mong muốn theo tháng."
        id="profile-salary"
        label="Mức lương mong muốn"
        min="0"
        placeholder="Ví dụ: 15000000"
        type="number"
        value={form.mucLuongMongMuon}
        onChange={(value) => onUpdate('mucLuongMongMuon', value)}
      />
      <TextField
        id="profile-preferred-location"
        label="Địa điểm mong muốn"
        placeholder="Nhập địa điểm mong muốn"
        value={form.diaDiemMongMuon}
        onChange={(value) => onUpdate('diaDiemMongMuon', value)}
      />
      <label className="profile-field" htmlFor="profile-preferred-province">
        <span>Tỉnh/Thành phố mong muốn</span>
        <select
          id="profile-preferred-province"
          value={form.tinhThanhPhoMongMuon}
          onChange={(event) =>
            onUpdate('tinhThanhPhoMongMuon', event.target.value)
          }
        >
          <option value="">Chọn tỉnh/thành phố</option>
          <option value="Hà Nội">Hà Nội</option>
        </select>
      </label>
      <TextField
        id="profile-preferred-district"
        label="Quận/Huyện mong muốn"
        value={form.quanHuyenMongMuon}
        onChange={(value) => onUpdate('quanHuyenMongMuon', value)}
      />
      <label className="profile-field" htmlFor="profile-preferred-work-type">
        <span>Loại hình công việc mong muốn</span>
        <select
          id="profile-preferred-work-type"
          value={form.hinhThucLamViecMongMuon}
          onChange={(event) =>
            onUpdate('hinhThucLamViecMongMuon', event.target.value)
          }
        >
          <option value="">Không yêu cầu</option>
          <option value="TOAN_THOI_GIAN">Toàn thời gian</option>
          <option value="BAN_THOI_GIAN">Bán thời gian</option>
          <option value="THUC_TAP">Thực tập</option>
          <option value="THOI_VU">Thời vụ</option>
        </select>
      </label>
      <label className="profile-field" htmlFor="profile-preferred-work-mode">
        <span>Phương thức làm việc mong muốn</span>
        <select
          id="profile-preferred-work-mode"
          value={form.phuongThucLamViecMongMuon}
          onChange={(event) =>
            onUpdate('phuongThucLamViecMongMuon', event.target.value)
          }
        >
          <option value="">Không yêu cầu</option>
          <option value="TAI_VAN_PHONG">Làm việc tại văn phòng</option>
          <option value="TU_XA">Làm việc từ xa</option>
          <option value="KET_HOP">Làm việc kết hợp</option>
        </select>
      </label>
      <label className="profile-field profile-checkbox-field">
        <span>Chấp nhận làm việc từ xa</span>
        <input
          checked={form.chapNhanLamTuXa}
          type="checkbox"
          onChange={(event) =>
            onUpdate('chapNhanLamTuXa', event.target.checked)
          }
        />
      </label>
    </div>
  );
}

function CvSection({
  busy,
  editing,
  error,
  form,
  onChange,
  onDownload,
  onRemove,
  onView,
}: {
  busy: boolean;
  editing: boolean;
  error?: string;
  form: ProfileForm;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onRemove: () => void;
  onView: () => void;
}) {
  if (form.tenFileCv || form.tepCvUrl) {
    const name = form.tenFileCv || form.tepCvUrl;
    return (
      <div className="cv-file-card">
        <span>{fileExtension(name)}</span>
        <div>
          <strong>{fileName(name)}</strong>
          {(form.kichThuocCv || form.ngayTaiCv) && (
            <small>
              {[formatFileSize(form.kichThuocCv), form.ngayTaiCv ? `Cập nhật ${formatDate(form.ngayTaiCv)}` : '']
                .filter(Boolean)
                .join(' · ')}
            </small>
          )}
        </div>
        <div>
          <button disabled={busy} onClick={onView} type="button">
            Xem CV
          </button>
          <button disabled={busy} onClick={onDownload} type="button">
            Tải xuống
          </button>
          {editing && (
            <>
              <label>
                {busy ? 'Đang xử lý...' : 'Thay thế'}
                <input
                  disabled={busy}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onChange}
                />
              </label>
              <button disabled={busy} onClick={onRemove} type="button">
                Xóa
              </button>
            </>
          )}
        </div>
        <FieldError id="profile-cv-error" value={error} />
      </div>
    );
  }

  return (
    <label
      className="profile-upload-zone"
      htmlFor="profile-cv-upload"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          document.getElementById('profile-cv-upload')?.click();
        }
      }}
    >
      <input
        id="profile-cv-upload"
        type="file"
        accept=".pdf,application/pdf"
        disabled={busy}
        onChange={onChange}
      />
      <Icon name="upload" />
      <strong>{busy ? 'Đang tải CV lên...' : 'Kéo thả CV hoặc chọn tệp'}</strong>
      <small>PDF, tối đa 5 MB</small>
      <FieldError id="profile-cv-error" value={error} />
    </label>
  );
}

function ProfileSaveBar({
  dirty,
  lastSavedAt,
  message,
  onCancel,
  onSave,
  saving,
}: {
  dirty: boolean;
  lastSavedAt: string;
  message: string;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className={`profile-save-bar ${dirty ? 'visible' : ''}`}>
      <div aria-live="polite">
        <strong>
          {dirty
            ? 'Bạn có thay đổi chưa được lưu.'
            : message || 'Hồ sơ đã được cập nhật.'}
        </strong>
        {message && <span>{message}</span>}
        {!message && lastSavedAt && <span>Lưu gần nhất {lastSavedAt}</span>}
      </div>
      <div>
        <button onClick={onCancel} disabled={saving} type="button">
          Hủy thay đổi
        </button>
        <button onClick={onSave} disabled={!dirty || saving} type="button">
          {saving ? 'Đang lưu hồ sơ...' : 'Lưu hồ sơ'}
        </button>
      </div>
    </div>
  );
}

function TextField({
  disabled,
  error,
  helper,
  id,
  inputRef,
  label,
  min,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
}: {
  disabled?: boolean;
  error?: string;
  helper?: string;
  id: string;
  inputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  label: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <label className="profile-field" htmlFor={id}>
      <span>
        {label}
        {required && ' *'}
      </span>
      <input
        aria-describedby={[
          error ? errorId : undefined,
          helper ? helperId : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={id}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef as React.RefObject<HTMLInputElement> | undefined}
        type={type}
        value={value}
      />
      {helper && (
        <small className="profile-field-help" id={helperId}>
          {helper}
        </small>
      )}
      <FieldError id={errorId} value={error} />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-readonly-field">
      <span>{label}</span>
      <strong>{value || 'Chưa cập nhật'}</strong>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'Chưa cập nhật'}</dd>
    </div>
  );
}

function FieldError({ id, value }: { id: string; value?: string }) {
  if (!value) return null;
  return (
    <small className="profile-field-error" id={id}>
      {value}
    </small>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <aside className="profile-management-sidebar skeleton">
        <span />
        <span />
        <span />
      </aside>
      <div className="profile-section-stack">
        {sections.slice(0, 4).map((section) => (
          <section className="profile-section skeleton" key={section.id}>
            <span />
            <span />
            <span />
          </section>
        ))}
        <span className="sr-only">Đang tải hồ sơ...</span>
      </div>
    </>
  );
}

function mapProfile(profile: ApiWorkerProfile): ProfileForm {
  const salary =
    profile.mucLuongMongMuonTu ?? profile.mucLuongMongMuonDen ?? '';

  return {
    id: profile.id,
    hoTen: profile.hoTen ?? '',
    ngaySinh: dateInputValue(profile.ngaySinh),
    gioiTinh: profile.gioiTinh ?? '',
    diaChi: profile.diaChi ?? '',
    anhDaiDienUrl: profile.anhDaiDienUrl ?? '',
    gioiThieuBanThan: profile.gioiThieuBanThan ?? '',
    mucLuongMongMuon: salary ? String(Number(salary)) : '',
    diaDiemMongMuon: profile.diaDiemMongMuon ?? '',
    nganhNgheMongMuonId: profile.nganhNgheMongMuonId
      ? String(profile.nganhNgheMongMuonId)
      : '',
    viTriMongMuon: profile.viTriMongMuon ?? '',
    tinhThanhPhoMongMuon: profile.tinhThanhPhoMongMuon ?? '',
    quanHuyenMongMuon: profile.quanHuyenMongMuon ?? '',
    chapNhanLamTuXa: Boolean(profile.chapNhanLamTuXa),
    hinhThucLamViecMongMuon: profile.hinhThucLamViecMongMuon ?? '',
    phuongThucLamViecMongMuon: profile.phuongThucLamViecMongMuon ?? '',
    tepCvUrl: profile.cv?.tenFileCv ?? profile.tenFileCv ?? profile.tepCvUrl ?? '',
    tenFileCv: profile.cv?.tenFileCv ?? profile.tenFileCv ?? '',
    loaiFileCv: profile.cv?.loaiFileCv ?? profile.loaiFileCv ?? '',
    kichThuocCv: profile.cv?.kichThuocCv ?? profile.kichThuocCv ?? null,
    ngayTaiCv: profile.cv?.ngayTaiCv ?? profile.ngayTaiCv ?? '',
    email: profile.taiKhoan?.email ?? '',
    soDienThoai: profile.taiKhoan?.soDienThoai ?? '',
    ngayCapNhat: profile.ngayCapNhat ?? '',
    educations: (profile.hocVans ?? []).map((item) => ({
      clientId: item.id ? `education-${item.id}` : createClientId('education'),
      id: item.id,
      trinhDo: item.trinhDo ?? '',
      tenCoSoDaoTao: item.tenCoSoDaoTao ?? '',
      chuyenNganh: item.chuyenNganh ?? '',
      namBatDau: item.namBatDau ? String(item.namBatDau) : '',
      namTotNghiep: item.namTotNghiep ? String(item.namTotNghiep) : '',
      dangHoc: Boolean(item.dangHoc),
      xepLoai: item.xepLoai ?? '',
    })),
    experiences: (profile.kinhNghiemLamViecs ?? []).map((item) => ({
      clientId: item.id
        ? `experience-${item.id}`
        : createClientId('experience'),
      id: item.id,
      tenDonVi: item.tenDonVi ?? '',
      viTriCongViec: item.viTriCongViec ?? '',
      ngayBatDau: dateInputValue(item.ngayBatDau),
      ngayKetThuc: dateInputValue(item.ngayKetThuc),
      dangLamViec: Boolean(item.dangLamViec),
      moTaCongViec: item.moTaCongViec ?? '',
    })),
    skills: (profile.hoSoKyNangs ?? [])
      .map((item) => item.kyNang?.tenKyNang?.trim() ?? '')
      .filter(Boolean),
  };
}

function buildPayload(form: ProfileForm) {
  return {
    hoTen: form.hoTen.trim(),
    ngaySinh: form.ngaySinh || null,
    gioiTinh: form.gioiTinh || null,
    diaChi: form.diaChi.trim() || null,
    anhDaiDienUrl: form.anhDaiDienUrl || null,
    gioiThieuBanThan: form.gioiThieuBanThan || null,
    mucLuongMongMuonTu: form.mucLuongMongMuon
      ? Number(form.mucLuongMongMuon)
      : null,
    mucLuongMongMuonDen: form.mucLuongMongMuon
      ? Number(form.mucLuongMongMuon)
      : null,
    diaDiemMongMuon: form.diaDiemMongMuon.trim() || null,
    nganhNgheMongMuonId: form.nganhNgheMongMuonId
      ? Number(form.nganhNgheMongMuonId)
      : null,
    viTriMongMuon: form.viTriMongMuon.trim() || null,
    tinhThanhPhoMongMuon: form.tinhThanhPhoMongMuon || null,
    quanHuyenMongMuon: form.quanHuyenMongMuon.trim() || null,
    chapNhanLamTuXa: form.chapNhanLamTuXa,
    hinhThucLamViecMongMuon: form.hinhThucLamViecMongMuon || null,
    phuongThucLamViecMongMuon: form.phuongThucLamViecMongMuon || null,
    kinhNghiemLamViecs: form.experiences.map((item) => ({
      tenDonVi: item.tenDonVi.trim(),
      viTriCongViec: item.viTriCongViec.trim(),
      ngayBatDau: item.ngayBatDau,
      ngayKetThuc: item.dangLamViec ? null : item.ngayKetThuc || null,
      dangLamViec: item.dangLamViec,
      moTaCongViec: item.moTaCongViec.trim() || null,
    })),
    hocVans: form.educations.map((item) => ({
      trinhDo: item.trinhDo,
      tenCoSoDaoTao: item.tenCoSoDaoTao.trim(),
      chuyenNganh: item.chuyenNganh.trim() || null,
      namBatDau: item.namBatDau,
      namTotNghiep: item.dangHoc ? null : item.namTotNghiep || null,
      dangHoc: item.dangHoc,
      xepLoai: item.xepLoai.trim() || null,
    })),
    skills: form.skills,
  };
}

function applyCvToForm(form: ProfileForm, metadata: ApiCvMetadata): ProfileForm {
  return {
    ...form,
    tepCvUrl: metadata.hasCv ? metadata.tenFileCv ?? '' : '',
    tenFileCv: metadata.hasCv ? metadata.tenFileCv ?? '' : '',
    loaiFileCv: metadata.hasCv ? metadata.loaiFileCv ?? '' : '',
    kichThuocCv: metadata.hasCv ? metadata.kichThuocCv ?? null : null,
    ngayTaiCv: metadata.hasCv ? metadata.ngayTaiCv ?? '' : '',
  };
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

function serializeProfile(form: ProfileForm) {
  return JSON.stringify(buildPayload(form));
}

function validateProfile(form: ProfileForm) {
  const nextErrors: ValidationErrors = {};
  const currentYear = new Date().getFullYear();

  if (!form.hoTen.trim()) {
    nextErrors.hoTen = 'Vui lòng nhập họ và tên.';
  }
  if (form.ngaySinh && Number.isNaN(new Date(form.ngaySinh).getTime())) {
    nextErrors.ngaySinh = 'Ngày sinh không hợp lệ.';
  }
  if (form.mucLuongMongMuon && Number(form.mucLuongMongMuon) <= 0) {
    nextErrors.mucLuongMongMuon = 'Mức lương mong muốn phải lớn hơn 0.';
  }

  form.educations.forEach((item, index) => {
    const prefix = `educations.${index}`;
    const startYear = Number(item.namBatDau);
    const endYear = Number(item.namTotNghiep);

    if (!item.trinhDo)
      nextErrors[`${prefix}.trinhDo`] = 'Vui lòng chọn bậc học.';
    if (!item.tenCoSoDaoTao.trim()) {
      nextErrors[`${prefix}.tenCoSoDaoTao`] = 'Vui lòng nhập cơ sở đào tạo.';
    }
    if (
      !item.namBatDau ||
      !Number.isInteger(startYear) ||
      startYear < 1950 ||
      startYear > currentYear + 5
    ) {
      nextErrors[`${prefix}.namBatDau`] = 'Năm bắt đầu không hợp lệ.';
    }
    if (
      !item.dangHoc &&
      item.namTotNghiep &&
      (!Number.isInteger(endYear) ||
        endYear < 1950 ||
        endYear > currentYear + 8)
    ) {
      nextErrors[`${prefix}.namTotNghiep`] = 'Năm tốt nghiệp không hợp lệ.';
    }
    if (!item.dangHoc && item.namTotNghiep && startYear > endYear) {
      nextErrors[`${prefix}.namTotNghiep`] =
        'Năm bắt đầu không được sau năm tốt nghiệp.';
    }
  });

  form.experiences.forEach((item, index) => {
    const prefix = `experiences.${index}`;

    if (!item.tenDonVi.trim()) {
      nextErrors[`${prefix}.tenDonVi`] =
        'Vui lòng nhập tên đơn vị đã làm việc.';
    }
    if (!item.viTriCongViec.trim()) {
      nextErrors[`${prefix}.viTriCongViec`] = 'Vui lòng nhập vị trí công việc.';
    }
    if (!item.ngayBatDau) {
      nextErrors[`${prefix}.ngayBatDau`] = 'Vui lòng nhập ngày bắt đầu.';
    }
    if (
      item.ngayBatDau &&
      item.ngayKetThuc &&
      !item.dangLamViec &&
      new Date(item.ngayBatDau) > new Date(item.ngayKetThuc)
    ) {
      nextErrors[`${prefix}.ngayKetThuc`] =
        'Ngày bắt đầu không được sau ngày kết thúc.';
    }
  });

  return nextErrors;
}

function buildCompletion(form: ProfileForm): CompletionItem[] {
  return [
    {
      id: 'personal',
      label: 'thông tin cá nhân',
      complete: Boolean(
        form.hoTen && form.ngaySinh && form.gioiTinh && form.diaChi,
      ),
    },
    {
      id: 'education',
      label: 'học vấn',
      complete: form.educations.length > 0,
    },
    {
      id: 'experience',
      label: 'kinh nghiệm làm việc',
      complete: form.experiences.length > 0,
    },
    {
      id: 'skills',
      label: 'kỹ năng',
      complete: form.skills.length > 0,
    },
    {
      id: 'preferences',
      label: 'nguyện vọng việc làm',
      complete: Boolean(
        form.mucLuongMongMuon &&
          (form.diaDiemMongMuon || form.tinhThanhPhoMongMuon) &&
          (form.nganhNgheMongMuonId || form.viTriMongMuon),
      ),
    },
    {
      id: 'cv',
      label: 'CV',
      complete: Boolean(form.tepCvUrl),
    },
  ];
}

function fieldToSection(field: string): SectionId | null {
  if (field.startsWith('educations')) return 'education';
  if (field.startsWith('experiences')) return 'experience';
  if (field === 'skills') return 'skills';
  if (field === 'cv') return 'cv';
  if (field === 'mucLuongMongMuon') return 'preferences';
  if (['hoTen', 'ngaySinh', 'gioiTinh', 'diaChi'].includes(field)) {
    return 'personal';
  }
  return null;
}

function sectionHasError(section: SectionId, errors: ValidationErrors) {
  return Object.keys(errors).some((field) => fieldToSection(field) === section);
}

function createEducation(): Education {
  return {
    clientId: createClientId('education'),
    trinhDo: '',
    tenCoSoDaoTao: '',
    chuyenNganh: '',
    namBatDau: '',
    namTotNghiep: '',
    dangHoc: false,
    xepLoai: '',
  };
}

function createExperience(): Experience {
  return {
    clientId: createClientId('experience'),
    tenDonVi: '',
    viTriCongViec: '',
    ngayBatDau: '',
    ngayKetThuc: '',
    dangLamViec: false,
    moTaCongViec: '',
  };
}

function createClientId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 3)
    .join('');

  return initials.toUpperCase() || 'HS';
}

function dateInputValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN');
}

function genderLabel(value: Gender) {
  switch (value) {
    case 'NAM':
      return 'Nam';
    case 'NU':
      return 'Nữ';
    case 'KHAC':
      return 'Khác';
    default:
      return '';
  }
}

function workModeLabel(value: string) {
  return (
    {
      TAI_VAN_PHONG: 'Làm việc tại văn phòng',
      TU_XA: 'Làm việc từ xa',
      KET_HOP: 'Làm việc kết hợp',
    }[value] ?? ''
  );
}

function educationTitle(item: Education) {
  if (item.trinhDo && item.tenCoSoDaoTao) {
    return `${item.trinhDo} - ${item.tenCoSoDaoTao}`;
  }
  return item.tenCoSoDaoTao || item.trinhDo || 'Chưa cập nhật học vấn';
}

function educationSubtitle(item: Education) {
  const end = item.dangHoc ? 'Hiện tại' : item.namTotNghiep;
  return (
    [item.namBatDau, end].filter(Boolean).join(' - ') ||
    'Chưa cập nhật thời gian'
  );
}

function experienceSubtitle(item: Experience) {
  return [item.tenDonVi, experienceTime(item)].filter(Boolean).join(' · ');
}

function experienceTime(item: Experience) {
  const start = formatMonthYear(item.ngayBatDau);
  const end = item.dangLamViec ? 'Hiện tại' : formatMonthYear(item.ngayKetThuc);
  return [start, end].filter(Boolean).join(' - ');
}

function formatMonthYear(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(value: string) {
  const numeric = Number(value);
  if (!value || !Number.isFinite(numeric) || numeric <= 0) return '';
  return `${numeric.toLocaleString('vi-VN')} ₫`;
}

function validateCvFile(file: File) {
  const lowerName = file.name.toLowerCase();

  if (!file.size) {
    return 'Vui lòng chọn file CV.';
  }

  if (file.type !== 'application/pdf' || !lowerName.endsWith('.pdf')) {
    return 'CV chỉ được phép có định dạng PDF.';
  }

  if (file.size > 5 * 1024 * 1024) {
    return 'Dung lượng CV không được vượt quá 5 MB.';
  }

  return '';
}

function formatFileSize(size?: number | null) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileName(value: string) {
  return value.split('/').pop() || value;
}

function fileExtension(value: string) {
  const extension = fileName(value).split('.').pop()?.toUpperCase();
  return extension || 'CV';
}

function isDownloadableUrl(value: string) {
  return value.startsWith('http') || value.startsWith('/');
}

type IconName =
  'alertCircle' | 'chevronDown' | 'edit' | 'plus' | 'trash' | 'upload' | 'x';

function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    alertCircle: (
      <path d="M12 8v5m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
    chevronDown: <path d="m6 9 6 6 6-6" />,
    edit: <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Zm11-13 3 3" />,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    upload: <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
