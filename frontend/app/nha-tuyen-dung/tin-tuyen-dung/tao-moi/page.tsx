'use client';

import SiteShell from '@/components/SiteShell';
import { portalFetch } from '@/lib/portal-api';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useRouter } from 'next/navigation';

type Category = { id: number; name: string };
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

const requiredFields: Array<[keyof JobForm, string]> = [
  ['viTriTuyenDung', 'Tiêu đề công việc'],
  ['nganhNgheId', 'Ngành nghề'],
  ['hinhThucLamViec', 'Loại hình công việc'],
  ['phuongThucLamViec', 'Phương thức làm việc'],
  ['tinhThanhPho', 'Tỉnh/Thành phố'],
  ['moTaCongViec', 'Mô tả công việc'],
  ['yeuCauUngVien', 'Yêu cầu ứng viên'],
  ['thoiHanNhanHoSo', 'Hạn nộp hồ sơ'],
];

export default function JobEditorPage() {
  const router = useRouter();
  const [form, setForm] = useState<JobForm>(initialForm);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    portalFetch<Category[]>('/categories')
      .then(setCategories)
      .catch((error) => setMessage(error.message));
  }, []);

  const completion = useMemo(() => {
    const completed = requiredFields.filter(([field]) => {
      if (field === 'tinhThanhPho' && form.phuongThucLamViec === 'TU_XA') {
        return true;
      }
      return Boolean(String(form[field] ?? '').trim());
    });
    return {
      count: completed.length,
      total: requiredFields.length,
      percent: Math.round((completed.length / requiredFields.length) * 100),
      missing: requiredFields
        .filter(([field]) => {
          if (field === 'tinhThanhPho' && form.phuongThucLamViec === 'TU_XA') {
            return false;
          }
          return !String(form[field] ?? '').trim();
        })
        .map(([, label]) => label),
    };
  }, [form]);

  function update<K extends keyof JobForm>(field: K, value: JobForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
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
    const nextErrors: Record<string, string> = {};
    for (const [field, label] of requiredFields) {
      if (field === 'tinhThanhPho' && form.phuongThucLamViec === 'TU_XA') {
        continue;
      }
      if (!String(form[field] ?? '').trim()) {
        nextErrors[field] = `Vui lòng nhập ${label.toLowerCase()}.`;
      }
    }
    if (
      form.phuongThucLamViec !== 'TU_XA' &&
      !form.diaChiLamViecCuThe.trim()
    ) {
      nextErrors.diaChiLamViecCuThe = 'Vui lòng nhập địa chỉ làm việc cụ thể.';
    }
    if (!form.coTheThoaThuan) {
      const salaryFrom = numberFromMoney(form.mucLuongTu);
      const salaryTo = numberFromMoney(form.mucLuongDen);
      if (!salaryFrom && !salaryTo) {
        nextErrors.mucLuongTu = 'Nhập mức lương hoặc chọn lương thỏa thuận.';
      }
      if (salaryFrom && salaryTo && salaryFrom > salaryTo) {
        nextErrors.mucLuongDen = 'Lương tối đa không được nhỏ hơn lương tối thiểu.';
      }
    }
    if (Number(form.soLuongTuyen) < 1) {
      nextErrors.soLuongTuyen = 'Số lượng tuyển phải lớn hơn 0.';
    }
    if (Number(form.soNamKinhNghiemToiThieu) < 0) {
      nextErrors.soNamKinhNghiemToiThieu =
        'Kinh nghiệm yêu cầu không được nhỏ hơn 0.';
    }
    if (
      form.thoiHanNhanHoSo &&
      new Date(`${form.thoiHanNhanHoSo}T23:59:59`) <= new Date()
    ) {
      nextErrors.thoiHanNhanHoSo = 'Hạn nộp hồ sơ phải sau ngày hiện tại.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      firstFieldRef.current?.focus();
      setMessage('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return false;
    }
    return true;
  }

  async function save(action: 'draft' | 'submit') {
    if (saving) return;
    if (action === 'submit' && !validateSubmit()) return;

    setSaving(action);
    setMessage(action === 'draft' ? 'Đang lưu bản nháp...' : 'Đang gửi kiểm duyệt...');
    try {
      await portalFetch('/employer/jobs', {
        method: 'POST',
        body: JSON.stringify(buildPayload(form, action)),
      });
      setMessage(
        action === 'draft'
          ? 'Tin tuyển dụng đã được lưu dưới dạng bản nháp.'
          : 'Tin tuyển dụng đã được gửi kiểm duyệt.',
      );
      window.setTimeout(() => router.push('/nha-tuyen-dung/tin-tuyen-dung'), 700);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể lưu tin tuyển dụng.',
      );
    } finally {
      setSaving(null);
      setConfirmOpen(false);
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validateSubmit()) setConfirmOpen(true);
  }

  return (
    <SiteShell
      role="employer"
      title="Tạo tin tuyển dụng"
      subtitle="Chuẩn hóa thông tin để hệ thống có thể gợi ý việc làm phù hợp cho người lao động."
    >
      <section className="container portal-content editor-layout">
        <form className="content-card editor-form" onSubmit={submitForm}>
          {message && (
            <div className={`form-message ${message.includes('đã') ? 'success' : 'info'}`}>
              {message}
            </div>
          )}

          <EditorSection
            index={1}
            title="Thông tin công việc"
            description="Tên vị trí, ngành nghề và loại hình làm việc."
          >
            <div className="form-grid">
              <TextInput
                refTarget={firstFieldRef}
                error={errors.viTriTuyenDung}
                label="Tiêu đề công việc"
                required
                value={form.viTriTuyenDung}
                onChange={(value) => update('viTriTuyenDung', value)}
              />
              <SelectInput
                error={errors.nganhNgheId}
                label="Ngành nghề"
                required
                value={form.nganhNgheId}
                onChange={(value) => update('nganhNgheId', value)}
                options={[
                  ['', 'Chọn ngành nghề'],
                  ...categories.map((item) => [String(item.id), item.name] as const),
                ]}
              />
              <TextInput
                label="Vị trí hoặc chuyên môn"
                value={form.chuyenMon}
                onChange={(value) => update('chuyenMon', value)}
              />
              <SelectInput
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
                label="Số lượng tuyển"
                required
                type="number"
                value={form.soLuongTuyen}
                onChange={(value) => update('soLuongTuyen', value)}
              />
            </div>
          </EditorSection>

          <EditorSection
            index={2}
            title="Địa điểm và mức lương"
            description="Địa điểm được tách để tìm kiếm và gợi ý chính xác hơn."
          >
            <div className="form-grid">
              <SelectInput
                error={errors.tinhThanhPho}
                label="Tỉnh/Thành phố"
                required={form.phuongThucLamViec !== 'TU_XA'}
                value={form.tinhThanhPho}
                onChange={(value) => update('tinhThanhPho', value)}
                options={[
                  ['Hà Nội', 'Hà Nội'],
                ]}
              />
              <SelectInput
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
                label="Địa chỉ làm việc cụ thể"
                required={form.phuongThucLamViec !== 'TU_XA'}
                value={form.diaChiLamViecCuThe}
                onChange={(value) => update('diaChiLamViecCuThe', value)}
              />
              <MoneyInput
                disabled={form.coTheThoaThuan}
                error={errors.mucLuongTu}
                label="Lương tối thiểu"
                value={form.mucLuongTu}
                onChange={(value) => update('mucLuongTu', value)}
              />
              <MoneyInput
                disabled={form.coTheThoaThuan}
                error={errors.mucLuongDen}
                label="Lương tối đa"
                value={form.mucLuongDen}
                onChange={(value) => update('mucLuongDen', value)}
              />
              <label className="form-group full checkbox-line">
                <input
                  checked={form.coTheThoaThuan}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      coTheThoaThuan: event.target.checked,
                      mucLuongTu: event.target.checked ? '' : current.mucLuongTu,
                      mucLuongDen: event.target.checked ? '' : current.mucLuongDen,
                    }))
                  }
                  type="checkbox"
                />
                <span>Lương thỏa thuận</span>
              </label>
            </div>
          </EditorSection>

          <EditorSection
            index={3}
            title="Tiêu chí ứng viên"
            description="Kinh nghiệm, trình độ và kỹ năng dùng cho so khớp hồ sơ."
          >
            <div className="form-grid">
              <SelectInput
                error={errors.soNamKinhNghiemToiThieu}
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
                label="Trình độ yêu cầu"
                value={form.trinhDoYeuCau}
                onChange={(value) => update('trinhDoYeuCau', value)}
                options={educationOptions}
              />
              <div className="form-group full">
                <span>Kỹ năng yêu cầu</span>
                <div className="tag-editor">
                  <input
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <button type="button" onClick={addSkill}>
                    Thêm
                  </button>
                </div>
                {errors.skills && <small className="field-error">{errors.skills}</small>}
                <div className="tag-list">
                  {form.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          skills: current.skills.filter((item) => item !== skill),
                        }))
                      }
                    >
                      {skill}
                      <span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            index={4}
            title="Nội dung tuyển dụng"
            description="Mô tả ngắn gọn, rõ trách nhiệm, yêu cầu và quyền lợi."
          >
            <TextareaInput
              error={errors.moTaCongViec}
              label="Mô tả công việc"
              required
              value={form.moTaCongViec}
              onChange={(value) => update('moTaCongViec', value)}
            />
            <TextareaInput
              error={errors.yeuCauUngVien}
              label="Yêu cầu ứng viên chi tiết"
              required
              value={form.yeuCauUngVien}
              onChange={(value) => update('yeuCauUngVien', value)}
            />
            <TextareaInput
              label="Quyền lợi"
              value={form.quyenLoi}
              onChange={(value) => update('quyenLoi', value)}
            />
          </EditorSection>

          <EditorSection
            index={5}
            title="Thời hạn và nhận hồ sơ"
            description="Hệ thống nhận hồ sơ trực tiếp trên nền tảng."
          >
            <div className="form-grid">
              <TextInput
                error={errors.thoiHanNhanHoSo}
                label="Hạn nộp hồ sơ"
                required
                type="date"
                value={form.thoiHanNhanHoSo}
                onChange={(value) => update('thoiHanNhanHoSo', value)}
              />
              <div className="form-group">
                <span>Phương thức nhận hồ sơ</span>
                <strong className="readonly-pill">Nhận hồ sơ trên hệ thống</strong>
              </div>
            </div>
          </EditorSection>

          <div className="job-editor-actionbar">
            <button
              className="btn btn-outline"
              disabled={Boolean(saving)}
              onClick={() => void save('draft')}
              type="button"
            >
              {saving === 'draft' ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setPreviewOpen(true)}
              type="button"
            >
              Xem trước
            </button>
            <button className="btn btn-primary" disabled={Boolean(saving)}>
              {saving === 'submit' ? 'Đang gửi...' : 'Gửi kiểm duyệt'}
            </button>
          </div>
        </form>

        <aside className="editor-tips content-card">
          <h3>Mức độ hoàn thiện</h3>
          <div className="completion-meter">
            <span style={{ width: `${completion.percent}%` }} />
          </div>
          <strong>{completion.percent}%</strong>
          <p>
            Đã hoàn thành {completion.count}/{completion.total} trường bắt buộc.
          </p>
          {completion.missing.length > 0 && (
            <ul>
              {completion.missing.slice(0, 5).map((item) => (
                <li key={item}>Chưa nhập {item.toLowerCase()}</li>
              ))}
            </ul>
          )}
          <p>Tin sẽ được quản trị viên kiểm duyệt trước khi hiển thị.</p>
        </aside>
      </section>

      {previewOpen && (
        <PreviewDialog
          category={categories.find((item) => String(item.id) === form.nganhNgheId)?.name}
          form={form}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {confirmOpen && (
        <div className="preview-layer" role="dialog" aria-modal="true">
          <div className="content-card preview-dialog">
            <h2>Gửi tin tuyển dụng để kiểm duyệt?</h2>
            <p>Sau khi gửi, tin sẽ chờ quản trị viên kiểm duyệt trước khi hiển thị.</p>
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
    </SiteShell>
  );
}

function EditorSection({
  children,
  description,
  index,
  title,
}: {
  children: ReactNode;
  description: string;
  index: number;
  title: string;
}) {
  return (
    <section className="job-editor-section">
      <div className="card-title numbered">
        <b>{index}</b>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextInput({
  error,
  label,
  onChange,
  refTarget,
  required,
  type = 'text',
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  refTarget?: RefObject<HTMLInputElement | null>;
  required?: boolean;
  type?: string;
  value: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="form-group" htmlFor={id}>
      <span>{label}{required && ' *'}</span>
      <input
        aria-invalid={Boolean(error)}
        id={id}
        ref={refTarget}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function SelectInput({
  error,
  label,
  onChange,
  options,
  required,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<Readonly<[string, string]>>;
  required?: boolean;
  value: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="form-group" htmlFor={id}>
      <span>{label}{required && ' *'}</span>
      <select
        aria-invalid={Boolean(error)}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function MoneyInput({
  disabled,
  error,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="form-group">
      <span>{label}</span>
      <span className="money-field">
        <input
          aria-invalid={Boolean(error)}
          disabled={disabled}
          inputMode="numeric"
          value={formatMoneyInput(value)}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        />
        <small>VNĐ</small>
      </span>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function TextareaInput({
  error,
  label,
  onChange,
  required,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="form-group full">
      <span>{label}{required && ' *'}</span>
      <textarea
        aria-invalid={Boolean(error)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>{value.length.toLocaleString('vi-VN')} ký tự</small>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function PreviewDialog({
  category,
  form,
  onClose,
}: {
  category?: string;
  form: JobForm;
  onClose: () => void;
}) {
  return (
    <div className="preview-layer" role="dialog" aria-modal="true">
      <article className="content-card preview-dialog">
        <button className="preview-close" onClick={onClose} type="button">
          Đóng
        </button>
        <h2>{form.viTriTuyenDung || 'Tin tuyển dụng chưa có tiêu đề'}</h2>
        <p>{category || 'Chưa chọn ngành nghề'} · {workTypeLabel(form.hinhThucLamViec)}</p>
        <p>{locationLabel(form)}</p>
        <p>{form.coTheThoaThuan ? 'Lương thỏa thuận' : `${formatMoneyInput(form.mucLuongTu) || '?'} - ${formatMoneyInput(form.mucLuongDen) || '?'} VNĐ`}</p>
        <h3>Mô tả công việc</h3>
        <p>{form.moTaCongViec || 'Chưa nhập mô tả công việc.'}</p>
        <h3>Yêu cầu ứng viên</h3>
        <p>{form.yeuCauUngVien || 'Chưa nhập yêu cầu ứng viên.'}</p>
        {form.skills.length > 0 && (
          <div className="tag-list">
            {form.skills.map((skill) => <span key={skill}>{skill}</span>)}
          </div>
        )}
      </article>
    </div>
  );
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
