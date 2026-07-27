import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import {
  MucDichMaXacThuc,
  Prisma,
  TrangThaiKiemDuyet,
  TrangThaiTaiKhoan,
  VaiTroTaiKhoan,
} from '../../../generated/prisma/client.js';
import { ApiError } from '../../common/api-error.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { RegisterWorkerDto } from './dto/register-worker.dto.js';
import { ResendEmployerRegistrationOtpDto } from './dto/resend-employer-registration-otp.dto.js';
import { ResendRegistrationOtpDto } from './dto/resend-registration-otp.dto.js';
import { VerifyEmployerRegistrationOtpDto } from './dto/verify-employer-registration-otp.dto.js';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto.js';
import { AuthRepository } from './repositories/auth.repository.js';
import { OtpService } from './services/otp.service.js';
import { maskEmail } from './utils/mask-email.util.js';
import { normalizeEmail } from './utils/normalize-email.util.js';
import { normalizePhone } from './utils/normalize-phone.util.js';
import { normalizeTaxCode } from './utils/normalize-tax-code.util.js';

type CreatedRegistration = {
  accountId: number;
  email: string;
  hoTen: string;
  otp: string;
  otpId: number;
};

type CreatedEmployerRegistration = CreatedRegistration & {
  tenDangNhap: string;
  tenDonVi: string;
  trangThaiTaiKhoan: TrangThaiTaiKhoan;
  trangThaiHoSo: TrangThaiKiemDuyet;
};

type LoginIdentifierType =
  | 'WORKER_CCCD'
  | 'EMPLOYER_TAX_CODE'
  | 'ADMIN_USERNAME';

type LoginAccount = Prisma.TaiKhoanGetPayload<{
  include: {
    hoSoNguoiLaoDong: true;
    hoSoNhaTuyenDung: true;
  };
}>;

