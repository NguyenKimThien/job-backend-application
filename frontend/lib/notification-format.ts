const notificationStatusLabels: Record<string, string> = {
  BAN_NHAP: 'Bản nháp',
  CHO_DUYET: 'Chờ duyệt',
  CHUA_DANG: 'Chưa đăng',
  DA_DONG: 'Đã đóng',
  DA_DUYET: 'Đã duyệt',
  DA_NOP: 'Đã nộp',
  DA_PHONG_VAN: 'Đã phỏng vấn',
  DA_RUT: 'Đã rút',
  DA_XEM: 'Đã xem',
  DANG_HIEN_THI: 'Đang hiển thị',
  DUOC_CHON_SO_BO: 'Được chọn sơ bộ',
  HET_HAN: 'Hết hạn',
  KHONG_PHU_HOP: 'Không phù hợp',
  MOI_PHONG_VAN: 'Mời phỏng vấn',
  TAM_AN: 'Tạm ẩn',
  TRUNG_TUYEN: 'Trúng tuyển',
  TU_CHOI: 'Từ chối',
  YEU_CAU_BO_SUNG: 'Yêu cầu bổ sung',
};

export function formatPortalNotificationText(value: string) {
  return Object.entries(notificationStatusLabels).reduce(
    (content, [code, label]) =>
      content.replace(
        new RegExp(`(^|[^A-Z0-9_])${code}(?=$|[^A-Z0-9_])`, 'g'),
        `$1"${label}"`,
      ),
    value,
  );
}
