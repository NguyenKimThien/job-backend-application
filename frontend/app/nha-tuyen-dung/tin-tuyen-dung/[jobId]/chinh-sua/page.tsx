'use client';

import SiteShell from '@/components/SiteShell';
import { ApiJob, portalFetch } from '@/lib/portal-api';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

type Category = { id: number; name: string };

export default function EditEmployerJobPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [job, setJob] = useState<ApiJob | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const remainingEdits = Math.max(0, 3 - (job?.editCount ?? 0));

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage('');
      try {
        const [jobData, categoryData] = await Promise.all([
          portalFetch<ApiJob>(`/employer/jobs/${params.jobId}`),
          portalFetch<Category[]>('/categories'),
        ]);
        setJob(jobData);
        setCategories(categoryData);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Không thể tải tin tuyển dụng.',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.jobId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage('');
    try {
      await portalFetch(`/employer/jobs/${params.jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          viTriTuyenDung: form.get('viTriTuyenDung'),
          nganhNgheId: Number(form.get('nganhNgheId')),
          hinhThucLamViec: form.get('hinhThucLamViec'),
          mucLuongTu: Number(form.get('mucLuongTu')) || null,
          mucLuongDen: Number(form.get('mucLuongDen')) || null,
          coTheThoaThuan: form.get('coTheThoaThuan') === 'on',
          diaDiemLamViec: form.get('diaDiemLamViec'),
          moTaCongViec: form.get('moTaCongViec'),
          yeuCauUngVien: form.get('yeuCauUngVien'),
          quyenLoi: form.get('quyenLoi'),
          thoiHanNhanHoSo: form.get('thoiHanNhanHoSo'),
          soLuongTuyen: Number(form.get('soLuongTuyen') || 1),
          soNamKinhNghiemToiThieu:
            Number(form.get('soNamKinhNghiemToiThieu')) || null,
          trinhDoYeuCau: form.get('trinhDoYeuCau'),
          skills: String(form.get('skills') ?? '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      setMessage('Đã cập nhật và gửi lại tin chờ kiểm duyệt.');
      window.setTimeout(
        () => router.push('/nha-tuyen-dung/tin-tuyen-dung'),
        700,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật tin tuyển dụng.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteShell
      action={
        <Link
          className="btn btn-outline"
          href="/nha-tuyen-dung/tin-tuyen-dung"
        >
          Quay lại danh sách
        </Link>
      }
      breadcrumb="Trang chủ / Tin tuyển dụng / Chỉnh sửa"
      role="employer"
      subtitle="Tin sau khi cập nhật sẽ được gửi lại để quản trị viên kiểm duyệt."
      title="Chỉnh sửa tin tuyển dụng"
    >
      <section className="container portal-content editor-layout">
        {loading && (
          <div className="content-card detail-loading">Đang tải dữ liệu...</div>
        )}
        {!loading && !job && (
          <div className="content-card">
            <div className="form-message error">{message}</div>
          </div>
        )}
        {job && job.status !== 'TU_CHOI' && (
          <div className="content-card employer-edit-limit-message">
            <strong>Tin tuyển dụng không được phép chỉnh sửa</strong>
            <p>
              Chỉ tin tuyển dụng ở trạng thái Từ chối mới được chỉnh sửa và
              gửi lại để kiểm duyệt.
            </p>
            <Link
              className="btn btn-primary"
              href="/nha-tuyen-dung/tin-tuyen-dung"
            >
              Quay lại danh sách
            </Link>
          </div>
        )}
        {job && job.status === 'TU_CHOI' && remainingEdits === 0 && (
          <div className="content-card employer-edit-limit-message">
            <strong>Đã hết lượt chỉnh sửa tin tuyển dụng</strong>
            <p>
              Tin này đã được chỉnh sửa đủ 3 lần nên không thể tiếp tục thay
              đổi. Bạn có thể quay lại danh sách tin tuyển dụng để theo dõi
              trạng thái kiểm duyệt.
            </p>
            <Link
              className="btn btn-primary"
              href="/nha-tuyen-dung/tin-tuyen-dung"
            >
              Quay lại danh sách
            </Link>
          </div>
        )}
        {job && job.status === 'TU_CHOI' && remainingEdits > 0 && (
          <form className="content-card editor-form" onSubmit={save}>
            <div className="form-message info employer-edit-quota-message">
              Bạn còn <strong>{remainingEdits}/3 lượt chỉnh sửa</strong> cho
              tin tuyển dụng này. Sau khi lưu, tin sẽ được gửi lại để kiểm
              duyệt và số lượt còn lại sẽ giảm 1.
            </div>
            {message && (
              <div
                className={`form-message ${
                  message.startsWith('Đã') ? 'success' : 'error'
                }`}
              >
                {message}
              </div>
            )}
            {job.rejectionReason && (
              <div className="form-message error">
                Yêu cầu từ quản trị viên: {job.rejectionReason}
              </div>
            )}

            <div className="card-title numbered">
              <b>1</b>
              <div>
                <h2>Thông tin cơ bản</h2>
                <p>Cập nhật vị trí, ngành nghề và điều kiện làm việc.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="form-group full">
                <span>Tiêu đề công việc *</span>
                <input
                  defaultValue={job.title}
                  name="viTriTuyenDung"
                  required
                />
              </label>
              <label className="form-group">
                <span>Ngành nghề *</span>
                <select
                  defaultValue={String(job.categoryId)}
                  name="nganhNgheId"
                  required
                >
                  <option value="">Chọn ngành nghề</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-group">
                <span>Hình thức làm việc *</span>
                <select defaultValue={job.type} name="hinhThucLamViec">
                  <option value="TOAN_THOI_GIAN">Toàn thời gian</option>
                  <option value="BAN_THOI_GIAN">Bán thời gian</option>
                  <option value="THUC_TAP">Thực tập</option>
                  <option value="THOI_VU">Thời vụ</option>
                  <option value="TU_XA">Từ xa</option>
                </select>
              </label>
              <label className="form-group">
                <span>Lương từ (VNĐ)</span>
                <input
                  defaultValue={numberValue(job.salaryFrom)}
                  name="mucLuongTu"
                  type="number"
                />
              </label>
              <label className="form-group">
                <span>Lương đến (VNĐ)</span>
                <input
                  defaultValue={numberValue(job.salaryTo)}
                  name="mucLuongDen"
                  type="number"
                />
              </label>
              <label className="form-group full checkbox-line">
                <input
                  defaultChecked={job.negotiable}
                  name="coTheThoaThuan"
                  type="checkbox"
                />
                <span>Mức lương có thể thỏa thuận</span>
              </label>
              <label className="form-group full">
                <span>Địa điểm *</span>
                <input
                  defaultValue={job.location}
                  name="diaDiemLamViec"
                  required
                />
              </label>
              <label className="form-group">
                <span>Số năm kinh nghiệm tối thiểu</span>
                <input
                  defaultValue={numberValue(job.experience)}
                  min="0"
                  name="soNamKinhNghiemToiThieu"
                  step="0.5"
                  type="number"
                />
              </label>
              <label className="form-group">
                <span>Trình độ yêu cầu</span>
                <input
                  defaultValue={job.requiredEducation ?? ''}
                  name="trinhDoYeuCau"
                />
              </label>
            </div>

            <div className="card-title numbered">
              <b>2</b>
              <div>
                <h2>Nội dung tuyển dụng</h2>
                <p>Mô tả rõ trách nhiệm, yêu cầu và quyền lợi.</p>
              </div>
            </div>
            <label className="form-group">
              <span>Mô tả công việc *</span>
              <textarea
                defaultValue={job.description}
                name="moTaCongViec"
                required
              />
            </label>
            <label className="form-group">
              <span>Yêu cầu ứng viên *</span>
              <textarea
                defaultValue={job.requirements}
                name="yeuCauUngVien"
                required
              />
            </label>
            <label className="form-group">
              <span>Kỹ năng (phân cách bằng dấu phẩy)</span>
              <input defaultValue={job.skills.join(', ')} name="skills" />
            </label>
            <label className="form-group">
              <span>Quyền lợi</span>
              <textarea defaultValue={job.benefits ?? ''} name="quyenLoi" />
            </label>
            <div className="form-grid">
              <label className="form-group">
                <span>Hạn nộp hồ sơ *</span>
                <input
                  defaultValue={dateInputValue(job.deadline)}
                  name="thoiHanNhanHoSo"
                  type="date"
                  required
                />
              </label>
              <label className="form-group">
                <span>Số lượng tuyển</span>
                <input
                  defaultValue={job.quantity ?? 1}
                  min="1"
                  name="soLuongTuyen"
                  type="number"
                />
              </label>
            </div>
            <div className="form-footer">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu và gửi kiểm duyệt'}
              </button>
            </div>
          </form>
        )}
      </section>
    </SiteShell>
  );
}

function dateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function numberValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}
