import { HttpStatus, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  HinhThucLamViec,
  HinhThucPhongVan,
  LoaiDoiTuongKiemDuyet,
  LoaiThongBao,
  MucDichMaXacThuc,
  PhuongThucLamViec,
  Prisma,
  TrangThaiHienThiTin,
  TrangThaiTaiKhoan,
  TrangThaiKiemDuyet,
  TrangThaiUngTuyen,
  VaiTroTaiKhoan,
} from '../../../generated/prisma/client.js';
import { ApiError } from '../../common/api-error.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { InviteCandidateInterviewDto } from './dto/invite-candidate-interview.dto.js';

const maxCvSize = 5 * 1024 * 1024;
const workerCvDir = 'uploads/cv';
const applicationCvDir = 'uploads/application-cv';

type UploadedCvFile = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

type StoredCvFile = {
  originalName: string;
  relativePath: string;
  mimeType: string;
  size: number;
};

type CvStreamTarget = {
  absolutePath: string;
  fileName: string;
  mimeType: string;
  size: number;
};

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
    const where: Prisma.TinTuyenDungWhereInput = this.activeJobWhere();
    const andFilters: Prisma.TinTuyenDungWhereInput[] = [];
    if (query.category) {
      where.nganhNghe = {
        tenNganhNghe: { equals: query.category, mode: 'insensitive' },
      };
    }
    if (query.keyword) {
      andFilters.push({
        OR: [
          { viTriTuyenDung: { contains: query.keyword, mode: 'insensitive' } },
          { chuyenMon: { contains: query.keyword, mode: 'insensitive' } },
          {
            nhaTuyenDung: {
              tenDonVi: { contains: query.keyword, mode: 'insensitive' },
            },
          },
        ],
      });
    }
    if (query.location) {
      andFilters.push({
        OR: [
          { tinhThanhPho: { contains: query.location, mode: 'insensitive' } },
          { quanHuyen: { contains: query.location, mode: 'insensitive' } },
          { diaDiemLamViec: { contains: query.location, mode: 'insensitive' } },
        ],
      });
    }
    if (
      query.type &&
      Object.values(HinhThucLamViec).includes(query.type as HinhThucLamViec)
    ) {
      where.hinhThucLamViec = query.type as HinhThucLamViec;
    }
    if (
      query.workMode &&
      Object.values(PhuongThucLamViec).includes(
        query.workMode as PhuongThucLamViec,
      )
    ) {
      where.phuongThucLamViec = query.workMode as PhuongThucLamViec;
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
    andFilters.push(...extraFilters);
    if (andFilters.length) where.AND = andFilters;
    const items = await this.prisma.tinTuyenDung.findMany({
      where,
      include: this.jobInclude(),
      orderBy: { ngayDang: 'desc' },
    });
    return { success: true, data: items.map((item) => this.mapJob(item)) };
  }

  async recommendedJobs(
    accountId: number,
    query: Record<string, string | undefined>,
  ) {
    const profile = await this.prisma.hoSoNguoiLaoDong.findUnique({
      where: { taiKhoanId: accountId },
      include: {
        hoSoKyNangs: { include: { kyNang: true } },
        nganhNgheMongMuon: true,
      },
    });
    if (!profile) this.notFound('Chua co ho so nguoi lao dong.');

    const hasPreferences = Boolean(
      profile.nganhNgheMongMuonId ||
        profile.viTriMongMuon ||
        profile.tinhThanhPhoMongMuon ||
        profile.mucLuongMongMuonTu ||
        profile.mucLuongMongMuonDen ||
        profile.hoSoKyNangs.length,
    );
    if (!hasPreferences) {
      return {
        success: true,
        data: {
          needsPreferences: true,
          page: 1,
          pageSize: 0,
          total: 0,
          items: [],
          message:
            'Vui long bo sung nhu cau tim viec de nhan de xuat phu hop.',
        },
      };
    }

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(20, Math.max(1, Number(query.pageSize || 8)));
    const candidateWhere: Prisma.TinTuyenDungWhereInput = {
      ...this.activeJobWhere(),
      OR: [
        profile.nganhNgheMongMuonId
          ? { nganhNgheId: profile.nganhNgheMongMuonId }
          : undefined,
        profile.tinhThanhPhoMongMuon
          ? {
              tinhThanhPho: {
                equals: profile.tinhThanhPhoMongMuon,
                mode: 'insensitive',
              },
            }
          : undefined,
        profile.viTriMongMuon
          ? {
              viTriTuyenDung: {
                contains: profile.viTriMongMuon,
                mode: 'insensitive',
              },
            }
          : undefined,
        profile.chapNhanLamTuXa
          ? { phuongThucLamViec: PhuongThucLamViec.TU_XA }
          : undefined,
      ].filter(Boolean) as Prisma.TinTuyenDungWhereInput[],
    };
    if (!candidateWhere.OR?.length) delete candidateWhere.OR;

    const candidates = await this.prisma.tinTuyenDung.findMany({
      where: candidateWhere,
      include: this.jobInclude(),
      orderBy: [{ ngayDang: 'desc' }, { id: 'desc' }],
      take: 200,
    });

    const scored = candidates
      .map((job) => this.scoreRecommendedJob(profile, job))
      .filter((item) => item.diemPhuHop >= 40)
      .sort(
        (a, b) =>
          b.diemPhuHop - a.diemPhuHop ||
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime() ||
          b.id - a.id,
      );
    const start = (page - 1) * pageSize;

    return {
      success: true,
      data: {
        needsPreferences: false,
        page,
        pageSize,
        total: scored.length,
        items: scored.slice(start, start + pageSize),
      },
    };
  }

  async jobDetail(id: number) {
    const item = await this.prisma.tinTuyenDung.findFirst({
      where: {
        ...this.activeJobWhere(),
        id,
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
          where: this.activeJobWhere(),
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
        nganhNgheMongMuon: true,
        hocVans: true,
        kinhNghiemLamViecs: true,
        hoSoKyNangs: { include: { kyNang: true } },
      },
    });
    if (!profile) this.notFound('Chưa có hồ sơ người lao động.');
    return { success: true, data: this.mapWorkerProfile(profile) };
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
          nganhNgheMongMuonId: body.nganhNgheMongMuonId
            ? Number(body.nganhNgheMongMuonId)
            : null,
          viTriMongMuon: this.trimOrNull(body.viTriMongMuon),
          tinhThanhPhoMongMuon: this.trimOrNull(body.tinhThanhPhoMongMuon),
          quanHuyenMongMuon: this.trimOrNull(body.quanHuyenMongMuon),
          chapNhanLamTuXa: Boolean(body.chapNhanLamTuXa),
          hinhThucLamViecMongMuon: this.enumOrNull(
            body.hinhThucLamViecMongMuon,
            HinhThucLamViec,
          ),
          phuongThucLamViecMongMuon: this.enumOrNull(
            body.phuongThucLamViecMongMuon,
            PhuongThucLamViec,
          ),
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
        await tx.hocVan.deleteMany({
          where: { hoSoNguoiLaoDongId: profile.id },
        });
        if (body.hocVans.length) {
          await tx.hocVan.createMany({
            data: body.hocVans.map((item: any) => ({
              hoSoNguoiLaoDongId: profile.id,
              trinhDo: item.trinhDo,
              tenCoSoDaoTao: item.tenCoSoDaoTao,
              chuyenNganh: item.chuyenNganh || null,
              namBatDau: Number(item.namBatDau),
              namTotNghiep: item.namTotNghiep
                ? Number(item.namTotNghiep)
                : null,
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
        for (const skillName of this.normalizeSkillNames(body.skills)) {
          const skill = await tx.kyNang.upsert({
            where: { tenKyNang: skillName },
            create: { tenKyNang: skillName },
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

  async workerCv(accountId: number) {
    const profile = await this.workerProfileRecord(accountId);
    return { success: true, data: this.cvMetadata(profile) };
  }

  async uploadWorkerCv(accountId: number, file?: UploadedCvFile) {
    const profile = await this.workerProfileRecord(accountId);
    const stored = await this.storeUploadedCv(file, workerCvDir);
    const previousPath = profile.duongDanCv ?? profile.tepCvUrl;

    try {
      const updated = await this.prisma.hoSoNguoiLaoDong.update({
        where: { id: profile.id },
        data: {
          tepCvUrl: stored.relativePath,
          tenFileCv: stored.originalName,
          duongDanCv: stored.relativePath,
          loaiFileCv: stored.mimeType,
          kichThuocCv: stored.size,
          ngayTaiCv: new Date(),
        },
      });
      await this.safeUnlink(previousPath, workerCvDir);
      return {
        success: true,
        message: 'Đã cập nhật CV cá nhân.',
        data: this.cvMetadata(updated),
      };
    } catch (error) {
      await this.safeUnlink(stored.relativePath, workerCvDir);
      throw error;
    }
  }

  async deleteWorkerCv(accountId: number) {
    const profile = await this.workerProfileRecord(accountId);
    const previousPath = profile.duongDanCv ?? profile.tepCvUrl;
    const updated = await this.prisma.hoSoNguoiLaoDong.update({
      where: { id: profile.id },
      data: {
        tepCvUrl: null,
        tenFileCv: null,
        duongDanCv: null,
        loaiFileCv: null,
        kichThuocCv: null,
        ngayTaiCv: null,
      },
    });
    await this.safeUnlink(previousPath, workerCvDir);
    return {
      success: true,
      message: 'Đã xóa CV cá nhân.',
      data: this.cvMetadata(updated),
    };
  }

  async workerCvStream(accountId: number): Promise<CvStreamTarget> {
    const profile = await this.workerProfileRecord(accountId);
    return this.resolveStoredCv({
      relativePath: profile.duongDanCv ?? profile.tepCvUrl,
      fileName: profile.tenFileCv,
      mimeType: profile.loaiFileCv,
      size: profile.kichThuocCv,
      allowedDir: workerCvDir,
      missingMessage: 'Bạn chưa có CV trong hồ sơ.',
    });
  }

  async apply(
    accountId: number,
    jobId: number,
    body: Record<string, any>,
    file?: UploadedCvFile,
  ) {
    const profile = await this.prisma.hoSoNguoiLaoDong.findUnique({
      where: { taiKhoanId: accountId },
      include: { taiKhoan: true },
    });
    if (!profile)
      this.notFound('Bạn cần hoàn thiện hồ sơ trước khi ứng tuyển.');
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
    const hoTenSnapshot = String(
      body.hoTen ?? body.hoTenSnapshot ?? profile.hoTen ?? '',
    ).trim();
    const emailSnapshot = String(
      body.email ?? body.emailSnapshot ?? profile.taiKhoan.email ?? '',
    )
      .trim()
      .toLowerCase();
    const soDienThoaiSnapshot =
      String(
        body.soDienThoai ??
          body.soDienThoaiSnapshot ??
          profile.taiKhoan.soDienThoai ??
          '',
      ).trim() || null;

    if (!hoTenSnapshot || !emailSnapshot) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'APPLICATION_CONTACT_REQUIRED',
        message: 'Vui lòng nhập đầy đủ họ tên và email trước khi nộp hồ sơ.',
      });
    }

    const submittedCv = await this.prepareApplicationCv(profile, body, file);

    let application: any;
    try {
      application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.ungTuyen.create({
          data: {
            hoSoNguoiLaoDongId: profile.id,
            tinTuyenDungId: jobId,
            hoTenSnapshot,
            emailSnapshot,
            soDienThoaiSnapshot,
            tepCvSnapshotUrl: submittedCv.relativePath,
            tenFileCvUngTuyen: submittedCv.originalName,
            duongDanCvUngTuyen: submittedCv.relativePath,
            loaiFileCvUngTuyen: submittedCv.mimeType,
            kichThuocCvUngTuyen: submittedCv.size,
            ngayNopCv: new Date(),
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
            noiDung: `${hoTenSnapshot} vừa ứng tuyển vị trí ${job.viTriTuyenDung}.`,
            loaiThongBao: LoaiThongBao.UNG_TUYEN,
            duongDanDich: `/nha-tuyen-dung/tin-tuyen-dung/${jobId}/ung-vien/${created.id}`,
          },
        });
        return created;
      });
    } catch (error) {
      await this.safeUnlink(submittedCv.relativePath, applicationCvDir);
      throw error;
    }
    return {
      success: true,
      message: 'Ứng tuyển thành công.',
      data: this.mapApplication(application),
    };
  }

  async workerApplications(accountId: number) {
    const items = await this.prisma.ungTuyen.findMany({
      where: { hoSoNguoiLaoDong: { taiKhoanId: accountId } },
      include: {
        thongTinPhongVan: true,
        tinTuyenDung: { include: this.jobInclude() },
      },
      orderBy: { ngayNop: 'desc' },
    });
    return {
      success: true,
      data: items.map((item) =>
        this.mapApplication(item, this.mapJob(item.tinTuyenDung)),
      ),
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
        tepGiayPhepUrl:
          body.tepGiayPhepUrl || body.tepGiayPhepKinhDoanh || null,
        trangThaiDuyet: TrangThaiKiemDuyet.CHO_DUYET,
        ngayGuiDuyet: new Date(),
      },
    });
    return {
      success: true,
      message: 'Đã cập nhật và gửi hồ sơ chờ duyệt.',
      data: profile,
    };
  }

  async employerJobs(accountId: number) {
    const items = await this.prisma.tinTuyenDung.findMany({
      where: { nhaTuyenDung: { taiKhoanId: accountId } },
      include: {
        ...this.jobInclude(),
        _count: { select: { ungTuyens: true } },
      },
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
      employer.taiKhoan.trangThaiTaiKhoan !== TrangThaiTaiKhoan.HOAT_DONG ||
      !employer.taiKhoan.emailXacThucLuc
    ) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'EMPLOYER_NOT_APPROVED',
        message: 'Hồ sơ nhà tuyển dụng phải được duyệt trước khi đăng tin.',
      });
    }
    const isDraft = this.isDraftAction(body);
    this.validateJobBody(body, !isDraft);
    const fallbackCategoryId = await this.fallbackCategoryId();
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tinTuyenDung.create({
        data: this.jobWriteData(
          employer.id,
          body,
          isDraft,
          fallbackCategoryId,
        ),
      });
      await this.replaceJobSkills(tx, created.id, body.skills);
      if (!isDraft) {
        await this.notifyAdmins(
        tx,
        'Tin tuyển dụng mới chờ duyệt',
        `${employer.tenDonVi} vừa gửi tin “${created.viTriTuyenDung}”.`,
        `/quan-tri/kiem-duyet-tin/${created.id}`,
      );
      }
      return created;
    });
    return {
      success: true,
      message: 'Đã gửi tin tuyển dụng chờ duyệt.',
      data: job,
    };
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
    if (!current)
      this.notFound('Không tìm thấy tin tuyển dụng của doanh nghiệp.');
    if (
      !(
        [TrangThaiKiemDuyet.BAN_NHAP, TrangThaiKiemDuyet.TU_CHOI] as
          TrangThaiKiemDuyet[]
      ).includes(
        current.trangThaiKiemDuyet,
      )
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'JOB_NOT_EDITABLE',
        message: 'Chỉ tin tuyển dụng bị từ chối mới được phép chỉnh sửa.',
      });
    }
    if (current.soLanChinhSua >= 3) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'JOB_EDIT_LIMIT',
        message: 'Tin tuyển dụng đã vượt quá 3 lần chỉnh sửa.',
      });
    }
    const isDraft = this.isDraftAction(body);
    this.validateJobBody(body, !isDraft);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.tinTuyenDung.update({
        where: { id: jobId },
        data: {
          ...this.jobWriteData(
            current.nhaTuyenDungId,
            body,
            isDraft,
            current.nganhNgheId,
          ),
          ...(current.trangThaiKiemDuyet === TrangThaiKiemDuyet.TU_CHOI &&
          !isDraft
            ? { soLanChinhSua: { increment: 1 } }
            : {}),
          lyDoTuChoi: null,
        },
      });
      await this.replaceJobSkills(tx, jobId, body.skills);
      if (!isDraft) {
        await this.notifyAdmins(
        tx,
        'Tin tuyển dụng đã được gửi lại',
        `${current.nhaTuyenDung.tenDonVi} đã chỉnh sửa và gửi lại tin “${item.viTriTuyenDung}”.`,
        `/quan-tri/kiem-duyet-tin/${jobId}`,
        );
      }
      return item;
    });
    return {
      success: true,
      message: 'Đã cập nhật và gửi lại tin chờ duyệt.',
      data: updated,
    };
  }

  async employerApplicants(accountId: number, jobId: number) {
    await this.assertEmployerJob(accountId, jobId);
    const items = await this.prisma.ungTuyen.findMany({
      where: { tinTuyenDungId: jobId },
      include: { hoSoNguoiLaoDong: true },
      orderBy: { ngayNop: 'desc' },
    });
    return {
      success: true,
      data: items.map((item) => this.mapApplication(item)),
    };
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
        tinTuyenDung: {
          select: {
            id: true,
            viTriTuyenDung: true,
            diaDiemLamViec: true,
            nhaTuyenDung: {
              select: {
                tenDonVi: true,
                nguoiDaiDien: true,
                soDienThoaiLienHe: true,
                taiKhoan: { select: { soDienThoai: true } },
              },
            },
          },
        },
        thongTinPhongVan: true,
        lichSuTrangThaiUngTuyens: true,
      },
    });
    if (!item) this.notFound('Không tìm thấy ứng viên.');
    if (item.trangThaiHienTai === TrangThaiUngTuyen.DA_NOP) {
      const viewedAt = new Date();
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.ungTuyen.updateMany({
          where: {
            id,
            tinTuyenDungId: jobId,
            trangThaiHienTai: TrangThaiUngTuyen.DA_NOP,
          },
          data: {
            trangThaiHienTai: TrangThaiUngTuyen.DA_XEM,
            ngayCapNhatTrangThai: viewedAt,
          },
        });
        if (!result.count) return;

        await tx.lichSuTrangThaiUngTuyen.create({
          data: {
            ungTuyenId: id,
            nguoiThucHienId: accountId,
            trangThaiTruoc: TrangThaiUngTuyen.DA_NOP,
            trangThaiSau: TrangThaiUngTuyen.DA_XEM,
          },
        });
      });
      item.trangThaiHienTai = TrangThaiUngTuyen.DA_XEM;
      item.ngayCapNhatTrangThai = viewedAt;
    }
    return { success: true, data: this.mapApplication(item) };
  }

  async employerApplicationCvStream(
    accountId: number,
    jobId: number,
    id: number,
  ): Promise<CvStreamTarget> {
    await this.assertEmployerJob(accountId, jobId);
    const item = await this.prisma.ungTuyen.findFirst({
      where: { id, tinTuyenDungId: jobId },
    });
    if (!item) this.notFound('Không tìm thấy ứng viên.');
    return this.resolveStoredCv({
      relativePath: item.duongDanCvUngTuyen ?? item.tepCvSnapshotUrl,
      fileName: item.tenFileCvUngTuyen,
      mimeType: item.loaiFileCvUngTuyen,
      size: item.kichThuocCvUngTuyen,
      allowedDir: applicationCvDir,
      missingMessage: 'Ứng viên chưa đính kèm CV.',
    });
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
      [TrangThaiUngTuyen.DA_NOP]: [TrangThaiUngTuyen.KHONG_PHU_HOP],
      [TrangThaiUngTuyen.DA_XEM]: [TrangThaiUngTuyen.KHONG_PHU_HOP],
      [TrangThaiUngTuyen.DUOC_CHON_SO_BO]: [TrangThaiUngTuyen.KHONG_PHU_HOP],
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
    if (
      !Object.values(TrangThaiUngTuyen).includes(status) ||
      !allowed[current.trangThaiHienTai]?.includes(status)
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_APPLICATION_TRANSITION',
        message: 'Chuyển trạng thái ứng tuyển không hợp lệ.',
      });
    }
    const rejectionReason =
      status === TrangThaiUngTuyen.KHONG_PHU_HOP
        ? String(body.reason ?? body.note ?? '').trim()
        : null;

    if (status === TrangThaiUngTuyen.KHONG_PHU_HOP && !rejectionReason) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'APPLICATION_REJECTION_REASON_REQUIRED',
        message:
          'Vui l\u00f2ng nh\u1eadp l\u00fd do t\u1eeb ch\u1ed1i h\u1ed3 s\u01a1.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === TrangThaiUngTuyen.TRUNG_TUYEN) {
        await this.assertApprovedApplicationLimit(tx, jobId, id);
      }

      const result = await tx.ungTuyen.update({
        where: { id },
        data: {
          trangThaiHienTai: status,
          ngayCapNhatTrangThai: new Date(),
          lyDoTuChoi:
            status === TrangThaiUngTuyen.KHONG_PHU_HOP ? rejectionReason : null,
        },
      });
      await tx.lichSuTrangThaiUngTuyen.create({
        data: {
          ungTuyenId: id,
          nguoiThucHienId: accountId,
          trangThaiTruoc: current.trangThaiHienTai,
          trangThaiSau: status,
          ghiChu: rejectionReason ?? body.note ?? null,
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
        const notificationTitle =
          status === TrangThaiUngTuyen.KHONG_PHU_HOP
            ? 'K\u1ebft qu\u1ea3 h\u1ed3 s\u01a1 \u1ee9ng tuy\u1ec3n'
            : 'Tr\u1ea1ng th\u00e1i h\u1ed3 s\u01a1 \u1ee9ng tuy\u1ec3n \u0111\u00e3 thay \u0111\u1ed5i';
        const notificationContent =
          status === TrangThaiUngTuyen.KHONG_PHU_HOP
            ? `H\u1ed3 s\u01a1 \u1ee9ng tuy\u1ec3n v\u1ecb tr\u00ed ${application.tinTuyenDung.viTriTuyenDung} \u0111\u00e3 \u0111\u01b0\u1ee3c Nh\u00e0 tuy\u1ec3n d\u1ee5ng c\u1eadp nh\u1eadt k\u1ebft qu\u1ea3. Nh\u1ea5n \u0111\u1ec3 xem chi ti\u1ebft.`
            : `H\u1ed3 s\u01a1 \u1ee9ng tuy\u1ec3n v\u1ecb tr\u00ed ${application.tinTuyenDung.viTriTuyenDung} \u0111\u00e3 chuy\u1ec3n sang ${status}.`;
        const notificationLink =
          status === TrangThaiUngTuyen.KHONG_PHU_HOP
            ? `/viec-lam-da-ung-tuyen?applicationId=${id}&status=rejected`
            : `/viec-lam-da-ung-tuyen?applicationId=${id}`;

        await tx.thongBao.create({
          data: {
            taiKhoanId: application.hoSoNguoiLaoDong.taiKhoanId,
            tieuDe: notificationTitle,
            noiDung: notificationContent,
            loaiThongBao: LoaiThongBao.UNG_TUYEN,
            duongDanDich: notificationLink,
          },
        });
      }
      return result;
    });
    return {
      success: true,
      message: 'Đã cập nhật trạng thái ứng viên.',
      data: this.mapApplication(updated),
    };
  }

  async inviteCandidateInterview(
    accountId: number,
    jobId: number,
    id: number,
    dto: InviteCandidateInterviewDto,
  ) {
    const current = await this.prisma.ungTuyen.findFirst({
      where: {
        id,
        tinTuyenDungId: jobId,
        tinTuyenDung: { nhaTuyenDung: { taiKhoanId: accountId } },
      },
      include: {
        hoSoNguoiLaoDong: {
          include: { taiKhoan: { select: { email: true, soDienThoai: true } } },
        },
        tinTuyenDung: {
          include: {
            nhaTuyenDung: {
              include: {
                taiKhoan: { select: { email: true, soDienThoai: true } },
              },
            },
          },
        },
        thongTinPhongVan: true,
      },
    });
    if (!current) this.notFound('Không tìm thấy ứng viên.');

    const allowedStatuses: TrangThaiUngTuyen[] = [
      TrangThaiUngTuyen.DA_NOP,
      TrangThaiUngTuyen.DA_XEM,
      TrangThaiUngTuyen.DUOC_CHON_SO_BO,
      TrangThaiUngTuyen.MOI_PHONG_VAN,
    ];
    if (!allowedStatuses.includes(current.trangThaiHienTai)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INTERVIEW_INVITATION_NOT_ALLOWED',
        message: 'Trạng thái hồ sơ hiện tại không cho phép mời phỏng vấn.',
      });
    }

    const interviewData = this.validateInterviewInvitation(dto);
    const updatedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.thongTinPhongVan.upsert({
        where: { ungTuyenId: id },
        create: {
          ungTuyenId: id,
          nguoiTaoId: accountId,
          ...interviewData,
        },
        update: {
          nguoiTaoId: accountId,
          ...interviewData,
        },
      });

      const application = await tx.ungTuyen.update({
        where: { id },
        data: {
          trangThaiHienTai: TrangThaiUngTuyen.MOI_PHONG_VAN,
          ngayCapNhatTrangThai: updatedAt,
          lyDoTuChoi: null,
        },
        include: {
          hoSoNguoiLaoDong: {
            include: {
              taiKhoan: { select: { email: true, soDienThoai: true } },
              hocVans: true,
              kinhNghiemLamViecs: true,
              hoSoKyNangs: { include: { kyNang: true } },
            },
          },
          tinTuyenDung: {
            select: {
              id: true,
              viTriTuyenDung: true,
              diaDiemLamViec: true,
              nhaTuyenDung: {
                select: {
                  tenDonVi: true,
                  nguoiDaiDien: true,
                  soDienThoaiLienHe: true,
                  taiKhoan: { select: { email: true, soDienThoai: true } },
                },
              },
            },
          },
          thongTinPhongVan: true,
          lichSuTrangThaiUngTuyens: true,
        },
      });

      if (current.trangThaiHienTai !== TrangThaiUngTuyen.MOI_PHONG_VAN) {
        await tx.lichSuTrangThaiUngTuyen.create({
          data: {
            ungTuyenId: id,
            nguoiThucHienId: accountId,
            trangThaiTruoc: current.trangThaiHienTai,
            trangThaiSau: TrangThaiUngTuyen.MOI_PHONG_VAN,
            ghiChu: dto.ghiChuPhongVan ?? null,
          },
        });
      }

      await tx.thongBao.create({
        data: {
          taiKhoanId: current.hoSoNguoiLaoDong.taiKhoanId,
          tieuDe: 'Hồ sơ của bạn đã được mời phỏng vấn',
          noiDung: `Nhà tuyển dụng đã gửi lời mời phỏng vấn cho vị trí ${current.tinTuyenDung.viTriTuyenDung}. Thời gian: ${this.formatInterviewDateTime(interviewData.thoiGianBatDau)}. Vui lòng xem chi tiết để biết địa điểm và thông tin liên hệ.`,
          loaiThongBao: LoaiThongBao.UNG_TUYEN,
          duongDanDich: `/viec-lam-da-ung-tuyen?applicationId=${id}&status=interview`,
        },
      });

      return application;
    });

    this.sendInterviewInvitationEmail(updated).catch((error: unknown) => {
      console.error('Failed to send interview invitation email', error);
    });

    return {
      success: true,
      message: 'Đã gửi lời mời phỏng vấn đến ứng viên.',
      data: this.mapApplication(updated),
    };
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
    return {
      success: true,
      message: 'Đã ẩn ngành nghề. Dữ liệu liên kết được giữ nguyên.',
    };
  }

  async adminEmployers(query: Record<string, string | undefined> = {}) {
    const where: Prisma.HoSoNhaTuyenDungWhereInput = {};
    const search = query.search?.trim();
    const fieldId = this.positiveInteger(query.fieldId);
    const createdAt = this.dateFilter(query.from, query.to);
    const status = this.enumOrNull(query.status, TrangThaiKiemDuyet);
    const accountStatus = this.enumOrNull(
      query.accountStatus,
      TrangThaiTaiKhoan,
    );

    if (search) {
      where.OR = [
        { tenDonVi: { contains: search, mode: 'insensitive' } },
        { maSoThue: { contains: search } },
        { nguoiDaiDien: { contains: search, mode: 'insensitive' } },
        { taiKhoan: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (fieldId) where.linhVucId = fieldId;
    if (status) where.trangThaiDuyet = status;
    if (accountStatus) {
      where.taiKhoan = { trangThaiTaiKhoan: accountStatus };
    }
    if (createdAt) where.ngayTao = createdAt;

    const items = await this.prisma.hoSoNhaTuyenDung.findMany({
      where,
      include: {
        taiKhoan: {
          select: {
            email: true,
            soDienThoai: true,
            trangThaiTaiKhoan: true,
          },
        },
        linhVuc: true,
        _count: { select: { tinTuyenDungs: true } },
      },
      orderBy: { ngayTao: 'desc' },
    });
    return { success: true, data: items };
  }

  async adminEmployer(id: number) {
    const item = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { id },
      include: {
        taiKhoan: { select: { email: true, soDienThoai: true } },
        linhVuc: true,
      },
    });
    if (!item) this.notFound('Không tìm thấy nhà tuyển dụng.');
    return { success: true, data: item };
  }

  async reviewEmployer(adminId: number, id: number, body: Record<string, any>) {
    const status = this.reviewStatus(body.action ?? body.hanhDong);
    const current = await this.prisma.hoSoNhaTuyenDung.findUnique({
      where: { id },
    });
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
          noiDung:
            status === TrangThaiKiemDuyet.DA_DUYET
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

  async adminJobs(query: Record<string, string | undefined> = {}) {
    const where: Prisma.TinTuyenDungWhereInput = {
      trangThaiKiemDuyet: { not: TrangThaiKiemDuyet.BAN_NHAP },
    };
    const search = query.search?.trim();
    const categoryId = this.positiveInteger(query.categoryId);
    const status = this.enumOrNull(query.status, TrangThaiKiemDuyet);
    const displayStatus = this.enumOrNull(
      query.displayStatus,
      TrangThaiHienThiTin,
    );
    const workType = this.enumOrNull(query.workType, HinhThucLamViec);
    const salaryMin = this.numberOrNull(query.salaryMin);
    const salaryMax = this.numberOrNull(query.salaryMax);
    const createdAt = this.dateFilter(query.from, query.to);

    if (search) {
      where.OR = [
        { viTriTuyenDung: { contains: search, mode: 'insensitive' } },
        { diaDiemLamViec: { contains: search, mode: 'insensitive' } },
        {
          nhaTuyenDung: {
            tenDonVi: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }
    if (categoryId) where.nganhNgheId = categoryId;
    if (status) where.trangThaiKiemDuyet = status;
    if (displayStatus) where.trangThaiHienThi = displayStatus;
    if (workType) where.hinhThucLamViec = workType;
    if (query.negotiable === 'true') where.coTheThoaThuan = true;
    if (query.negotiable === 'false') where.coTheThoaThuan = false;
    if (salaryMin !== null) where.mucLuongDen = { gte: salaryMin };
    if (salaryMax !== null) where.mucLuongTu = { lte: salaryMax };
    if (createdAt) where.ngayTao = createdAt;

    const items = await this.prisma.tinTuyenDung.findMany({
      where,
      include: {
        ...this.jobInclude(),
        _count: { select: { ungTuyens: true } },
      },
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
    const current = await this.prisma.tinTuyenDung.findUnique({
      where: { id },
    });
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
            noiDung:
              status === TrangThaiKiemDuyet.DA_DUYET
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
    const result = await this.prisma.thongBao.updateMany({
      where: { id, taiKhoanId: accountId },
      data: { daDoc: true, ngayDoc: new Date() },
    });
    if (!result.count)
      this.notFound('Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng b\u00e1o.');
    return { success: true };
  }

  async readAllNotifications(accountId: number) {
    await this.prisma.thongBao.updateMany({
      where: { taiKhoanId: accountId, daDoc: false },
      data: { daDoc: true, ngayDoc: new Date() },
    });
    return {
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc.',
    };
  }

  async statistics(query: Record<string, string | undefined> = {}) {
    const createdAt = this.dateFilter(query.from, query.to);
    const now = new Date();
    const [
      workers,
      employers,
      jobs,
      applications,
      approvedJobs,
      activeJobs,
      hiredApplications,
      vacancyAggregate,
    ] =
      await this.prisma.$transaction([
        this.prisma.taiKhoan.count({
          where: {
            vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
            ...(createdAt ? { ngayTao: createdAt } : {}),
          },
        }),
        this.prisma.taiKhoan.count({
          where: {
            vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG,
            ...(createdAt ? { ngayTao: createdAt } : {}),
          },
        }),
        this.prisma.tinTuyenDung.count({
          where: createdAt ? { ngayTao: createdAt } : {},
        }),
        this.prisma.ungTuyen.count({
          where: createdAt ? { ngayNop: createdAt } : {},
        }),
        this.prisma.tinTuyenDung.count({
          where: {
            trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
            ...(createdAt ? { ngayTao: createdAt } : {}),
          },
        }),
        this.prisma.tinTuyenDung.count({
          where: {
            trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
            trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
            thoiHanNhanHoSo: { gte: now },
            ...(createdAt ? { ngayTao: createdAt } : {}),
          },
        }),
        this.prisma.ungTuyen.count({
          where: {
            trangThaiHienTai: TrangThaiUngTuyen.TRUNG_TUYEN,
            ...(createdAt ? { ngayNop: createdAt } : {}),
          },
        }),
        this.prisma.tinTuyenDung.aggregate({
          where: createdAt ? { ngayTao: createdAt } : {},
          _sum: { soLuongTuyen: true },
        }),
      ]);
    const [
      userByStatus,
      employerByStatus,
      jobByStatus,
      jobByDisplayStatus,
      jobByWorkType,
      jobByCategory,
      applicationByStatus,
      applicationsWithJob,
    ] =
      await this.prisma.$transaction([
        this.prisma.taiKhoan.groupBy({
          by: ['trangThaiTaiKhoan'],
          where: createdAt ? { ngayTao: createdAt } : {},
          _count: true,
          orderBy: { trangThaiTaiKhoan: 'asc' },
        }),
        this.prisma.hoSoNhaTuyenDung.groupBy({
          by: ['trangThaiDuyet'],
          where: createdAt ? { ngayTao: createdAt } : {},
          _count: true,
          orderBy: { trangThaiDuyet: 'asc' },
        }),
        this.prisma.tinTuyenDung.groupBy({
          by: ['trangThaiKiemDuyet'],
          where: createdAt ? { ngayTao: createdAt } : {},
          _count: true,
          orderBy: { trangThaiKiemDuyet: 'asc' },
        }),
        this.prisma.tinTuyenDung.groupBy({
          by: ['trangThaiHienThi'],
          where: createdAt ? { ngayTao: createdAt } : {},
          _count: true,
          orderBy: { trangThaiHienThi: 'asc' },
        }),
        this.prisma.tinTuyenDung.groupBy({
          by: ['hinhThucLamViec'],
          where: createdAt ? { ngayTao: createdAt } : {},
          _count: true,
          orderBy: { hinhThucLamViec: 'asc' },
        }),
        this.prisma.tinTuyenDung.groupBy({
          by: ['nganhNgheId'],
          where: createdAt ? { ngayTao: createdAt } : {},
          _count: true,
          orderBy: { nganhNgheId: 'asc' },
        }),
        this.prisma.ungTuyen.groupBy({
          by: ['trangThaiHienTai'],
          where: createdAt ? { ngayNop: createdAt } : {},
          _count: true,
          orderBy: { trangThaiHienTai: 'asc' },
        }),
        this.prisma.ungTuyen.findMany({
          where: createdAt ? { ngayNop: createdAt } : {},
          select: {
            tinTuyenDung: {
              select: {
                id: true,
                viTriTuyenDung: true,
                nhaTuyenDung: { select: { tenDonVi: true } },
              },
            },
          },
        }),
      ]);

    const categoryIds = jobByCategory.map((item) => item.nganhNgheId);
    const categories = categoryIds.length
      ? await this.prisma.nganhNghe.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, tenNganhNghe: true },
        })
      : [];
    const categoryNames = new Map(
      categories.map((item) => [item.id, item.tenNganhNghe]),
    );
    const applicationsByJob = new Map<
      number,
      { label: string; value: number }
    >();
    for (const item of applicationsWithJob) {
      const job = item.tinTuyenDung;
      const current = applicationsByJob.get(job.id);
      applicationsByJob.set(job.id, {
        label: `${job.viTriTuyenDung} - ${job.nhaTuyenDung.tenDonVi}`,
        value: (current?.value ?? 0) + 1,
      });
    }
    const topJobs = [...applicationsByJob.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const totalVacancies = vacancyAggregate._sum.soLuongTuyen ?? 0;
    const recruitmentRate = applications
      ? Number(((hiredApplications / applications) * 100).toFixed(2))
      : 0;
    return {
      success: true,
      data: {
        workers,
        employers,
        jobs,
        applications,
        approvedJobs,
        activeJobs,
        hiredApplications,
        totalVacancies,
        recruitmentRate,
        period: { from: query.from ?? null, to: query.to ?? null },
        users: {
          total: workers + employers,
          byRole: { NGUOI_LAO_DONG: workers, NHA_TUYEN_DUNG: employers },
          byStatus: Object.fromEntries(
            userByStatus.map((x) => [x.trangThaiTaiKhoan, x._count]),
          ),
        },
        employerStatistics: {
          total: employers,
          byStatus: Object.fromEntries(
            employerByStatus.map((x) => [x.trangThaiDuyet, x._count]),
          ),
        },
        jobStatistics: {
          total: jobs,
          byStatus: Object.fromEntries(
            jobByStatus.map((x) => [x.trangThaiKiemDuyet, x._count]),
          ),
          byDisplayStatus: Object.fromEntries(
            jobByDisplayStatus.map((x) => [x.trangThaiHienThi, x._count]),
          ),
          byWorkType: Object.fromEntries(
            jobByWorkType.map((x) => [x.hinhThucLamViec, x._count]),
          ),
          byCategory: Object.fromEntries(
            jobByCategory.map((x) => [
              categoryNames.get(x.nganhNgheId) ?? `Ngành #${x.nganhNgheId}`,
              x._count,
            ]),
          ),
        },
        applicationStatistics: {
          total: applications,
          byStatus: Object.fromEntries(
            applicationByStatus.map((x) => [x.trangThaiHienTai, x._count]),
          ),
          topJobs,
        },
      },
    };
  }

  async exportStatistics(query: Record<string, string | undefined> = {}) {
    const { data } = await this.statistics(query);
    const type = this.reportType(query.type);
    const format = query.format === 'json' ? 'json' : 'csv';
    const rowsByType: Record<
      'summary' | 'users' | 'employers' | 'jobs' | 'applications',
      Array<[string, string, number]>
    > = {
      summary: [
        ['Tài khoản', 'Người lao động', data.workers],
        ['Tài khoản', 'Nhà tuyển dụng', data.employers],
        ['Tin tuyển dụng', 'Tổng số', data.jobs],
        ['Tin tuyển dụng', 'Đã duyệt', data.approvedJobs],
        ['Tin tuyển dụng', 'Đang hiển thị và còn hạn', data.activeJobs],
        ['Tin tuyển dụng', 'Tổng nhu cầu tuyển', data.totalVacancies],
        ['Ứng tuyển', 'Tổng số', data.applications],
        ['Ứng tuyển', 'Trúng tuyển', data.hiredApplications],
        ['Ứng tuyển', 'Tỷ lệ trúng tuyển (%)', data.recruitmentRate],
        ...this.rowsFromStatisticsRecord(
          'Trạng thái tài khoản',
          data.users.byStatus,
        ),
        ...this.rowsFromStatisticsRecord(
          'Trạng thái nhà tuyển dụng',
          data.employerStatistics.byStatus,
        ),
        ...this.rowsFromStatisticsRecord(
          'Trạng thái tin',
          data.jobStatistics.byStatus,
        ),
        ...this.rowsFromStatisticsRecord(
          'Trạng thái ứng tuyển',
          data.applicationStatistics.byStatus,
        ),
      ],
      users: [
        ['Tài khoản', 'Người lao động', data.workers],
        ['Tài khoản', 'Nhà tuyển dụng', data.employers],
        ...this.rowsFromStatisticsRecord(
          'Trạng thái tài khoản',
          data.users.byStatus,
        ),
      ],
      employers: [
        ['Nhà tuyển dụng', 'Tổng số', data.employers],
        ...this.rowsFromStatisticsRecord(
          'Trạng thái kiểm duyệt',
          data.employerStatistics.byStatus,
        ),
      ],
      jobs: [
        ['Tin tuyển dụng', 'Tổng số', data.jobs],
        ['Tin tuyển dụng', 'Đã duyệt', data.approvedJobs],
        ['Tin tuyển dụng', 'Đang hiển thị và còn hạn', data.activeJobs],
        ['Tin tuyển dụng', 'Tổng nhu cầu tuyển', data.totalVacancies],
        ...this.rowsFromStatisticsRecord(
          'Trạng thái tin',
          data.jobStatistics.byStatus,
        ),
        ...this.rowsFromStatisticsRecord(
          'Trạng thái hiển thị',
          data.jobStatistics.byDisplayStatus,
        ),
        ...this.rowsFromStatisticsRecord(
          'Hình thức làm việc',
          data.jobStatistics.byWorkType,
        ),
        ...this.rowsFromStatisticsRecord(
          'Ngành nghề',
          data.jobStatistics.byCategory,
        ),
      ],
      applications: [
        ['Ứng tuyển', 'Tổng số', data.applications],
        ['Ứng tuyển', 'Trúng tuyển', data.hiredApplications],
        ['Ứng tuyển', 'Tỷ lệ trúng tuyển (%)', data.recruitmentRate],
        ...this.rowsFromStatisticsRecord(
          'Trạng thái ứng tuyển',
          data.applicationStatistics.byStatus,
        ),
        ...data.applicationStatistics.topJobs.map(
          (item) =>
            ['Tin có nhiều ứng viên', item.label, item.value] as [
              string,
              string,
              number,
            ],
        ),
      ],
    };
    const rows = rowsByType[type];

    if (format === 'json') {
      return JSON.stringify(
        {
          period: data.period,
          type,
          rows: rows.map(([group, label, value]) => ({ group, label, value })),
        },
        null,
        2,
      );
    }

    const csv = [['Nhóm', 'Chỉ tiêu', 'Số lượng'], ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','),
      )
      .join('\r\n');
    return `\uFEFF${csv}`;
  }

  private reportType(
    value?: string,
  ): 'summary' | 'users' | 'employers' | 'jobs' | 'applications' {
    if (
      value === 'users' ||
      value === 'employers' ||
      value === 'jobs' ||
      value === 'applications' ||
      value === 'summary'
    ) {
      return value;
    }
    return 'summary';
  }

  private rowsFromStatisticsRecord(
    group: string,
    record: Record<string, unknown>,
  ) {
    return Object.entries(record).map(
      ([key, value]) =>
        [group, key, Number(value) || 0] as [string, string, number],
    );
  }

  async changePassword(accountId: number, body: ChangePasswordDto) {
    const account = await this.prisma.taiKhoan.findUnique({
      where: { id: accountId },
    });
    if (!account) this.notFound('Không tìm thấy tài khoản.');
    if (body.newPassword !== body.confirmPassword) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'PASSWORD_CONFIRMATION_MISMATCH',
        message: 'Mật khẩu xác nhận không khớp.',
      });
    }
    const matches = await bcrypt.compare(
      body.currentPassword,
      account.matKhauHash,
    );
    if (!matches) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Mật khẩu hiện tại không chính xác.',
      });
    }
    if (await bcrypt.compare(body.newPassword, account.matKhauHash)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'PASSWORD_UNCHANGED',
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
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
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const account = await this.prisma.taiKhoan.findUnique({ where: { email } });
    const expiresIn = 600;
    const generic = {
      success: true,
      message: 'Nếu email tồn tại, mã OTP đã được gửi.',
    };
    if (!account) return generic;
    const otp = String(randomInt(100000, 1000000));
    await this.prisma.maXacThuc.updateMany({
      where: {
        taiKhoanId: account.id,
        mucDich: MucDichMaXacThuc.QUEN_MAT_KHAU,
        daSuDung: false,
      },
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
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    if (
      body.newPassword !== body.confirmPassword ||
      String(body.newPassword).length < 8
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_PASSWORD',
        message: 'Mật khẩu xác nhận không khớp hoặc chưa đủ 8 ký tự.',
      });
    }
    const account = await this.prisma.taiKhoan.findUnique({ where: { email } });
    if (!account) this.notFound('Mã OTP không hợp lệ.');
    const record = await this.prisma.maXacThuc.findFirst({
      where: {
        taiKhoanId: account.id,
        mucDich: MucDichMaXacThuc.QUEN_MAT_KHAU,
        daSuDung: false,
        hanSuDung: { gt: new Date() },
      },
      orderBy: { ngayTao: 'desc' },
    });
    if (
      !record ||
      !(await bcrypt.compare(String(body.otp), record.maXacThucHash))
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_OTP',
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn.',
      });
    }
    await this.prisma.$transaction([
      this.prisma.taiKhoan.update({
        where: { id: account.id },
        data: { matKhauHash: await bcrypt.hash(body.newPassword, 12) },
      }),
      this.prisma.maXacThuc.update({
        where: { id: record.id },
        data: { daSuDung: true },
      }),
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

  private activeJobWhere(): Prisma.TinTuyenDungWhereInput {
    return {
      trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      thoiHanNhanHoSo: { gte: new Date() },
      nhaTuyenDung: {
        trangThaiDuyet: TrangThaiKiemDuyet.DA_DUYET,
        taiKhoan: { trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG },
      },
    };
  }

  private mapJob(item: any) {
    return {
      id: item.id,
      title: item.viTriTuyenDung,
      companyId: item.nhaTuyenDung.id,
      company: item.nhaTuyenDung.tenDonVi,
      companyLogo: item.nhaTuyenDung.logoUrl,
      location: item.diaDiemLamViec,
      province: item.tinhThanhPho,
      district: item.quanHuyen,
      specificAddress: item.diaChiLamViecCuThe,
      category: item.nganhNghe.tenNganhNghe,
      categoryId: item.nganhNgheId,
      salaryFrom: item.mucLuongTu,
      salaryTo: item.mucLuongDen,
      negotiable: item.coTheThoaThuan,
      experience: item.soNamKinhNghiemToiThieu,
      requiredEducation: item.trinhDoYeuCau,
      quantity: item.soLuongTuyen,
      type: item.hinhThucLamViec,
      workMode: item.phuongThucLamViec,
      specialization: item.chuyenMon,
      description: item.moTaCongViec,
      requirements: item.yeuCauUngVien,
      benefits: item.quyenLoi,
      deadline: item.thoiHanNhanHoSo,
      status: item.trangThaiKiemDuyet,
      displayStatus: item.trangThaiHienThi,
      rejectionReason: item.lyDoTuChoi,
      editCount: item.soLanChinhSua,
      postedAt: item.ngayDang ?? item.ngayTao,
      skills: item.tinTuyenDungKyNangs.map(
        (skill: any) => skill.kyNang.tenKyNang,
      ),
      employer: item.nhaTuyenDung,
    };
  }

  private scoreRecommendedJob(profile: any, job: any) {
    let score = 0;
    const reasons: string[] = [];

    if (profile.nganhNgheMongMuonId === job.nganhNgheId) {
      score += 25;
      reasons.push('Phu hop nganh nghe ban quan tam.');
    }

    const desiredPosition = this.normalizeText(profile.viTriMongMuon);
    const jobPosition = this.normalizeText(
      [job.viTriTuyenDung, job.chuyenMon].filter(Boolean).join(' '),
    );
    if (desiredPosition && jobPosition) {
      if (
        desiredPosition === jobPosition ||
        desiredPosition.includes(jobPosition) ||
        jobPosition.includes(desiredPosition)
      ) {
        score += 25;
        reasons.push('Gan voi vi tri cong viec mong muon.');
      } else {
        const desiredTokens = new Set(desiredPosition.split(' '));
        const jobTokens = new Set(jobPosition.split(' '));
        const matched = [...desiredTokens].filter((token) =>
          jobTokens.has(token),
        ).length;
        const ratio = desiredTokens.size ? matched / desiredTokens.size : 0;
        const positionScore = Math.round(ratio * 25);
        if (positionScore > 0) {
          score += positionScore;
          reasons.push('Co tu khoa vi tri cong viec tuong dong.');
        }
      }
    }

    const workerSkills = new Set(
      (profile.hoSoKyNangs ?? []).map((item: any) =>
        this.normalizeText(item.kyNang?.tenKyNang),
      ),
    );
    const requiredSkills = (job.tinTuyenDungKyNangs ?? [])
      .map((item: any) => this.normalizeText(item.kyNang?.tenKyNang))
      .filter(Boolean);
    if (requiredSkills.length) {
      const matchedSkills = requiredSkills.filter((skill: string) =>
        workerSkills.has(skill),
      ).length;
      if (matchedSkills > 0) {
        score += Math.round((matchedSkills / requiredSkills.length) * 20);
        reasons.push(`Co ${matchedSkills} ky nang phu hop.`);
      }
    }

    if (
      job.phuongThucLamViec === PhuongThucLamViec.TU_XA &&
      profile.chapNhanLamTuXa
    ) {
      score += 15;
      reasons.push('Phu hop voi nhu cau lam viec tu xa.');
    } else {
      if (
        profile.tinhThanhPhoMongMuon &&
        this.normalizeText(profile.tinhThanhPhoMongMuon) ===
          this.normalizeText(job.tinhThanhPho)
      ) {
        score += 10;
        reasons.push('Dung tinh/thanh pho mong muon.');
      }
      if (
        profile.quanHuyenMongMuon &&
        this.normalizeText(profile.quanHuyenMongMuon) ===
          this.normalizeText(job.quanHuyen)
      ) {
        score += 5;
        reasons.push('Dung quan/huyen mong muon.');
      }
    }

    score += this.salaryMatchScore(profile, job, reasons);

    if (
      (profile.hinhThucLamViecMongMuon &&
        profile.hinhThucLamViecMongMuon === job.hinhThucLamViec) ||
      (profile.phuongThucLamViecMongMuon &&
        profile.phuongThucLamViecMongMuon === job.phuongThucLamViec)
    ) {
      score += 5;
      reasons.push('Phu hop hinh thuc hoac phuong thuc lam viec.');
    }

    return {
      ...this.mapJob(job),
      diemPhuHop: Math.min(100, score),
      lyDoPhuHop: reasons.slice(0, 4),
    };
  }

  private salaryMatchScore(profile: any, job: any, reasons: string[]) {
    if (job.coTheThoaThuan) {
      reasons.push('Muc luong co the thoa thuan.');
      return 5;
    }
    const desiredFrom = Number(profile.mucLuongMongMuonTu ?? 0);
    const desiredTo = Number(profile.mucLuongMongMuonDen ?? desiredFrom);
    const jobFrom = Number(job.mucLuongTu ?? 0);
    const jobTo = Number(job.mucLuongDen ?? jobFrom);
    if (!desiredFrom && !desiredTo) return 0;
    if (jobTo >= (desiredTo || desiredFrom)) {
      reasons.push('Muc luong dap ung mong muon.');
      return 10;
    }
    const overlapFrom = Math.max(jobFrom, desiredFrom);
    const overlapTo = Math.min(jobTo, desiredTo || desiredFrom);
    if (overlapTo >= overlapFrom) {
      reasons.push('Khoang luong co giao voi mong muon.');
      return 7;
    }
    return 0;
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

  private positiveInteger(value: unknown) {
    const number = this.numberOrNull(value);
    return number !== null && Number.isInteger(number) && number > 0
      ? number
      : null;
  }

  private dateFilter(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
    return range;
  }

  private trimOrNull(value: unknown) {
    const text = String(value ?? '').trim().replace(/\s+/g, ' ');
    return text || null;
  }

  private cleanText(value: unknown) {
    const text = String(value ?? '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    return text || null;
  }

  private enumOrNull<T extends Record<string, string>>(value: unknown, source: T) {
    return Object.values(source).includes(value as T[keyof T])
      ? (value as T[keyof T])
      : null;
  }

  private isDraftAction(body: Record<string, any>) {
    return ['draft', 'save-draft', 'BAN_NHAP'].includes(
      String(body.action ?? body.saveMode ?? '').trim(),
    );
  }

  private async fallbackCategoryId() {
    const category = await this.prisma.nganhNghe.findFirst({
      where: { trangThaiHienThi: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (!category) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'CATEGORY_REQUIRED',
        message: 'Can co it nhat mot nganh nghe truoc khi luu tin.',
      });
    }
    return category.id;
  }

  private normalizeSkillNames(skills: unknown) {
    if (!Array.isArray(skills)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of skills) {
      const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
      const key = this.normalizeText(name);
      if (!name || name.length < 2 || name.length > 50 || seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(name);
      if (result.length >= 15) break;
    }
    return result;
  }

  private normalizeSkillValues(skills: unknown) {
    if (!Array.isArray(skills)) return [];
    const seen = new Set<string>();
    const result: Array<string | { name?: string; required?: boolean }> = [];
    for (const raw of skills) {
      const value = raw as string | { name?: string; required?: boolean };
      const name = String(
        typeof value === 'string' ? value : (value.name ?? ''),
      )
        .trim()
        .replace(/\s+/g, ' ');
      const key = this.normalizeText(name);
      if (!name || name.length < 2 || name.length > 50 || seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(typeof value === 'string' ? name : { ...value, name });
      if (result.length >= 15) break;
    }
    return result;
  }

  private normalizeText(value: unknown) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private validateJobBody(body: Record<string, any>, requireComplete = true) {
    if (!requireComplete) {
      const quantity = Number(body.soLuongTuyen || 1);
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new ApiError(HttpStatus.BAD_REQUEST, {
          code: 'INVALID_QUANTITY',
          message: 'So luong tuyen phai lon hon 0.',
        });
      }
      return;
    }

    const required = [
      'nganhNgheId',
      'viTriTuyenDung',
      'moTaCongViec',
      'yeuCauUngVien',
      'hinhThucLamViec',
      'phuongThucLamViec',
      'thoiHanNhanHoSo',
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
    if (
      !Object.values(PhuongThucLamViec).includes(body.phuongThucLamViec)
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_WORK_MODE',
        message: 'Phuong thuc lam viec khong hop le.',
      });
    }
    if (
      [PhuongThucLamViec.TAI_VAN_PHONG, PhuongThucLamViec.KET_HOP].includes(
        body.phuongThucLamViec,
      ) &&
      (!body.tinhThanhPho || !body.diaChiLamViecCuThe)
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_LOCATION',
        message: 'Vui long nhap dia chi lam viec cu the.',
      });
    }
    if (
      Number.isNaN(new Date(body.thoiHanNhanHoSo).getTime()) ||
      new Date(body.thoiHanNhanHoSo) <= new Date()
    ) {
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
    if ((from !== null && from < 0) || (to !== null && to < 0)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_SALARY',
        message: 'Mức lương không được nhỏ hơn 0.',
      });
    }
    if (!body.coTheThoaThuan && from !== null && to !== null && from > to) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_SALARY',
        message: 'Mức lương từ không được lớn hơn mức lương đến.',
      });
    }
    const minimumExperience = this.numberOrNull(body.soNamKinhNghiemToiThieu);
    if (
      minimumExperience !== null &&
      (minimumExperience < 0 || !Number.isInteger(minimumExperience))
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_EXPERIENCE',
        message: 'Số năm kinh nghiệm tối thiểu không được nhỏ hơn 0.',
      });
    }
  }

  private jobWriteData(
    employerId: number,
    body: Record<string, any>,
    isDraft = false,
    fallbackCategoryId?: number | null,
  ) {
    const workMode =
      this.enumOrNull(body.phuongThucLamViec, PhuongThucLamViec) ??
      PhuongThucLamViec.TAI_VAN_PHONG;
    const locationParts = [
      this.trimOrNull(body.diaChiLamViecCuThe),
      this.trimOrNull(body.quanHuyen),
      this.trimOrNull(body.tinhThanhPho),
    ].filter(Boolean);
    const fallbackDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return {
      nhaTuyenDungId: employerId,
      nganhNgheId: Number(body.nganhNgheId || fallbackCategoryId),
      viTriTuyenDung:
        this.trimOrNull(body.viTriTuyenDung) ?? 'Ban nhap tin tuyen dung',
      moTaCongViec:
        this.cleanText(body.moTaCongViec) ??
        (isDraft ? 'Dang cap nhat' : ''),
      yeuCauUngVien:
        this.cleanText(body.yeuCauUngVien) ??
        (isDraft ? 'Dang cap nhat' : ''),
      quyenLoi: this.cleanText(body.quyenLoi),
      mucLuongTu: body.coTheThoaThuan ? null : this.decimal(body.mucLuongTu),
      mucLuongDen: body.coTheThoaThuan ? null : this.decimal(body.mucLuongDen),
      coTheThoaThuan: Boolean(body.coTheThoaThuan),
      diaDiemLamViec:
        locationParts.join(', ') ||
        this.trimOrNull(body.diaDiemLamViec) ||
        (workMode === PhuongThucLamViec.TU_XA ? 'Tu xa' : 'Dang cap nhat'),
      tinhThanhPho: this.trimOrNull(body.tinhThanhPho),
      quanHuyen: this.trimOrNull(body.quanHuyen),
      diaChiLamViecCuThe: this.trimOrNull(body.diaChiLamViecCuThe),
      hinhThucLamViec:
        this.enumOrNull(body.hinhThucLamViec, HinhThucLamViec) ??
        HinhThucLamViec.TOAN_THOI_GIAN,
      phuongThucLamViec: workMode,
      chuyenMon: this.trimOrNull(body.chuyenMon),
      soLuongTuyen: Number(body.soLuongTuyen || 1),
      soNamKinhNghiemToiThieu: this.decimal(body.soNamKinhNghiemToiThieu),
      trinhDoYeuCau: this.trimOrNull(body.trinhDoYeuCau),
      thoiHanNhanHoSo: body.thoiHanNhanHoSo
        ? new Date(body.thoiHanNhanHoSo)
        : fallbackDeadline,
      trangThaiKiemDuyet: isDraft
        ? TrangThaiKiemDuyet.BAN_NHAP
        : TrangThaiKiemDuyet.CHO_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.CHUA_DANG,
      ngayGuiDuyet: isDraft ? null : new Date(),
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
    await tx.tinTuyenDungKyNang.deleteMany({
      where: { tinTuyenDungId: jobId },
    });
    for (const raw of this.normalizeSkillValues(skills)) {
      const value = raw as string | { name?: string; required?: boolean };
      const name = String(
        typeof value === 'string' ? value : (value.name ?? ''),
      ).trim();
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

  private async assertApprovedApplicationLimit(
    tx: Prisma.TransactionClient,
    jobId: number,
    applicationId: number,
  ) {
    const jobs = await tx.$queryRaw<Array<{ so_luong_tuyen: number }>>`
      SELECT "so_luong_tuyen"
      FROM "tin_tuyen_dung"
      WHERE "id" = ${jobId}
      FOR UPDATE
    `;
    const limit = jobs[0]?.so_luong_tuyen;
    if (!limit) this.notFound('Khong tim thay tin tuyen dung.');

    const approvedCount = await tx.ungTuyen.count({
      where: {
        tinTuyenDungId: jobId,
        trangThaiHienTai: TrangThaiUngTuyen.TRUNG_TUYEN,
        id: { not: applicationId },
      },
    });

    if (approvedCount >= limit) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'APPROVED_APPLICATION_LIMIT_REACHED',
        message:
          'So luong ho so duoc duyet da dat gioi han tuyen dung cua tin nay.',
      });
    }
  }

  private validateInterviewInvitation(dto: InviteCandidateInterviewDto) {
    const thoiGianBatDau = new Date(dto.thoiGianBatDau);
    const thoiGianKetThuc = dto.thoiGianKetThuc
      ? new Date(dto.thoiGianKetThuc)
      : null;

    if (
      Number.isNaN(thoiGianBatDau.getTime()) ||
      thoiGianBatDau <= new Date()
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_INTERVIEW_START_TIME',
        message: 'Thời gian phỏng vấn phải lớn hơn thời gian hiện tại.',
      });
    }

    if (
      thoiGianKetThuc &&
      (Number.isNaN(thoiGianKetThuc.getTime()) ||
        thoiGianKetThuc <= thoiGianBatDau)
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_INTERVIEW_END_TIME',
        message: 'Giờ kết thúc phải sau giờ bắt đầu.',
      });
    }

    const diaDiemPhongVan = dto.diaDiemPhongVan ?? null;
    const duongDanPhongVan = dto.duongDanPhongVan ?? null;

    if (dto.hinhThucPhongVan === HinhThucPhongVan.TRUC_TIEP) {
      if (!diaDiemPhongVan) {
        throw new ApiError(HttpStatus.BAD_REQUEST, {
          code: 'INTERVIEW_LOCATION_REQUIRED',
          message: 'Vui lòng nhập địa điểm phỏng vấn trực tiếp.',
        });
      }
      return {
        thoiGianBatDau,
        thoiGianKetThuc,
        hinhThucPhongVan: dto.hinhThucPhongVan,
        diaDiemPhongVan,
        duongDanPhongVan: null,
        nguoiLienHe: dto.nguoiLienHe,
        soDienThoaiLienHe: dto.soDienThoaiLienHe,
        noiDungChuanBi: dto.noiDungChuanBi ?? null,
        ghiChuPhongVan: dto.ghiChuPhongVan ?? null,
      };
    }

    if (!duongDanPhongVan || !this.isHttpUrl(duongDanPhongVan)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_INTERVIEW_URL',
        message: duongDanPhongVan
          ? 'Đường dẫn phỏng vấn không hợp lệ.'
          : 'Vui lòng nhập đường dẫn tham gia phỏng vấn.',
      });
    }

    return {
      thoiGianBatDau,
      thoiGianKetThuc,
      hinhThucPhongVan: dto.hinhThucPhongVan,
      diaDiemPhongVan: null,
      duongDanPhongVan,
      nguoiLienHe: dto.nguoiLienHe,
      soDienThoaiLienHe: dto.soDienThoaiLienHe,
      noiDungChuanBi: dto.noiDungChuanBi ?? null,
      ghiChuPhongVan: dto.ghiChuPhongVan ?? null,
    };
  }

  private isHttpUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private formatInterviewDateTime(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private async sendInterviewInvitationEmail(application: any) {
    const interview = application.thongTinPhongVan;
    if (!interview) return;
    await this.mailService.sendInterviewInvitation({
      email: application.hoSoNguoiLaoDong.taiKhoan.email,
      candidateName: application.hoTenSnapshot,
      employerName: application.tinTuyenDung.nhaTuyenDung.tenDonVi,
      jobTitle: application.tinTuyenDung.viTriTuyenDung,
      startTime: this.formatInterviewDateTime(interview.thoiGianBatDau),
      endTime: interview.thoiGianKetThuc
        ? this.formatInterviewDateTime(interview.thoiGianKetThuc)
        : null,
      interviewMode:
        interview.hinhThucPhongVan === HinhThucPhongVan.TRUC_TIEP
          ? 'Phỏng vấn trực tiếp'
          : 'Phỏng vấn trực tuyến',
      location: interview.diaDiemPhongVan,
      meetingUrl: this.isHttpUrl(String(interview.duongDanPhongVan ?? ''))
        ? interview.duongDanPhongVan
        : null,
      contactName: interview.nguoiLienHe,
      contactPhone: interview.soDienThoaiLienHe,
      preparation: interview.noiDungChuanBi,
      note: interview.ghiChuPhongVan,
    });
  }

  private mapWorkerProfile(profile: any) {
    const { duongDanCv, tepCvUrl, ...safeProfile } = profile;
    return {
      ...safeProfile,
      tepCvUrl:
        profile.tenFileCv ??
        this.fileNameFromStoredPath(profile.duongDanCv ?? profile.tepCvUrl),
      hasCv: Boolean(profile.duongDanCv ?? profile.tepCvUrl),
      cv: this.cvMetadata(profile),
    };
  }

  private mapApplication(item: any, job?: any) {
    const {
      duongDanCvUngTuyen,
      tepCvSnapshotUrl,
      hoSoNguoiLaoDong,
      tinTuyenDung,
      ...safe
    } = item;
    const safeProfile = hoSoNguoiLaoDong
      ? this.mapWorkerProfile(hoSoNguoiLaoDong)
      : undefined;
    const cvName =
      item.tenFileCvUngTuyen ??
      this.fileNameFromStoredPath(
        item.duongDanCvUngTuyen ?? item.tepCvSnapshotUrl,
      );

    return {
      ...safe,
      tepCvSnapshotUrl: null,
      hoSoNguoiLaoDong: safeProfile,
      ...(job ? { job } : {}),
      ...(tinTuyenDung && !job ? { tinTuyenDung } : {}),
      tenFileCvUngTuyen: cvName,
      hasCv: Boolean(item.duongDanCvUngTuyen ?? item.tepCvSnapshotUrl),
    };
  }

  private cvMetadata(profile: any) {
    const pathValue = profile.duongDanCv ?? profile.tepCvUrl;
    return {
      hasCv: Boolean(pathValue),
      tenFileCv: profile.tenFileCv ?? this.fileNameFromStoredPath(pathValue),
      loaiFileCv: profile.loaiFileCv ?? 'application/pdf',
      kichThuocCv: profile.kichThuocCv ?? null,
      ngayTaiCv: profile.ngayTaiCv ?? null,
    };
  }

  private async prepareApplicationCv(
    profile: any,
    body: Record<string, any>,
    file?: UploadedCvFile,
  ) {
    const source = String(
      body.nguonCv ??
        body.cvSource ??
        (file ? 'UPLOADED_CV' : 'CURRENT_PROFILE_CV'),
    );

    if (file) return this.storeUploadedCv(file, applicationCvDir);

    if (source === 'UPLOADED_CV') {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'CV_FILE_REQUIRED',
        message: 'Vui lòng chọn file CV.',
      });
    }

    const currentPath = profile.duongDanCv ?? profile.tepCvUrl;
    if (!currentPath) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'PROFILE_CV_REQUIRED',
        message:
          'Bạn chưa có CV trong hồ sơ. Vui lòng tải lên một CV để ứng tuyển.',
      });
    }

    const sourceFile = await this.resolveStoredCv({
      relativePath: currentPath,
      fileName: profile.tenFileCv,
      mimeType: profile.loaiFileCv,
      size: profile.kichThuocCv,
      allowedDir: workerCvDir,
      missingMessage: 'Không tìm thấy file CV hiện có trong hồ sơ.',
    });
    await this.assertPdfSignature(sourceFile.absolutePath);

    const relativePath = this.relativeCvPath(applicationCvDir);
    const absolutePath = this.safeAbsolutePath(relativePath, applicationCvDir);
    await this.ensureUploadDir(applicationCvDir);
    await copyFile(sourceFile.absolutePath, absolutePath);
    const fileStat = await stat(absolutePath);

    return {
      originalName: sourceFile.fileName,
      relativePath,
      mimeType: 'application/pdf',
      size: Number(fileStat.size),
    };
  }

  private async storeUploadedCv(
    file: UploadedCvFile | undefined,
    targetDir: string,
  ) {
    this.validateUploadedCv(file);

    const relativePath = this.relativeCvPath(targetDir);
    const absolutePath = this.safeAbsolutePath(relativePath, targetDir);
    await this.ensureUploadDir(targetDir);
    await writeFile(absolutePath, file!.buffer!);

    return {
      originalName: this.cleanOriginalFileName(file!.originalname),
      relativePath,
      mimeType: 'application/pdf',
      size: file!.buffer!.length,
    };
  }

  private validateUploadedCv(file: UploadedCvFile | undefined) {
    if (!file?.buffer?.length || !file.size) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'CV_FILE_REQUIRED',
        message: 'Vui lòng chọn file CV.',
      });
    }

    if (file.size > maxCvSize || file.buffer.length > maxCvSize) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'CV_FILE_TOO_LARGE',
        message: 'Dung lượng CV không được vượt quá 5 MB.',
      });
    }

    const name = this.cleanOriginalFileName(file.originalname).toLowerCase();
    if (file.mimetype !== 'application/pdf' || !name.endsWith('.pdf')) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CV_TYPE',
        message: 'CV chỉ được phép có định dạng PDF.',
      });
    }

    if (file.buffer.subarray(0, 5).toString('utf8') !== '%PDF-') {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CV_CONTENT',
        message: 'Nội dung file không phải là tài liệu PDF hợp lệ.',
      });
    }
  }

  private async assertPdfSignature(absolutePath: string) {
    let fileHeader: Buffer;
    try {
      const buffer = await readFile(absolutePath);
      fileHeader = buffer.subarray(0, 5);
    } catch {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'CV_FILE_NOT_READABLE',
        message: 'Không thể đọc file CV.',
      });
    }

    if (fileHeader.toString('utf8') !== '%PDF-') {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CV_CONTENT',
        message: 'Nội dung file không phải là tài liệu PDF hợp lệ.',
      });
    }
  }

  private async resolveStoredCv({
    relativePath,
    fileName,
    mimeType,
    size,
    allowedDir,
    missingMessage,
  }: {
    relativePath?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    size?: number | null;
    allowedDir: string;
    missingMessage: string;
  }): Promise<CvStreamTarget> {
    if (!relativePath) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'CV_NOT_FOUND',
        message: missingMessage,
      });
    }

    const absolutePath = this.safeAbsolutePath(relativePath, allowedDir);
    let fileStat;
    try {
      fileStat = await stat(absolutePath);
    } catch {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'CV_FILE_NOT_FOUND',
        message: 'Không tìm thấy file CV.',
      });
    }
    if (!fileStat.isFile()) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'CV_FILE_NOT_FOUND',
        message: 'Không tìm thấy file CV.',
      });
    }

    return {
      absolutePath,
      fileName:
        fileName || this.fileNameFromStoredPath(relativePath) || 'CV.pdf',
      mimeType: mimeType || 'application/pdf',
      size: size ?? Number(fileStat.size),
    };
  }

  private safeAbsolutePath(relativePath: string, allowedDir: string) {
    const normalized = String(relativePath).replace(/\\/g, '/');
    if (
      path.posix.isAbsolute(normalized) ||
      normalized.split('/').some((segment) => segment === '..')
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CV_PATH',
        message: 'Đường dẫn file CV không hợp lệ.',
      });
    }

    const root = path.resolve(process.cwd(), allowedDir);
    const target = path.resolve(process.cwd(), normalized);
    const relativeToRoot = path.relative(root, target);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_CV_PATH',
        message: 'Đường dẫn file CV không hợp lệ.',
      });
    }
    return target;
  }

  private async safeUnlink(
    relativePath: string | null | undefined,
    allowedDir: string,
  ) {
    if (!relativePath) return;
    try {
      await unlink(this.safeAbsolutePath(relativePath, allowedDir));
    } catch {
      console.warn('Không thể xóa file CV cũ.');
    }
  }

  private async ensureUploadDir(relativeDir: string) {
    await mkdir(path.resolve(process.cwd(), relativeDir), { recursive: true });
  }

  private relativeCvPath(relativeDir: string) {
    return `${relativeDir}/${randomUUID()}.pdf`;
  }

  private cleanOriginalFileName(value?: string) {
    const name = path
      .basename(String(value || 'CV.pdf'))
      .replace(/[\r\n]/g, ' ');
    return name.slice(0, 255) || 'CV.pdf';
  }

  private fileNameFromStoredPath(value?: string | null) {
    if (!value) return null;
    return path.posix.basename(String(value).replace(/\\/g, '/'));
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
