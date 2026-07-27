import { Injectable } from '@nestjs/common';
import {
  MucDichMaXacThuc,
  Prisma,
  TrangThaiTaiKhoan,
  TrangThaiTimViec,
  VaiTroTaiKhoan,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

type PrismaTx = Prisma.TransactionClient;

type CreateWorkerRegistrationData = {
  tenDangNhap: string;
  email: string;
  soDienThoai?: string;
  matKhauHash: string;
  hoTen: string;
  buildOtpHash: (taiKhoanId: number) => string;
  otpExpiresAt: Date;
};

type CreateRegistrationOtpData = {
  taiKhoanId: number;
  otpHash: string;
  otpExpiresAt: Date;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAccountByUsername(tenDangNhap: string) {
    return this.prisma.taiKhoan.findUnique({
      where: { tenDangNhap },
    });
  }

  findAccountByEmail(email: string) {
    return this.prisma.taiKhoan.findUnique({
      where: { email },
    });
  }

  findAccountByPhone(soDienThoai: string) {
    return this.prisma.taiKhoan.findUnique({
      where: { soDienThoai },
    });
  }

  findWorkerAccountByEmail(email: string) {
    return this.prisma.taiKhoan.findFirst({
      where: {
        email,
        vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
      },
    });
  }

  findPendingWorkerAccount(email: string) {
    return this.prisma.taiKhoan.findFirst({
      where: {
        email,
        vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
        trangThaiTaiKhoan: TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL,
        emailXacThucLuc: null,
      },
      include: {
        hoSoNguoiLaoDong: true,
      },
    });
  }

  findLatestActiveRegistrationOtp(taiKhoanId: number) {
    return this.prisma.maXacThuc.findFirst({
      where: {
        taiKhoanId,
        mucDich: MucDichMaXacThuc.DANG_KY,
        daSuDung: false,
      },
      orderBy: {
        ngayTao: 'desc',
      },
    });
  }

  findLatestRegistrationOtp(taiKhoanId: number) {
    return this.prisma.maXacThuc.findFirst({
      where: {
        taiKhoanId,
        mucDich: MucDichMaXacThuc.DANG_KY,
      },
      orderBy: {
        ngayTao: 'desc',
      },
    });
  }

  countRegistrationOtpsSince(taiKhoanId: number, since: Date) {
    return this.prisma.maXacThuc.count({
      where: {
        taiKhoanId,
        mucDich: MucDichMaXacThuc.DANG_KY,
        ngayTao: {
          gte: since,
        },
      },
    });
  }

  markOtpAsUsed(otpId: number) {
    return this.prisma.maXacThuc.update({
      where: { id: otpId },
      data: { daSuDung: true },
    });
  }

  incrementOtpAttempts(otpId: number) {
    return this.prisma.maXacThuc.update({
      where: { id: otpId },
      data: { soLanThu: { increment: 1 } },
    });
  }

  createWorkerRegistration(data: CreateWorkerRegistrationData) {
    return this.runSerializableTransaction(async (tx) => {
      const account = await tx.taiKhoan.create({
        data: {
          tenDangNhap: data.tenDangNhap,
          email: data.email,
          soDienThoai: data.soDienThoai,
          matKhauHash: data.matKhauHash,
          vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
          trangThaiTaiKhoan: TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL,
          emailXacThucLuc: null,
        },
      });

      await tx.hoSoNguoiLaoDong.create({
        data: {
          taiKhoanId: account.id,
          hoTen: data.hoTen,
          trangThaiTimViec: TrangThaiTimViec.DANG_TIM_VIEC,
        },
      });

      const otp = await this.createRegistrationOtp(tx, {
        taiKhoanId: account.id,
        otpHash: data.buildOtpHash(account.id),
        otpExpiresAt: data.otpExpiresAt,
      });

      return {
        account,
        otp,
      };
    });
  }

  replaceRegistrationOtp(data: CreateRegistrationOtpData) {
    return this.runSerializableTransaction(async (tx) => {
      await this.invalidateActiveRegistrationOtps(tx, data.taiKhoanId);
      return this.createRegistrationOtp(tx, data);
    });
  }

  activateWorkerAccount(taiKhoanId: number, otpId: number) {
    return this.runSerializableTransaction(async (tx) => {
      const otpUpdate = await tx.maXacThuc.updateMany({
        where: {
          id: otpId,
          taiKhoanId,
          mucDich: MucDichMaXacThuc.DANG_KY,
          daSuDung: false,
        },
        data: {
          daSuDung: true,
        },
      });

      if (otpUpdate.count !== 1) {
        return null;
      }

      const account = await tx.taiKhoan.update({
        where: {
          id: taiKhoanId,
        },
        data: {
          trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
          emailXacThucLuc: new Date(),
        },
      });

      await this.invalidateActiveRegistrationOtps(tx, taiKhoanId, otpId);

      return account;
    });
  }

  private createRegistrationOtp(tx: PrismaTx, data: CreateRegistrationOtpData) {
    return tx.maXacThuc.create({
      data: {
        taiKhoanId: data.taiKhoanId,
        maXacThucHash: data.otpHash,
        mucDich: MucDichMaXacThuc.DANG_KY,
        hanSuDung: data.otpExpiresAt,
        soLanThu: 0,
        daSuDung: false,
      },
    });
  }

  private async invalidateActiveRegistrationOtps(
    tx: PrismaTx,
    taiKhoanId: number,
    exceptOtpId?: number,
  ) {
    const where: Prisma.MaXacThucWhereInput = {
      taiKhoanId,
      mucDich: MucDichMaXacThuc.DANG_KY,
      daSuDung: false,
    };

    if (exceptOtpId) {
      where.id = { not: exceptOtpId };
    }

    await tx.maXacThuc.updateMany({
      where,
      data: {
        daSuDung: true,
      },
    });
  }

  private async runSerializableTransaction<T>(
    callback: (tx: PrismaTx) => Promise<T>,
    maxRetries = 2,
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await this.prisma.$transaction(callback, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (attempt < maxRetries && this.isTransactionConflict(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Transaction retry exhausted');
  }

  private isTransactionConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
}
