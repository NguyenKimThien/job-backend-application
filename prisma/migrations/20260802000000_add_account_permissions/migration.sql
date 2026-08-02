CREATE TABLE "phan_quyen_tai_khoan" (
    "id" SERIAL NOT NULL,
    "tai_khoan_id" INTEGER NOT NULL,
    "ma_quyen" VARCHAR(80) NOT NULL,
    "duoc_phep" BOOLEAN NOT NULL,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phan_quyen_tai_khoan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_phan_quyen_tai_khoan"
ON "phan_quyen_tai_khoan"("tai_khoan_id", "ma_quyen");

CREATE INDEX "idx_phan_quyen_tai_khoan"
ON "phan_quyen_tai_khoan"("tai_khoan_id");

ALTER TABLE "phan_quyen_tai_khoan"
ADD CONSTRAINT "phan_quyen_tai_khoan_tai_khoan_id_fkey"
FOREIGN KEY ("tai_khoan_id") REFERENCES "tai_khoan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
