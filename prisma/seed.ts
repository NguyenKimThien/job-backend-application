import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import pg from 'pg';
import {
  GioiTinh,
  HinhThucLamViec,
  LoaiDoiTuongKiemDuyet,
  MucDoKyNang,
  Prisma,
  PrismaClient,
  TrangThaiHienThiTin,
  TrangThaiKiemDuyet,
  TrangThaiTaiKhoan,
  TrangThaiTimViec,
  VaiTroTaiKhoan,
} from '../generated/prisma/client.js';

const { Pool } = pg;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

const databaseUrl = requireEnv('DATABASE_URL');
const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function upsertTaiKhoan(data: {
  tenDangNhap: string;
  email: string;
  soDienThoai?: string;
  matKhauHash: string;
  vaiTro: VaiTroTaiKhoan;
  trangThaiTaiKhoan: TrangThaiTaiKhoan;
  emailXacThucLuc?: Date;
}) {
  return prisma.taiKhoan.upsert({
    where: { email: data.email },
    update: {
      tenDangNhap: data.tenDangNhap,
      soDienThoai: data.soDienThoai,
      matKhauHash: data.matKhauHash,
      vaiTro: data.vaiTro,
      trangThaiTaiKhoan: data.trangThaiTaiKhoan,
      emailXacThucLuc: data.emailXacThucLuc,
    },
    create: data,
  });
}

