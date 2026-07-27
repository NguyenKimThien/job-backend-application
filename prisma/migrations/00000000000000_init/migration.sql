-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VaiTroTaiKhoan" AS ENUM ('NGUOI_LAO_DONG', 'NHA_TUYEN_DUNG', 'QUAN_TRI_VIEN');

-- CreateEnum
CREATE TYPE "TrangThaiTaiKhoan" AS ENUM ('CHO_XAC_THUC_EMAIL', 'HOAT_DONG', 'TAM_KHOA', 'DA_KHOA');

-- CreateEnum
CREATE TYPE "MucDichMaXacThuc" AS ENUM ('DANG_KY', 'QUEN_MAT_KHAU', 'DOI_EMAIL');

-- CreateEnum
CREATE TYPE "GioiTinh" AS ENUM ('NAM', 'NU', 'KHAC');

-- CreateEnum
CREATE TYPE "TrangThaiTimViec" AS ENUM ('DANG_TIM_VIEC', 'TAM_DUNG_TIM_VIEC', 'DA_CO_VIEC');

-- CreateEnum
CREATE TYPE "MucDoKyNang" AS ENUM ('CO_BAN', 'TRUNG_BINH', 'KHA', 'THANH_THAO', 'CHUYEN_GIA');

-- CreateEnum
CREATE TYPE "TrangThaiKiemDuyet" AS ENUM ('BAN_NHAP', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'YEU_CAU_BO_SUNG');

-- CreateEnum
CREATE TYPE "HinhThucLamViec" AS ENUM ('TOAN_THOI_GIAN', 'BAN_THOI_GIAN', 'THUC_TAP', 'THOI_VU', 'TU_XA');

-- CreateEnum
CREATE TYPE "TrangThaiHienThiTin" AS ENUM ('CHUA_DANG', 'DANG_HIEN_THI', 'TAM_AN', 'DA_DONG', 'HET_HAN');

-- CreateEnum
CREATE TYPE "TrangThaiUngTuyen" AS ENUM ('DA_NOP', 'DA_XEM', 'DUOC_CHON_SO_BO', 'MOI_PHONG_VAN', 'DA_PHONG_VAN', 'TRUNG_TUYEN', 'KHONG_PHU_HOP', 'DA_RUT');

-- CreateEnum
CREATE TYPE "LoaiDoiTuongKiemDuyet" AS ENUM ('NHA_TUYEN_DUNG', 'TIN_TUYEN_DUNG');

-- CreateEnum
CREATE TYPE "LoaiThongBao" AS ENUM ('HE_THONG', 'TAI_KHOAN', 'KIEM_DUYET', 'TUYEN_DUNG', 'UNG_TUYEN');

