import { HttpStatus, Injectable } from '@nestjs/common';
import {
  LoaiThongBao,
  Prisma,
  TrangThaiTaiKhoan,
  VaiTroTaiKhoan,
} from '../../../generated/prisma/client.js';
import { ApiError } from '../../common/api-error.js';
import {
  defaultPermissions,
  isPermissionCode,
  PERMISSION_GROUPS,
} from '../../common/auth/permissions.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto.js';

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
    if (query.verified === 'true') where.emailXacThucLuc = { not: null };
    if (query.verified === 'false') where.emailXacThucLuc = null;
    if (query.from || query.to) {
      where.ngayTao = {
        ...(query.from
          ? { gte: new Date(`${query.from.slice(0, 10)}T00:00:00.000Z`) }
          : {}),
        ...(query.to
          ? { lte: new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) }
          : {}),
      };
    }
    if (query.hasProfile === 'true') {
      where.AND = [
        {
          OR: [
            { hoSoNguoiLaoDong: { isNot: null } },
            { hoSoNhaTuyenDung: { isNot: null } },
          ],
        },
      ];
    }
    if (query.hasProfile === 'false') {
      where.hoSoNguoiLaoDong = { is: null };
      where.hoSoNhaTuyenDung = { is: null };
    }
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
        phanQuyens: true,
      },
    });

    if (!account) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản.',
      });
    }

    const { matKhauHash: _password, phanQuyens, ...safeAccount } = account;
    const defaults = new Set(defaultPermissions(account.vaiTro));
    const overrides = new Map(
      phanQuyens.map((item) => [item.maQuyen, item.duocPhep]),
    );
    const permissionGroups = PERMISSION_GROUPS[account.vaiTro].map((group) => ({
      resource: group.resource,
      permissions: group.permissions.map((permission) => ({
        ...permission,
        allowed:
          overrides.get(permission.code) ?? defaults.has(permission.code),
        inherited: !overrides.has(permission.code),
      })),
    }));
    return { success: true, data: { ...safeAccount, permissionGroups } };
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

    const statusNotification = {
      [TrangThaiTaiKhoan.HOAT_DONG]: {
        title: 'Tài khoản đã được mở khóa',
        content:
          'Quản trị viên đã mở khóa tài khoản của bạn. Bạn có thể tiếp tục sử dụng các chức năng được cấp quyền.',
      },
      [TrangThaiTaiKhoan.TAM_KHOA]: {
        title: 'Tài khoản đã bị tạm khóa',
        content:
          'Quản trị viên đã tạm khóa tài khoản của bạn. Vui lòng liên hệ bộ phận hỗ trợ nếu cần thêm thông tin.',
      },
      [TrangThaiTaiKhoan.DA_KHOA]: {
        title: 'Tài khoản đã bị khóa',
        content:
          'Quản trị viên đã khóa tài khoản của bạn. Vui lòng liên hệ bộ phận hỗ trợ để được giải quyết.',
      },
      [TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL]: {
        title: 'Tài khoản cần xác thực email',
        content:
          'Trạng thái tài khoản đã được chuyển sang chờ xác thực email. Vui lòng hoàn tất xác thực để tiếp tục sử dụng.',
      },
    }[dto.status];

    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.taiKhoan.update({
        where: { id },
        data: { trangThaiTaiKhoan: dto.status },
        include: {
          hoSoNguoiLaoDong: { select: { hoTen: true } },
          hoSoNhaTuyenDung: {
            select: { tenDonVi: true, maSoThue: true, trangThaiDuyet: true },
          },
        },
      });
      await tx.thongBao.create({
        data: {
          taiKhoanId: id,
          tieuDe: statusNotification.title,
          noiDung: statusNotification.content,
          loaiThongBao: LoaiThongBao.TAI_KHOAN,
          duongDanDich: '/',
        },
      });
      return item;
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

  async updatePermissions(
    id: number,
    dto: UpdateUserPermissionsDto,
    currentAdminId: number,
  ) {
    if (id === currentAdminId) {
      throw new ApiError(HttpStatus.FORBIDDEN, {
        code: 'CANNOT_CHANGE_CURRENT_PERMISSIONS',
        message:
          'Quản trị viên không thể tự thay đổi quyền của tài khoản đang đăng nhập.',
      });
    }
    const account = await this.prisma.taiKhoan.findUnique({
      where: { id },
      select: { id: true, vaiTro: true },
    });
    if (!account || account.vaiTro === VaiTroTaiKhoan.QUAN_TRI_VIEN) {
      throw new ApiError(HttpStatus.NOT_FOUND, {
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản có thể phân quyền.',
      });
    }
    const allowedCodes = new Set(defaultPermissions(account.vaiTro));
    const invalid = dto.permissions.find(
      (item) =>
        !isPermissionCode(item.code) || !allowedCodes.has(item.code as never),
    );
    if (invalid) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'INVALID_PERMISSION',
        message: `Quyền ${invalid.code} không thuộc nhóm quyền của tài khoản này.`,
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.phanQuyenTaiKhoan.deleteMany({ where: { taiKhoanId: id } });
      if (dto.permissions.length) {
        await tx.phanQuyenTaiKhoan.createMany({
          data: dto.permissions.map((item) => ({
            taiKhoanId: id,
            maQuyen: item.code,
            duocPhep: item.allowed,
          })),
        });
      }
      await tx.thongBao.create({
        data: {
          taiKhoanId: id,
          tieuDe: 'Quyền truy cập đã được cập nhật',
          noiDung:
            'Quản trị viên đã cập nhật quyền xem, thêm, sửa hoặc xóa dữ liệu của tài khoản bạn.',
          loaiThongBao: LoaiThongBao.TAI_KHOAN,
          duongDanDich: '/thong-bao',
        },
      });
    });
    return {
      success: true,
      message: 'Phân quyền người dùng thành công.',
    };
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
