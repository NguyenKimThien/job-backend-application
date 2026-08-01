-- CreateEnum
CREATE TYPE "TrangThaiPhongVan" AS ENUM ('DA_LEN_LICH', 'DA_HUY');

-- AlterTable
ALTER TABLE "thong_tin_phong_van"
ADD COLUMN "trang_thai_phong_van" "TrangThaiPhongVan" NOT NULL DEFAULT 'DA_LEN_LICH',
ADD COLUMN "ly_do_huy" TEXT,
ADD COLUMN "thoi_gian_huy" TIMESTAMPTZ(6),
ADD COLUMN "nguoi_huy_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_thong_tin_phong_van_nguoi_huy_id" ON "thong_tin_phong_van"("nguoi_huy_id");

-- CreateIndex
CREATE INDEX "idx_thong_tin_phong_van_trang_thai" ON "thong_tin_phong_van"("trang_thai_phong_van");

-- AddForeignKey
ALTER TABLE "thong_tin_phong_van" ADD CONSTRAINT "thong_tin_phong_van_nguoi_huy_id_fkey" FOREIGN KEY ("nguoi_huy_id") REFERENCES "tai_khoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
