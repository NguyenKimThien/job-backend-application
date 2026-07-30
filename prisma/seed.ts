import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import pg from 'pg';
import {
  GioiTinh,
  HinhThucLamViec,
  HinhThucPhongVan,
  LoaiThongBao,
  LoaiDoiTuongKiemDuyet,
  MucDoKyNang,
  Prisma,
  PrismaClient,
  TrangThaiHienThiTin,
  TrangThaiKiemDuyet,
  TrangThaiTaiKhoan,
  TrangThaiTimViec,
  TrangThaiUngTuyen,
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

function addDays(base: Date, days: number, hour = 9, minute = 0) {
  const value = new Date(base);
  value.setDate(value.getDate() + days);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function decimal(value: number | string) {
  return new Prisma.Decimal(String(value));
}

function phone(prefix: string, index: number) {
  return `${prefix}${String(index).padStart(4, '0')}`;
}

async function replaceProfileDetails(
  profileId: number,
  data: {
    education: {
      chuyenNganh: string;
      tenCoSoDaoTao: string;
      trinhDo: string;
      xepLoai: string;
    };
    experience: {
      moTaCongViec: string;
      tenDonVi: string;
      viTriCongViec: string;
    };
    skills: Array<{
      kyNangId: number;
      mucDoThanhThao: MucDoKyNang;
      soNamKinhNghiem: string;
    }>;
  },
) {
  await prisma.hocVan.deleteMany({
    where: { hoSoNguoiLaoDongId: profileId },
  });
  await prisma.kinhNghiemLamViec.deleteMany({
    where: { hoSoNguoiLaoDongId: profileId },
  });
  await prisma.hoSoKyNang.deleteMany({
    where: { hoSoNguoiLaoDongId: profileId },
  });

  await prisma.hocVan.create({
    data: {
      hoSoNguoiLaoDongId: profileId,
      trinhDo: data.education.trinhDo,
      tenCoSoDaoTao: data.education.tenCoSoDaoTao,
      chuyenNganh: data.education.chuyenNganh,
      namBatDau: 2018,
      namTotNghiep: 2022,
      dangHoc: false,
      xepLoai: data.education.xepLoai,
    },
  });

  await prisma.kinhNghiemLamViec.create({
    data: {
      hoSoNguoiLaoDongId: profileId,
      tenDonVi: data.experience.tenDonVi,
      viTriCongViec: data.experience.viTriCongViec,
      ngayBatDau: new Date('2022-03-01T00:00:00.000Z'),
      ngayKetThuc: null,
      dangLamViec: true,
      moTaCongViec: data.experience.moTaCongViec,
    },
  });

  await prisma.hoSoKyNang.createMany({
    data: data.skills.map((skill) => ({
      hoSoNguoiLaoDongId: profileId,
      kyNangId: skill.kyNangId,
      mucDoThanhThao: skill.mucDoThanhThao,
      soNamKinhNghiem: decimal(skill.soNamKinhNghiem),
    })),
  });
}

async function upsertJobByTitle(data: Prisma.TinTuyenDungUncheckedCreateInput) {
  const existing = await prisma.tinTuyenDung.findFirst({
    where: {
      nhaTuyenDungId: Number(data.nhaTuyenDungId),
      viTriTuyenDung: String(data.viTriTuyenDung),
    },
  });

  if (existing) {
    return prisma.tinTuyenDung.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.tinTuyenDung.create({ data });
}

async function replaceJobSkills(
  tinTuyenDungId: number,
  skills: Array<{
    kyNangId: number;
    mucDoYeuCau: MucDoKyNang;
    batBuoc: boolean;
  }>,
) {
  await prisma.tinTuyenDungKyNang.deleteMany({ where: { tinTuyenDungId } });
  await prisma.tinTuyenDungKyNang.createMany({
    data: skills.map((skill) => ({
      tinTuyenDungId,
      kyNangId: skill.kyNangId,
      mucDoYeuCau: skill.mucDoYeuCau,
      batBuoc: skill.batBuoc,
    })),
  });
}

function applicationHistory(status: TrangThaiUngTuyen): Array<{
  trangThaiTruoc: TrangThaiUngTuyen | null;
  trangThaiSau: TrangThaiUngTuyen;
  ghiChu: string;
}> {
  const history: Array<{
    trangThaiTruoc: TrangThaiUngTuyen | null;
    trangThaiSau: TrangThaiUngTuyen;
    ghiChu: string;
  }> = [
    {
      trangThaiTruoc: null,
      trangThaiSau: TrangThaiUngTuyen.DA_NOP,
      ghiChu: '[Seed] Ứng viên đã nộp hồ sơ qua cổng việc làm.',
    },
  ];
  if (status === TrangThaiUngTuyen.DA_NOP) return history;

  history.push({
    trangThaiTruoc: TrangThaiUngTuyen.DA_NOP,
    trangThaiSau: TrangThaiUngTuyen.DA_XEM,
    ghiChu: '[Seed] Nhà tuyển dụng đã xem hồ sơ.',
  });
  if (status === TrangThaiUngTuyen.DA_XEM) return history;

  history.push({
    trangThaiTruoc: TrangThaiUngTuyen.DA_XEM,
    trangThaiSau: TrangThaiUngTuyen.DUOC_CHON_SO_BO,
    ghiChu: '[Seed] Hồ sơ phù hợp với vòng sàng lọc ban đầu.',
  });
  if (status === TrangThaiUngTuyen.DUOC_CHON_SO_BO) return history;

  history.push({
    trangThaiTruoc: TrangThaiUngTuyen.DUOC_CHON_SO_BO,
    trangThaiSau:
      status === TrangThaiUngTuyen.KHONG_PHU_HOP
        ? TrangThaiUngTuyen.KHONG_PHU_HOP
        : TrangThaiUngTuyen.MOI_PHONG_VAN,
    ghiChu:
      status === TrangThaiUngTuyen.KHONG_PHU_HOP
        ? '[Seed] Hồ sơ chưa phù hợp với yêu cầu tuyển dụng hiện tại.'
        : '[Seed] Ứng viên được mời tham gia phỏng vấn.',
  });
  if (
    status === TrangThaiUngTuyen.KHONG_PHU_HOP ||
    status === TrangThaiUngTuyen.MOI_PHONG_VAN
  ) {
    return history;
  }

  history.push({
    trangThaiTruoc: TrangThaiUngTuyen.MOI_PHONG_VAN,
    trangThaiSau:
      status === TrangThaiUngTuyen.TRUNG_TUYEN
        ? TrangThaiUngTuyen.TRUNG_TUYEN
        : TrangThaiUngTuyen.DA_PHONG_VAN,
    ghiChu:
      status === TrangThaiUngTuyen.TRUNG_TUYEN
        ? '[Seed] Ứng viên đã vượt qua các vòng đánh giá.'
        : '[Seed] Ứng viên đã hoàn thành buổi phỏng vấn.',
  });

  return history;
}

async function seedExpandedDemoData({
  adminId,
  demoPasswordHash,
  now,
}: {
  adminId: number;
  demoPasswordHash: string;
  now: Date;
}) {
  const extraFields = await Promise.all(
    [
      'Công nghệ thông tin',
      'Tài chính - kế toán',
      'Thương mại điện tử',
      'Sản xuất công nghiệp',
      'Giáo dục - đào tạo',
      'Logistics và chuỗi cung ứng',
      'Y tế - chăm sóc sức khỏe',
      'Bất động sản',
    ].map((name) => upsertLinhVuc(name)),
  );
  const extraCategories = await Promise.all(
    [
      'Phát triển phần mềm',
      'Kiểm thử phần mềm',
      'Thiết kế UI/UX',
      'Phân tích dữ liệu',
      'Kế toán - kiểm toán',
      'Nhân sự - tuyển dụng',
      'Kinh doanh B2B',
      'Marketing số',
      'Chăm sóc khách hàng',
      'Vận hành kho vận',
      'Giáo viên - đào tạo',
      'Điều dưỡng - chăm sóc',
    ].map((name) => upsertNganhNghe(name)),
  );
  const categoryByName = new Map(
    extraCategories.map((category) => [category.tenNganhNghe, category]),
  );

  const extraSkills = await Promise.all(
    [
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'NestJS',
      'PostgreSQL',
      'Prisma',
      'Git',
      'Node.js',
      'Java',
      'Python',
      'Figma',
      'SQL',
      'Excel',
      'Power BI',
      'SEO',
      'Content Marketing',
      'Chăm sóc khách hàng',
      'Tư vấn khách hàng',
      'Tuyển dụng',
      'Quản lý kho',
      'Tiếng Anh',
      'Giao tiếp',
      'Làm việc nhóm',
    ].map((name) => upsertKyNang(name)),
  );
  const skillByName = new Map(
    extraSkills.map((skill) => [skill.tenKyNang, skill]),
  );
  const requiredSkill = (name: string) => {
    const skill = skillByName.get(name);
    if (!skill) throw new Error(`Missing seeded skill ${name}`);
    return skill;
  };
  const requiredCategory = (name: string) => {
    const category = categoryByName.get(name);
    if (!category) throw new Error(`Missing seeded category ${name}`);
    return category;
  };

  const workerNames = [
    ['Phạm Minh Anh', 'Frontend Developer', 'Nam Từ Liêm, Hà Nội'],
    ['Trần Hoàng Long', 'Backend Developer', 'Cầu Giấy, Hà Nội'],
    ['Đặng Thu Hà', 'UI/UX Designer', 'Hai Bà Trưng, Hà Nội'],
    ['Lê Quốc Việt', 'Data Analyst', 'Thanh Xuân, Hà Nội'],
    ['Nguyễn Mai Phương', 'Kế toán tổng hợp', 'Hoàng Mai, Hà Nội'],
    ['Vũ Đức Nam', 'Nhân viên kinh doanh B2B', 'Đống Đa, Hà Nội'],
    ['Bùi Thảo Linh', 'Chuyên viên tuyển dụng', 'Ba Đình, Hà Nội'],
    ['Đỗ Hải Yến', 'Digital Marketing Executive', 'Long Biên, Hà Nội'],
    ['Hoàng Gia Bảo', 'Nhân viên vận hành kho', 'Gia Lâm, Hà Nội'],
    ['Mai Khánh Chi', 'Chăm sóc khách hàng', 'Hà Đông, Hà Nội'],
  ] as const;

  const workerAccounts: Array<Awaited<ReturnType<typeof upsertTaiKhoan>>> = [];
  const workerProfiles: Array<{
    account: Awaited<ReturnType<typeof upsertTaiKhoan>>;
    profile: Prisma.HoSoNguoiLaoDongGetPayload<object>;
  }> = [];
  for (let index = 1; index <= 20; index += 1) {
    const account = await upsertTaiKhoan({
      tenDangNhap: `seed-worker-${String(index).padStart(2, '0')}`,
      email: `seed.worker${String(index).padStart(2, '0')}@example.com`,
      soDienThoai: phone('091100', index),
      matKhauHash: demoPasswordHash,
      vaiTro: VaiTroTaiKhoan.NGUOI_LAO_DONG,
      trangThaiTaiKhoan: TrangThaiTaiKhoan.HOAT_DONG,
      emailXacThucLuc: now,
    });
    workerAccounts.push(account);

    if (index > 10) continue;

    const [hoTen, targetRole, address] = workerNames[index - 1];
    const profile = await prisma.hoSoNguoiLaoDong.upsert({
      where: { taiKhoanId: account.id },
      update: {
        hoTen,
        ngaySinh: new Date(
          `${1995 + index}-0${(index % 9) + 1}-15T00:00:00.000Z`,
        ),
        gioiTinh: index % 3 === 0 ? GioiTinh.NU : GioiTinh.NAM,
        diaChi: address,
        gioiThieuBanThan: `Tôi có kinh nghiệm thực tế ở vị trí ${targetRole}, quen làm việc theo mục tiêu, chủ động phối hợp với các bộ phận liên quan và mong muốn tìm môi trường ổn định tại Hà Nội.`,
        mucLuongMongMuonTu: decimal(9000000 + index * 1000000),
        mucLuongMongMuonDen: decimal(14000000 + index * 1200000),
        diaDiemMongMuon: 'Hà Nội',
        tepCvUrl: `https://example.com/cv/seed-worker-${String(index).padStart(2, '0')}.pdf`,
        tenFileCv: `CV-${hoTen.replace(/\s+/g, '-')}.pdf`,
        loaiFileCv: 'application/pdf',
        kichThuocCv: 860000 + index * 15000,
        ngayTaiCv: addDays(now, -index * 2, 8),
        trangThaiTimViec:
          index % 4 === 0
            ? TrangThaiTimViec.TAM_DUNG_TIM_VIEC
            : TrangThaiTimViec.DANG_TIM_VIEC,
      },
      create: {
        taiKhoanId: account.id,
        hoTen,
        ngaySinh: new Date(
          `${1995 + index}-0${(index % 9) + 1}-15T00:00:00.000Z`,
        ),
        gioiTinh: index % 3 === 0 ? GioiTinh.NU : GioiTinh.NAM,
        diaChi: address,
        gioiThieuBanThan: `Tôi có kinh nghiệm thực tế ở vị trí ${targetRole}, quen làm việc theo mục tiêu, chủ động phối hợp với các bộ phận liên quan và mong muốn tìm môi trường ổn định tại Hà Nội.`,
        mucLuongMongMuonTu: decimal(9000000 + index * 1000000),
        mucLuongMongMuonDen: decimal(14000000 + index * 1200000),
        diaDiemMongMuon: 'Hà Nội',
        tepCvUrl: `https://example.com/cv/seed-worker-${String(index).padStart(2, '0')}.pdf`,
        tenFileCv: `CV-${hoTen.replace(/\s+/g, '-')}.pdf`,
        loaiFileCv: 'application/pdf',
        kichThuocCv: 860000 + index * 15000,
        ngayTaiCv: addDays(now, -index * 2, 8),
        trangThaiTimViec:
          index % 4 === 0
            ? TrangThaiTimViec.TAM_DUNG_TIM_VIEC
            : TrangThaiTimViec.DANG_TIM_VIEC,
      },
    });

    const skillSets = [
      ['React', 'Next.js', 'TypeScript'],
      ['NestJS', 'PostgreSQL', 'Prisma'],
      ['Figma', 'React', 'Giao tiếp'],
      ['SQL', 'Python', 'Power BI'],
      ['Excel', 'SQL', 'Giao tiếp'],
      ['Tư vấn khách hàng', 'Giao tiếp', 'Tiếng Anh'],
      ['Tuyển dụng', 'Excel', 'Giao tiếp'],
      ['SEO', 'Content Marketing', 'Figma'],
      ['Quản lý kho', 'Excel', 'Làm việc nhóm'],
      ['Chăm sóc khách hàng', 'Giao tiếp', 'Tiếng Anh'],
    ];

    await replaceProfileDetails(profile.id, {
      education: {
        trinhDo: index <= 4 ? 'Đại học' : 'Cao đẳng',
        tenCoSoDaoTao:
          index <= 4
            ? 'Trường Đại học Công nghệ - Đại học Quốc gia Hà Nội'
            : 'Trường Cao đẳng Nghề Công nghiệp Hà Nội',
        chuyenNganh: targetRole,
        xepLoai: index % 2 === 0 ? 'Khá' : 'Giỏi',
      },
      experience: {
        tenDonVi:
          index <= 5
            ? 'Công ty Cổ phần Dịch vụ Số Hà Nội'
            : 'Công ty TNHH Thương mại An Phát',
        viTriCongViec: targetRole,
        moTaCongViec: `Phụ trách các đầu việc chính của vị trí ${targetRole}, phối hợp với nhóm vận hành để hoàn thành kế hoạch tháng và báo cáo kết quả theo chỉ số đã thống nhất.`,
      },
      skills: skillSets[index - 1].map((name, skillIndex) => ({
        kyNangId: requiredSkill(name).id,
        mucDoThanhThao:
          skillIndex === 0 ? MucDoKyNang.KHA : MucDoKyNang.TRUNG_BINH,
        soNamKinhNghiem: String(1 + skillIndex + index / 10),
      })),
    });
    workerProfiles.push({ account, profile });
  }

  const employerGroups = [
    {
      count: 5,
      label: 'approved',
      accountStatus: TrangThaiTaiKhoan.HOAT_DONG,
      profileStatus: TrangThaiKiemDuyet.DA_DUYET,
      reason: null,
    },
    {
      count: 5,
      label: 'rejected-editable',
      accountStatus: TrangThaiTaiKhoan.HOAT_DONG,
      profileStatus: TrangThaiKiemDuyet.TU_CHOI,
      reason:
        'Thông tin giấy phép kinh doanh cần bổ sung bản scan rõ nét và thống nhất với mã số thuế đã đăng ký.',
    },
    {
      count: 5,
      label: 'rejected-locked',
      accountStatus: TrangThaiTaiKhoan.DA_KHOA,
      profileStatus: TrangThaiKiemDuyet.TU_CHOI,
      reason:
        'Hồ sơ bị từ chối do thông tin pháp lý không xác minh được sau nhiều lần đối soát.',
    },
    {
      count: 5,
      label: 'pending',
      accountStatus: TrangThaiTaiKhoan.HOAT_DONG,
      profileStatus: TrangThaiKiemDuyet.CHO_DUYET,
      reason: null,
    },
  ] as const;

  const companyNames = [
    'Công ty Cổ phần Nền tảng Số Sao Bắc',
    'Công ty TNHH Giải pháp Phần mềm An Khang',
    'Công ty Cổ phần Thương mại Điện tử Hồng Hà',
    'Công ty TNHH Dịch vụ Nhân sự Minh Tâm',
    'Công ty Cổ phần Logistics Đông Đô',
    'Công ty TNHH Nội thất và Xây dựng Việt Gia',
    'Công ty Cổ phần Đào tạo Kỹ năng Mở',
    'Công ty TNHH Y tế Cộng đồng Hà Thành',
    'Công ty Cổ phần Bất động sản Thành An',
    'Công ty TNHH Kiểm toán và Tư vấn Bắc Việt',
    'Công ty Cổ phần Sản xuất Cơ khí Ánh Dương',
    'Công ty TNHH Thực phẩm Sạch GreenMart',
    'Công ty Cổ phần Truyền thông Mặt Trời',
    'Công ty TNHH Chăm sóc Khách hàng LinkCare',
    'Công ty Cổ phần Giáo dục Ngôn ngữ Việt Anh',
    'Công ty TNHH Công nghệ Tài chính BlueLedger',
    'Công ty Cổ phần Dịch vụ Kho vận Mekong',
    'Công ty TNHH Phân phối Thiết bị Sao Việt',
    'Công ty Cổ phần Nông nghiệp Công nghệ Xanh',
    'Công ty TNHH Du lịch Trải nghiệm Thủ đô',
  ];
  const employerProfiles: Array<{
    account: Awaited<ReturnType<typeof upsertTaiKhoan>>;
    group: string;
    profile: Prisma.HoSoNhaTuyenDungGetPayload<object>;
  }> = [];
  let employerIndex = 0;

  for (const group of employerGroups) {
    for (let offset = 1; offset <= group.count; offset += 1) {
      employerIndex += 1;
      const taxCode = `01088${String(employerIndex).padStart(5, '0')}`;
      const companyName = companyNames[employerIndex - 1];
      const account = await upsertTaiKhoan({
        tenDangNhap: taxCode,
        email: `seed.employer${String(employerIndex).padStart(2, '0')}@example.com`,
        soDienThoai: phone('092200', employerIndex),
        matKhauHash: demoPasswordHash,
        vaiTro: VaiTroTaiKhoan.NHA_TUYEN_DUNG,
        trangThaiTaiKhoan: group.accountStatus,
        emailXacThucLuc: now,
      });
      const field = extraFields[(employerIndex - 1) % extraFields.length];
      const sentAt = addDays(now, -30 + employerIndex, 10);
      const reviewedAt =
        group.profileStatus === TrangThaiKiemDuyet.CHO_DUYET
          ? null
          : addDays(sentAt, 2, 15);
      const profile = await prisma.hoSoNhaTuyenDung.upsert({
        where: { taiKhoanId: account.id },
        update: {
          linhVucId: field.id,
          tenDonVi: companyName,
          maSoThue: taxCode,
          diaChiTruSo: `${20 + employerIndex} phố Duy Tân, phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội`,
          nguoiDaiDien: [
            'Nguyễn Thành Nam',
            'Trần Thu Trang',
            'Lê Minh Đức',
            'Phạm Hoài An',
          ][employerIndex % 4],
          chucVuNguoiDaiDien:
            employerIndex % 2 === 0
              ? 'Giám đốc điều hành'
              : 'Trưởng phòng nhân sự',
          soDienThoaiLienHe: phone('024399', employerIndex),
          emailLienHe: `hr.seed${String(employerIndex).padStart(2, '0')}@example.com`,
          website: `https://seed-employer-${String(employerIndex).padStart(2, '0')}.example.com`,
          logoUrl: `https://placehold.co/160x160/0b5fc2/ffffff?text=E${String(employerIndex).padStart(2, '0')}`,
          moTaDonVi: `${companyName} là đơn vị hoạt động tại Hà Nội, tập trung xây dựng môi trường làm việc minh bạch, quy trình tuyển dụng rõ ràng và lộ trình phát triển nghề nghiệp cho nhân sự trẻ.`,
          tepGiayPhepUrl: `https://example.com/licenses/seed-employer-${String(employerIndex).padStart(2, '0')}.pdf`,
          trangThaiDuyet: group.profileStatus,
          lyDoTuChoi: group.reason,
          ngayGuiDuyet: sentAt,
          ngayDuyet: reviewedAt,
        },
        create: {
          taiKhoanId: account.id,
          linhVucId: field.id,
          tenDonVi: companyName,
          maSoThue: taxCode,
          diaChiTruSo: `${20 + employerIndex} phố Duy Tân, phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội`,
          nguoiDaiDien: [
            'Nguyễn Thành Nam',
            'Trần Thu Trang',
            'Lê Minh Đức',
            'Phạm Hoài An',
          ][employerIndex % 4],
          chucVuNguoiDaiDien:
            employerIndex % 2 === 0
              ? 'Giám đốc điều hành'
              : 'Trưởng phòng nhân sự',
          soDienThoaiLienHe: phone('024399', employerIndex),
          emailLienHe: `hr.seed${String(employerIndex).padStart(2, '0')}@example.com`,
          website: `https://seed-employer-${String(employerIndex).padStart(2, '0')}.example.com`,
          logoUrl: `https://placehold.co/160x160/0b5fc2/ffffff?text=E${String(employerIndex).padStart(2, '0')}`,
          moTaDonVi: `${companyName} là đơn vị hoạt động tại Hà Nội, tập trung xây dựng môi trường làm việc minh bạch, quy trình tuyển dụng rõ ràng và lộ trình phát triển nghề nghiệp cho nhân sự trẻ.`,
          tepGiayPhepUrl: `https://example.com/licenses/seed-employer-${String(employerIndex).padStart(2, '0')}.pdf`,
          trangThaiDuyet: group.profileStatus,
          lyDoTuChoi: group.reason,
          ngayGuiDuyet: sentAt,
          ngayDuyet: reviewedAt,
        },
      });
      employerProfiles.push({ account, group: group.label, profile });
    }
  }

  await prisma.lichSuKiemDuyet.deleteMany({
    where: {
      hoSoNhaTuyenDungId: {
        in: employerProfiles.map((item) => item.profile.id),
      },
    },
  });
  await prisma.lichSuKiemDuyet.createMany({
    data: employerProfiles.map((item) => ({
      nguoiKiemDuyetId: adminId,
      loaiDoiTuong: LoaiDoiTuongKiemDuyet.NHA_TUYEN_DUNG,
      hoSoNhaTuyenDungId: item.profile.id,
      trangThaiTruoc: TrangThaiKiemDuyet.CHO_DUYET,
      trangThaiSau: item.profile.trangThaiDuyet,
      lyDo:
        item.profile.trangThaiDuyet === TrangThaiKiemDuyet.DA_DUYET
          ? '[Seed] Hồ sơ doanh nghiệp đầy đủ và hợp lệ.'
          : item.profile.trangThaiDuyet === TrangThaiKiemDuyet.CHO_DUYET
            ? '[Seed] Hồ sơ đang chờ quản trị viên kiểm duyệt.'
            : `[Seed] ${item.profile.lyDoTuChoi}`,
    })),
  });

  const approvedEmployers = employerProfiles
    .filter(
      (item) => item.profile.trangThaiDuyet === TrangThaiKiemDuyet.DA_DUYET,
    )
    .map((item) => item.profile);
  const jobTitles = [
    [
      'Frontend Developer React/Next.js cho nền tảng tuyển dụng',
      'Phát triển phần mềm',
      ['React', 'Next.js', 'TypeScript'],
    ],
    [
      'Backend Developer NestJS phụ trách API tuyển dụng',
      'Phát triển phần mềm',
      ['NestJS', 'PostgreSQL', 'Prisma'],
    ],
    [
      'QA Engineer kiểm thử sản phẩm web và mobile',
      'Kiểm thử phần mềm',
      ['Git', 'SQL', 'Giao tiếp'],
    ],
    [
      'UI/UX Designer thiết kế trải nghiệm sản phẩm nhân sự',
      'Thiết kế UI/UX',
      ['Figma', 'Giao tiếp', 'React'],
    ],
    [
      'Data Analyst xây dựng báo cáo vận hành tuyển dụng',
      'Phân tích dữ liệu',
      ['SQL', 'Python', 'Power BI'],
    ],
    [
      'Kế toán tổng hợp phụ trách báo cáo nội bộ',
      'Kế toán - kiểm toán',
      ['Excel', 'SQL', 'Giao tiếp'],
    ],
    [
      'Chuyên viên tuyển dụng khối văn phòng',
      'Nhân sự - tuyển dụng',
      ['Tuyển dụng', 'Giao tiếp', 'Excel'],
    ],
    [
      'Nhân viên kinh doanh B2B dịch vụ phần mềm',
      'Kinh doanh B2B',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Tiếng Anh'],
    ],
    [
      'Digital Marketing Executive quản lý chiến dịch đa kênh',
      'Marketing số',
      ['SEO', 'Content Marketing', 'Figma'],
    ],
    [
      'Chuyên viên chăm sóc khách hàng doanh nghiệp',
      'Chăm sóc khách hàng',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Tiếng Anh'],
    ],
    [
      'Điều phối vận hành kho thương mại điện tử',
      'Vận hành kho vận',
      ['Quản lý kho', 'Excel', 'Làm việc nhóm'],
    ],
    [
      'Giảng viên đào tạo kỹ năng tin học văn phòng',
      'Giáo viên - đào tạo',
      ['Excel', 'Giao tiếp', 'Tiếng Anh'],
    ],
    [
      'Điều dưỡng viên chăm sóc khách hàng tại nhà',
      'Điều dưỡng - chăm sóc',
      ['Giao tiếp', 'Làm việc nhóm', 'Tiếng Anh'],
    ],
    [
      'Java Developer phát triển hệ thống giao dịch nội bộ',
      'Phát triển phần mềm',
      ['Java', 'SQL', 'Git'],
    ],
    [
      'Node.js Developer tích hợp thanh toán và đối soát',
      'Phát triển phần mềm',
      ['Node.js', 'PostgreSQL', 'Git'],
    ],
    [
      'Business Analyst cho dự án chuyển đổi số doanh nghiệp',
      'Phân tích dữ liệu',
      ['SQL', 'Giao tiếp', 'Excel'],
    ],
    [
      'Account Executive phụ trách khách hàng SME',
      'Kinh doanh B2B',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Excel'],
    ],
    [
      'Content Marketing Specialist mảng giáo dục nghề nghiệp',
      'Marketing số',
      ['Content Marketing', 'SEO', 'Figma'],
    ],
    [
      'Nhân viên hành chính nhân sự tổng hợp',
      'Nhân sự - tuyển dụng',
      ['Tuyển dụng', 'Excel', 'Giao tiếp'],
    ],
    [
      'Kế toán công nợ và thanh toán nhà cung cấp',
      'Kế toán - kiểm toán',
      ['Excel', 'SQL', 'Giao tiếp'],
    ],
    [
      'Senior Frontend Engineer tối ưu hiệu năng web',
      'Phát triển phần mềm',
      ['React', 'TypeScript', 'Git'],
    ],
    [
      'Chuyên viên kiểm thử tự động API và regression',
      'Kiểm thử phần mềm',
      ['TypeScript', 'Git', 'SQL'],
    ],
    [
      'Product Designer cho ứng dụng tìm việc thanh niên',
      'Thiết kế UI/UX',
      ['Figma', 'Giao tiếp', 'Content Marketing'],
    ],
    [
      'Chuyên viên phân tích dữ liệu bán hàng',
      'Phân tích dữ liệu',
      ['Power BI', 'SQL', 'Excel'],
    ],
    [
      'Nhân viên tư vấn tuyển sinh khóa học công nghệ',
      'Giáo viên - đào tạo',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Excel'],
    ],
    [
      'Nhân viên điều phối giao nhận nội thành Hà Nội',
      'Vận hành kho vận',
      ['Quản lý kho', 'Excel', 'Làm việc nhóm'],
    ],
    [
      'Chuyên viên chăm sóc khách hàng qua tổng đài',
      'Chăm sóc khách hàng',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Tiếng Anh'],
    ],
    [
      'Chuyên viên SEO technical cho website thương mại điện tử',
      'Marketing số',
      ['SEO', 'Content Marketing', 'SQL'],
    ],
    [
      'Kỹ sư phần mềm Python xử lý dữ liệu tuyển dụng',
      'Phát triển phần mềm',
      ['Python', 'SQL', 'Git'],
    ],
    [
      'Nhân viên nhân sự phụ trách onboarding',
      'Nhân sự - tuyển dụng',
      ['Tuyển dụng', 'Giao tiếp', 'Excel'],
    ],
    [
      'Kế toán thuế cho doanh nghiệp dịch vụ',
      'Kế toán - kiểm toán',
      ['Excel', 'SQL', 'Giao tiếp'],
    ],
    [
      'Chuyên viên kinh doanh phần mềm quản trị doanh nghiệp',
      'Kinh doanh B2B',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Tiếng Anh'],
    ],
    [
      'Nhân viên vận hành sàn thương mại điện tử',
      'Vận hành kho vận',
      ['Excel', 'Quản lý kho', 'Content Marketing'],
    ],
    [
      'Giáo viên tiếng Anh giao tiếp cho người đi làm',
      'Giáo viên - đào tạo',
      ['Tiếng Anh', 'Giao tiếp', 'Làm việc nhóm'],
    ],
    [
      'Nhân viên hỗ trợ khách hàng sau bán',
      'Chăm sóc khách hàng',
      ['Tư vấn khách hàng', 'Giao tiếp', 'Excel'],
    ],
    [
      'DevOps Intern hỗ trợ triển khai môi trường staging',
      'Phát triển phần mềm',
      ['Git', 'Node.js', 'PostgreSQL'],
    ],
    [
      'Thực tập sinh UI Designer hỗ trợ thiết kế landing page',
      'Thiết kế UI/UX',
      ['Figma', 'Content Marketing', 'Giao tiếp'],
    ],
    [
      'Nhân viên kiểm thử phần mềm thủ công',
      'Kiểm thử phần mềm',
      ['Git', 'Giao tiếp', 'SQL'],
    ],
    [
      'Chuyên viên nhập liệu và kiểm soát chất lượng dữ liệu',
      'Phân tích dữ liệu',
      ['Excel', 'SQL', 'Giao tiếp'],
    ],
    [
      'Chuyên viên chăm sóc sức khỏe cộng đồng',
      'Điều dưỡng - chăm sóc',
      ['Giao tiếp', 'Làm việc nhóm', 'Tiếng Anh'],
    ],
  ] as const;
  const reviewPlan = [
    ...Array(14).fill([
      TrangThaiKiemDuyet.DA_DUYET,
      TrangThaiHienThiTin.DANG_HIEN_THI,
      120,
      0,
    ]),
    ...Array(5).fill([
      TrangThaiKiemDuyet.DA_DUYET,
      TrangThaiHienThiTin.HET_HAN,
      -15,
      0,
    ]),
    ...Array(4).fill([
      TrangThaiKiemDuyet.DA_DUYET,
      TrangThaiHienThiTin.DA_DONG,
      45,
      0,
    ]),
    ...Array(6).fill([
      TrangThaiKiemDuyet.CHO_DUYET,
      TrangThaiHienThiTin.CHUA_DANG,
      90,
      0,
    ]),
    ...Array(6).fill([
      TrangThaiKiemDuyet.TU_CHOI,
      TrangThaiHienThiTin.CHUA_DANG,
      90,
      1,
    ]),
    ...Array(5).fill([
      TrangThaiKiemDuyet.BAN_NHAP,
      TrangThaiHienThiTin.CHUA_DANG,
      75,
      0,
    ]),
  ] as const;
  const jobs: Array<Prisma.TinTuyenDungGetPayload<object>> = [];

  for (let index = 0; index < jobTitles.length; index += 1) {
    const [title, categoryName, skillNames] = jobTitles[index];
    const [reviewStatus, displayStatus, deadlineOffset, editCount] =
      reviewPlan[index];
    const employer = approvedEmployers[index % approvedEmployers.length];
    const category = requiredCategory(categoryName);
    const salaryFrom = 9000000 + (index % 8) * 1500000;
    const createdAt = addDays(now, -60 + index, 9);
    const approvedAt =
      reviewStatus === TrangThaiKiemDuyet.BAN_NHAP ||
      reviewStatus === TrangThaiKiemDuyet.CHO_DUYET
        ? null
        : addDays(createdAt, 2, 14);
    const postedAt =
      reviewStatus === TrangThaiKiemDuyet.DA_DUYET
        ? addDays(createdAt, 3, 8)
        : null;
    const job = await upsertJobByTitle({
      nhaTuyenDungId: employer.id,
      nganhNgheId: category.id,
      viTriTuyenDung: title,
      moTaCongViec: `Vị trí ${title} tham gia trực tiếp vào hoạt động vận hành và phát triển sản phẩm/dịch vụ của doanh nghiệp. Ứng viên sẽ phối hợp với quản lý trực tiếp để phân tích nhu cầu, triển khai công việc theo kế hoạch tuần, theo dõi chất lượng đầu ra và đề xuất cải tiến quy trình khi phát sinh vấn đề thực tế.`,
      yeuCauUngVien: `Ứng viên cần có nền tảng phù hợp với ngành ${categoryName}, giao tiếp rõ ràng, chủ động cập nhật tiến độ và có khả năng xử lý công việc độc lập. Ưu tiên người đã từng làm việc trong môi trường có quy trình, biết sử dụng công cụ số và có tinh thần học hỏi lâu dài.`,
      quyenLoi: `Thu nhập cạnh tranh theo năng lực, được tham gia bảo hiểm theo quy định, có phụ cấp ăn trưa/gửi xe và được đào tạo trong giai đoạn hội nhập. Doanh nghiệp có đánh giá hiệu quả định kỳ, lộ trình phát triển rõ ràng và môi trường làm việc tôn trọng phản hồi hai chiều.`,
      mucLuongTu: decimal(salaryFrom),
      mucLuongDen: decimal(salaryFrom + 6000000),
      coTheThoaThuan: index % 9 === 0,
      diaDiemLamViec:
        index % 3 === 0
          ? 'Tòa nhà văn phòng khu Cầu Giấy, Hà Nội'
          : index % 3 === 1
            ? 'Khu đô thị Times City, Hai Bà Trưng, Hà Nội'
            : 'Văn phòng khu Nam Từ Liêm, Hà Nội',
      hinhThucLamViec:
        index % 7 === 0
          ? HinhThucLamViec.THUC_TAP
          : index % 5 === 0
            ? HinhThucLamViec.TU_XA
            : HinhThucLamViec.TOAN_THOI_GIAN,
      soLuongTuyen: 1 + (index % 5),
      soNamKinhNghiemToiThieu: decimal((index % 4) * 0.5),
      trinhDoYeuCau:
        index % 4 === 0 ? 'Không yêu cầu bằng cấp cố định' : 'Cao đẳng trở lên',
      thoiHanNhanHoSo: addDays(now, deadlineOffset, 23, 59),
      trangThaiKiemDuyet: reviewStatus,
      trangThaiHienThi: displayStatus,
      lyDoTuChoi:
        reviewStatus === TrangThaiKiemDuyet.TU_CHOI
          ? 'Nội dung tin cần làm rõ phạm vi công việc, mức lương và quyền lợi trước khi đăng lại.'
          : null,
      soLanChinhSua: Number(editCount),
      ngayGuiDuyet:
        reviewStatus === TrangThaiKiemDuyet.BAN_NHAP
          ? null
          : addDays(createdAt, 1, 10),
      ngayDuyet: approvedAt,
      ngayDang: postedAt,
      ngayTao: createdAt,
      ngayCapNhat: createdAt,
    });
    await replaceJobSkills(
      job.id,
      skillNames.map((name, skillIndex) => ({
        kyNangId: requiredSkill(name).id,
        mucDoYeuCau:
          skillIndex === 0 ? MucDoKyNang.KHA : MucDoKyNang.TRUNG_BINH,
        batBuoc: skillIndex < 2,
      })),
    );
    jobs.push(job);
  }

  await prisma.lichSuKiemDuyet.deleteMany({
    where: { tinTuyenDungId: { in: jobs.map((job) => job.id) } },
  });
  await prisma.lichSuKiemDuyet.createMany({
    data: jobs
      .filter((job) => job.trangThaiKiemDuyet !== TrangThaiKiemDuyet.BAN_NHAP)
      .map((job) => ({
        nguoiKiemDuyetId: adminId,
        loaiDoiTuong: LoaiDoiTuongKiemDuyet.TIN_TUYEN_DUNG,
        tinTuyenDungId: job.id,
        trangThaiTruoc: TrangThaiKiemDuyet.CHO_DUYET,
        trangThaiSau: job.trangThaiKiemDuyet,
        lyDo:
          job.trangThaiKiemDuyet === TrangThaiKiemDuyet.TU_CHOI
            ? `[Seed] ${job.lyDoTuChoi}`
            : '[Seed] Tin tuyển dụng đã được kiểm tra theo bộ tiêu chí hiển thị.',
      })),
  });

  const activeJobs = jobs.filter(
    (job) =>
      job.trangThaiKiemDuyet === TrangThaiKiemDuyet.DA_DUYET &&
      job.trangThaiHienThi === TrangThaiHienThiTin.DANG_HIEN_THI,
  );
  const employerAccountIdByProfileId = new Map(
    employerProfiles.map((item) => [item.profile.id, item.account.id]),
  );
  const employerAccountIdForJob = (job: (typeof jobs)[number]) =>
    employerAccountIdByProfileId.get(job.nhaTuyenDungId) ?? adminId;
  const applicationStatuses = [
    TrangThaiUngTuyen.DA_NOP,
    TrangThaiUngTuyen.DA_XEM,
    TrangThaiUngTuyen.DUOC_CHON_SO_BO,
    TrangThaiUngTuyen.MOI_PHONG_VAN,
    TrangThaiUngTuyen.DA_PHONG_VAN,
    TrangThaiUngTuyen.TRUNG_TUYEN,
    TrangThaiUngTuyen.KHONG_PHU_HOP,
    TrangThaiUngTuyen.MOI_PHONG_VAN,
    TrangThaiUngTuyen.DA_XEM,
    TrangThaiUngTuyen.DUOC_CHON_SO_BO,
    TrangThaiUngTuyen.DA_NOP,
    TrangThaiUngTuyen.KHONG_PHU_HOP,
  ];
  const applications: Array<{
    application: Prisma.UngTuyenGetPayload<object>;
    job: Prisma.TinTuyenDungGetPayload<object>;
    status: TrangThaiUngTuyen;
    worker: {
      account: Awaited<ReturnType<typeof upsertTaiKhoan>>;
      profile: Prisma.HoSoNguoiLaoDongGetPayload<object>;
    };
  }> = [];

  for (let index = 0; index < applicationStatuses.length; index += 1) {
    const worker = workerProfiles[index % workerProfiles.length];
    const job = activeJobs[index % activeJobs.length];
    const status = applicationStatuses[index];
    const application = await prisma.ungTuyen.upsert({
      where: {
        hoSoNguoiLaoDongId_tinTuyenDungId: {
          hoSoNguoiLaoDongId: worker.profile.id,
          tinTuyenDungId: job.id,
        },
      },
      update: {
        hoTenSnapshot: worker.profile.hoTen,
        emailSnapshot: worker.account.email,
        soDienThoaiSnapshot: worker.account.soDienThoai,
        tepCvSnapshotUrl: worker.profile.tepCvUrl,
        tenFileCvUngTuyen: worker.profile.tenFileCv,
        loaiFileCvUngTuyen: worker.profile.loaiFileCv,
        kichThuocCvUngTuyen: worker.profile.kichThuocCv,
        ngayNopCv: addDays(now, -12 + index, 10),
        thuGioiThieu: `[Seed] Tôi quan tâm đến vị trí ${job.viTriTuyenDung} vì kinh nghiệm hiện tại phù hợp với mô tả công việc và mong muốn được đóng góp lâu dài cho doanh nghiệp.`,
        trangThaiHienTai: status,
        lyDoTuChoi:
          status === TrangThaiUngTuyen.KHONG_PHU_HOP
            ? 'Kinh nghiệm hiện tại chưa phù hợp với yêu cầu ưu tiên của vị trí.'
            : null,
        ngayNop: addDays(now, -12 + index, 10),
        ngayCapNhatTrangThai: addDays(now, -5 + index, 16),
      },
      create: {
        hoSoNguoiLaoDongId: worker.profile.id,
        tinTuyenDungId: job.id,
        hoTenSnapshot: worker.profile.hoTen,
        emailSnapshot: worker.account.email,
        soDienThoaiSnapshot: worker.account.soDienThoai,
        tepCvSnapshotUrl: worker.profile.tepCvUrl,
        tenFileCvUngTuyen: worker.profile.tenFileCv,
        loaiFileCvUngTuyen: worker.profile.loaiFileCv,
        kichThuocCvUngTuyen: worker.profile.kichThuocCv,
        ngayNopCv: addDays(now, -12 + index, 10),
        thuGioiThieu: `[Seed] Tôi quan tâm đến vị trí ${job.viTriTuyenDung} vì kinh nghiệm hiện tại phù hợp với mô tả công việc và mong muốn được đóng góp lâu dài cho doanh nghiệp.`,
        trangThaiHienTai: status,
        lyDoTuChoi:
          status === TrangThaiUngTuyen.KHONG_PHU_HOP
            ? 'Kinh nghiệm hiện tại chưa phù hợp với yêu cầu ưu tiên của vị trí.'
            : null,
        ngayNop: addDays(now, -12 + index, 10),
        ngayCapNhatTrangThai: addDays(now, -5 + index, 16),
      },
    });
    applications.push({ application, job, status, worker });
  }

  await prisma.lichSuTrangThaiUngTuyen.deleteMany({
    where: {
      ungTuyenId: { in: applications.map((item) => item.application.id) },
    },
  });
  await prisma.thongTinPhongVan.deleteMany({
    where: {
      ungTuyenId: { in: applications.map((item) => item.application.id) },
    },
  });
  const interviewStatuses = new Set<TrangThaiUngTuyen>([
    TrangThaiUngTuyen.MOI_PHONG_VAN,
    TrangThaiUngTuyen.DA_PHONG_VAN,
    TrangThaiUngTuyen.TRUNG_TUYEN,
  ]);
  for (const item of applications) {
    const history = applicationHistory(item.status);
    for (
      let historyIndex = 0;
      historyIndex < history.length;
      historyIndex += 1
    ) {
      await prisma.lichSuTrangThaiUngTuyen.create({
        data: {
          ungTuyenId: item.application.id,
          nguoiThucHienId:
            historyIndex === 0 ? null : employerAccountIdForJob(item.job),
          trangThaiTruoc: history[historyIndex].trangThaiTruoc,
          trangThaiSau: history[historyIndex].trangThaiSau,
          ghiChu: history[historyIndex].ghiChu,
          ngayThayDoi: addDays(
            now,
            -12 + historyIndex + applications.indexOf(item),
            11,
          ),
        },
      });
    }

    if (interviewStatuses.has(item.status)) {
      await prisma.thongTinPhongVan.upsert({
        where: { ungTuyenId: item.application.id },
        update: {
          thoiGianBatDau: addDays(now, 7 + applications.indexOf(item), 9, 30),
          thoiGianKetThuc: addDays(now, 7 + applications.indexOf(item), 10, 30),
          hinhThucPhongVan:
            applications.indexOf(item) % 2 === 0
              ? HinhThucPhongVan.TRUC_TUYEN
              : HinhThucPhongVan.TRUC_TIEP,
          diaDiemPhongVan:
            'Phòng họp tầng 6, tòa nhà văn phòng Cầu Giấy, Hà Nội',
          duongDanPhongVan: 'https://meet.example.com/interview-seed',
          nguoiLienHe: 'Bộ phận Tuyển dụng',
          soDienThoaiLienHe: '02439990000',
          noiDungChuanBi:
            'Ứng viên chuẩn bị CV mới nhất, sản phẩm/dự án tiêu biểu và có mặt trước giờ hẹn 10 phút.',
          ghiChuPhongVan: '[Seed] Lịch phỏng vấn dùng để kiểm thử giao diện.',
          nguoiTaoId: employerAccountIdForJob(item.job),
        },
        create: {
          ungTuyenId: item.application.id,
          thoiGianBatDau: addDays(now, 7 + applications.indexOf(item), 9, 30),
          thoiGianKetThuc: addDays(now, 7 + applications.indexOf(item), 10, 30),
          hinhThucPhongVan:
            applications.indexOf(item) % 2 === 0
              ? HinhThucPhongVan.TRUC_TUYEN
              : HinhThucPhongVan.TRUC_TIEP,
          diaDiemPhongVan:
            'Phòng họp tầng 6, tòa nhà văn phòng Cầu Giấy, Hà Nội',
          duongDanPhongVan: 'https://meet.example.com/interview-seed',
          nguoiLienHe: 'Bộ phận Tuyển dụng',
          soDienThoaiLienHe: '02439990000',
          noiDungChuanBi:
            'Ứng viên chuẩn bị CV mới nhất, sản phẩm/dự án tiêu biểu và có mặt trước giờ hẹn 10 phút.',
          ghiChuPhongVan: '[Seed] Lịch phỏng vấn dùng để kiểm thử giao diện.',
          nguoiTaoId: employerAccountIdForJob(item.job),
        },
      });
    }
  }

  for (let index = 0; index < workerProfiles.length; index += 1) {
    for (const job of activeJobs.slice(index % 3, (index % 3) + 3)) {
      await prisma.tinTuyenDungDaLuu.upsert({
        where: {
          hoSoNguoiLaoDongId_tinTuyenDungId: {
            hoSoNguoiLaoDongId: workerProfiles[index].profile.id,
            tinTuyenDungId: job.id,
          },
        },
        create: {
          hoSoNguoiLaoDongId: workerProfiles[index].profile.id,
          tinTuyenDungId: job.id,
          ngayLuu: addDays(now, -index, 18),
        },
        update: { ngayLuu: addDays(now, -index, 18) },
      });
    }
  }

  const notificationAccountIds = [
    ...workerAccounts.map((account) => account.id),
    ...employerProfiles.map((item) => item.account.id),
  ];
  await prisma.thongBao.deleteMany({
    where: {
      taiKhoanId: { in: notificationAccountIds },
      tieuDe: { startsWith: '[Seed]' },
    },
  });
  await prisma.thongBao.createMany({
    data: [
      ...applications.map((item) => ({
        taiKhoanId: employerAccountIdForJob(item.job),
        tieuDe: '[Seed] Có hồ sơ ứng tuyển mới',
        noiDung: `${item.worker.profile.hoTen} vừa ứng tuyển vị trí ${item.job.viTriTuyenDung}.`,
        loaiThongBao: LoaiThongBao.UNG_TUYEN,
        duongDanDich: `/nha-tuyen-dung/tin-tuyen-dung/${item.job.id}/ung-vien/${item.application.id}`,
        ngayTao: addDays(now, -2, 14),
      })),
      ...applications
        .filter((item) => item.status === TrangThaiUngTuyen.MOI_PHONG_VAN)
        .map((item) => ({
          taiKhoanId: item.worker.account.id,
          tieuDe: '[Seed] Hồ sơ của bạn đã được mời phỏng vấn',
          noiDung: `Bạn đã nhận được lời mời phỏng vấn cho vị trí ${item.job.viTriTuyenDung}.`,
          loaiThongBao: LoaiThongBao.UNG_TUYEN,
          duongDanDich: '/viec-lam-da-ung-tuyen?status=interview',
          ngayTao: addDays(now, -1, 9),
        })),
      ...employerProfiles
        .filter(
          (item) =>
            item.profile.trangThaiDuyet !== TrangThaiKiemDuyet.CHO_DUYET,
        )
        .map((item) => ({
          taiKhoanId: item.account.id,
          tieuDe: '[Seed] Kết quả duyệt hồ sơ nhà tuyển dụng',
          noiDung:
            item.profile.trangThaiDuyet === TrangThaiKiemDuyet.DA_DUYET
              ? 'Hồ sơ nhà tuyển dụng đã được phê duyệt.'
              : `Hồ sơ cần xử lý thêm: ${item.profile.lyDoTuChoi}`,
          loaiThongBao: LoaiThongBao.KIEM_DUYET,
          duongDanDich: '/nha-tuyen-dung/ho-so',
          ngayTao: addDays(now, -3, 16),
        })),
    ],
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

  await seedExpandedDemoData({
    adminId: admin.id,
    demoPasswordHash,
    now,
  });
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