async function main() {
  const now = new Date();
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const demoPasswordHash = await bcrypt.hash('SeedDemoPassword123!', 12);

  const admin = await upsertTaiKhoan({
    tenDangNhap: 'admin',
    email: adminEmail,
    matKhauHash: adminPasswordHash,
    vaiTro: VaiTroTaiKhoan.QUAN_TRI_VIEN,
    trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
    emailXacThucLuc: now,
  });

  const linhVucs = await Promise.all(
    [
      'Cong nghe thong tin',
      'Giao duc',
      'Thuong mai - dich vu',
      'San xuat',
      'Tai chinh - ke toan',
      'Y te',
      'Du lich - khach san',
      'Xay dung',
      'Bat dong san',
      'Van tai - logistics',
      'Nong nghiep',
      'Truyen thong - giai tri',
      'Hanh chinh - van phong',
      'Phap ly',
      'Co khi - dien tu',
      'Ban le',
      'Lao dong pho thong',
    ].map((tenLinhVuc) =>
      prisma.linhVuc.upsert({
        where: { tenLinhVuc },
        update: { trangThaiHienThi: true },
        create: { tenLinhVuc, trangThaiHienThi: true },
      }),
    ),
  );

  const nganhNghes = await Promise.all(
    [
      'Phat trien phan mem',
      'Kiem thu phan mem',
      'Thiet ke do hoa',
      'Ke toan',
      'Nhan su',
      'Kinh doanh',
      'Marketing',
      'Cham soc khach hang',
    ].map((tenNganhNghe) =>
      prisma.nganhNghe.upsert({
        where: { tenNganhNghe },
        update: { trangThaiHienThi: true },
        create: { tenNganhNghe, trangThaiHienThi: true },
      }),
    ),
  );

  const kyNangs = await Promise.all(
    [
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'NestJS',
      'PostgreSQL',
      'Prisma',
      'Git',
      'Giao tiep',
      'Lam viec nhom',
      'Microsoft Office',
      'Tieng Anh',
    ].map((tenKyNang) =>
      prisma.kyNang.upsert({
        where: { tenKyNang },
        update: { trangThaiHienThi: true },
        create: { tenKyNang, trangThaiHienThi: true },
      }),
    ),
  );

  const nguoiLaoDong = await upsertTaiKhoan({
    tenDangNhap: 'nguyen-van-an',
    email: 'nguoilaodong@example.com',
    soDienThoai: '0901000001',
    matKhauHash: demoPasswordHash,
    vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
    trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
    emailXacThucLuc: now,
  });

  const hoSoNguoiLaoDong = await prisma.hoSoNguoiLaoDong.upsert({
    where: { taiKhoanId: nguoiLaoDong.id },
    update: {
      hoTen: 'Nguyen Van An',
      ngaySinh: new Date('2001-05-12T00:00:00.000Z'),
      gioiTinh: GioiTinh.NAM,
      diaChi: 'Cau Giay, Ha Noi',
      gioiThieuBanThan: 'Lap trinh vien tre yeu thich NestJS va PostgreSQL.',
      mucLuongMongMuonTu: new Prisma.Decimal('12000000'),
      mucLuongMongMuonDen: new Prisma.Decimal('18000000'),
      diaDiemMongMuon: 'Ha Noi',
      tepCvUrl: 'https://example.com/cv/nguyen-van-an.pdf',
      trangThaiTimViec: TrangThaiTimViec.DANG_TIM_VIEC,
    },
    create: {
      taiKhoanId: nguoiLaoDong.id,
      hoTen: 'Nguyen Van An',
      ngaySinh: new Date('2001-05-12T00:00:00.000Z'),
      gioiTinh: GioiTinh.NAM,
      diaChi: 'Cau Giay, Ha Noi',
      gioiThieuBanThan: 'Lap trinh vien tre yeu thich NestJS va PostgreSQL.',
      mucLuongMongMuonTu: new Prisma.Decimal('12000000'),
      mucLuongMongMuonDen: new Prisma.Decimal('18000000'),
      diaDiemMongMuon: 'Ha Noi',
      tepCvUrl: 'https://example.com/cv/nguyen-van-an.pdf',
      trangThaiTimViec: TrangThaiTimViec.DANG_TIM_VIEC,
    },
  });

  await prisma.hocVan.upsert({
    where: { id: 1 },
    update: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      trinhDo: 'Dai hoc',
      tenCoSoDaoTao: 'Dai hoc Cong nghe',
      chuyenNganh: 'Cong nghe thong tin',
      namBatDau: 2019,
      namTotNghiep: 2023,
      dangHoc: false,
      xepLoai: 'Kha',
    },
    create: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      trinhDo: 'Dai hoc',
      tenCoSoDaoTao: 'Dai hoc Cong nghe',
      chuyenNganh: 'Cong nghe thong tin',
      namBatDau: 2019,
      namTotNghiep: 2023,
      dangHoc: false,
      xepLoai: 'Kha',
    },
  });

  await prisma.kinhNghiemLamViec.upsert({
    where: { id: 1 },
    update: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      tenDonVi: 'Cong ty Phan mem Demo',
      viTriCongViec: 'Thuc tap sinh Backend',
      ngayBatDau: new Date('2022-06-01T00:00:00.000Z'),
      ngayKetThuc: new Date('2023-01-31T00:00:00.000Z'),
      dangLamViec: false,
      moTaCongViec: 'Xay dung API voi NestJS va Prisma.',
    },
    create: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      tenDonVi: 'Cong ty Phan mem Demo',
      viTriCongViec: 'Thuc tap sinh Backend',
      ngayBatDau: new Date('2022-06-01T00:00:00.000Z'),
      ngayKetThuc: new Date('2023-01-31T00:00:00.000Z'),
      dangLamViec: false,
      moTaCongViec: 'Xay dung API voi NestJS va Prisma.',
    },
  });

  const kyNangByName = new Map(
    kyNangs.map((kyNang) => [kyNang.tenKyNang, kyNang]),
  );

  for (const [tenKyNang, mucDoThanhThao, soNamKinhNghiem] of [
    ['TypeScript', MucDoKyNang.KHA, '2.0'],
    ['NestJS', MucDoKyNang.TRUNG_BINH, '1.5'],
    ['PostgreSQL', MucDoKyNang.TRUNG_BINH, '1.5'],
    ['Git', MucDoKyNang.KHA, '2.0'],
  ] as const) {
    const kyNang = kyNangByName.get(tenKyNang);

    if (kyNang) {
      await prisma.hoSoKyNang.upsert({
        where: {
          hoSoNguoiLaoDongId_kyNangId: {
            hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
            kyNangId: kyNang.id,
          },
        },
        update: {
          mucDoThanhThao,
          soNamKinhNghiem: new Prisma.Decimal(soNamKinhNghiem),
        },
        create: {
          hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
          kyNangId: kyNang.id,
          mucDoThanhThao,
          soNamKinhNghiem: new Prisma.Decimal(soNamKinhNghiem),
        },
      });
    }
  }

  const nhaTuyenDungAccount = await upsertTaiKhoan({
    tenDangNhap: '0109999001',
    email: 'nhatuyendung@example.com',
    soDienThoai: '0902000002',
    matKhauHash: demoPasswordHash,
    vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG,
    trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
    emailXacThucLuc: now,
  });

  const hoSoNhaTuyenDung = await prisma.hoSoNhaTuyenDung.upsert({
    where: { taiKhoanId: nhaTuyenDungAccount.id },
    update: {
      linhVucId: linhVucs[0].id,
      tenDonVi: 'Cong ty TNHH Cong nghe Tre Ha Noi',
      maSoThue: '0109999001',
      diaChiTruSo: 'Dong Da, Ha Noi',
      nguoiDaiDien: 'Tran Thi Binh',
      chucVuNguoiDaiDien: 'Giam doc',
      soDienThoaiLienHe: '02439990001',
      emailLienHe: 'hr@congnghetre.example.com',
      website: 'https://congnghetre.example.com',
      moTaDonVi:
        'Doanh nghiep cong nghe tap trung vao giai phap viec lam va giao duc.',
      tepGiayPhepUrl: 'https://example.com/licenses/cong-nghe-tre.pdf',
      trangThaiDuyet: TrangThaiKiemDuyet.DA_DUYET,
      lyDoTuChoi: null,
      ngayGuiDuyet: now,
      ngayDuyet: now,
    },
    create: {
      taiKhoanId: nhaTuyenDungAccount.id,
      linhVucId: linhVucs[0].id,
      tenDonVi: 'Cong ty TNHH Cong nghe Tre Ha Noi',
      maSoThue: '0109999001',
      diaChiTruSo: 'Dong Da, Ha Noi',
      nguoiDaiDien: 'Tran Thi Binh',
      chucVuNguoiDaiDien: 'Giam doc',
      soDienThoaiLienHe: '02439990001',
      emailLienHe: 'hr@congnghetre.example.com',
      website: 'https://congnghetre.example.com',
      moTaDonVi:
        'Doanh nghiep cong nghe tap trung vao giai phap viec lam va giao duc.',
      tepGiayPhepUrl: 'https://example.com/licenses/cong-nghe-tre.pdf',
      trangThaiDuyet: TrangThaiKiemDuyet.DA_DUYET,
      ngayGuiDuyet: now,
      ngayDuyet: now,
    },
  });

  await prisma.lichSuKiemDuyet.upsert({
    where: { id: 1 },
    update: {
      nguoiKiemDuyetId: admin.id,
      loaiDoiTuong: LoaiDoiTuongKiemDuyet.NHA_TUYEN_DUNG,
      hoSoNhaTuyenDungId: hoSoNhaTuyenDung.id,
      tinTuyenDungId: null,
      trangThaiTruoc: TrangThaiKiemDuyet.CHO_DUYET,
      trangThaiSau: TrangThaiKiemDuyet.DA_DUYET,
      lyDo: 'Ho so hop le.',
    },
    create: {
      nguoiKiemDuyetId: admin.id,
      loaiDoiTuong: LoaiDoiTuongKiemDuyet.NHA_TUYEN_DUNG,
      hoSoNhaTuyenDungId: hoSoNhaTuyenDung.id,
      trangThaiTruoc: TrangThaiKiemDuyet.CHO_DUYET,
      trangThaiSau: TrangThaiKiemDuyet.DA_DUYET,
      lyDo: 'Ho so hop le.',
    },
  });

  const phatTrienPhanMem = nganhNghes.find(
    (nganhNghe) => nganhNghe.tenNganhNghe === 'Phat trien phan mem',
  );
  const kiemThuPhanMem = nganhNghes.find(
    (nganhNghe) => nganhNghe.tenNganhNghe === 'Kiem thu phan mem',
  );

  if (!phatTrienPhanMem || !kiemThuPhanMem) {
    throw new Error('Missing seeded job categories');
  }

  const tinBackend = await prisma.tinTuyenDung.upsert({
    where: { id: 1 },
    update: {
      nhaTuyenDungId: hoSoNhaTuyenDung.id,
      nganhNgheId: phatTrienPhanMem.id,
      viTriTuyenDung: 'Lap trinh vien Backend NestJS',
      moTaCongViec: 'Phat trien API cho nen tang ket noi viec lam.',
      yeuCauUngVien: 'Nam vung TypeScript, NestJS, PostgreSQL va Git.',
      quyenLoi:
        'Moi truong tre, duoc dao tao va co lo trinh phat trien ro rang.',
      mucLuongTu: new Prisma.Decimal('15000000'),
      mucLuongDen: new Prisma.Decimal('25000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Ha Noi',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 2,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('1.0'),
      trinhDoYeuCau: 'Cao dang tro len',
      thoiHanNhanHoSo: new Date('2027-12-31T23:59:59.000Z'),
      trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      ngayGuiDuyet: now,
      ngayDuyet: now,
      ngayDang: now,
    },
    create: {
      nhaTuyenDungId: hoSoNhaTuyenDung.id,
      nganhNgheId: phatTrienPhanMem.id,
      viTriTuyenDung: 'Lap trinh vien Backend NestJS',
      moTaCongViec: 'Phat trien API cho nen tang ket noi viec lam.',
      yeuCauUngVien: 'Nam vung TypeScript, NestJS, PostgreSQL va Git.',
      quyenLoi:
        'Moi truong tre, duoc dao tao va co lo trinh phat trien ro rang.',
      mucLuongTu: new Prisma.Decimal('15000000'),
      mucLuongDen: new Prisma.Decimal('25000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Ha Noi',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 2,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('1.0'),
      trinhDoYeuCau: 'Cao dang tro len',
      thoiHanNhanHoSo: new Date('2027-12-31T23:59:59.000Z'),
      trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      ngayGuiDuyet: now,
      ngayDuyet: now,
      ngayDang: now,
    },
  });

  const tinTester = await prisma.tinTuyenDung.upsert({
    where: { id: 2 },
    update: {
      nhaTuyenDungId: hoSoNhaTuyenDung.id,
      nganhNgheId: kiemThuPhanMem.id,
      viTriTuyenDung: 'Nhan vien Kiem thu phan mem',
      moTaCongViec: 'Thiet ke test case, kiem thu tinh nang va bao cao loi.',
      yeuCauUngVien:
        'Can than, co tu duy logic va biet su dung cong cu quan ly loi.',
      quyenLoi: 'Duoc dao tao quy trinh kiem thu san pham thuc te.',
      mucLuongTu: new Prisma.Decimal('10000000'),
      mucLuongDen: new Prisma.Decimal('16000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Ha Noi',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 3,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('0.5'),
      trinhDoYeuCau: 'Trung cap tro len',
      thoiHanNhanHoSo: new Date('2027-12-31T23:59:59.000Z'),
      trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      ngayGuiDuyet: now,
      ngayDuyet: now,
      ngayDang: now,
    },
    create: {
      nhaTuyenDungId: hoSoNhaTuyenDung.id,
      nganhNgheId: kiemThuPhanMem.id,
      viTriTuyenDung: 'Nhan vien Kiem thu phan mem',
      moTaCongViec: 'Thiet ke test case, kiem thu tinh nang va bao cao loi.',
      yeuCauUngVien:
        'Can than, co tu duy logic va biet su dung cong cu quan ly loi.',
      quyenLoi: 'Duoc dao tao quy trinh kiem thu san pham thuc te.',
      mucLuongTu: new Prisma.Decimal('10000000'),
      mucLuongDen: new Prisma.Decimal('16000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Ha Noi',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 3,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('0.5'),
      trinhDoYeuCau: 'Trung cap tro len',
      thoiHanNhanHoSo: new Date('2027-12-31T23:59:59.000Z'),
      trangThaiKiemDuyet: TrangThaiKiemDuyet.DA_DUYET,
      trangThaiHienThi: TrangThaiHienThiTin.DANG_HIEN_THI,
      ngayGuiDuyet: now,
      ngayDuyet: now,
      ngayDang: now,
    },
  });

  const tinKyNangMap: Array<{
    tinTuyenDungId: number;
    tenKyNang: string;
    mucDoYeuCau: MucDoKyNang;
    batBuoc: boolean;
  }> = [
    {
      tinTuyenDungId: tinBackend.id,
      tenKyNang: 'TypeScript',
      mucDoYeuCau: MucDoKyNang.KHA,
      batBuoc: true,
    },
    {
      tinTuyenDungId: tinBackend.id,
      tenKyNang: 'NestJS',
      mucDoYeuCau: MucDoKyNang.KHA,
      batBuoc: true,
    },
    {
      tinTuyenDungId: tinBackend.id,
      tenKyNang: 'PostgreSQL',
      mucDoYeuCau: MucDoKyNang.TRUNG_BINH,
      batBuoc: true,
    },
    {
      tinTuyenDungId: tinBackend.id,
      tenKyNang: 'Prisma',
      mucDoYeuCau: MucDoKyNang.TRUNG_BINH,
      batBuoc: false,
    },
    {
      tinTuyenDungId: tinTester.id,
      tenKyNang: 'Git',
      mucDoYeuCau: MucDoKyNang.CO_BAN,
      batBuoc: true,
    },
    {
      tinTuyenDungId: tinTester.id,
      tenKyNang: 'Giao tiep',
      mucDoYeuCau: MucDoKyNang.KHA,
      batBuoc: false,
    },
    {
      tinTuyenDungId: tinTester.id,
      tenKyNang: 'Lam viec nhom',
      mucDoYeuCau: MucDoKyNang.KHA,
      batBuoc: true,
    },
  ];

  for (const item of tinKyNangMap) {
    const kyNang = kyNangByName.get(item.tenKyNang);

    if (kyNang) {
      await prisma.tinTuyenDungKyNang.upsert({
        where: {
          tinTuyenDungId_kyNangId: {
            tinTuyenDungId: item.tinTuyenDungId,
            kyNangId: kyNang.id,
          },
        },
        update: {
          mucDoYeuCau: item.mucDoYeuCau,
          batBuoc: item.batBuoc,
        },
        create: {
          tinTuyenDungId: item.tinTuyenDungId,
          kyNangId: kyNang.id,
          mucDoYeuCau: item.mucDoYeuCau,
          batBuoc: item.batBuoc,
        },
      });
    }
  }
}

main()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
