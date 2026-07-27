import { jest } from '@jest/globals';
import {
  MucDichMaXacThuc,
  TrangThaiTaiKhoan,
  TrangThaiTimViec,
  VaiTroTaiKhoan,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuthRepository } from './auth.repository.js';

function createRepository() {
  const tx = {
    taiKhoan: {
      create: jest.fn(),
      update: jest.fn(),
    },
    hoSoNguoiLaoDong: {
      create: jest.fn(),
    },
    maXacThuc: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    ),
    taiKhoan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    maXacThuc: {
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new AuthRepository(prisma as unknown as PrismaService);

  return { repository, prisma, tx };
}

describe('AuthRepository', () => {
  it('creates worker account, profile and OTP in one transaction', async () => {
    const { repository, prisma, tx } = createRepository();
    tx.taiKhoan.create.mockResolvedValue({
      id: 1,
      email: 'worker@example.com',
      tenDangNhap: 'worker',
    });
    tx.hoSoNguoiLaoDong.create.mockResolvedValue({ id: 2 });
    tx.maXacThuc.create.mockResolvedValue({ id: 3 });

    const result = await repository.createWorkerRegistration({
      tenDangNhap: 'worker',
      email: 'worker@example.com',
      soDienThoai: '+84912345678',
      matKhauHash: 'hashed-password',
      hoTen: 'Worker',
      buildOtpHash: (accountId) => `hashed-otp-${accountId}`,
      otpExpiresAt: new Date('2026-07-27T03:05:00.000Z'),
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.taiKhoan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenDangNhap: 'worker',
        email: 'worker@example.com',
        matKhauHash: 'hashed-password',
        vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
        trangThaiTaiKhoan: TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL,
      }),
    });
    expect(tx.hoSoNguoiLaoDong.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taiKhoanId: 1,
        hoTen: 'Worker',
        trangThaiTimViec: TrangThaiTimViec.DANG_TIM_VIEC,
      }),
    });
    expect(tx.maXacThuc.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taiKhoanId: 1,
        maXacThucHash: 'hashed-otp-1',
        mucDich: MucDichMaXacThuc.DANG_KY,
        daSuDung: false,
      }),
    });
    expect(result.account.id).toBe(1);
    expect(result.otp.id).toBe(3);
  });

  it('activates worker account and invalidates active registration OTPs atomically', async () => {
    const { repository, tx } = createRepository();
    tx.maXacThuc.updateMany.mockResolvedValue({ count: 1 });
    tx.taiKhoan.update.mockResolvedValue({
      id: 1,
      trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
    });

    const result = await repository.activateWorkerAccount(1, 10);

    expect(tx.maXacThuc.updateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        taiKhoanId: 1,
        mucDich: MucDichMaXacThuc.DANG_KY,
        daSuDung: false,
      },
      data: {
        daSuDung: true,
      },
    });
    expect(tx.taiKhoan.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
      }),
    });
    expect(result?.trangThaiTaiKhoan).toBe(TrangThaiTaiKhoan.HOAT_DONG);
  });
});
