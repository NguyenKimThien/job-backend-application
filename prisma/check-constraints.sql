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

ALTER TABLE "hoc_van"
ADD CONSTRAINT "chk_hoc_van_nam"
CHECK (
  nam_bat_dau BETWEEN 1900 AND 2100
  AND (nam_tot_nghiep IS NULL OR nam_tot_nghiep >= nam_bat_dau)
);

ALTER TABLE "kinh_nghiem_lam_viec"
ADD CONSTRAINT "chk_kinh_nghiem_ngay"
CHECK (
  (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau)
  AND (dang_lam_viec = false OR ngay_ket_thuc IS NULL)
);

ALTER TABLE "ho_so_ky_nang"
ADD CONSTRAINT "chk_ho_so_ky_nang_so_nam"
CHECK (so_nam_kinh_nghiem >= 0);

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

ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_so_luong"
CHECK (so_luong_tuyen > 0);

ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_kinh_nghiem"
CHECK (
  so_nam_kinh_nghiem_toi_thieu IS NULL
  OR so_nam_kinh_nghiem_toi_thieu >= 0
);

ALTER TABLE "tin_tuyen_dung"
ADD CONSTRAINT "chk_tin_tuyen_dung_thoi_han"
CHECK (thoi_han_nhan_ho_so >= ngay_tao);

ALTER TABLE "ma_xac_thuc"
ADD CONSTRAINT "chk_ma_xac_thuc_so_lan_thu"
CHECK (so_lan_thu >= 0);

ALTER TABLE "ma_xac_thuc"
ADD CONSTRAINT "chk_ma_xac_thuc_han_su_dung"
CHECK (han_su_dung > ngay_tao);

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

ALTER TABLE "thong_bao"
ADD CONSTRAINT "chk_thong_bao_da_doc"
CHECK (
  (da_doc = false AND ngay_doc IS NULL)
  OR (da_doc = true AND ngay_doc IS NOT NULL)
);
