# Việc làm Thanh niên Hà Nội — bản chạy một lệnh

Đây là dự án full-stack đã gom thư viện frontend và backend vào **một**
`package.json` và **một** thư mục `node_modules`.

## Cấu trúc

```text
viec-lam-thanh-nien-one-command/
├── src/                 Backend NestJS
├── prisma/              Prisma và PostgreSQL
├── frontend/            Frontend Next.js
├── scripts/             Chạy đồng thời hai máy chủ
├── .env.example
└── package.json         Toàn bộ thư viện của dự án
```

Không chạy `npm install` trong `frontend`. Thư mục này không còn
`package.json` riêng.

## Bước 1: tạo database

Trong pgAdmin, tạo database tên `jobconnect`, hoặc chạy:

```sql
CREATE DATABASE jobconnect;
```

## Bước 2: cấu hình

Mở PowerShell tại thư mục dự án:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay mật khẩu PostgreSQL trong `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/jobconnect?schema=public"
```

## Bước 3: cài và tạo dữ liệu

Chỉ thực hiện một lần:

```powershell
npm.cmd install
npm.cmd run setup
```

Tài khoản quản trị mẫu:

- Tên đăng nhập: `admin`
- Mật khẩu mặc định: `Admin@123456`

## Bước 4: chạy toàn bộ dự án

```powershell
npm.cmd run dev
```

Một lệnh trên tự chạy:

- Website: `http://localhost:3000`
- Backend API: `http://localhost:3001`

Giữ cửa sổ PowerShell đang chạy. Nhấn `Ctrl + C` để dừng cả hai.

## Các lệnh riêng

```powershell
npm.cmd run dev:frontend
npm.cmd run dev:backend
npm.cmd run prisma:studio
npm.cmd run build
```

## Quản lý người dùng

Sau khi đăng nhập quản trị, truy cập:

```text
http://localhost:3000/quan-tri/tai-khoan
```

Đã có tìm kiếm, lọc, phân trang, xem chi tiết hồ sơ, tạm khóa, khóa và mở
khóa tài khoản. API được bảo vệ bằng JWT và quyền `QUAN_TRI_VIEN`.

## Các chức năng đã kết nối frontend với backend

- Đăng ký, xác thực OTP, đăng nhập, quên và đổi mật khẩu.
- Danh mục ngành nghề, danh sách/chi tiết việc làm và thông tin công ty.
- Hồ sơ người lao động: học vấn, kinh nghiệm, kỹ năng, nguyện vọng và CV.
- Nộp hồ sơ, theo dõi việc đã ứng tuyển, lưu và bỏ lưu tin.
- Hồ sơ nhà tuyển dụng, tạo tin và xem/xử lý ứng viên theo từng tin.
- Quản trị tài khoản, ngành nghề, duyệt nhà tuyển dụng, duyệt tin và thống kê.
- Thông báo được lấy riêng theo tài khoản đang đăng nhập.

Frontend gọi backend tại `http://localhost:3001` thông qua
`NEXT_PUBLIC_API_URL` trong `.env`.

Sau khi nhận phiên bản mới có thay đổi Prisma, luôn chạy:

```powershell
npm.cmd run setup
```

Lệnh này tạo/cập nhật các bảng, sinh Prisma Client và nạp dữ liệu mẫu.

## Email OTP

OTP xác thực tài khoản và đặt lại mật khẩu luôn được gửi qua SMTP. Cần cấu hình
đúng `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`
và `SMTP_FROM_EMAIL` trong `.env` trước khi đăng ký hoặc gửi lại OTP.

Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` như các câu lệnh trên.

## Backend API đã triển khai

Backend NestJS chạy tại `http://localhost:3001`. Các API riêng tư dùng header:

```text
Authorization: Bearer <accessToken>
```

Các nhóm chức năng chính:

- `/auth/*`: đăng ký người lao động/nhà tuyển dụng, OTP, gửi lại OTP, đăng nhập.
- `/auth/forgot-password`, `/auth/reset-password`, `/account/password`,
  `/account/logout`: quên, đặt lại, đổi mật khẩu và đăng xuất.
- `/jobs`, `/jobs/:id`, `/companies/:id`, `/categories`, `/fields`: dữ liệu
  công khai; danh sách việc hỗ trợ lọc `keyword`, `category`, `location`,
  `type`, `salaryMin`, `salaryMax`, `experienceMax`.
- `/worker/profile`, `/worker/applications`, `/worker/saved-jobs`: hồ sơ,
  ứng tuyển, lịch sử ứng tuyển và tin đã lưu của người lao động.
- `/employer/profile`, `/employer/jobs`: hồ sơ nhà tuyển dụng, tạo tin, xem
  tin và sửa/gửi lại tin để kiểm duyệt (tối đa 3 lần; tin đang chờ duyệt
  không thể sửa).
- `/employer/jobs/:jobId/applicants/*`: danh sách, chi tiết và cập nhật quy
  trình ứng viên theo từng tin thuộc doanh nghiệp.
- `/admin/users/*`: tìm kiếm, xem chi tiết, khóa/mở khóa và phân quyền tài khoản.
- `/admin/employers/*`, `/admin/jobs/*`: kiểm duyệt nhà tuyển dụng và tin,
  lưu lịch sử kiểm duyệt, gửi thông báo kết quả.
- `/admin/categories/*`: thêm, sửa, ẩn/hiện danh mục; thao tác xóa chỉ ẩn để
  không làm mất dữ liệu liên kết.
- `/notifications`, `/notifications/read-all`, `/notifications/:id/read`:
  thông báo riêng của từng tài khoản.
- `/admin/statistics?from=YYYY-MM-DD&to=YYYY-MM-DD`: bảng số liệu tài khoản,
  tin và ứng tuyển theo trạng thái.
- `/admin/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD`: tải báo cáo CSV.

## Ba chức năng bổ sung

### Phân quyền

- Backend kiểm tra JWT và vai trò ở từng nhóm API; không chỉ ẩn nút trên giao
  diện.
- Frontend tự chuyển người dùng ra khỏi khu vực `/quan-tri` hoặc
  `/nha-tuyen-dung` nếu vai trò không phù hợp.
- Quản trị viên đổi vai trò tại **Quản trị → Tài khoản → Chi tiết tài khoản →
  Phân quyền tài khoản**. Chỉ chuyển được khi tài khoản có hồ sơ tương ứng;
  không thể tự cấp quyền quản trị.

### Chỉnh sửa tin tuyển dụng

Tại **Nhà tuyển dụng → Tin tuyển dụng**, mở nút ba chấm của tin và chọn
**Chỉnh sửa tin**. Hệ thống nạp sẵn nội dung cũ, kiểm tra tin có thuộc đúng nhà
tuyển dụng đang đăng nhập và gửi phiên bản cập nhật về trạng thái chờ kiểm
duyệt. Tin đang chờ duyệt và tin đã đủ ba lần sửa sẽ không hiện thao tác sửa.

### Xuất báo cáo

Tại **Quản trị → Thống kê và báo cáo**, chọn **Từ ngày**, **Đến ngày**, bấm
**Lọc số liệu**, sau đó chọn **Xuất báo cáo CSV**. File dùng UTF-8 có BOM để
Excel hiển thị đúng tiếng Việt và chỉ chứa dữ liệu trong khoảng ngày đã chọn.

Sau khi cập nhật bản này trên cơ sở dữ liệu đã có, chạy:

```powershell
npm.cmd run db:push
npm.cmd run prisma:generate
npm.cmd run dev
```

`db:push` bổ sung cột đếm số lần chỉnh sửa tin và không xóa dữ liệu hiện có.
