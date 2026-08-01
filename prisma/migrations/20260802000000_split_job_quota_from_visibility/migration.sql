-- Keep "reached quota" as derived business data, not as a visibility status.
ALTER TABLE "tin_tuyen_dung"
ADD COLUMN IF NOT EXISTS "ngung_nhan_ho_so" BOOLEAN NOT NULL DEFAULT false;

UPDATE "tin_tuyen_dung"
SET "trang_thai_hien_thi" = 'DANG_HIEN_THI'
WHERE "trang_thai_hien_thi" = 'DA_DU_CHI_TIEU';
