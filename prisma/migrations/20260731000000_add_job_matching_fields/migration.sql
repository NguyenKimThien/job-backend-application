CREATE TYPE "PhuongThucLamViec" AS ENUM ('TAI_VAN_PHONG', 'TU_XA', 'KET_HOP');

ALTER TABLE "ho_so_nguoi_lao_dong"
ADD COLUMN "nganh_nghe_mong_muon_id" INTEGER,
ADD COLUMN "vi_tri_mong_muon" VARCHAR(255),
ADD COLUMN "tinh_thanh_pho_mong_muon" VARCHAR(120),
ADD COLUMN "quan_huyen_mong_muon" VARCHAR(120),
ADD COLUMN "chap_nhan_lam_tu_xa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hinh_thuc_lam_viec_mong_muon" "HinhThucLamViec",
ADD COLUMN "phuong_thuc_lam_viec_mong_muon" "PhuongThucLamViec";

ALTER TABLE "tin_tuyen_dung"
ADD COLUMN "tinh_thanh_pho" VARCHAR(120),
ADD COLUMN "quan_huyen" VARCHAR(120),
ADD COLUMN "dia_chi_lam_viec_cu_the" TEXT,
ADD COLUMN "phuong_thuc_lam_viec" "PhuongThucLamViec" NOT NULL DEFAULT 'TAI_VAN_PHONG',
ADD COLUMN "chuyen_mon" VARCHAR(255);

CREATE INDEX "idx_ho_so_nguoi_lao_dong_nganh_mong_muon" ON "ho_so_nguoi_lao_dong"("nganh_nghe_mong_muon_id");

ALTER TABLE "ho_so_nguoi_lao_dong"
ADD CONSTRAINT "ho_so_nguoi_lao_dong_nganh_nghe_mong_muon_id_fkey"
FOREIGN KEY ("nganh_nghe_mong_muon_id") REFERENCES "nganh_nghe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
