-- AlterEnum
ALTER TYPE "TrangThaiHienThiTin" ADD VALUE IF NOT EXISTS 'DA_DU_CHI_TIEU';

-- AlterTable
ALTER TABLE "tin_tuyen_dung"
ADD COLUMN IF NOT EXISTS "ngay_du_chi_tieu" TIMESTAMPTZ(6);
