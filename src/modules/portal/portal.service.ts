import { HttpStatus, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import {
  HinhThucLamViec,
  LoaiDoiTuongKiemDuyet,
  LoaiThongBao,
  Prisma,
  TrangThaiHienThiTin,
  TrangThaiKiemDuyet,
  TrangThaiUngTuyen,
  VaiTroTaiKhoan,
} from '../../../generated/prisma/client.js';
import { ApiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async categories(onlyVisible = true) {
    const items = await this.prisma.nganhNghe.findMany({
      where: onlyVisible ? { trangThaiHienThi: true } : {},
      include: { _count: { select: { tinTuyenDungs: true } } },
      orderBy: { tenNganhNghe: 'asc' },
    });
    return {
      success: true,
      data: items.map((item) => ({
        id: item.id,
        name: item.tenNganhNghe,
        description: item.moTa,
        visible: item.trangThaiHienThi,
        jobCount: item._count.tinTuyenDungs,
        createdAt: item.ngayTao,
        updatedAt: item.ngayCapNhat,
      })),
    };
  }

  async fields() {
    const items = await this.prisma.linhVuc.findMany({
      where: { trangThaiHienThi: true },
      orderBy: { tenLinhVuc: 'asc' },
    });
    return { success: true, data: items };
  }

  async jobs(query: Record<string, string | undefined>) {
    const where: Prisma.TinTuyenDungWhereInput = {
      trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      thoiHanNhanHoSo: { gte: new Date() },
    };
    if (query.category) {
      where.nganhNghe = {
        tenNganhNghe: { equals: query.category, mode: 'insensitive' },
      };
    }
    if (query.keyword) {
      where.OR = [
        { viTriTuyenDung: { contains: query.keyword, mode: 'insensitive' } },
        {
          nhaTuyenDung: {
            tenDonVi: { contains: query.keyword, mode: 'insensitive' },
          },
        },
      ];
    }
    const items = await this.prisma.tinTuyenDung.findMany({
      where,
      include: this.jobInclude(),
      orderBy: { ngayDang: 'desc' },
    });
    return { success: true, data: items.map((item) => this.mapJob(item)) };
  }

  async jobDetail(id: number) {
    const item = await this.prisma.tinTuyenDung.findFirst({
      where: {
        id,
        trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
        trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      },
      include: this.jobInclude(),
    });
    if (!item) this.notFound('Không tìm thấy tin tuyển dụng.');
    return { success: true, data: this.mapJob(item) };
  }

  async companyDetail(id: number) {
    const company = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { id },
      include: {
        linhVuc: true,
        tinTuyenDungs: {
          where: {
            trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
            trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
          },
          include: this.jobInclude(),
        },
      },
    });
    if (!company) this.notFound('Không tìm thấy doanh nghiệp.');
    return {
      success: true,
      data: {
        ...company,
        jobs: company.tinTuyenDungs.map((item) => this.mapJob(item)),
      },
    };
  }

  async workerProfile(accountId: number) {
    const profile = await this.prisma.hoSoNguoiLaoDong.findUnique({
      where: { taiKhoanId: accountId },
      include: {
        taiKhoan: { select: { email: true, soDienThoai: true } },
        hocVans: true,
        kinhNghiemLamViecs: true,
        hoSoKyNangs: { include: { kyNang: true } },
      },
    });
    if (!profile) this.notFound('Chưa có hồ sơ người lao động.');
    return { success: true, data: profile };
  }

  async updateWorkerProfile(accountId: number, body: Record<string, any>) {
    const profile = await this.prisma.hoSoNguoiLaoDong.findUnique({
      where: { taiKhoanId: accountId },
    });
    if (!profile) this.notFound('Chưa có hồ sơ người lao động.');

    await this.prisma.$transaction(async (tx) => {
      await tx.hoSoNguoiLaoDong.update({
        where: { id: profile.id },
        data: {
          hoTen: body.hoTen,
          ngaySinh: body.ngaySinh ? new Date(body.ngaySinh) : null,
          gioiTinh: body.gioiTinh || null,
          diaChi: body.diaChi || null,
          anhDaiDienUrl: body.anhDaiDienUrl || null,
          gioiThieuBanThan: body.gioiThieuBanThan || null,
          mucLuongMongMuonTu: this.decimal(body.mucLuongMongMuonTu),
          mucLuongMongMuonDen: this.decimal(body.mucLuongMongMuonDen),
          diaDiemMongMuon: body.diaDiemMongMuon || null,
          tepCvUrl: body.tepCvUrl || null,
        },
      });
      if (Array.isArray(body.kinhNghiemLamViecs)) {
        await tx.kinhNghiemLamViec.deleteMany({
          where: { hoSoNguoiLaoDongId: profile.id },
        });
        if (body.kinhNghiemLamViecs.length) {
          await tx.kinhNghiemLamViec.createMany({
            data: body.kinhNghiemLamViecs.map((item: any) => ({
              hoSoNguoiLaoDongId: profile.id,
              tenDonVi: item.tenDonVi,
              viTriCongViec: item.viTriCongViec,
              ngayBatDau: new Date(item.ngayBatDau),
              ngayKetThuc: item.ngayKetThuc ? new Date(item.ngayKetThuc) : null,
              dangLamViec: Boolean(item.dangLamViec),
              moTaCongViec: item.moTaCongViec || null,
            })),
          });
        }
      }
      if (Array.isArray(body.hocVans)) {
        await tx.hocVan.deleteMany({ where: { hoSoNguoiLaoDongId: profile.id } });
        if (body.hocVans.length) {
          await tx.hocVan.createMany({
            data: body.hocVans.map((item: any) => ({
              hoSoNguoiLaoDongId: profile.id,
              trinhDo: item.trinhDo,
              tenCoSoDaoTao: item.tenCoSoDaoTao,
              chuyenNganh: item.chuyenNganh || null,
              namBatDau: Number(item.namBatDau),
              namTotNghiep: item.namTotNghiep ? Number(item.namTotNghiep) : null,
              dangHoc: Boolean(item.dangHoc),
              xepLoai: item.xepLoai || null,
            })),
          });
        }
      }
      if (Array.isArray(body.skills)) {
        await tx.hoSoKyNang.deleteMany({
          where: { hoSoNguoiLaoDongId: profile.id },
        });
        for (const skillName of body.skills) {
          const skill = await tx.kyNang.upsert({
            where: { tenKyNang: String(skillName).trim() },
            create: { tenKyNang: String(skillName).trim() },
            update: {},
          });
          await tx.hoSoKyNang.create({
            data: {
              hoSoNguoiLaoDongId: profile.id,
              kyNangId: skill.id,
              mucDoThanhThao: 'TRUNG_BINH',
            },
          });
        }
      }
    });
    return this.workerProfile(accountId);
  }

  async apply(accountId: number, jobId: number, body: Record<string, any>) {
    const profile = await this.prisma.hoSoNguoiLaoDong.findUnique({
      where: { taiKhoanId: accountId },
      include: { taiKhoan: true },
    });
    if (!profile) this.notFound('Bạn cần hoàn thiện hồ sơ trước khi ứng tuyển.');
    const job = await this.prisma.tinTuyenDung.findUnique({ where: { id: jobId } });
    if (!job) this.notFound('Không tìm thấy tin tuyển dụng.');
    const application = await this.prisma.ungTuyen.create({
      data: {
        hoSoNguoiLaoDongId: profile.id,
        tinTuyenDungId: jobId,
        hoTenSnapshot: profile.hoTen,
        emailSnapshot: profile.taiKhoan.email,
        soDienThoaiSnapshot: profile.taiKhoan.soDienThoai,
        tepCvSnapshotUrl: body.tepCvUrl || profile.tepCvUrl,
        thuGioiThieu: body.thuGioiThieu || null,
        lichSuTrangThaiUngTuyens: {
          create: { trangThaiSau: TrangThaiUngTuyen.DA_NOP },
        },
      },
    });
    return { success: true, message: 'Ứng tuyển thành công.', data: application };
  }

  async workerApplications(accountId: number) {
    const items = await this.prisma.ungTuyen.findMany({
      where: { hoSoNguoiLaoDong: { taiKhoanId: accountId } },
      include: { tinTuyenDung: { include: this.jobInclude() } },
      orderBy: { ngayNop: 'desc' },
    });
    return {
      success: true,
      data: items.map((item) => ({
        ...item,
        job: this.mapJob(item.tinTuyenDung),
      })),
    };
  }

  async savedJobs(accountId: number) {
    const items = await this.prisma.tinTuyenDungDaLuu.findMany({
      where: { hoSoNguoiLaoDong: { taiKhoanId: accountId } },
      include: { tinTuyenDung: { include: this.jobInclude() } },
      orderBy: { ngayLuu: 'desc' },
    });
    return {
      success: true,
      data: items.map((item) => this.mapJob(item.tinTuyenDung)),
    };
  }

  async saveJob(accountId: number, jobId: number) {
    const profile = await this.workerProfileRecord(accountId);
    await this.prisma.tinTuyenDungDaLuu.upsert({
      where: {
        hoSoNguoiLaoDongId_tinTuyenDungId: {
          hoSoNguoiLaoDongId: profile.id,
          tinTuyenDungId: jobId,
        },
      },
      create: { hoSoNguoiLaoDongId: profile.id, tinTuyenDungId: jobId },
      update: {},
    });
    return { success: true, message: 'Đã lưu tin tuyển dụng.' };
  }

  async unsaveJob(accountId: number, jobId: number) {
    const profile = await this.workerProfileRecord(accountId);
    await this.prisma.tinTuyenDungDaLuu.deleteMany({
      where: { hoSoNguoiLaoDongId: profile.id, tinTuyenDungId: jobId },
    });
    return { success: true, message: 'Đã bỏ lưu tin tuyển dụng.' };
  }

  async employerProfile(accountId: number) {
    const profile = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { taiKhoanId: accountId },
      include: { linhVuc: true, taiKhoan: { select: { email: true } } },
    });
    if (!profile) this.notFound('Không tìm thấy hồ sơ nhà tuyển dụng.');
    return { success: true, data: profile };
  }

  async updateEmployerProfile(accountId: number, body: Record<string, any>) {
    const profile = await this.prisma.hoSoNhaTuyenDung.update({
      where: { taiKhoanId: accountId },
      data: {
        tenDonVi: body.tenDonVi,
        linhVucId: body.linhVucId ? Number(body.linhVucId) : null,
        diaChiTruSo: body.diaChiTruSo,
        nguoiDaiDien: body.nguoiDaiDien || null,
        chucVuNguoiDaiDien: body.chucVuNguoiDaiDien || null,
        soDienThoaiLienHe: body.soDienThoaiLienHe || null,
        emailLienHe: body.emailLienHe || null,
        website: body.website || null,
        logoUrl: body.logoUrl || null,
        moTaDonVi: body.moTaDonVi || null,
        tepGiayPhepUrl: body.tepGiayPhepUrl || body.tepGiayPhepKinhDoanh || null,
        trangThaiDuyet: TrangThaiKiemDuyet.CHO_DUYET,
        ngayGuiDuyet: new Date(),
      },
    });
    return { success: true, message: 'Đã cập nhật và gửi hồ sơ chờ duyệt.', data: profile };
  }

  async employerJobs(accountId: number) {
    const items = await this.prisma.tinTuyenDung.findMany({
      where: { nhaTuyenDung: { taiKhoanId: accountId } },
      include: { ...this.jobInclude(), _count: { select: { ungTuyens: true } } },
      orderBy: { ngayTao: 'desc' },
    });
    return {
      success: true,
      data: items.map((item) => ({
        ...this.mapJob(item),
        applicantCount: item._count.ungTuyens,
      })),
    };
  }

  async createEmployerJob(accountId: number, body: Record<string, any>) {
    const employer = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { taiKhoanId: accountId },
    });
    if (!employer) this.notFound('Không tìm thấy hồ sơ nhà tuyển dụng.');
    const job = await this.prisma.tinTuyenDung.create({
      data: {
        nhaTuyenDungId: employer.id,
        nganhNgheId: Number(body.nganhNgheId),
        viTriTuyenDung: body.viTriTuyenDung,
        moTaCongViec: body.moTaCongViec,
        yeuCauUngVien: body.yeuCauUngVien,
        quyenLoi: body.quyenLoi || null,
        mucLuongTu: this.decimal(body.mucLuongTu),
        mucLuongDen: this.decimal(body.mucLuongDen),
        coTheThoaThuan: Boolean(body.coTheThoaThuan),
        diaDiemLamViec: body.diaDiemLamViec,
        hinhThucLamViec: body.hinhThucLamViec as HinhThucLamViec,
        soLuongTuyen: Number(body.soLuongTuyen || 1),
        soNamKinhNghiemToiThieu: this.decimal(body.soNamKinhNghiemToiThieu),
        trinhDoYeuCau: body.trinhDoYeuCau || null,
        thoiHanNhanHoSo: new Date(body.thoiHanNhanHoSo),
        trangThaiKiemDuyet: TrangThaiKiemDuyet.CHO_DUYET,
        ngayGuiDuyet: new Date(),
      },
    });
    return { success: true, message: 'Đã gửi tin tuyển dụng chờ duyệt.', data: job };
  }

  async employerApplicants(accountId: number, jobId: number) {
    await this.assertEmployerJob(accountId, jobId);
    const items = await this.prisma.ungTuyen.findMany({
      where: { tinTuyenDungId: jobId },
      include: { hoSoNguoiLaoDong: true },
      orderBy: { ngayNop: 'desc' },
    });
    return { success: true, data: items };
  }

  async employerApplicant(accountId: number, jobId: number, id: number) {
    await this.assertEmployerJob(accountId, jobId);
    const item = await this.prisma.ungTuyen.findFirst({
      where: { id, tinTuyenDungId: jobId },
      include: {
        hoSoNguoiLaoDong: {
          include: {
            taiKhoan: { select: { email: true, soDienThoai: true } },
            hocVans: true,
            kinhNghiemLamViecs: true,
            hoSoKyNangs: { include: { kyNang: true } },
          },
        },
        lichSuTrangThaiUngTuyens: true,
      },
    });
    if (!item) this.notFound('Không tìm thấy ứng viên.');
    return { success: true, data: item };
  }

  async updateApplicationStatus(
    accountId: number,
    jobId: number,
    id: number,
    body: Record<string, any>,
  ) {
    await this.assertEmployerJob(accountId, jobId);
    const current = await this.prisma.ungTuyen.findFirst({
      where: { id, tinTuyenDungId: jobId },
    });
    if (!current) this.notFound('Không tìm thấy ứng viên.');
    const status = body.status as TrangThaiUngTuyen;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ungTuyen.update({
        where: { id },
        data: { trangThaiHienTai: status, ngayCapNhatTrangThai: new Date() },
      });
      await tx.lichSuTrangThaiUngTuyen.create({
        data: {
          ungTuyenId: id,
          nguoiThucHienId: accountId,
          trangThaiTruoc: current.trangThaiHienTai,
          trangThaiSau: status,
          ghiChu: body.note || null,
        },
      });
      return result;
    });
    return { success: true, message: 'Đã cập nhật trạng thái ứng viên.', data: updated };
  }

  async adminCategories() {
    return this.categories(false);
  }

  async saveCategory(body: Record<string, any>, id?: number) {
    const data = {
      tenNganhNghe: body.name ?? body.tenNghe,
      moTa: body.description ?? body.moTa ?? null,
      trangThaiHienThi: body.visible ?? body.trangThaiHienThi ?? true,
    };
    const item = id
      ? await this.prisma.nganhNghe.update({ where: { id }, data })
      : await this.prisma.nganhNghe.create({ data });
    return {
      success: true,
      data: {
        id: item.id,
        name: item.tenNganhNghe,
        description: item.moTa,
        visible: item.trangThaiHienThi,
        createdAt: item.ngayTao,
        updatedAt: item.ngayCapNhat,
      },
    };
  }

  async deleteCategory(id: number) {
    const jobs = await this.prisma.tinTuyenDung.count({ where: { nganhNgheId: id } });
    if (jobs) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'CATEGORY_IN_USE',
        message: 'Không thể xóa ngành nghề đang có tin tuyển dụng.',
      });
    }
    await this.prisma.nganhNghe.delete({ where: { id } });
    return { success: true, message: 'Đã xóa ngành nghề.' };
  }

  async adminEmployers() {
    const items = await this.prisma.hoSoNhaTuyenDung.findMany({
      include: { taiKhoan: { select: { email: true, soDienThoai: true } }, linhVuc: true },
      orderBy: { ngayTao: 'desc' },
    });
    return { success: true, data: items };
  }

  async adminEmployer(id: number) {
    const item = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { id },
      include: { taiKhoan: { select: { email: true, soDienThoai: true } }, linhVuc: true },
    });
    if (!item) this.notFound('Không tìm thấy nhà tuyển dụng.');
    return { success: true, data: item };
  }

  async reviewEmployer(adminId: number, id: number, body: Record<string, any>) {
    const status = this.reviewStatus(body.action ?? body.hanhDong);
    const current = await this.prisma.hoSoNhaTuyenDung.findUnique({ where: { id } });
    if (!current) this.notFound('Không tìm thấy nhà tuyển dụng.');
    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.hoSoNhaTuyenDung.update({
        where: { id },
        data: {
          trangThaiDuyet: status,
          lyDoTuChoi: body.reason ?? body.lyDo ?? null,
          ngayDuyet: new Date(),
        },
      });
      await tx.lichSuKiemDuyet.create({
        data: {
          nguoiKiemDuyetId: adminId,
          loaiDoiTuong: LoaiDoiTuongKiemDuyet.NHA_TUYEN_DUNG,
          hoSoNhaTuyenDungId: id,
          trangThaiTruoc: current.trangThaiDuyet,
          trangThaiSau: status,
          lyDo: body.reason ?? body.lyDo ?? null,
        },
      });
      return updated;
    });
    return { success: true, data: item };
  }

  async adminJobs() {
    const items = await this.prisma.tinTuyenDung.findMany({
      include: this.jobInclude(),
      orderBy: { ngayTao: 'desc' },
    });
    return { success: true, data: items.map((item) => this.mapJob(item)) };
  }

  async adminJob(id: number) {
    const item = await this.prisma.tinTuyenDung.findUnique({
      where: { id },
      include: this.jobInclude(),
    });
    if (!item) this.notFound('Không tìm thấy tin tuyển dụng.');
    return { success: true, data: this.mapJob(item) };
  }

  async reviewJob(adminId: number, id: number, body: Record<string, any>) {
    const status = this.reviewStatus(body.action ?? body.hanhDong);
    const current = await this.prisma.tinTuyenDung.findUnique({ where: { id } });
    if (!current) this.notFound('Không tìm thấy tin tuyển dụng.');
    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.tinTuyenDung.update({
        where: { id },
        data: {
          trangThaiKiemDuyet: status,
          trangThaiHienThi:
            status === TrangThaiKiemDuyet.DA_DUYET
              ? TrangThaiHienThiTin.DANG_HIEN_THI
              : TrangThaiHienThiTin.CHUA_DANG,
          lyDoTuChoi: body.reason ?? body.lyDo ?? null,
          ngayDuyet: new Date(),
          ngayDang: status === TrangThaiKiemDuyet.DA_DUYET ? new Date() : null,
        },
      });
      await tx.lichSuKiemDuyet.create({
        data: {
          nguoiKiemDuyetId: adminId,
          loaiDoiTuong: LoaiDoiTuongKiemDuyet.TIN_TUYEN_DUNG,
          tinTuyenDungId: id,
          trangThaiTruoc: current.trangThaiKiemDuyet,
          trangThaiSau: status,
          lyDo: body.reason ?? body.lyDo ?? null,
        },
      });
      return updated;
    });
    return { success: true, data: item };
  }

  async notifications(accountId: number) {
    const items = await this.prisma.thongBao.findMany({
      where: { taiKhoanId: accountId },
      orderBy: { ngayTao: 'desc' },
    });
    return { success: true, data: items };
  }

  async readNotification(accountId: number, id: number) {
    await this.prisma.thongBao.updateMany({
      where: { id, taiKhoanId: accountId },
      data: { daDoc: true, ngayDoc: new Date() },
    });
    return { success: true };
  }

  async statistics() {
    const [workers, employers, jobs, applications, approvedJobs] =
      await this.prisma.$transaction([
        this.prisma.taiKhoan.count({ where: { vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG } }),
        this.prisma.taiKhoan.count({ where: { vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG } }),
        this.prisma.tinTuyenDung.count(),
        this.prisma.ungTuyen.count(),
        this.prisma.tinTuyenDung.count({
          where: { trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET },
        }),
      ]);
    return {
      success: true,
      data: { workers, employers, jobs, applications, approvedJobs },
    };
  }

  async changePassword(accountId: number, body: Record<string, any>) {
    const account = await this.prisma.taiKhoan.findUnique({ where: { id: accountId } });
    if (!account) this.notFound('Không tìm thấy tài khoản.');
    const matches = await bcrypt.compare(body.currentPassword, account.matKhauHash);
    if (!matches) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Mật khẩu hiện tại không chính xác.',
      });
    }
    const hash = await bcrypt.hash(body.newPassword, 12);
    await this.prisma.taiKhoan.update({
      where: { id: accountId },
      data: { matKhauHash: hash },
    });
    return { success: true, message: 'Đổi mật khẩu thành công.' };
  }

  async forgotPassword(body: Record<string, any>) {
    const email = String(body.email ?? '').trim().toLowerCase();
    const account = await this.prisma.taiKhoan.findUnique({ where: { email } });
    const generic = { success: true, message: 'Nếu email tồn tại, mã OTP đã được tạo.' };
    if (!account) return generic;
    const otp = String(randomInt(100000, 1000000));
    await this.prisma.maXacThuc.updateMany({
      where: { taiKhoanId: account.id, mucDich: 'QUEN_MAT_KHAU', daSuDung: false },
      data: { daSuDung: true },
    });
    await this.prisma.maXacThuc.create({
      data: {
        taiKhoanId: account.id,
        mucDich: 'QUEN_MAT_KHAU',
        maXacThucHash: await bcrypt.hash(otp, 10),
        hanSuDung: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    return { ...generic, data: { developmentOtp: otp, expiresIn: 600 } };
  }

  async resetPassword(body: Record<string, any>) {
    const email = String(body.email ?? '').trim().toLowerCase();
    if (body.newPassword !== body.confirmPassword || String(body.newPassword).length < 8) {
      throw new ApiError(HttpStatus.BAD_REQUEST, { code: 'INVALID_PASSWORD', message: 'Mật khẩu xác nhận không khớp hoặc chưa đủ 8 ký tự.' });
    }
    const account = await this.prisma.taiKhoan.findUnique({ where: { email } });
    if (!account) this.notFound('Mã OTP không hợp lệ.');
    const record = await this.prisma.maXacThuc.findFirst({
      where: { taiKhoanId: account.id, mucDich: 'QUEN_MAT_KHAU', daSuDung: false, hanSuDung: { gt: new Date() } },
      orderBy: { ngayTao: 'desc' },
    });
    if (!record || !(await bcrypt.compare(String(body.otp), record.maXacThucHash))) {
      throw new ApiError(HttpStatus.BAD_REQUEST, { code: 'INVALID_OTP', message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
    }
    await this.prisma.$transaction([
      this.prisma.taiKhoan.update({ where: { id: account.id }, data: { matKhauHash: await bcrypt.hash(body.newPassword, 12) } }),
      this.prisma.maXacThuc.update({ where: { id: record.id }, data: { daSuDung: true } }),
    ]);
    return { success: true, message: 'Đặt lại mật khẩu thành công.' };
  }

  private jobInclude() {
    return {
      nganhNghe: true,
      nhaTuyenDung: { include: { linhVuc: true } },
      tinTuyenDungKyNangs: { include: { kyNang: true } },
    } as const;
  }

  private mapJob(item: any) {
    return {
      id: item.id,
      title: item.viTriTuyenDung,
      companyId: item.nhaTuyenDung.id,
      company: item.nhaTuyenDung.tenDonVi,
      companyLogo: item.nhaTuyenDung.logoUrl,
      location: item.diaDiemLamViec,
      category: item.nganhNghe.tenNganhNghe,
      categoryId: item.nganhNgheId,
      salaryFrom: item.mucLuongTu,
      salaryTo: item.mucLuongDen,
      negotiable: item.coTheThoaThuan,
      experience: item.soNamKinhNghiemToiThieu,
      type: item.hinhThucLamViec,
      description: item.moTaCongViec,
      requirements: item.yeuCauUngVien,
      benefits: item.quyenLoi,
      deadline: item.thoiHanNhanHoSo,
      status: item.trangThaiKiemDuyet,
      displayStatus: item.trangThaiHienThi,
      rejectionReason: item.lyDoTuChoi,
      postedAt: item.ngayDang ?? item.ngayTao,
      skills: item.tinTuyenDungKyNangs.map((skill: any) => skill.kyNang.tenKyNang),
      employer: item.nhaTuyenDung,
    };
  }

  private decimal(value: unknown) {
    return value === '' || value === null || value === undefined
      ? null
      : new Prisma.Decimal(String(value));
  }

  private async workerProfileRecord(accountId: number) {
    const profile = await this.prisma.hoSoNguoiLaoDong.findUnique({
      where: { taiKhoanId: accountId },
    });
    if (!profile) this.notFound('Chưa có hồ sơ người lao động.');
    return profile;
  }

  private async assertEmployerJob(accountId: number, jobId: number) {
    const job = await this.prisma.tinTuyenDung.findFirst({
      where: { id: jobId, nhaTuyenDung: { taiKhoanId: accountId } },
    });
    if (!job) this.notFound('Không tìm thấy tin tuyển dụng của doanh nghiệp.');
  }

  private reviewStatus(action: string): TrangThaiKiemDuyet {
    if (['approve', 'duyet', 'DA_DUYET', 'PHE_DUYET'].includes(action)) {
      return TrangThaiKiemDuyet.DA_DUYET;
    }
    if (['request', 'bo-sung', 'YEU_CAU_BO_SUNG'].includes(action)) {
      return TrangThaiKiemDuyet.YEU_CAU_BO_SUNG;
    }
    return TrangThaiKiemDuyet.TU_CHOI;
  }

  private notFound(message: string): never {
    throw new ApiError(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message });
  }
}
