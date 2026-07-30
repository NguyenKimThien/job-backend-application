-- CreateEnum
CREATE TYPE "HinhThucPhongVan" AS ENUM ('TRUC_TIEP', 'TRUC_TUYEN');

-- CreateTable
CREATE TABLE "thong_tin_phong_van" (
    "id" SERIAL NOT NULL,
    "ung_tuyen_id" INTEGER NOT NULL,
    "thoi_gian_bat_dau" TIMESTAMPTZ(6) NOT NULL,
    "thoi_gian_ket_thuc" TIMESTAMPTZ(6),
    "hinh_thuc_phong_van" "HinhThucPhongVan" NOT NULL,
    "dia_diem_phong_van" TEXT,
    "duong_dan_phong_van" TEXT,
    "nguoi_lien_he" VARCHAR(255) NOT NULL,
    "so_dien_thoai_lien_he" VARCHAR(20) NOT NULL,
    "noi_dung_chuan_bi" TEXT,
    "ghi_chu_phong_van" TEXT,
    "nguoi_tao_id" INTEGER,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "thong_tin_phong_van_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "thong_tin_phong_van_ung_tuyen_id_key" ON "thong_tin_phong_van"("ung_tuyen_id");

-- CreateIndex
CREATE INDEX "idx_thong_tin_phong_van_nguoi_tao_id" ON "thong_tin_phong_van"("nguoi_tao_id");

-- CreateIndex
CREATE INDEX "idx_thong_tin_phong_van_thoi_gian_bat_dau" ON "thong_tin_phong_van"("thoi_gian_bat_dau");

-- AddForeignKey
ALTER TABLE "thong_tin_phong_van" ADD CONSTRAINT "thong_tin_phong_van_ung_tuyen_id_fkey" FOREIGN KEY ("ung_tuyen_id") REFERENCES "ung_tuyen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thong_tin_phong_van" ADD CONSTRAINT "thong_tin_phong_van_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "tai_khoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
