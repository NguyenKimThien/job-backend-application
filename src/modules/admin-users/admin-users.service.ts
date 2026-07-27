import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  TrangThaiTaiKhoan,
  VaiTroTaiKhoan,
} from '../../../generated/prisma/client.js';
import { ApiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto) {
    const where: Prisma.TaiKhoanWhereInput = {
      vaiTro: { not: VaiTroTaiKhoan.QUAN_TRI_VIEN },
    };
    const search = query.search?.trim();

    if (query.role && query.role !== VaiTroTaiKhoan.QUAN_TRI_VIEN) {
      where.vaiTro = query.role;
    }
    if (query.status) where.trangThaiTaiKhoan = query.status;
    if (search) {
      where.OR = [
        { tenDangNhap: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { soDienThoai: { contains: search } },
        {
          hoSoNguoiLaoDong: {
            is: { hoTen: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          hoSoNhaTuyenDung: {
            is: { tenDonVi: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [
      items,
      total,
      pendingEmailCount,
      activeCount,
      temporarilyLockedCount,
      lockedCount,
    ] = await this.prisma.$transaction([
      this.prisma.taiKhoan.findMany({
        where,
        include: {
          hoSoNguoiLaoDong: { select: { hoTen: true } },
          hoSoNhaTuyenDung: {
            select: { tenDonVi: true, maSoThue: true, trangThaiDuyet: true },
          },
        },
        orderBy: { ngayTao: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.taiKhoan.count({ where }),
      this.prisma.taiKhoan.count({
        where: {
          vaiTro: { not: VaiTroTaiKhoan.QUAN_TRI_VIEN },
          trangThaiTaiKhoan: TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL,
        },
      }),
      this.prisma.taiKhoan.count({
        where: {
          vaiTro: { not: VaiTroTaiKhoan.QUAN_TRI_VIEN },
          trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
        },
      }),
      this.prisma.taiKhoan.count({
        where: {
          vaiTro: { not: VaiTroTaiKhoan.QUAN_TRI_VIEN },
          trangThaiTaiKhoan: TrangThaiTaiKhoan.TAM_KHOA,
        },
      }),
      this.prisma.taiKhoan.count({
        where: {
          vaiTro: { not: VaiTroTaiKhoan.QUAN_TRI_VIEN },
          trangThaiTaiKhoan: TrangThaiTaiKhoan.DA_KHOA,
        },
      }),
    ]);

    const summary: Record<TrangThaiTaiKhoan, number> = {
      [TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL]: pendingEmailCount,
      [TrangThaiTaiKhoan.HOAT_DONG]: activeCount,
      [TrangThaiTaiKhoan.TAM_KHOA]: temporarilyLockedCount,
      [TrangThaiTaiKhoan.DA_KHOA]: lockedCount,
    };

    return {
      success: true,
      data: {
        items: items.map((item) => this.toListItem(item)),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
        summary: {
          total: Object.values(summary).reduce((sum, value) => sum + value, 0),
          ...summary,
        },
      },
    };
  }

  async detail(id: number) {
    const account = await this.prisma.taiKhoan.findFirst({
      where: {
        id,
        vaiTro: { not: VaiTroTaiKhoan.QUAN_TRI_VIEN },
      },
      include: {
        hoSoNguoiLaoDong: {
          include: {
            hocVans: true,
            kinhNghiemLamViecs: true,
            hoSoKyNangs: { include: { kyNang: true } },
          },
        },
        hoSoNhaTuyenDung: { include: { linhVuc: true } },
      },
    });

    if (!account) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản.',
      });
    }

    const { matKhauHash: _password, ...safeAccount } = account;
    return { success: true, data: safeAccount };
  }

  async updateStatus(
    id: number,
    dto: UpdateUserStatusDto,
    currentAdminId: number,
  ) {
    if (id === currentAdminId && dto.status !== TrangThaiTaiKhoan.HOAT_DONG) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'CANNOT_LOCK_CURRENT_ACCOUNT',
        message: 'Quản trị viên không thể tự khóa tài khoản đang đăng nhập.',
      });
    }

    const account = await this.prisma.taiKhoan.findUnique({ where: { id } });
    if (!account) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản.',
      });
    }

    if (account.vaiTro === VaiTroTaiKhoan.QUAN_TRI_VIEN) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'ADMIN_ACCOUNT_NOT_MANAGEABLE',
        message: 'Không thể thay đổi trạng thái tài khoản quản trị viên.',
      });
    }

    const updated = await this.prisma.taiKhoan.update({
      where: { id },
      data: { trangThaiTaiKhoan: dto.status },
      include: {
        hoSoNguoiLaoDong: { select: { hoTen: true } },
        hoSoNhaTuyenDung: {
          select: { tenDonVi: true, maSoThue: true, trangThaiDuyet: true },
        },
      },
    });

    return {
      success: true,
      message:
        dto.status === TrangThaiTaiKhoan.HOAT_DONG
          ? 'Đã mở khóa tài khoản.'
          : 'Đã cập nhật trạng thái tài khoản.',
      data: this.toListItem(updated),
    };
  }

  async updateRole(id: number, role: VaiTroTaiKhoan, currentAdminId: number) {
    if (id === currentAdminId || role === VaiTroTaiKhoan.QUAN_TRI_VIEN) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'INVALID_ROLE_ASSIGNMENT',
        message: 'Không được cấp quyền quản trị hoặc sửa vai trò của chính mình.',
      });
    }
    const account = await this.prisma.taiKhoan.findUnique({
      where: { id },
      include: { hoSoNguoiLaoDong: true, hoSoNhaTuyenDung: true },
    });
    if (!account || account.vaiTro === VaiTroTaiKhoan.QUAN_TRI_VIEN) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản có thể phân quyền.',
      });
    }
    if (
      (role === VaiTroTaiKhoan.NGUOI_LAO_DONG && !account.hoSoNguoiLaoDong) ||
      (role === VaiTroTaiKhoan.NHA_TUYEN_DUNG && !account.hoSoNhaTuyenDung)
    ) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'ROLE_PROFILE_MISSING',
        message: 'Tài khoản chưa có hồ sơ phù hợp với vai trò được chọn.',
      });
    }
    await this.prisma.$transaction([
      this.prisma.taiKhoan.update({ where: { id }, data: { vaiTro: role } }),
      this.prisma.thongBao.create({
        data: {
          taiKhoanId: id,
          tieuDe: 'Vai trò tài khoản đã thay đổi',
          noiDung: `Tài khoản của bạn đã được chuyển sang vai trò ${role}.`,
          loaiThongBao: 'TAI_KHOAN',
          duongDanDich: '/',
        },
      }),
    ]);
    return { success: true, message: 'Đã cập nhật vai trò tài khoản.' };
  }

  private toListItem(account: {
    id: number;
    tenDangNhap: string;
    email: string;
    soDienThoai: string | null;
    vaiTro: VaiTroTaiKhoan;
    trangThaiTaiKhoan: TrangThaiTaiKhoan;
    lanDangNhapCuoi: Date | null;
    ngayTao: Date;
    hoSoNguoiLaoDong: { hoTen: string } | null;
    hoSoNhaTuyenDung: {
      tenDonVi: string;
      maSoThue: string;
      trangThaiDuyet: string;
    } | null;
  }) {
    return {
      id: account.id,
      tenDangNhap: account.tenDangNhap,
      tenHienThi:
        account.hoSoNguoiLaoDong?.hoTen ??
        account.hoSoNhaTuyenDung?.tenDonVi ??
        account.tenDangNhap,
      email: account.email,
      soDienThoai: account.soDienThoai,
      vaiTro: account.vaiTro,
      trangThaiTaiKhoan: account.trangThaiTaiKhoan,
      maSoThue: account.hoSoNhaTuyenDung?.maSoThue ?? null,
      trangThaiHoSoNhaTuyenDung:
        account.hoSoNhaTuyenDung?.trangThaiDuyet ?? null,
      lanDangNhapCuoi: account.lanDangNhapCuoi,
      ngayTao: account.ngayTao,
    };
  }
}