const REGISTRATION_PURPOSE = MucDichMaXacThuc.DANG_KY;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly prismaService?: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = this.normalizeLoginIdentifier(dto.tendangnhap);
    const identifierType = this.detectLoginIdentifierType(identifier);
    const account = await this.findAccountByLoginIdentifier(
      identifier,
      identifierType,
    );

    if (!account) {
      this.throwLoginError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Thong tin dang nhap khong chinh xac.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.matKhau,
      account.matKhauHash,
    );

    if (!passwordMatches) {
      this.throwLoginError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Thong tin dang nhap khong chinh xac.',
      );
    }

    this.validateAccountStatus(account);

    const accessToken = await this.generateAccessToken(account);
    const loggedInAccount = await this.updateLastLogin(account.id);

    return this.buildLoginResponse(loggedInAccount, accessToken);
  }

  async registerWorker(dto: RegisterWorkerDto) {
    const normalized = this.normalizeRegisterWorkerDto(dto);

    if (normalized.matKhau !== normalized.xacNhanMatKhau) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'PASSWORD_CONFIRMATION_MISMATCH',
        message: 'Mat khau xac nhan khong khop voi mat khau.',
      });
    }

    await this.checkDuplicateRegistrationData(
      normalized.tenDangNhap,
      normalized.email,
      normalized.soDienThoai,
    );

    const passwordHash = await bcrypt.hash(
      normalized.matKhau,
      this.configService.getOrThrow<number>('BCRYPT_SALT_ROUNDS'),
    );

    let created: CreatedRegistration;

    try {
      created = await this.createWorkerAccount(normalized, passwordHash);
    } catch (error) {
      this.handlePrismaUniqueError(error);
      throw error;
    }

    await this.sendRegistrationOtp(created);

    return {
      success: true,
      message:
        'Dang ky thanh cong. Vui long kiem tra email de xac thuc tai khoan.',
      data: {
        email: maskEmail(created.email),
        expiresIn: this.otpService.getTtlSeconds(),
        ...(!this.isSmtpEnabled() ? { developmentOtp: created.otp } : {}),
      },
    };
  }

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto) {
    const email = normalizeEmail(dto.email);
    const account = await this.authRepository.findWorkerAccountByEmail(email);

    if (!account) {
      this.throwOtpInvalid();
    }

    if (
      account.trangThaiTaiKhoan === TrangThaiTaiKhoan.HOAT_DONG &&
      account.emailXacThucLuc
    ) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Email da duoc xac thuc.',
      });
    }

    const latestOtp = await this.authRepository.findLatestActiveRegistrationOtp(
      account.id,
    );

    if (!latestOtp) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'OTP_NOT_FOUND',
        message: 'Ma OTP khong hop le hoac da duoc su dung.',
      });
    }

    if (latestOtp.hanSuDung <= new Date()) {
      await this.authRepository.markOtpAsUsed(latestOtp.id);
      throw new ApiError(HttpStatus.GONE, {
        code: 'OTP_EXPIRED',
        message: 'Ma OTP da het han. Vui long yeu cau gui lai OTP.',
      });
    }

    if (latestOtp.soLanThu >= this.otpService.getMaxAttempts()) {
      await this.authRepository.markOtpAsUsed(latestOtp.id);
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
        code: 'OTP_MAX_ATTEMPTS_EXCEEDED',
        message:
          'Ban da nhap sai OTP qua so lan cho phep. Vui long yeu cau ma moi.',
      });
    }

    const matches = this.otpService.compareOtp(
      account.id,
      REGISTRATION_PURPOSE,
      dto.otp,
      latestOtp.maXacThucHash,
    );

    if (!matches) {
      const updatedOtp = await this.authRepository.incrementOtpAttempts(
        latestOtp.id,
      );

      if (updatedOtp.soLanThu >= this.otpService.getMaxAttempts()) {
        await this.authRepository.markOtpAsUsed(latestOtp.id);
        throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
          code: 'OTP_MAX_ATTEMPTS_EXCEEDED',
          message:
            'Ban da nhap sai OTP qua so lan cho phep. Vui long yeu cau ma moi.',
        });
      }

      this.throwOtpInvalid();
    }

    const verifiedAccount = await this.authRepository.activateWorkerAccount(
      account.id,
      latestOtp.id,
    );

    if (!verifiedAccount) {
      this.throwOtpInvalid();
    }

    return {
      success: true,
      message: 'Xac thuc email thanh cong. Tai khoan da duoc kich hoat.',
      data: {
        id: verifiedAccount.id,
        tenDangNhap: verifiedAccount.tenDangNhap,
        email: verifiedAccount.email,
        vaiTro: verifiedAccount.vaiTro,
        trangThaiTaiKhoan: verifiedAccount.trangThaiTaiKhoan,
        emailXacThucLuc: verifiedAccount.emailXacThucLuc,
      },
    };
  }

  async resendRegistrationOtp(dto: ResendRegistrationOtpDto) {
    const expiresIn = this.otpService.getTtlSeconds();
    const genericResponse = {
      success: true,
      message:
        'Neu tai khoan dang cho xac thuc, ma OTP moi da duoc gui den email.',
      data: {
        expiresIn,
      },
    };
    const account = await this.findPendingWorkerAccount(dto.email);

    if (!account) {
      return genericResponse;
    }

    await this.ensureResendAllowed(account.id);

    const otp = this.otpService.generateOtp();
    const otpRecord = await this.authRepository.replaceRegistrationOtp({
      taiKhoanId: account.id,
      otpHash: this.otpService.hashOtp(account.id, REGISTRATION_PURPOSE, otp),
      otpExpiresAt: this.otpService.calculateExpiry(),
    });

    try {
      await this.mailService.sendRegistrationOtp({
        email: account.email,
        hoTen: account.hoSoNguoiLaoDong?.hoTen ?? account.tenDangNhap,
        otp,
        expiresInMinutes: Math.ceil(expiresIn / 60),
      });
    } catch {
      await this.authRepository.markOtpAsUsed(otpRecord.id);
      throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, {
        code: 'VERIFICATION_EMAIL_SEND_FAILED',
        message:
          'Tai khoan da duoc ghi nhan nhung chua the gui email xac thuc. Vui long thu lai chuc nang gui lai OTP.',
      });
    }

    return {
      ...genericResponse,
      data: {
        ...genericResponse.data,
        ...(!this.isSmtpEnabled() ? { developmentOtp: otp } : {}),
      },
    };
  }

  async registerEmployer(dto: RegisterEmployerDto) {
    const normalized = this.normalizeRegisterEmployerDto(dto);

    if (normalized.matKhau !== normalized.xacNhanMatKhau) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'PASSWORD_CONFIRMATION_MISMATCH',
        message: 'Mat khau xac nhan khong khop voi mat khau.',
      });
    }

    await this.checkDuplicateEmployerRegistrationData(
      normalized.tenDangNhap,
      normalized.email,
      normalized.maSoThue,
      normalized.soDienThoai,
    );

    const passwordHash = await bcrypt.hash(
      normalized.matKhau,
      this.configService.getOrThrow<number>('BCRYPT_SALT_ROUNDS'),
    );

    let created: CreatedEmployerRegistration;

    try {
      created = await this.createEmployerAccount(normalized, passwordHash);
    } catch (error) {
      this.handleEmployerPrismaUniqueError(error);
      throw error;
    }

    await this.sendEmployerRegistrationOtp(created);

    return {
      success: true,
      message:
        'Dang ky thanh cong. Vui long kiem tra email de xac thuc tai khoan.',
      data: {
        email: maskEmail(created.email),
        tenDangNhap: created.tenDangNhap,
        tenDonVi: created.tenDonVi,
        expiresIn: this.otpService.getTtlSeconds(),
        trangThaiTaiKhoan: created.trangThaiTaiKhoan,
        trangThaiHoSo: created.trangThaiHoSo,
        ...(!this.isSmtpEnabled() ? { developmentOtp: created.otp } : {}),
      },
    };
  }

  async verifyEmployerRegistrationOtp(dto: VerifyEmployerRegistrationOtpDto) {
    const prisma = this.getPrismaService();
    const email = normalizeEmail(dto.email);
    const account = await prisma.taiKhoan.findFirst({
      where: {
        email,
        vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG,
      },
    });

    if (!account) {
      this.throwOtpInvalid();
    }

    if (
      account.trangThaiTaiKhoan === TrangThaiTaiKhoan.HOAT_DONG &&
      account.emailXacThucLuc
    ) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Email da duoc xac thuc.',
      });
    }

    const latestOtp = await prisma.maXacThuc.findFirst({
      where: {
        taiKhoanId: account.id,
        mucDich: REGISTRATION_PURPOSE,
        daSuDung: false,
      },
      orderBy: {
        ngayTao: 'desc',
      },
    });

    if (!latestOtp) {
      throw new ApiError(HttpStatus.BAD_REQUEST, {
        code: 'OTP_NOT_FOUND',
        message: 'Ma OTP khong hop le hoac da duoc su dung.',
      });
    }

    if (latestOtp.hanSuDung <= new Date()) {
      await prisma.maXacThuc.update({
        where: { id: latestOtp.id },
        data: { daSuDung: true },
      });
      throw new ApiError(HttpStatus.GONE, {
        code: 'OTP_EXPIRED',
        message: 'Ma OTP da het han. Vui long yeu cau gui lai OTP.',
      });
    }

    if (latestOtp.soLanThu >= this.otpService.getMaxAttempts()) {
      await prisma.maXacThuc.update({
        where: { id: latestOtp.id },
        data: { daSuDung: true },
      });
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
        code: 'OTP_MAX_ATTEMPTS_EXCEEDED',
        message:
          'Ban da nhap sai OTP qua so lan cho phep. Vui long yeu cau ma moi.',
      });
    }

    const matches = this.otpService.compareOtp(
      account.id,
      REGISTRATION_PURPOSE,
      dto.otp,
      latestOtp.maXacThucHash,
    );

    if (!matches) {
      const updatedOtp = await prisma.maXacThuc.update({
        where: { id: latestOtp.id },
        data: { soLanThu: { increment: 1 } },
      });

      if (updatedOtp.soLanThu >= this.otpService.getMaxAttempts()) {
        await prisma.maXacThuc.update({
          where: { id: latestOtp.id },
          data: { daSuDung: true },
        });
        throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
          code: 'OTP_MAX_ATTEMPTS_EXCEEDED',
          message:
            'Ban da nhap sai OTP qua so lan cho phep. Vui long yeu cau ma moi.',
        });
      }

      this.throwOtpInvalid();
    }

    const verifiedAccount = await prisma.$transaction(
      async (tx) => {
        const otpUpdate = await tx.maXacThuc.updateMany({
          where: {
            id: latestOtp.id,
            taiKhoanId: account.id,
            mucDich: REGISTRATION_PURPOSE,
            daSuDung: false,
          },
          data: {
            daSuDung: true,
          },
        });

        if (otpUpdate.count !== 1) {
          this.throwOtpInvalid();
        }

        const updatedAccount = await tx.taiKhoan.update({
          where: { id: account.id },
          data: {
            trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
            emailXacThucLuc: new Date(),
          },
        });

        await tx.maXacThuc.updateMany({
          where: {
            taiKhoanId: account.id,
            mucDich: REGISTRATION_PURPOSE,
            daSuDung: false,
            id: { not: latestOtp.id },
          },
          data: {
            daSuDung: true,
          },
        });

        return updatedAccount;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      success: true,
      message: 'Xac thuc email thanh cong. Tai khoan da duoc kich hoat.',
      data: {
        id: verifiedAccount.id,
        tenDangNhap: verifiedAccount.tenDangNhap,
        email: verifiedAccount.email,
        vaiTro: verifiedAccount.vaiTro,
        trangThaiTaiKhoan: verifiedAccount.trangThaiTaiKhoan,
        emailXacThucLuc: verifiedAccount.emailXacThucLuc,
      },
    };
  }

  async resendEmployerRegistrationOtp(dto: ResendEmployerRegistrationOtpDto) {
    const prisma = this.getPrismaService();
    const expiresIn = this.otpService.getTtlSeconds();
    const genericResponse = {
      success: true,
      message:
        'Neu tai khoan dang cho xac thuc, ma OTP moi da duoc gui den email.',
      data: {
        expiresIn,
      },
    };
    const account = await prisma.taiKhoan.findFirst({
      where: {
        email: normalizeEmail(dto.email),
        vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG,
        trangThaiTaiKhoan: TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL,
        emailXacThucLuc: null,
      },
      include: {
        hoSoNhaTuyenDung: true,
      },
    });

    if (!account) {
      return genericResponse;
    }

    await this.ensureEmployerResendAllowed(account.id);

    const otp = this.otpService.generateOtp();
    const otpRecord = await prisma.$transaction(
      async (tx) => {
        await tx.maXacThuc.updateMany({
          where: {
            taiKhoanId: account.id,
            mucDich: REGISTRATION_PURPOSE,
            daSuDung: false,
          },
          data: {
            daSuDung: true,
          },
        });

        return tx.maXacThuc.create({
          data: {
            taiKhoanId: account.id,
            maXacThucHash: this.otpService.hashOtp(
              account.id,
              REGISTRATION_PURPOSE,
              otp,
            ),
            mucDich: REGISTRATION_PURPOSE,
            hanSuDung: this.otpService.calculateExpiry(),
            soLanThu: 0,
            daSuDung: false,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      await this.mailService.sendRegistrationOtp({
        email: account.email,
        hoTen: account.hoSoNhaTuyenDung?.tenDonVi ?? account.tenDangNhap,
        otp,
        expiresInMinutes: Math.ceil(expiresIn / 60),
      });
    } catch {
      await prisma.maXacThuc.update({
        where: { id: otpRecord.id },
        data: { daSuDung: true },
      });
      throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, {
        code: 'VERIFICATION_EMAIL_SEND_FAILED',
        message:
          'Tai khoan da duoc ghi nhan nhung chua the gui email xac thuc. Vui long thu lai chuc nang gui lai OTP.',
      });
    }

    return {
      ...genericResponse,
      data: {
        ...genericResponse.data,
        ...(!this.isSmtpEnabled() ? { developmentOtp: otp } : {}),
      },
    };
  }

  private normalizeLoginIdentifier(identifier: string): string {
    return String(identifier ?? '')
      .trim()
      .toLowerCase();
  }

  private isSmtpEnabled(): boolean {
    return this.configService.get<boolean>('SMTP_ENABLED') === true;
  }

  private detectLoginIdentifierType(identifier: string): LoginIdentifierType {
    if (/^\d{12}$/.test(identifier)) {
      return 'WORKER_CCCD';
    }

    if (/^\d{10}$/.test(identifier) || /^\d{13}$/.test(identifier)) {
      return 'EMPLOYER_TAX_CODE';
    }

    if (/^[a-zA-Z0-9._@-]{4,255}$/.test(identifier)) {
      return 'ADMIN_USERNAME';
    }

    this.throwLoginError(HttpStatus.BAD_REQUEST, 'INVALID_LOGIN_IDENTIFIER',
      'Dinh danh dang nhap khong hop le.');
  }

  private findAccountByLoginIdentifier(
    identifier: string,
    _identifierType: LoginIdentifierType,
  ): Promise<LoginAccount | null> {
    const prisma = this.getPrismaService();

    return prisma.taiKhoan.findFirst({
      where: {
        tenDangNhap: identifier,
      },
      include: {
        hoSoNguoiLaoDong: true,
        hoSoNhaTuyenDung: true,
      },
    });
  }

  private validateAccountStatus(account: LoginAccount) {
    if (
      account.trangThaiTaiKhoan === TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL ||
      !account.emailXacThucLuc
    ) {
      this.throwLoginError(
        HttpStatus.FORBIDDEN,
        'EMAIL_NOT_VERIFIED',
        'Tai khoan chua xac thuc email.',
      );
    }

    if (account.trangThaiTaiKhoan === TrangThaiTaiKhoan.TAM_KHOA) {
      this.throwLoginError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_TEMPORARILY_LOCKED',
        'Tai khoan dang bi tam khoa.',
      );
    }

    if (account.trangThaiTaiKhoan === TrangThaiTaiKhoan.DA_KHOA) {
      this.throwLoginError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_LOCKED',
        'Tai khoan da bi khoa.',
      );
    }

    if (account.trangThaiTaiKhoan !== TrangThaiTaiKhoan.HOAT_DONG) {
      this.throwLoginError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_NOT_ACTIVE',
        'Tai khoan chua duoc kich hoat.',
      );
    }
  }

  private generateAccessToken(account: LoginAccount): Promise<string> {
    return this.jwtService.signAsync({
      sub: account.id,
      role: account.vaiTro,
      email: account.email,
    });
  }

  private async updateLastLogin(accountId: number): Promise<LoginAccount> {
    const prisma = this.getPrismaService();

    return prisma.taiKhoan.update({
      where: { id: accountId },
      data: {
        lanDangNhapCuoi: new Date(),
      },
      include: {
        hoSoNguoiLaoDong: true,
        hoSoNhaTuyenDung: true,
      },
    });
  }

  private buildLoginResponse(account: LoginAccount, accessToken: string) {
    const baseAccount = {
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
    };

    if (account.vaiTro === VaiTroTaiKhoan.NGUOI_LAO_DONG) {
      return {
        success: true,
        message: 'Dang nhap thanh cong.',
        data: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: this.getJwtExpiresInSeconds(),
          taiKhoan: {
            ...baseAccount,
            daCoHoSo: Boolean(account.hoSoNguoiLaoDong),
          },
        },
      };
    }

    return {
      success: true,
      message: 'Dang nhap thanh cong.',
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.getJwtExpiresInSeconds(),
        taiKhoan: {
          ...baseAccount,
          trangThaiHoSo: account.hoSoNhaTuyenDung?.trangThaiDuyet ?? null,
          daHoanThienHoSo: this.isEmployerProfileComplete(account),
        },
      },
    };
  }

  private isEmployerProfileComplete(account: LoginAccount): boolean {
    const profile = account.hoSoNhaTuyenDung;

    return Boolean(
      profile?.tenDonVi &&
      profile.maSoThue &&
      profile.diaChiTruSo &&
      profile.linhVucId &&
      profile.nguoiDaiDien &&
      profile.chucVuNguoiDaiDien &&
      profile.soDienThoaiLienHe &&
      profile.emailLienHe &&
      profile.moTaDonVi &&
      profile.tepGiayPhepUrl,
    );
  }

  private getJwtExpiresInSeconds(): number {
    const expiresIn = Number(
      this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS') ?? 900,
    );

    return Number.isInteger(expiresIn) && expiresIn > 0 ? expiresIn : 900;
  }

  private normalizeRegisterWorkerDto(
    dto: RegisterWorkerDto,
  ): RegisterWorkerDto {
    return {
      ...dto,
      tenDangNhap: String(dto.tenDangNhap).trim().toLowerCase(),
      email: normalizeEmail(dto.email),
      soDienThoai: normalizePhone(dto.soDienThoai),
      hoTen: String(dto.hoTen).trim(),
    };
  }

  private normalizeRegisterEmployerDto(dto: RegisterEmployerDto) {
    const maSoThue = normalizeTaxCode(dto.maSoThue);

    return {
      ...dto,
      email: normalizeEmail(dto.email),
      soDienThoai: normalizePhone(dto.soDienThoai),
      maSoThue,
      tenDangNhap: maSoThue,
      tenDonVi: String(dto.tenDonVi).trim(),
      diaChiTruSo: String(dto.diaChiTruSo).trim(),
    };
  }

  private async checkDuplicateRegistrationData(
    tenDangNhap: string,
    email: string,
    soDienThoai?: string,
  ) {
    const [usernameAccount, emailAccount, phoneAccount] = await Promise.all([
      this.authRepository.findAccountByUsername(tenDangNhap),
      this.authRepository.findAccountByEmail(email),
      soDienThoai
        ? this.authRepository.findAccountByPhone(soDienThoai)
        : Promise.resolve(null),
    ]);

    if (
      emailAccount?.trangThaiTaiKhoan === TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL
    ) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'ACCOUNT_PENDING_VERIFICATION',
        message:
          'Tai khoan da duoc dang ky nhung chua xac thuc. Vui long yeu cau gui lai OTP.',
      });
    }

    if (usernameAccount) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'Ten dang nhap da ton tai.',
      });
    }

    if (emailAccount) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email da ton tai.',
      });
    }

    if (phoneAccount) {
      throw new ApiError(HttpStatus.CONFLICT, {
        code: 'PHONE_ALREADY_EXISTS',
        message: 'So dien thoai da ton tai.',
      });
    }
  }

  private async checkDuplicateEmployerRegistrationData(
    tenDangNhap: string,
    email: string,
    maSoThue: string,
    soDienThoai?: string,
  ) {
    const prisma = this.getPrismaService();
    const [usernameAccount, employerProfile, emailAccount, phoneAccount] =
      await Promise.all([
        prisma.taiKhoan.findUnique({ where: { tenDangNhap } }),
        prisma.hoSoNhaTuyenDung.findUnique({ where: { maSoThue } }),
        prisma.taiKhoan.findUnique({ where: { email } }),
        soDienThoai
          ? prisma.taiKhoan.findUnique({ where: { soDienThoai } })
          : Promise.resolve(null),
      ]);

    if (
      emailAccount?.trangThaiTaiKhoan === TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL
    ) {
      this.throwEmployerError(
        HttpStatus.CONFLICT,
        'ACCOUNT_PENDING_VERIFICATION',
        'Tai khoan da duoc dang ky nhung chua xac thuc. Vui long yeu cau gui lai OTP.',
      );
    }

    if (usernameAccount || employerProfile) {
      this.throwEmployerError(
        HttpStatus.CONFLICT,
        'TAX_CODE_ALREADY_EXISTS',
        'Ma so thue da duoc su dung.',
      );
    }

    if (emailAccount) {
      this.throwEmployerError(
        HttpStatus.CONFLICT,
        'EMAIL_ALREADY_EXISTS',
        'Email da ton tai.',
      );
    }

    if (phoneAccount) {
      this.throwEmployerError(
        HttpStatus.CONFLICT,
        'PHONE_ALREADY_EXISTS',
        'So dien thoai da ton tai.',
      );
    }
  }

  private handlePrismaUniqueError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = this.extractUniqueTarget(error);

      if (target.includes('tenDangNhap') || target.includes('ten_dang_nhap')) {
        throw new ApiError(HttpStatus.CONFLICT, {
          code: 'USERNAME_ALREADY_EXISTS',
          message: 'Ten dang nhap da ton tai.',
        });
      }

      if (target.includes('email')) {
        throw new ApiError(HttpStatus.CONFLICT, {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email da ton tai.',
        });
      }

      if (target.includes('soDienThoai') || target.includes('so_dien_thoai')) {
        throw new ApiError(HttpStatus.CONFLICT, {
          code: 'PHONE_ALREADY_EXISTS',
          message: 'So dien thoai da ton tai.',
        });
      }
    }

    throw error;
  }

  private handleEmployerPrismaUniqueError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = this.extractUniqueTarget(error);

      if (
        target.includes('tenDangNhap') ||
        target.includes('ten_dang_nhap') ||
        target.includes('maSoThue') ||
        target.includes('ma_so_thue')
      ) {
        this.throwEmployerError(
          HttpStatus.CONFLICT,
          'TAX_CODE_ALREADY_EXISTS',
          'Ma so thue da duoc su dung.',
        );
      }

      if (target.includes('email')) {
        this.throwEmployerError(
          HttpStatus.CONFLICT,
          'EMAIL_ALREADY_EXISTS',
          'Email da ton tai.',
        );
      }

      if (target.includes('soDienThoai') || target.includes('so_dien_thoai')) {
        this.throwEmployerError(
          HttpStatus.CONFLICT,
          'PHONE_ALREADY_EXISTS',
          'So dien thoai da ton tai.',
        );
      }
    }

    throw error;
  }

  private async createWorkerAccount(
    dto: RegisterWorkerDto,
    passwordHash: string,
  ): Promise<CreatedRegistration> {
    const otp = this.otpService.generateOtp();
    const registration = await this.authRepository.createWorkerRegistration({
      tenDangNhap: dto.tenDangNhap,
      email: dto.email,
      soDienThoai: dto.soDienThoai,
      matKhauHash: passwordHash,
      hoTen: dto.hoTen,
      buildOtpHash: (accountId) =>
        this.otpService.hashOtp(accountId, REGISTRATION_PURPOSE, otp),
      otpExpiresAt: this.otpService.calculateExpiry(),
    });

    return {
      accountId: registration.account.id,
      email: registration.account.email,
      hoTen: dto.hoTen,
      otp,
      otpId: registration.otp.id,
    };
  }

  private async createEmployerAccount(
    dto: ReturnType<AuthService['normalizeRegisterEmployerDto']>,
    passwordHash: string,
  ): Promise<CreatedEmployerRegistration> {
    const prisma = this.getPrismaService();
    const otp = this.otpService.generateOtp();
    const registration = await prisma.$transaction(
      async (tx) => {
        const account = await tx.taiKhoan.create({
          data: {
            tenDangNhap: dto.tenDangNhap,
            email: dto.email,
            soDienThoai: dto.soDienThoai,
            matKhauHash: passwordHash,
            vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG,
            trangThaiTaiKhoan: TrangThaiTaiKhoan.CHO_XAC_THUC_EMAIL,
            emailXacThucLuc: null,
          },
        });

        const profile = await tx.hoSoNhaTuyenDung.create({
          data: {
            taiKhoanId: account.id,
            tenDonVi: dto.tenDonVi,
            maSoThue: dto.maSoThue,
            diaChiTruSo: dto.diaChiTruSo,
            linhVucId: null,
            nguoiDaiDien: null,
            chucVuNguoiDaiDien: null,
            soDienThoaiLienHe: null,
            emailLienHe: null,
            website: null,
            logoUrl: null,
            moTaDonVi: null,
            tepGiayPhepUrl: null,
            trangThaiDuyet: TrangThaiKiemDuyet.BAN_NHAP,
            lyDoTuChoi: null,
            ngayGuiDuyet: null,
            ngayDuyet: null,
          },
        });

        const otpRecord = await tx.maXacThuc.create({
          data: {
            taiKhoanId: account.id,
            maXacThucHash: this.otpService.hashOtp(
              account.id,
              REGISTRATION_PURPOSE,
              otp,
            ),
            mucDich: REGISTRATION_PURPOSE,
            hanSuDung: this.otpService.calculateExpiry(),
            soLanThu: 0,
            daSuDung: false,
          },
        });

        return {
          account,
          profile,
          otpRecord,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      accountId: registration.account.id,
      email: registration.account.email,
      hoTen: registration.profile.tenDonVi,
      otp,
      otpId: registration.otpRecord.id,
      tenDangNhap: registration.account.tenDangNhap,
      tenDonVi: registration.profile.tenDonVi,
      trangThaiTaiKhoan: registration.account.trangThaiTaiKhoan,
      trangThaiHoSo: registration.profile.trangThaiDuyet,
    };
  }

  private async sendRegistrationOtp(created: CreatedRegistration) {
    try {
      await this.mailService.sendRegistrationOtp({
        email: created.email,
        hoTen: created.hoTen,
        otp: created.otp,
        expiresInMinutes: Math.ceil(this.otpService.getTtlSeconds() / 60),
      });
    } catch {
      await this.authRepository.markOtpAsUsed(created.otpId);
      throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, {
        code: 'VERIFICATION_EMAIL_SEND_FAILED',
        message:
          'Tai khoan da duoc ghi nhan nhung chua the gui email xac thuc. Vui long thu lai chuc nang gui lai OTP.',
      });
    }
  }

  private async sendEmployerRegistrationOtp(
    created: CreatedEmployerRegistration,
  ) {
    const prisma = this.getPrismaService();

    try {
      await this.mailService.sendRegistrationOtp({
        email: created.email,
        hoTen: created.tenDonVi,
        otp: created.otp,
        expiresInMinutes: Math.ceil(this.otpService.getTtlSeconds() / 60),
      });
    } catch {
      await prisma.maXacThuc.update({
        where: { id: created.otpId },
        data: { daSuDung: true },
      });
      throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, {
        code: 'VERIFICATION_EMAIL_SEND_FAILED',
        message:
          'Tai khoan da duoc ghi nhan nhung chua the gui email xac thuc. Vui long thu lai chuc nang gui lai OTP.',
      });
    }
  }

  private findPendingWorkerAccount(email: string) {
    return this.authRepository.findPendingWorkerAccount(normalizeEmail(email));
  }

  private async ensureResendAllowed(accountId: number) {
    const now = new Date();
    const cooldownSeconds = this.otpService.getResendCooldownSeconds();
    const latestOtp =
      await this.authRepository.findLatestRegistrationOtp(accountId);

    if (latestOtp) {
      const secondsSinceLastSend = Math.floor(
        (now.getTime() - latestOtp.ngayTao.getTime()) / 1000,
      );

      if (secondsSinceLastSend < cooldownSeconds) {
        throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
          code: 'OTP_RESEND_COOLDOWN',
          message: 'Vui long cho truoc khi yeu cau ma OTP moi.',
          retryAfter: cooldownSeconds - secondsSinceLastSend,
        });
      }
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sendCount = await this.authRepository.countRegistrationOtpsSince(
      accountId,
      oneHourAgo,
    );

    if (sendCount >= this.otpService.getMaxSendsPerHour()) {
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
        code: 'OTP_RESEND_LIMIT_EXCEEDED',
        message: 'Ban da yeu cau gui OTP qua so lan cho phep trong mot gio.',
      });
    }
  }

  private async ensureEmployerResendAllowed(accountId: number) {
    const prisma = this.getPrismaService();
    const now = new Date();
    const cooldownSeconds = this.otpService.getResendCooldownSeconds();
    const latestOtp = await prisma.maXacThuc.findFirst({
      where: {
        taiKhoanId: accountId,
        mucDich: REGISTRATION_PURPOSE,
      },
      orderBy: {
        ngayTao: 'desc',
      },
    });

    if (latestOtp) {
      const secondsSinceLastSend = Math.floor(
        (now.getTime() - latestOtp.ngayTao.getTime()) / 1000,
      );

      if (secondsSinceLastSend < cooldownSeconds) {
        throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
          code: 'OTP_RESEND_COOLDOWN',
          message: 'Vui long cho truoc khi yeu cau ma OTP moi.',
          retryAfter: cooldownSeconds - secondsSinceLastSend,
        });
      }
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sendCount = await prisma.maXacThuc.count({
      where: {
        taiKhoanId: accountId,
        mucDich: REGISTRATION_PURPOSE,
        ngayTao: {
          gte: oneHourAgo,
        },
      },
    });

    if (sendCount >= this.otpService.getMaxSendsPerHour()) {
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, {
        code: 'OTP_RESEND_LIMIT_EXCEEDED',
        message: 'Ban da yeu cau gui OTP qua so lan cho phep trong mot gio.',
      });
    }
  }

  private throwOtpInvalid(): never {
    throw new ApiError(HttpStatus.BAD_REQUEST, {
      code: 'OTP_INVALID',
      message: 'Ma OTP khong hop le.',
    });
  }

  private extractUniqueTarget(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.join(',');
    }

    return String(target ?? '');
  }

  private getPrismaService(): PrismaService {
    if (!this.prismaService) {
      throw new Error('PrismaService is required for employer registration.');
    }

    return this.prismaService;
  }

  private throwEmployerError(
    status: HttpStatus,
    code: string,
    message: string,
  ): never {
    throw new ApiError(status, {
      success: false,
      code,
      message,
    } as never);
  }

  private throwLoginError(
    status: HttpStatus,
    code: string,
    message: string,
  ): never {
    throw new ApiError(status, {
      success: false,
      code,
      message,
    } as never);
  }
}
