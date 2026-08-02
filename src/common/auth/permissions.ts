import { VaiTroTaiKhoan } from '../../../generated/prisma/client.js';

export const PERMISSIONS = {
  XEM_HO_SO_CA_NHAN: 'XEM_HO_SO_CA_NHAN',
  SUA_HO_SO_CA_NHAN: 'SUA_HO_SO_CA_NHAN',
  XEM_UNG_TUYEN: 'XEM_UNG_TUYEN',
  THEM_UNG_TUYEN: 'THEM_UNG_TUYEN',
  XEM_VIEC_LAM_DA_LUU: 'XEM_VIEC_LAM_DA_LUU',
  SUA_VIEC_LAM_DA_LUU: 'SUA_VIEC_LAM_DA_LUU',
  XEM_HO_SO_DOANH_NGHIEP: 'XEM_HO_SO_DOANH_NGHIEP',
  SUA_HO_SO_DOANH_NGHIEP: 'SUA_HO_SO_DOANH_NGHIEP',
  XEM_TIN_TUYEN_DUNG: 'XEM_TIN_TUYEN_DUNG',
  THEM_TIN_TUYEN_DUNG: 'THEM_TIN_TUYEN_DUNG',
  SUA_TIN_TUYEN_DUNG: 'SUA_TIN_TUYEN_DUNG',
  XEM_HO_SO_UNG_VIEN: 'XEM_HO_SO_UNG_VIEN',
  SUA_HO_SO_UNG_VIEN: 'SUA_HO_SO_UNG_VIEN',
  XEM_THONG_BAO: 'XEM_THONG_BAO',
  SUA_THONG_BAO: 'SUA_THONG_BAO',
  XEM_TAI_KHOAN: 'XEM_TAI_KHOAN',
  SUA_TAI_KHOAN: 'SUA_TAI_KHOAN',
  PHAN_QUYEN_TAI_KHOAN: 'PHAN_QUYEN_TAI_KHOAN',
  XEM_DANH_MUC_NGHE: 'XEM_DANH_MUC_NGHE',
  THEM_DANH_MUC_NGHE: 'THEM_DANH_MUC_NGHE',
  SUA_DANH_MUC_NGHE: 'SUA_DANH_MUC_NGHE',
  XOA_DANH_MUC_NGHE: 'XOA_DANH_MUC_NGHE',
  XEM_KIEM_DUYET_NTD: 'XEM_KIEM_DUYET_NTD',
  SUA_KIEM_DUYET_NTD: 'SUA_KIEM_DUYET_NTD',
  XEM_KIEM_DUYET_TIN: 'XEM_KIEM_DUYET_TIN',
  SUA_KIEM_DUYET_TIN: 'SUA_KIEM_DUYET_TIN',
  XEM_BAO_CAO: 'XEM_BAO_CAO',
  XUAT_BAO_CAO: 'XUAT_BAO_CAO',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS: Record<
  VaiTroTaiKhoan,
  Array<{
    resource: string;
    permissions: Array<{ code: PermissionCode; action: string }>;
  }>
> = {
  NGUOI_LAO_DONG: [
    {
      resource: 'Hồ sơ cá nhân',
      permissions: [
        { code: PERMISSIONS.XEM_HO_SO_CA_NHAN, action: 'Xem' },
        { code: PERMISSIONS.SUA_HO_SO_CA_NHAN, action: 'Sửa' },
      ],
    },
    {
      resource: 'Hồ sơ ứng tuyển',
      permissions: [
        { code: PERMISSIONS.XEM_UNG_TUYEN, action: 'Xem' },
        { code: PERMISSIONS.THEM_UNG_TUYEN, action: 'Thêm' },
      ],
    },
    {
      resource: 'Việc làm đã lưu',
      permissions: [
        { code: PERMISSIONS.XEM_VIEC_LAM_DA_LUU, action: 'Xem' },
        { code: PERMISSIONS.SUA_VIEC_LAM_DA_LUU, action: 'Thêm/Xóa' },
      ],
    },
    {
      resource: 'Thông báo',
      permissions: [
        { code: PERMISSIONS.XEM_THONG_BAO, action: 'Xem' },
        { code: PERMISSIONS.SUA_THONG_BAO, action: 'Sửa' },
      ],
    },
  ],
  NHA_TUYEN_DUNG: [
    {
      resource: 'Hồ sơ nhà tuyển dụng',
      permissions: [
        { code: PERMISSIONS.XEM_HO_SO_DOANH_NGHIEP, action: 'Xem' },
        { code: PERMISSIONS.SUA_HO_SO_DOANH_NGHIEP, action: 'Sửa' },
      ],
    },
    {
      resource: 'Tin tuyển dụng',
      permissions: [
        { code: PERMISSIONS.XEM_TIN_TUYEN_DUNG, action: 'Xem' },
        { code: PERMISSIONS.THEM_TIN_TUYEN_DUNG, action: 'Thêm' },
        { code: PERMISSIONS.SUA_TIN_TUYEN_DUNG, action: 'Sửa' },
      ],
    },
    {
      resource: 'Hồ sơ ứng viên',
      permissions: [
        { code: PERMISSIONS.XEM_HO_SO_UNG_VIEN, action: 'Xem' },
        { code: PERMISSIONS.SUA_HO_SO_UNG_VIEN, action: 'Sửa' },
      ],
    },
    {
      resource: 'Thông báo',
      permissions: [
        { code: PERMISSIONS.XEM_THONG_BAO, action: 'Xem' },
        { code: PERMISSIONS.SUA_THONG_BAO, action: 'Sửa' },
      ],
    },
  ],
  QUAN_TRI_VIEN: [
    {
      resource: 'Tài khoản',
      permissions: [
        { code: PERMISSIONS.XEM_TAI_KHOAN, action: 'Xem' },
        { code: PERMISSIONS.SUA_TAI_KHOAN, action: 'Sửa' },
        { code: PERMISSIONS.PHAN_QUYEN_TAI_KHOAN, action: 'Phân quyền' },
      ],
    },
    {
      resource: 'Danh mục nghề',
      permissions: [
        { code: PERMISSIONS.XEM_DANH_MUC_NGHE, action: 'Xem' },
        { code: PERMISSIONS.THEM_DANH_MUC_NGHE, action: 'Thêm' },
        { code: PERMISSIONS.SUA_DANH_MUC_NGHE, action: 'Sửa' },
        { code: PERMISSIONS.XOA_DANH_MUC_NGHE, action: 'Xóa' },
      ],
    },
    {
      resource: 'Kiểm duyệt nhà tuyển dụng',
      permissions: [
        { code: PERMISSIONS.XEM_KIEM_DUYET_NTD, action: 'Xem' },
        { code: PERMISSIONS.SUA_KIEM_DUYET_NTD, action: 'Sửa' },
      ],
    },
    {
      resource: 'Kiểm duyệt tin',
      permissions: [
        { code: PERMISSIONS.XEM_KIEM_DUYET_TIN, action: 'Xem' },
        { code: PERMISSIONS.SUA_KIEM_DUYET_TIN, action: 'Sửa' },
      ],
    },
    {
      resource: 'Báo cáo',
      permissions: [
        { code: PERMISSIONS.XEM_BAO_CAO, action: 'Xem' },
        { code: PERMISSIONS.XUAT_BAO_CAO, action: 'Xuất' },
      ],
    },
    {
      resource: 'Thông báo',
      permissions: [
        { code: PERMISSIONS.XEM_THONG_BAO, action: 'Xem' },
        { code: PERMISSIONS.SUA_THONG_BAO, action: 'Sửa' },
      ],
    },
  ],
};

export function defaultPermissions(role: VaiTroTaiKhoan): PermissionCode[] {
  return PERMISSION_GROUPS[role].flatMap((group) =>
    group.permissions.map((item) => item.code),
  );
}

export function isPermissionCode(value: string): value is PermissionCode {
  return Object.values(PERMISSIONS).includes(value as PermissionCode);
}
