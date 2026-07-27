export type PortalRole = "worker" | "employer" | "admin";

export type PortalNotification = {
  id: number;
  type: string;
  title: string;
  content: string;
  time: string;
  unread: boolean;
  icon: string;
};

export const roleLabels: Record<PortalRole, string> = {
  worker: "Người lao động",
  employer: "Nhà tuyển dụng",
  admin: "Quản trị viên",
};

export const notificationsByRole: Record<PortalRole, PortalNotification[]> = {
  worker: [
    { id: 1, type: "Phỏng vấn", title: "Mời phỏng vấn vị trí Nhân viên Kinh doanh", content: "Công ty Cổ phần ABC mời bạn phỏng vấn lúc 09:00 ngày 30/07/2026.", time: "10 phút trước", unread: true, icon: "🏢" },
    { id: 2, type: "Ứng tuyển", title: "Trạng thái hồ sơ đã thay đổi", content: "Hồ sơ Lập trình viên Java đã chuyển sang trạng thái Phỏng vấn.", time: "2 giờ trước", unread: true, icon: "📄" },
    { id: 3, type: "Việc làm", title: "Có 8 việc làm mới phù hợp", content: "Các việc làm mới tại Hà Nội phù hợp với kỹ năng và mức lương mong muốn của bạn.", time: "Hôm qua", unread: false, icon: "🔔" },
    { id: 4, type: "Hệ thống", title: "Hồ sơ cá nhân đã được cập nhật", content: "Thông tin hồ sơ người lao động của bạn đã được lưu thành công.", time: "25/07/2026", unread: false, icon: "✓" },
  ],
  employer: [
    { id: 11, type: "Ứng viên", title: "Có ứng viên mới cho tin Lập trình viên Java", content: "Trần Thị B vừa nộp hồ sơ. Hãy xem CV và cập nhật trạng thái xử lý.", time: "5 phút trước", unread: true, icon: "👤" },
    { id: 12, type: "Kiểm duyệt", title: "Tin tuyển dụng đã được phê duyệt", content: "Tin Nhân viên Kinh doanh đã được quản trị viên duyệt và đang hiển thị.", time: "1 giờ trước", unread: true, icon: "✓" },
    { id: 13, type: "Ứng viên", title: "Ứng viên xác nhận lịch phỏng vấn", content: "Nguyễn Văn A đã xác nhận tham gia phỏng vấn vào ngày 30/07/2026.", time: "Hôm qua", unread: false, icon: "📅" },
    { id: 14, type: "Hệ thống", title: "Hồ sơ doanh nghiệp cần bổ sung", content: "Vui lòng cập nhật chức vụ người đại diện trong hồ sơ doanh nghiệp.", time: "24/07/2026", unread: false, icon: "🏢" },
  ],
  admin: [
    { id: 21, type: "Chờ duyệt", title: "Có 3 nhà tuyển dụng chờ kiểm duyệt", content: "Hồ sơ doanh nghiệp mới đã được gửi và cần cán bộ quản trị xử lý.", time: "3 phút trước", unread: true, icon: "🏢" },
    { id: 22, type: "Chờ duyệt", title: "Có 7 tin tuyển dụng chờ duyệt", content: "Danh sách kiểm duyệt vừa nhận thêm các tin tuyển dụng mới.", time: "20 phút trước", unread: true, icon: "📢" },
    { id: 23, type: "Báo cáo", title: "Báo cáo thống kê tháng đã sẵn sàng", content: "Số liệu F27, F28 và F29 tháng 07/2026 đã được tổng hợp.", time: "2 giờ trước", unread: false, icon: "📊" },
    { id: 24, type: "Hệ thống", title: "Cảnh báo đăng nhập bất thường", content: "Hệ thống ghi nhận nhiều lần đăng nhập thất bại vào tài khoản quản trị.", time: "Hôm qua", unread: false, icon: "⚠" },
  ],
};
