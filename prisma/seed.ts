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

async function upsertLinhVuc(tenLinhVuc: string, legacyNames: string[] = []) {
  const existing =
    (await prisma.linhVuc.findUnique({ where: { tenLinhVuc } })) ??
    (await prisma.linhVuc.findFirst({
      where: { tenLinhVuc: { in: legacyNames } },
    }));

  if (existing) {
    return prisma.linhVuc.update({
      where: { id: existing.id },
      data: { tenLinhVuc, trangThaiHienThi: true },
    });
  }

  return prisma.linhVuc.create({
    data: { tenLinhVuc, trangThaiHienThi: true },
  });
}

async function upsertNganhNghe(
  tenNganhNghe: string,
  legacyNames: string[] = [],
) {
  const existing =
    (await prisma.nganhNghe.findUnique({ where: { tenNganhNghe } })) ??
    (await prisma.nganhNghe.findFirst({
      where: { tenNganhNghe: { in: legacyNames } },
    }));

  if (existing) {
    return prisma.nganhNghe.update({
      where: { id: existing.id },
      data: { tenNganhNghe, trangThaiHienThi: true },
    });
  }

  return prisma.nganhNghe.create({
    data: { tenNganhNghe, trangThaiHienThi: true },
  });
}

async function upsertKyNang(tenKyNang: string, legacyNames: string[] = []) {
  const existing =
    (await prisma.kyNang.findUnique({ where: { tenKyNang } })) ??
    (await prisma.kyNang.findFirst({
      where: { tenKyNang: { in: legacyNames } },
    }));

  if (existing) {
    return prisma.kyNang.update({
      where: { id: existing.id },
      data: { tenKyNang, trangThaiHienThi: true },
    });
  }

  return prisma.kyNang.create({
    data: { tenKyNang, trangThaiHienThi: true },
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
      ['Công nghệ thông tin', 'Cong nghe thong tin'],
      ['Giáo dục', 'Giao duc'],
      ['Thương mại - dịch vụ', 'Thuong mai - dich vu'],
      ['Sản xuất', 'San xuat'],
      ['Tài chính - kế toán', 'Tai chinh - ke toan'],
      ['Y tế', 'Y te'],
      ['Du lịch - khách sạn', 'Du lich - khach san'],
      ['Xây dựng', 'Xay dung'],
      ['Bất động sản', 'Bat dong san'],
      ['Vận tải - logistics', 'Van tai - logistics'],
      ['Nông nghiệp', 'Nong nghiep'],
      ['Truyền thông - giải trí', 'Truyen thong - giai tri'],
      ['Hành chính - văn phòng', 'Hanh chinh - van phong'],
      ['Pháp lý', 'Phap ly'],
      ['Cơ khí - điện tử', 'Co khi - dien tu'],
      ['Bán lẻ', 'Ban le'],
      ['Lao động phổ thông', 'Lao dong pho thong'],
    ].map(([tenLinhVuc, legacyName]) =>
      upsertLinhVuc(tenLinhVuc, [legacyName]),
    ),
  );

  const nganhNghes = await Promise.all(
    [
      ['Phát triển phần mềm', 'Phat trien phan mem'],
      ['Kiểm thử phần mềm', 'Kiem thu phan mem'],
      ['Thiết kế đồ họa', 'Thiet ke do hoa'],
      ['Kế toán', 'Ke toan'],
      ['Nhân sự', 'Nhan su'],
      ['Kinh doanh', 'Kinh doanh'],
      ['Marketing', 'Marketing'],
      ['Chăm sóc khách hàng', 'Cham soc khach hang'],
    ].map(([tenNganhNghe, legacyName]) =>
      upsertNganhNghe(tenNganhNghe, [legacyName]),
    ),
  );

  const kyNangs = await Promise.all(
    [
      ['JavaScript'],
      ['TypeScript'],
      ['React'],
      ['Next.js'],
      ['NestJS'],
      ['PostgreSQL'],
      ['Prisma'],
      ['Git'],
      ['Giao tiếp', 'Giao tiep'],
      ['Làm việc nhóm', 'Lam viec nhom'],
      ['Microsoft Office'],
      ['Tiếng Anh', 'Tieng Anh'],
    ].map(([tenKyNang, legacyName]) =>
      upsertKyNang(tenKyNang, legacyName ? [legacyName] : []),
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
      hoTen: 'Nguyễn Văn An',
      ngaySinh: new Date('2001-05-12T00:00:00.000Z'),
      gioiTinh: GioiTinh.NAM,
      diaChi: 'Cầu Giấy, Hà Nội',
      gioiThieuBanThan: 'Lập trình viên trẻ yêu thích NestJS và PostgreSQL.',
      mucLuongMongMuonTu: new Prisma.Decimal('12000000'),
      mucLuongMongMuonDen: new Prisma.Decimal('18000000'),
      diaDiemMongMuon: 'Hà Nội',
      tepCvUrl: 'https://example.com/cv/nguyen-van-an.pdf',
      trangThaiTimViec: TrangThaiTimViec.DANG_TIM_VIEC,
    },
    create: {
      taiKhoanId: nguoiLaoDong.id,
      hoTen: 'Nguyễn Văn An',
      ngaySinh: new Date('2001-05-12T00:00:00.000Z'),
      gioiTinh: GioiTinh.NAM,
      diaChi: 'Cầu Giấy, Hà Nội',
      gioiThieuBanThan: 'Lập trình viên trẻ yêu thích NestJS và PostgreSQL.',
      mucLuongMongMuonTu: new Prisma.Decimal('12000000'),
      mucLuongMongMuonDen: new Prisma.Decimal('18000000'),
      diaDiemMongMuon: 'Hà Nội',
      tepCvUrl: 'https://example.com/cv/nguyen-van-an.pdf',
      trangThaiTimViec: TrangThaiTimViec.DANG_TIM_VIEC,
    },
  });

  await prisma.hocVan.upsert({
    where: { id: 1 },
    update: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      trinhDo: 'Đại học',
      tenCoSoDaoTao: 'Đại học Công nghệ',
      chuyenNganh: 'Công nghệ thông tin',
      namBatDau: 2019,
      namTotNghiep: 2023,
      dangHoc: false,
      xepLoai: 'Khá',
    },
    create: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      trinhDo: 'Đại học',
      tenCoSoDaoTao: 'Đại học Công nghệ',
      chuyenNganh: 'Công nghệ thông tin',
      namBatDau: 2019,
      namTotNghiep: 2023,
      dangHoc: false,
      xepLoai: 'Khá',
    },
  });

  await prisma.kinhNghiemLamViec.upsert({
    where: { id: 1 },
    update: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      tenDonVi: 'Công ty Phần mềm Demo',
      viTriCongViec: 'Thực tập sinh Backend',
      ngayBatDau: new Date('2022-06-01T00:00:00.000Z'),
      ngayKetThuc: new Date('2023-01-31T00:00:00.000Z'),
      dangLamViec: false,
      moTaCongViec: 'Xây dựng API với NestJS và Prisma.',
    },
    create: {
      hoSoNguoiLaoDongId: hoSoNguoiLaoDong.id,
      tenDonVi: 'Công ty Phần mềm Demo',
      viTriCongViec: 'Thực tập sinh Backend',
      ngayBatDau: new Date('2022-06-01T00:00:00.000Z'),
      ngayKetThuc: new Date('2023-01-31T00:00:00.000Z'),
      dangLamViec: false,
      moTaCongViec: 'Xây dựng API với NestJS và Prisma.',
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
      tenDonVi: 'Công ty TNHH Công nghệ Trẻ Hà Nội',
      maSoThue: '0109999001',
      diaChiTruSo: 'Đống Đa, Hà Nội',
      nguoiDaiDien: 'Trần Thị Bình',
      chucVuNguoiDaiDien: 'Giám đốc',
      soDienThoaiLienHe: '02439990001',
      emailLienHe: 'hr@congnghetre.example.com',
      website: 'https://congnghetre.example.com',
      moTaDonVi:
        'Doanh nghiệp công nghệ tập trung vào giải pháp việc làm và giáo dục.',
      tepGiayPhepUrl: 'https://example.com/licenses/cong-nghe-tre.pdf',
      trangThaiDuyet: TrangThaiKiemDuyet.DA_DUYET,
      lyDoTuChoi: null,
      ngayGuiDuyet: now,
      ngayDuyet: now,
    },
    create: {
      taiKhoanId: nhaTuyenDungAccount.id,
      linhVucId: linhVucs[0].id,
      tenDonVi: 'Công ty TNHH Công nghệ Trẻ Hà Nội',
      maSoThue: '0109999001',
      diaChiTruSo: 'Đống Đa, Hà Nội',
      nguoiDaiDien: 'Trần Thị Bình',
      chucVuNguoiDaiDien: 'Giám đốc',
      soDienThoaiLienHe: '02439990001',
      emailLienHe: 'hr@congnghetre.example.com',
      website: 'https://congnghetre.example.com',
      moTaDonVi:
        'Doanh nghiệp công nghệ tập trung vào giải pháp việc làm và giáo dục.',
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
      lyDo: 'Hồ sơ hợp lệ.',
    },
    create: {
      nguoiKiemDuyetId: admin.id,
      loaiDoiTuong: LoaiDoiTuongKiemDuyet.NHA_TUYEN_DUNG,
      hoSoNhaTuyenDungId: hoSoNhaTuyenDung.id,
      trangThaiTruoc: TrangThaiKiemDuyet.CHO_DUYET,
      trangThaiSau: TrangThaiKiemDuyet.DA_DUYET,
      lyDo: 'Hồ sơ hợp lệ.',
    },
  });

  const phatTrienPhanMem = nganhNghes.find(
    (nganhNghe) => nganhNghe.tenNganhNghe === 'Phát triển phần mềm',
  );
  const kiemThuPhanMem = nganhNghes.find(
    (nganhNghe) => nganhNghe.tenNganhNghe === 'Kiểm thử phần mềm',
  );

  if (!phatTrienPhanMem || !kiemThuPhanMem) {
    throw new Error('Missing seeded job categories');
  }

  const tinBackend = await prisma.tinTuyenDung.upsert({
    where: { id: 1 },
    update: {
      nhaTuyenDungId: hoSoNhaTuyenDung.id,
      nganhNgheId: phatTrienPhanMem.id,
      viTriTuyenDung: 'Lập trình viên Backend NestJS',
      moTaCongViec: 'Phát triển API cho nền tảng kết nối việc làm.',
      yeuCauUngVien: 'Nắm vững TypeScript, NestJS, PostgreSQL và Git.',
      quyenLoi:
        'Môi trường trẻ, được đào tạo và có lộ trình phát triển rõ ràng.',
      mucLuongTu: new Prisma.Decimal('15000000'),
      mucLuongDen: new Prisma.Decimal('25000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Hà Nội',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 2,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('1.0'),
      trinhDoYeuCau: 'Cao đẳng trở lên',
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
      viTriTuyenDung: 'Lập trình viên Backend NestJS',
      moTaCongViec: 'Phát triển API cho nền tảng kết nối việc làm.',
      yeuCauUngVien: 'Nắm vững TypeScript, NestJS, PostgreSQL và Git.',
      quyenLoi:
        'Môi trường trẻ, được đào tạo và có lộ trình phát triển rõ ràng.',
      mucLuongTu: new Prisma.Decimal('15000000'),
      mucLuongDen: new Prisma.Decimal('25000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Hà Nội',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 2,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('1.0'),
      trinhDoYeuCau: 'Cao đẳng trở lên',
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
      viTriTuyenDung: 'Nhân viên Kiểm thử phần mềm',
      moTaCongViec: 'Thiết kế test case, kiểm thử tính năng và báo cáo lỗi.',
      yeuCauUngVien:
        'Cẩn thận, có tư duy logic và biết sử dụng công cụ quản lý lỗi.',
      quyenLoi: 'Được đào tạo quy trình kiểm thử sản phẩm thực tế.',
      mucLuongTu: new Prisma.Decimal('10000000'),
      mucLuongDen: new Prisma.Decimal('16000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Hà Nội',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 3,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('0.5'),
      trinhDoYeuCau: 'Trung cấp trở lên',
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
      viTriTuyenDung: 'Nhân viên Kiểm thử phần mềm',
      moTaCongViec: 'Thiết kế test case, kiểm thử tính năng và báo cáo lỗi.',
      yeuCauUngVien:
        'Cẩn thận, có tư duy logic và biết sử dụng công cụ quản lý lỗi.',
      quyenLoi: 'Được đào tạo quy trình kiểm thử sản phẩm thực tế.',
      mucLuongTu: new Prisma.Decimal('10000000'),
      mucLuongDen: new Prisma.Decimal('16000000'),
      coTheThoaThuan: false,
      diaDiemLamViec: 'Hà Nội',
      hinhThucLamViec: HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 3,
      soNamKinhNghiemToiThieu: new Prisma.Decimal('0.5'),
      trinhDoYeuCau: 'Trung cấp trở lên',
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
      tenKyNang: 'Giao tiếp',
      mucDoYeuCau: MucDoKyNang.KHA,
      batBuoc: false,
    },
    {
      tinTuyenDungId: tinTester.id,
      tenKyNang: 'Làm việc nhóm',
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