-- CreateTable
CREATE TABLE "tai_khoan" (
    "id" SERIAL NOT NULL,
    "ten_dang_nhap" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "so_dien_thoai" VARCHAR(20),
    "mat_khau_hash" VARCHAR(255) NOT NULL,
    "vai_tro" "VaiTroTaiKhoan" NOT NULL,
    "trang_thai_tai_khoan" "TrangThaiTaiKhoan" NOT NULL DEFAULT 'CHO_XAC_THUC_EMAIL',
    "email_xac_thuc_luc" TIMESTAMPTZ(6),
    "lan_dang_nhap_cuoi" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tai_khoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_xac_thuc" (
    "id" SERIAL NOT NULL,
    "tai_khoan_id" INTEGER NOT NULL,
    "ma_xac_thuc_hash" VARCHAR(255) NOT NULL,
    "muc_dich" "MucDichMaXacThuc" NOT NULL,
    "han_su_dung" TIMESTAMPTZ(6) NOT NULL,
    "so_lan_thu" INTEGER NOT NULL DEFAULT 0,
    "da_su_dung" BOOLEAN NOT NULL DEFAULT false,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ma_xac_thuc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ho_so_nguoi_lao_dong" (
    "id" SERIAL NOT NULL,
    "tai_khoan_id" INTEGER NOT NULL,
    "ho_ten" VARCHAR(255) NOT NULL,
    "ngay_sinh" DATE,
    "gioi_tinh" "GioiTinh",
    "dia_chi" TEXT,
    "anh_dai_dien_url" TEXT,
    "gioi_thieu_ban_than" TEXT,
    "muc_luong_mong_muon_tu" DECIMAL(15,2),
    "muc_luong_mong_muon_den" DECIMAL(15,2),
    "dia_diem_mong_muon" TEXT,
    "tep_cv_url" TEXT,
    "trang_thai_tim_viec" "TrangThaiTimViec" NOT NULL DEFAULT 'DANG_TIM_VIEC',
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ho_so_nguoi_lao_dong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoc_van" (
    "id" SERIAL NOT NULL,
    "ho_so_nguoi_lao_dong_id" INTEGER NOT NULL,
    "trinh_do" VARCHAR(150) NOT NULL,
    "ten_co_so_dao_tao" VARCHAR(255) NOT NULL,
    "chuyen_nganh" VARCHAR(255),
    "nam_bat_dau" INTEGER NOT NULL,
    "nam_tot_nghiep" INTEGER,
    "dang_hoc" BOOLEAN NOT NULL DEFAULT false,
    "xep_loai" VARCHAR(100),

    CONSTRAINT "hoc_van_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kinh_nghiem_lam_viec" (
    "id" SERIAL NOT NULL,
    "ho_so_nguoi_lao_dong_id" INTEGER NOT NULL,
    "ten_don_vi" VARCHAR(255) NOT NULL,
    "vi_tri_cong_viec" VARCHAR(255) NOT NULL,
    "ngay_bat_dau" DATE NOT NULL,
    "ngay_ket_thuc" DATE,
    "dang_lam_viec" BOOLEAN NOT NULL DEFAULT false,
    "mo_ta_cong_viec" TEXT,

    CONSTRAINT "kinh_nghiem_lam_viec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ky_nang" (
    "id" SERIAL NOT NULL,
    "ten_ky_nang" VARCHAR(150) NOT NULL,
    "mo_ta" TEXT,
    "trang_thai_hien_thi" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ky_nang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ho_so_ky_nang" (
    "ho_so_nguoi_lao_dong_id" INTEGER NOT NULL,
    "ky_nang_id" INTEGER NOT NULL,
    "muc_do_thanh_thao" "MucDoKyNang" NOT NULL,
    "so_nam_kinh_nghiem" DECIMAL(4,1) NOT NULL DEFAULT 0,

    CONSTRAINT "ho_so_ky_nang_pkey" PRIMARY KEY ("ho_so_nguoi_lao_dong_id","ky_nang_id")
);

-- CreateTable
CREATE TABLE "linh_vuc" (
    "id" SERIAL NOT NULL,
    "ten_linh_vuc" VARCHAR(255) NOT NULL,
    "mo_ta" TEXT,
    "trang_thai_hien_thi" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "linh_vuc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ho_so_nha_tuyen_dung" (
    "id" SERIAL NOT NULL,
    "tai_khoan_id" INTEGER NOT NULL,
    "linh_vuc_id" INTEGER NOT NULL,
    "ten_don_vi" VARCHAR(255) NOT NULL,
    "ma_so_thue" VARCHAR(50) NOT NULL,
    "dia_chi_tru_so" TEXT NOT NULL,
    "nguoi_dai_dien" VARCHAR(255) NOT NULL,
    "chuc_vu_nguoi_dai_dien" VARCHAR(150),
    "so_dien_thoai_lien_he" VARCHAR(20) NOT NULL,
    "email_lien_he" VARCHAR(255) NOT NULL,
    "website" TEXT,
    "logo_url" TEXT,
    "mo_ta_don_vi" TEXT,
    "tep_giay_phep_url" TEXT,
    "trang_thai_duyet" "TrangThaiKiemDuyet" NOT NULL DEFAULT 'BAN_NHAP',
    "ly_do_tu_choi" TEXT,
    "ngay_gui_duyet" TIMESTAMPTZ(6),
    "ngay_duyet" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ho_so_nha_tuyen_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nganh_nghe" (
    "id" SERIAL NOT NULL,
    "ten_nganh_nghe" VARCHAR(255) NOT NULL,
    "mo_ta" TEXT,
    "trang_thai_hien_thi" BOOLEAN NOT NULL DEFAULT true,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "nganh_nghe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tin_tuyen_dung" (
    "id" SERIAL NOT NULL,
    "nha_tuyen_dung_id" INTEGER NOT NULL,
    "nganh_nghe_id" INTEGER NOT NULL,
    "vi_tri_tuyen_dung" VARCHAR(255) NOT NULL,
    "mo_ta_cong_viec" TEXT NOT NULL,
    "yeu_cau_ung_vien" TEXT NOT NULL,
    "quyen_loi" TEXT,
    "muc_luong_tu" DECIMAL(15,2),
    "muc_luong_den" DECIMAL(15,2),
    "co_the_thoa_thuan" BOOLEAN NOT NULL DEFAULT false,
    "dia_diem_lam_viec" TEXT NOT NULL,
    "hinh_thuc_lam_viec" "HinhThucLamViec" NOT NULL,
    "so_luong_tuyen" INTEGER NOT NULL DEFAULT 1,
    "so_nam_kinh_nghiem_toi_thieu" DECIMAL(4,1),
    "trinh_do_yeu_cau" VARCHAR(150),
    "thoi_han_nhan_ho_so" TIMESTAMPTZ(6) NOT NULL,
    "trang_thai_kiem_duyet" "TrangThaiKiemDuyet" NOT NULL DEFAULT 'BAN_NHAP',
    "trang_thai_hien_thi" "TrangThaiHienThiTin" NOT NULL DEFAULT 'CHUA_DANG',
    "ly_do_tu_choi" TEXT,
    "ngay_gui_duyet" TIMESTAMPTZ(6),
    "ngay_duyet" TIMESTAMPTZ(6),
    "ngay_dang" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tin_tuyen_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tin_tuyen_dung_ky_nang" (
    "tin_tuyen_dung_id" INTEGER NOT NULL,
    "ky_nang_id" INTEGER NOT NULL,
    "muc_do_yeu_cau" "MucDoKyNang" NOT NULL,
    "bat_buoc" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tin_tuyen_dung_ky_nang_pkey" PRIMARY KEY ("tin_tuyen_dung_id","ky_nang_id")
);

-- CreateTable
CREATE TABLE "ung_tuyen" (
    "id" SERIAL NOT NULL,
    "ho_so_nguoi_lao_dong_id" INTEGER NOT NULL,
    "tin_tuyen_dung_id" INTEGER NOT NULL,
    "ho_ten_snapshot" VARCHAR(255) NOT NULL,
    "email_snapshot" VARCHAR(255) NOT NULL,
    "so_dien_thoai_snapshot" VARCHAR(20),
    "tep_cv_snapshot_url" TEXT,
    "thu_gioi_thieu" TEXT,
    "trang_thai_hien_tai" "TrangThaiUngTuyen" NOT NULL DEFAULT 'DA_NOP',
    "ly_do_tu_choi" TEXT,
    "ngay_nop" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat_trang_thai" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ung_tuyen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lich_su_trang_thai_ung_tuyen" (
    "id" SERIAL NOT NULL,
    "ung_tuyen_id" INTEGER NOT NULL,
    "nguoi_thuc_hien_id" INTEGER,
    "trang_thai_truoc" "TrangThaiUngTuyen",
    "trang_thai_sau" "TrangThaiUngTuyen" NOT NULL,
    "ghi_chu" TEXT,
    "ngay_thay_doi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_trang_thai_ung_tuyen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lich_su_kiem_duyet" (
    "id" SERIAL NOT NULL,
    "nguoi_kiem_duyet_id" INTEGER NOT NULL,
    "loai_doi_tuong" "LoaiDoiTuongKiemDuyet" NOT NULL,
    "ho_so_nha_tuyen_dung_id" INTEGER,
    "tin_tuyen_dung_id" INTEGER,
    "trang_thai_truoc" "TrangThaiKiemDuyet",
    "trang_thai_sau" "TrangThaiKiemDuyet" NOT NULL,
    "ly_do" TEXT,
    "ngay_thuc_hien" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_kiem_duyet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thong_bao" (
    "id" SERIAL NOT NULL,
    "tai_khoan_id" INTEGER NOT NULL,
    "tieu_de" VARCHAR(255) NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "loai_thong_bao" "LoaiThongBao" NOT NULL,
    "duong_dan_dich" TEXT,
    "da_doc" BOOLEAN NOT NULL DEFAULT false,
    "ngay_doc" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_bao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_ten_dang_nhap_key" ON "tai_khoan"("ten_dang_nhap");

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_email_key" ON "tai_khoan"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_so_dien_thoai_key" ON "tai_khoan"("so_dien_thoai");

-- CreateIndex
CREATE INDEX "idx_tai_khoan_vai_tro" ON "tai_khoan"("vai_tro");

-- CreateIndex
CREATE INDEX "idx_tai_khoan_trang_thai" ON "tai_khoan"("trang_thai_tai_khoan");

-- CreateIndex
CREATE INDEX "idx_ma_xac_thuc_tai_khoan_muc_dich_da_su_dung" ON "ma_xac_thuc"("tai_khoan_id", "muc_dich", "da_su_dung");

-- CreateIndex
CREATE INDEX "idx_ma_xac_thuc_han_su_dung" ON "ma_xac_thuc"("han_su_dung");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_nguoi_lao_dong_tai_khoan_id_key" ON "ho_so_nguoi_lao_dong"("tai_khoan_id");

-- CreateIndex
CREATE INDEX "idx_ho_so_nguoi_lao_dong_trang_thai" ON "ho_so_nguoi_lao_dong"("trang_thai_tim_viec");

-- CreateIndex
CREATE INDEX "idx_hoc_van_ho_so_nguoi_lao_dong_id" ON "hoc_van"("ho_so_nguoi_lao_dong_id");

-- CreateIndex
CREATE INDEX "idx_kinh_nghiem_ho_so_nguoi_lao_dong_id" ON "kinh_nghiem_lam_viec"("ho_so_nguoi_lao_dong_id");

-- CreateIndex
CREATE UNIQUE INDEX "ky_nang_ten_ky_nang_key" ON "ky_nang"("ten_ky_nang");

-- CreateIndex
CREATE INDEX "idx_ho_so_ky_nang_ky_nang_id" ON "ho_so_ky_nang"("ky_nang_id");

-- CreateIndex
CREATE UNIQUE INDEX "linh_vuc_ten_linh_vuc_key" ON "linh_vuc"("ten_linh_vuc");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_nha_tuyen_dung_tai_khoan_id_key" ON "ho_so_nha_tuyen_dung"("tai_khoan_id");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_nha_tuyen_dung_ma_so_thue_key" ON "ho_so_nha_tuyen_dung"("ma_so_thue");

-- CreateIndex
CREATE INDEX "idx_ho_so_nha_tuyen_dung_linh_vuc_id" ON "ho_so_nha_tuyen_dung"("linh_vuc_id");

-- CreateIndex
CREATE INDEX "idx_ho_so_nha_tuyen_dung_trang_thai_duyet" ON "ho_so_nha_tuyen_dung"("trang_thai_duyet");

-- CreateIndex
CREATE UNIQUE INDEX "nganh_nghe_ten_nganh_nghe_key" ON "nganh_nghe"("ten_nganh_nghe");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_nha_tuyen_dung_id" ON "tin_tuyen_dung"("nha_tuyen_dung_id");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_nganh_nghe_id" ON "tin_tuyen_dung"("nganh_nghe_id");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_trang_thai_kiem_duyet" ON "tin_tuyen_dung"("trang_thai_kiem_duyet");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_trang_thai_hien_thi" ON "tin_tuyen_dung"("trang_thai_hien_thi");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_thoi_han_nhan_ho_so" ON "tin_tuyen_dung"("thoi_han_nhan_ho_so");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_ngay_tao" ON "tin_tuyen_dung"("ngay_tao");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_dang_hien_thi" ON "tin_tuyen_dung"("trang_thai_hien_thi", "thoi_han_nhan_ho_so", "ngay_tao");

-- CreateIndex
CREATE INDEX "idx_tin_tuyen_dung_ky_nang_ky_nang_id" ON "tin_tuyen_dung_ky_nang"("ky_nang_id");

-- CreateIndex
CREATE INDEX "idx_ung_tuyen_ho_so_nguoi_lao_dong_id" ON "ung_tuyen"("ho_so_nguoi_lao_dong_id");

-- CreateIndex
CREATE INDEX "idx_ung_tuyen_tin_tuyen_dung_id" ON "ung_tuyen"("tin_tuyen_dung_id");

-- CreateIndex
CREATE INDEX "idx_ung_tuyen_tin_trang_thai" ON "ung_tuyen"("tin_tuyen_dung_id", "trang_thai_hien_tai");

-- CreateIndex
CREATE INDEX "idx_ung_tuyen_ngay_nop" ON "ung_tuyen"("ngay_nop");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ung_tuyen_ho_so_tin" ON "ung_tuyen"("ho_so_nguoi_lao_dong_id", "tin_tuyen_dung_id");

-- CreateIndex
CREATE INDEX "idx_lich_su_trang_thai_ung_tuyen_ngay" ON "lich_su_trang_thai_ung_tuyen"("ung_tuyen_id", "ngay_thay_doi");

-- CreateIndex
CREATE INDEX "idx_lich_su_trang_thai_nguoi_thuc_hien_id" ON "lich_su_trang_thai_ung_tuyen"("nguoi_thuc_hien_id");

-- CreateIndex
CREATE INDEX "idx_lich_su_kiem_duyet_nguoi_kiem_duyet_id" ON "lich_su_kiem_duyet"("nguoi_kiem_duyet_id");

-- CreateIndex
CREATE INDEX "idx_lich_su_kiem_duyet_ho_so_ntd_ngay" ON "lich_su_kiem_duyet"("ho_so_nha_tuyen_dung_id", "ngay_thuc_hien");

-- CreateIndex
CREATE INDEX "idx_lich_su_kiem_duyet_tin_ngay" ON "lich_su_kiem_duyet"("tin_tuyen_dung_id", "ngay_thuc_hien");

-- CreateIndex
CREATE INDEX "idx_thong_bao_tai_khoan_da_doc_ngay_tao" ON "thong_bao"("tai_khoan_id", "da_doc", "ngay_tao");

-- AddForeignKey
ALTER TABLE "ma_xac_thuc" ADD CONSTRAINT "ma_xac_thuc_tai_khoan_id_fkey" FOREIGN KEY ("tai_khoan_id") REFERENCES "tai_khoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_nguoi_lao_dong" ADD CONSTRAINT "ho_so_nguoi_lao_dong_tai_khoan_id_fkey" FOREIGN KEY ("tai_khoan_id") REFERENCES "tai_khoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_van" ADD CONSTRAINT "hoc_van_ho_so_nguoi_lao_dong_id_fkey" FOREIGN KEY ("ho_so_nguoi_lao_dong_id") REFERENCES "ho_so_nguoi_lao_dong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kinh_nghiem_lam_viec" ADD CONSTRAINT "kinh_nghiem_lam_viec_ho_so_nguoi_lao_dong_id_fkey" FOREIGN KEY ("ho_so_nguoi_lao_dong_id") REFERENCES "ho_so_nguoi_lao_dong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_ky_nang" ADD CONSTRAINT "ho_so_ky_nang_ho_so_nguoi_lao_dong_id_fkey" FOREIGN KEY ("ho_so_nguoi_lao_dong_id") REFERENCES "ho_so_nguoi_lao_dong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_ky_nang" ADD CONSTRAINT "ho_so_ky_nang_ky_nang_id_fkey" FOREIGN KEY ("ky_nang_id") REFERENCES "ky_nang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_nha_tuyen_dung" ADD CONSTRAINT "ho_so_nha_tuyen_dung_tai_khoan_id_fkey" FOREIGN KEY ("tai_khoan_id") REFERENCES "tai_khoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_nha_tuyen_dung" ADD CONSTRAINT "ho_so_nha_tuyen_dung_linh_vuc_id_fkey" FOREIGN KEY ("linh_vuc_id") REFERENCES "linh_vuc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tin_tuyen_dung" ADD CONSTRAINT "tin_tuyen_dung_nha_tuyen_dung_id_fkey" FOREIGN KEY ("nha_tuyen_dung_id") REFERENCES "ho_so_nha_tuyen_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tin_tuyen_dung" ADD CONSTRAINT "tin_tuyen_dung_nganh_nghe_id_fkey" FOREIGN KEY ("nganh_nghe_id") REFERENCES "nganh_nghe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tin_tuyen_dung_ky_nang" ADD CONSTRAINT "tin_tuyen_dung_ky_nang_tin_tuyen_dung_id_fkey" FOREIGN KEY ("tin_tuyen_dung_id") REFERENCES "tin_tuyen_dung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tin_tuyen_dung_ky_nang" ADD CONSTRAINT "tin_tuyen_dung_ky_nang_ky_nang_id_fkey" FOREIGN KEY ("ky_nang_id") REFERENCES "ky_nang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ung_tuyen" ADD CONSTRAINT "ung_tuyen_ho_so_nguoi_lao_dong_id_fkey" FOREIGN KEY ("ho_so_nguoi_lao_dong_id") REFERENCES "ho_so_nguoi_lao_dong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ung_tuyen" ADD CONSTRAINT "ung_tuyen_tin_tuyen_dung_id_fkey" FOREIGN KEY ("tin_tuyen_dung_id") REFERENCES "tin_tuyen_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_trang_thai_ung_tuyen" ADD CONSTRAINT "lich_su_trang_thai_ung_tuyen_ung_tuyen_id_fkey" FOREIGN KEY ("ung_tuyen_id") REFERENCES "ung_tuyen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_trang_thai_ung_tuyen" ADD CONSTRAINT "lich_su_trang_thai_ung_tuyen_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "tai_khoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_kiem_duyet" ADD CONSTRAINT "lich_su_kiem_duyet_nguoi_kiem_duyet_id_fkey" FOREIGN KEY ("nguoi_kiem_duyet_id") REFERENCES "tai_khoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_kiem_duyet" ADD CONSTRAINT "lich_su_kiem_duyet_ho_so_nha_tuyen_dung_id_fkey" FOREIGN KEY ("ho_so_nha_tuyen_dung_id") REFERENCES "ho_so_nha_tuyen_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_kiem_duyet" ADD CONSTRAINT "lich_su_kiem_duyet_tin_tuyen_dung_id_fkey" FOREIGN KEY ("tin_tuyen_dung_id") REFERENCES "tin_tuyen_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thong_bao" ADD CONSTRAINT "thong_bao_tai_khoan_id_fkey" FOREIGN KEY ("tai_khoan_id") REFERENCES "tai_khoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "ho_so_nguoi_lao_dong"
ADD CONSTRAINT "chk_ho_so_nguoi_lao_dong_muc_luong"
CHECK (
  (muc_luong_mong_muon_tu IS NULL OR muc_luong_mong_muon_tu >= 0)
  AND (muc_luong_mong_muon_den IS NULL OR muc_luong_mong_muon_den >= 0)
  AND (
    muc_luong_mong_muon_tu IS NULL
    OR muc_luong_mong_muon_den IS NULL
    OR muc_luong_mong_muon_den >= muc_luong_mong_muon_tu
  )
);

-- AddCheckConstraint
ALTER TABLE "hoc_van"
ADD CONSTRAINT "chk_hoc_van_nam"
CHECK (
  nam_bat_dau BETWEEN 1900 AND 2100
  AND (nam_tot_nghiep IS NULL OR nam_tot_nghiep >= nam_bat_dau)
);

-- AddCheckConstraint
ALTER TABLE "kinh_nghiem_lam_viec"
ADD CONSTRAINT "chk_kinh_nghiem_ngay"
CHECK (
  (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau)
  AND (dang_lam_viec = false OR ngay_ket_thuc IS NULL)
);

-- AddCheckConstraint
ALTER TABLE "ho_so_ky_nang"
ADD CONSTRAINT "chk_ho_so_ky_nang_so_nam"
CHECK (so_nam_kinh_nghiem >= 0);

-- AddCheckConstraint
ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_muc_luong"
CHECK (
  (muc_luong_tu IS NULL OR muc_luong_tu >= 0)
  AND (muc_luong_den IS NULL OR muc_luong_den >= 0)
  AND (
    muc_luong_tu IS NULL
    OR muc_luong_den IS NULL
    OR muc_luong_den >= muc_luong_tu
  )
  AND (
    co_the_thoa_thuan = true
    OR muc_luong_tu IS NOT NULL
    OR muc_luong_den IS NOT NULL
  )
);

-- AddCheckConstraint
ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_so_luong"
CHECK (so_luong_tuyen > 0);

-- AddCheckConstraint
ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_kinh_nghiem"
CHECK (
  so_nam_kinh_nghiem_toi_thieu IS NULL
  OR so_nam_kinh_nghiem_toi_thieu >= 0
);

-- AddCheckConstraint
ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_thoi_han"
CHECK (thoi_han_nhan_ho_so >= ngay_tao);

-- AddCheckConstraint
ALTER TABLE "ma_xac_thuc"
ADD CONSTRAINT "chk_ma_xac_thuc_so_lan_thu"
CHECK (so_lan_thu >= 0);

-- AddCheckConstraint
ALTER TABLE "ma_xac_thuc"
ADD CONSTRAINT "chk_ma_xac_thuc_han_su_dung"
CHECK (han_su_dung > ngay_tao);

-- AddCheckConstraint
ALTER TABLE "lich_su_kiem_duyet"
ADD CONSTRAINT "chk_lich_su_kiem_duyet_doi_tuong"
CHECK (
  (
    loai_doi_tuong = 'NHA_TUYEN_DUNG'
    AND ho_so_nha_tuyen_dung_id IS NOT NULL
    AND tin_tuyen_dung_id IS NULL
  )
  OR (
    loai_doi_tuong = 'TIN_TUYEN_DUNG'
    AND tin_tuyen_dung_id IS NOT NULL
    AND ho_so_nha_tuyen_dung_id IS NULL
  )
);

-- AddCheckConstraint
ALTER TABLE "thong_bao"
ADD CONSTRAINT "chk_thong_bao_da_doc"
CHECK (
  (da_doc = false AND ngay_doc IS NULL)
  OR (da_doc = true AND ngay_doc IS NOT NULL)
);
