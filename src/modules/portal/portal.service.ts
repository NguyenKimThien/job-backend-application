import { HttpStatus, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import {
  HinhThucLamViec,
  LoaiDoiTuongKiemDuyet,
  LoaiThongBao,
  MucDichMaXacThuc,
  Prisma,
  TrangThaiHienThiTin,
  TrangThaiKiemDuyet,
  TrangThaiUngTuyen,
  VaiTroTaiKhoan,
} from '../../../generated/prisma/client.js';
import { ApiError } from '../../common/api-error.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
    if (query.location) {
      where.diaDiemLamViec = { contains: query.location, mode: 'insensitive' };
    }
    if (
      query.type &&
      Object.values(HinhThucLamViec).includes(query.type as HinhThucLamViec)
    ) {
      where.hinhThucLamViec = query.type as HinhThucLamViec;
    }
    const salaryMin = this.numberOrNull(query.salaryMin);
    const salaryMax = this.numberOrNull(query.salaryMax);
    const experienceMax = this.numberOrNull(query.experienceMax);
    const extraFilters: Prisma.TinTuyenDungWhereInput[] = [];
    if (salaryMin !== null || salaryMax !== null) {
      extraFilters.push({
        coTheThoaThuan: false,
        ...(salaryMin !== null ? { mucLuongDen: { gte: salaryMin } } : {}),
        ...(salaryMax !== null ? { mucLuongTu: { lte: salaryMax } } : {}),
      });
    }
    if (experienceMax !== null) {
      extraFilters.push({
        OR: [
          { soNamKinhNghiemToiThieu: null },
          { soNamKinhNghiemToiThieu: { lte: experienceMax } },
        ],
      });
    }
    if (extraFilters.length) where.AND = extraFilters;
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
    const job = await this.prisma.tinTuyenDung.findUnique({
      where: { id: jobId },
      include: { nhaTuyenDung: true },
    });
    if (!job) this.notFound('Không tìm thấy tin tuyển dụng.');
    if (
      job.trangThaiKiemDuyet !== TrangThaiKiemDuyet.DA_DUYET ||
      job.trangThaiHienThi !== TrangThaiHienThiTin.DANG_HIEN_THI ||
      job.thoiHanNhanHoSo < new Date()
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'JOB_NOT_OPEN',
        message: 'Tin tuyển dụng không còn nhận hồ sơ.',
      });
    }
    const existing = await this.prisma.ungTuyen.findUnique({
      where: {
        hoSoNguoiLaoDongId_tinTuyenDungId: {
          hoSoNguoiLaoDongId: profile.id,
          tinTuyenDungId: jobId,
        },
      },
    });
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'ALREADY_APPLIED',
        message: 'Bạn đã ứng tuyển vào tin này.',
      });
    }
    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ungTuyen.create({
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
      await tx.thongBao.create({
        data: {
          taiKhoanId: job.nhaTuyenDung.taiKhoanId,
          tieuDe: 'Có hồ sơ ứng tuyển mới',
          noiDung: `${profile.hoTen} vừa ứng tuyển vị trí ${job.viTriTuyenDung}.`,
          loaiThongBao: LoaiThongBao.UNG_TUYEN,
          duongDanDich: `/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien`,
        },
      });
      return created;
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

  async employerJob(accountId: number, jobId: number) {
    await this.assertEmployerJob(accountId, jobId);
    const item = await this.prisma.tinTuyenDung.findUnique({
      where: { id: jobId },
      include: this.jobInclude(),
    });
    if (!item) this.notFound('Không tìm thấy tin tuyển dụng.');
    return { success: true, data: this.mapJob(item) };
  }

  async createEmployerJob(accountId: number, body: Record<string, any>) {
    const employer = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { taiKhoanId: accountId },
      include: { taiKhoan: true },
    });
    if (!employer) this.notFound('Không tìm thấy hồ sơ nhà tuyển dụng.');
    if (
      employer.trangThaiDuyet !== TrangThaiKiemDuyet.DA_DUYET ||
      employer.taiKhoan.trangThaiTaiKhoan !== 'HOAT_DONG'
    ) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'EMPLOYER_NOT_APPROVED',
        message: 'Hồ sơ nhà tuyển dụng phải được duyệt trước khi đăng tin.',
      });
    }
    this.validateJobBody(body);
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tinTuyenDung.create({
        data: this.jobWriteData(employer.id, body),
      });
      await this.replaceJobSkills(tx, created.id, body.skills);
      await this.notifyAdmins(
        tx,
        'Tin tuyển dụng mới chờ duyệt',
        `${employer.tenDonVi} vừa gửi tin “${created.viTriTuyenDung}”.`,
        `/quan-tri/kiem-duyet-tin/${created.id}`,
      );
      return created;
    });
    return { success: true, message: 'Đã gửi tin tuyển dụng chờ duyệt.', data: job };
  }

  async updateEmployerJob(
    accountId: number,
    jobId: number,
    body: Record<string, any>,
  ) {
    const current = await this.prisma.tinTuyenDung.findFirst({
      where: { id: jobId, nhaTuyenDung: { taiKhoanId: accountId } },
      include: { nhaTuyenDung: true },
    });
    if (!current) this.notFound('Không tìm thấy tin tuyển dụng của doanh nghiệp.');
    if (current.trangThaiKiemDuyet === TrangThaiKiemDuyet.CHO_DUYET) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'JOB_NOT_EDITABLE',
        message: 'Tin đang chờ kiểm duyệt nên chưa thể chỉnh sửa.',
      });
    }
    if (current.soLanChinhSua >= 3) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'JOB_EDIT_LIMIT',
        message: 'Tin tuyển dụng đã vượt quá 3 lần chỉnh sửa.',
      });
    }
    this.validateJobBody(body);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.tinTuyenDung.update({
        where: { id: jobId },
        data: {
          ...this.jobWriteData(current.nhaTuyenDungId, body),
          soLanChinhSua: { increment: 1 },
          lyDoTuChoi: null,
        },
      });
      await this.replaceJobSkills(tx, jobId, body.skills);
      await this.notifyAdmins(
        tx,
        'Tin tuyển dụng đã được gửi lại',
        `${current.nhaTuyenDung.tenDonVi} đã chỉnh sửa và gửi lại tin “${item.viTriTuyenDung}”.`,
        `/quan-tri/kiem-duyet-tin/${jobId}`,
      );
      return item;
    });
    return { success: true, message: 'Đã cập nhật và gửi lại tin chờ duyệt.', data: updated };
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
    if (item.trangThaiHienTai === TrangThaiUngTuyen.DA_NOP) {
      await this.prisma.$transaction([
        this.prisma.ungTuyen.update({
          where: { id },
          data: {
            trangThaiHienTai: TrangThaiUngTuyen.DA_XEM,
            ngayCapNhatTrangThai: new Date(),
          },
        }),
        this.prisma.lichSuTrangThaiUngTuyen.create({
          data: {
            ungTuyenId: id,
            nguoiThucHienId: accountId,
            trangThaiTruoc: TrangThaiUngTuyen.DA_NOP,
            trangThaiSau: TrangThaiUngTuyen.DA_XEM,
          },
        }),
      ]);
      item.trangThaiHienTai = TrangThaiUngTuyen.DA_XEM;
    }
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
    const allowed: Partial<Record<TrangThaiUngTuyen, TrangThaiUngTuyen[]>> = {
      [TrangThaiUngTuyen.DA_NOP]: [
        TrangThaiUngTuyen.MOI_PHONG_VAN,
        TrangThaiUngTuyen.KHONG_PHU_HOP,
      ],
      [TrangThaiUngTuyen.DA_XEM]: [
        TrangThaiUngTuyen.MOI_PHONG_VAN,
        TrangThaiUngTuyen.KHONG_PHU_HOP,
      ],
      [TrangThaiUngTuyen.DUOC_CHON_SO_BO]: [
        TrangThaiUngTuyen.MOI_PHONG_VAN,
        TrangThaiUngTuyen.KHONG_PHU_HOP,
      ],
      [TrangThaiUngTuyen.MOI_PHONG_VAN]: [
        TrangThaiUngTuyen.DA_PHONG_VAN,
        TrangThaiUngTuyen.TRUNG_TUYEN,
        TrangThaiUngTuyen.KHONG_PHU_HOP,
      ],
      [TrangThaiUngTuyen.DA_PHONG_VAN]: [
        TrangThaiUngTuyen.TRUNG_TUYEN,
        TrangThaiUngTuyen.KHONG_PHU_HOP,
      ],
    };
    if (!Object.values(TrangThaiUngTuyen).includes(status) ||
        !allowed[current.trangThaiHienTai]?.includes(status)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_APPLICATION_TRANSITION',
        message: 'Chuyển trạng thái ứng tuyển không hợp lệ.',
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ungTuyen.update({
        where: { id },
        data: {
          trangThaiHienTai: status,
          ngayCapNhatTrangThai: new Date(),
          lyDoTuChoi:
            status === TrangThaiUngTuyen.KHONG_PHU_HOP
              ? body.reason ?? body.note ?? null
              : null,
        },
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
      const application = await tx.ungTuyen.findUnique({
        where: { id },
        include: {
          hoSoNguoiLaoDong: true,
          tinTuyenDung: true,
        },
      });
      if (application) {
        await tx.thongBao.create({
          data: {
            taiKhoanId: application.hoSoNguoiLaoDong.taiKhoanId,
            tieuDe: 'Trạng thái hồ sơ ứng tuyển đã thay đổi',
            noiDung: `Hồ sơ ứng tuyển vị trí ${application.tinTuyenDung.viTriTuyenDung} đã chuyển sang ${status}.`,
            loaiThongBao: LoaiThongBao.UNG_TUYEN,
            duongDanDich: '/nguoi-lao-dong/ung-tuyen',
          },
        });
      }
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
    await this.prisma.nganhNghe.update({
      where: { id },
      data: { trangThaiHienThi: false },
    });
    return { success: true, message: 'Đã ẩn ngành nghề. Dữ liệu liên kết được giữ nguyên.' };
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
      await tx.thongBao.create({
        data: {
          taiKhoanId: current.taiKhoanId,
          tieuDe: 'Kết quả duyệt hồ sơ nhà tuyển dụng',
          noiDung: status === TrangThaiKiemDuyet.DA_DUYET
            ? 'Hồ sơ nhà tuyển dụng đã được phê duyệt.'
            : `Hồ sơ chưa được duyệt: ${body.reason ?? body.lyDo ?? 'Cần bổ sung thông tin.'}`,
          loaiThongBao: LoaiThongBao.KIEM_DUYET,
          duongDanDich: '/nha-tuyen-dung/ho-so',
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
      const employer = await tx.hoSoNhaTuyenDung.findUnique({
        where: { id: current.nhaTuyenDungId },
      });
      if (employer) {
        await tx.thongBao.create({
          data: {
            taiKhoanId: employer.taiKhoanId,
            tieuDe: 'Kết quả kiểm duyệt tin tuyển dụng',
            noiDung: status === TrangThaiKiemDuyet.DA_DUYET
              ? `Tin “${current.viTriTuyenDung}” đã được duyệt và hiển thị.`
              : `Tin “${current.viTriTuyenDung}” chưa được duyệt: ${body.reason ?? body.lyDo ?? 'Cần bổ sung thông tin.'}`,
            loaiThongBao: LoaiThongBao.KIEM_DUYET,
            duongDanDich: '/nha-tuyen-dung/tin-tuyen-dung',
          },
        });
      }
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

  async readAllNotifications(accountId: number) {
    await this.prisma.thongBao.updateMany({
      where: { taiKhoanId: accountId, daDoc: false },
      data: { daDoc: true, ngayDoc: new Date() },
    });
    return { success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' };
  }

  async statistics(query: Record<string, string | undefined> = {}) {
    const createdAt = this.dateFilter(query.from, query.to);
    const [workers, employers, jobs, applications, approvedJobs] =
      await this.prisma.$transaction([
        this.prisma.taiKhoan.count({ where: { vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG, ...(createdAt ? { ngayTao: createdAt } : {}) } }),
        this.prisma.taiKhoan.count({ where: { vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG, ...(createdAt ? { ngayTao: createdAt } : {}) } }),
        this.prisma.tinTuyenDung.count({ where: createdAt ? { ngayTao: createdAt } : {} }),
        this.prisma.ungTuyen.count({ where: createdAt ? { ngayNop: createdAt } : {} }),
        this.prisma.tinTuyenDung.count({
          where: { trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET, ...(createdAt ? { ngayTao: createdAt } : {}) },
        }),
      ]);
    const [userByStatus, jobByStatus, applicationByStatus] = await this.prisma.$transaction([
      this.prisma.taiKhoan.groupBy({ by: ['trangThaiTaiKhoan'], where: createdAt ? { ngayTao: createdAt } : {}, _count: true, orderBy: { trangThaiTaiKhoan: 'asc' } }),
      this.prisma.tinTuyenDung.groupBy({ by: ['trangThaiKiemDuyet'], where: createdAt ? { ngayTao: createdAt } : {}, _count: true, orderBy: { trangThaiKiemDuyet: 'asc' } }),
      this.prisma.ungTuyen.groupBy({ by: ['trangThaiHienTai'], where: createdAt ? { ngayNop: createdAt } : {}, _count: true, orderBy: { trangThaiHienTai: 'asc' } }),
    ]);
    return {
      success: true,
      data: {
        workers, employers, jobs, applications, approvedJobs,
        period: { from: query.from ?? null, to: query.to ?? null },
        users: {
          total: workers + employers,
          byRole: { NGUOI_LAO_DONG: workers, NHA_TUYEN_DUNG: employers },
          byStatus: Object.fromEntries(userByStatus.map((x) => [x.trangThaiTaiKhoan, x._count])),
        },
        jobStatistics: {
          total: jobs,
          byStatus: Object.fromEntries(jobByStatus.map((x) => [x.trangThaiKiemDuyet, x._count])),
        },
        applicationStatistics: {
          total: applications,
          byStatus: Object.fromEntries(applicationByStatus.map((x) => [x.trangThaiHienTai, x._count])),
        },
      },
    };
  }

  async exportStatistics(query: Record<string, string | undefined> = {}) {
    const { data } = await this.statistics(query);
    const rows: Array<[string, string, number]> = [
      ['Tài khoản', 'Người lao động', data.workers],
      ['Tài khoản', 'Nhà tuyển dụng', data.employers],
      ['Tin tuyển dụng', 'Tổng số', data.jobs],
      ['Tin tuyển dụng', 'Đã duyệt', data.approvedJobs],
      ['Ứng tuyển', 'Tổng số', data.applications],
      ...Object.entries(data.users.byStatus).map(([key, value]) => ['Trạng thái tài khoản', key, value as number] as [string, string, number]),
      ...Object.entries(data.jobStatistics.byStatus).map(([key, value]) => ['Trạng thái tin', key, value as number] as [string, string, number]),
      ...Object.entries(data.applicationStatistics.byStatus).map(([key, value]) => ['Trạng thái ứng tuyển', key, value as number] as [string, string, number]),
    ];
    const csv = [['Nhóm', 'Chỉ tiêu', 'Số lượng'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    return `\uFEFF${csv}`;
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
    const expiresIn = 600;
    const generic = { success: true, message: 'Nếu email tồn tại, mã OTP đã được gửi.' };
    if (!account) return generic;
    const otp = String(randomInt(100000, 1000000));
    await this.prisma.maXacThuc.updateMany({
      where: { taiKhoanId: account.id, mucDich: MucDichMaXacThuc.QUEN_MAT_KHAU, daSuDung: false },
      data: { daSuDung: true },
    });
    const otpRecord = await this.prisma.maXacThuc.create({
      data: {
        taiKhoanId: account.id,
        mucDich: MucDichMaXacThuc.QUEN_MAT_KHAU,
        maXacThucHash: await bcrypt.hash(otp, 10),
        hanSuDung: new Date(Date.now() + expiresIn * 1000),
      },
    });

    try {
      await this.mailService.sendPasswordResetOtp({
        email: account.email,
        hoTen: account.tenDangNhap,
        otp,
        expiresInMinutes: Math.ceil(expiresIn / 60),
      });
    } catch {
      await this.prisma.maXacThuc.update({
        where: { id: otpRecord.id },
        data: { daSuDung: true },
      });
      throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, {
        code: 'PASSWORD_RESET_EMAIL_SEND_FAILED',
        message: 'Chưa thể gửi email OTP. Vui lòng thử lại sau.',
      });
    }

    return { ...generic, data: { expiresIn } };
  }

  async resetPassword(body: Record<string, any>) {
    const email = String(body.email ?? '').trim().toLowerCase();
    if (body.newPassword !== body.confirmPassword || String(body.newPassword).length < 8) {
      throw new ApiError(HttpStatus.BAD_REQUEST, { code: 'INVALID_PASSWORD', message: 'Mật khẩu xác nhận không khớp hoặc chưa đủ 8 ký tự.' });
    }
    const account = await this.prisma.taiKhoan.findUnique({ where: { email } });
    if (!account) this.notFound('Mã OTP không hợp lệ.');
    const record = await this.prisma.maXacThuc.findFirst({
      where: { taiKhoanId: account.id, mucDich: MucDichMaXacThuc.QUEN_MAT_KHAU, daSuDung: false, hanSuDung: { gt: new Date() } },
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
      requiredEducation: item.trinhDoYeuCau,
      quantity: item.soLuongTuyen,
      type: item.hinhThucLamViec,
      description: item.moTaCongViec,
      requirements: item.yeuCauUngVien,
      benefits: item.quyenLoi,
      deadline: item.thoiHanNhanHoSo,
      status: item.trangThaiKiemDuyet,
      displayStatus: item.trangThaiHienThi,
      rejectionReason: item.lyDoTuChoi,
      editCount: item.soLanChinhSua,
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

  private numberOrNull(value: unknown) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private dateFilter(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
    return range;
  }

  private validateJobBody(body: Record<string, any>) {
    const required = [
      'nganhNgheId', 'viTriTuyenDung', 'moTaCongViec', 'yeuCauUngVien',
      'diaDiemLamViec', 'hinhThucLamViec', 'thoiHanNhanHoSo',
    ];
    if (required.some((key) => !body[key])) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_JOB',
        message: 'Vui lòng nhập đủ thông tin bắt buộc của tin tuyển dụng.',
      });
    }
    if (!Object.values(HinhThucLamViec).includes(body.hinhThucLamViec)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_WORK_TYPE',
        message: 'Hình thức làm việc không hợp lệ.',
      });
    }
    if (Number.isNaN(new Date(body.thoiHanNhanHoSo).getTime()) ||
        new Date(body.thoiHanNhanHoSo) <= new Date()) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_DEADLINE',
        message: 'Thời hạn nhận hồ sơ phải sau thời điểm hiện tại.',
      });
    }
    if (Number(body.soLuongTuyen || 1) < 1) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_QUANTITY',
        message: 'Số lượng tuyển phải lớn hơn 0.',
      });
    }
    const from = this.numberOrNull(body.mucLuongTu);
    const to = this.numberOrNull(body.mucLuongDen);
    if (!body.coTheThoaThuan && from !== null && to !== null && from > to) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_SALARY',
        message: 'Mức lương từ không được lớn hơn mức lương đến.',
      });
    }
  }

  private jobWriteData(employerId: number, body: Record<string, any>) {
    return {
      nhaTuyenDungId: employerId,
      nganhNgheId: Number(body.nganhNgheId),
      viTriTuyenDung: String(body.viTriTuyenDung).trim(),
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
      trangThaiHienThi: TrangThaiHienThiTin.CHUA_DANG,
      ngayGuiDuyet: new Date(),
      ngayDuyet: null,
      ngayDang: null,
    };
  }

  private async replaceJobSkills(
    tx: Prisma.TransactionClient,
    jobId: number,
    skills: unknown,
  ) {
    if (!Array.isArray(skills)) return;
    await tx.tinTuyenDungKyNang.deleteMany({ where: { tinTuyenDungId: jobId } });
    for (const raw of skills) {
      const value = raw as string | { name?: string; required?: boolean };
      const name = String(typeof value === 'string' ? value : value.name ?? '').trim();
      if (!name) continue;
      const skill = await tx.kyNang.upsert({
        where: { tenKyNang: name },
        create: { tenKyNang: name },
        update: {},
      });
      await tx.tinTuyenDungKyNang.create({
        data: {
          tinTuyenDungId: jobId,
          kyNangId: skill.id,
          mucDoYeuCau: 'TRUNG_BINH',
          batBuoc: typeof value === 'object' ? Boolean(value.required) : false,
        },
      });
    }
  }

  private async notifyAdmins(
    tx: Prisma.TransactionClient,
    title: string,
    content: string,
    link: string,
  ) {
    const admins = await tx.taiKhoan.findMany({
      where: { vaiTro: VaiTroTaiKhoan.QUAN_TRI_VIEN },
      select: { id: true },
    });
    if (admins.length) {
      await tx.thongBao.createMany({
        data: admins.map(({ id }) => ({
          taiKhoanId: id,
          tieuDe: title,
          noiDung: content,
          loaiThongBao: LoaiThongBao.KIEM_DUYET,
          duongDanDich: link,
        })),
      });
    }
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
