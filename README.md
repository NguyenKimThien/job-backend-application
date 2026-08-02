# Việc làm Thanh niên Hà Nội

Hệ thống kết nối cung – cầu lao động dành cho Người lao động, Nhà tuyển dụng
và Cán bộ quản trị. Dự án sử dụng NestJS, Next.js, Prisma và PostgreSQL.
Frontend và backend dùng chung một `package.json` và một thư mục
`node_modules`.

## 1. Công nghệ sử dụng

- Backend: NestJS, TypeScript, Prisma ORM.
- Frontend: Next.js, React, TypeScript.
- Database: PostgreSQL.
- Xác thực: JWT, bcrypt và OTP qua email.
- Phân quyền: RBAC kết hợp quyền riêng theo từng tài khoản.

## 2. Cấu trúc dự án

```text
viec-lam-thanh-nien/
├── frontend/            Frontend Next.js
├── generated/           Prisma Client được sinh tự động
├── prisma/
│   ├── migrations/      Lịch sử thay đổi database
│   ├── schema.prisma    Mô hình dữ liệu
│   └── seed.ts          Dữ liệu mẫu
├── scripts/             Script chạy frontend và backend
├── src/                 Backend NestJS
├── .env.example         Cấu hình môi trường mẫu
├── package.json         Thư viện và câu lệnh chung
└── README.md
```

Không chạy `npm install` trong thư mục `frontend` vì frontend không có
`package.json` riêng.

## 3. Yêu cầu cài đặt

- Node.js phiên bản 20 trở lên.
- npm.
- PostgreSQL Server.
- pgAdmin 4 là tùy chọn, dùng để quản lý database bằng giao diện.

Kiểm tra môi trường:

```powershell
node -v
npm.cmd -v
```

Nếu PowerShell chặn `npm.ps1`, hãy dùng `npm.cmd` như các ví dụ trong tài liệu.

## 4. Tạo và cấu hình database

Tạo database bằng pgAdmin hoặc SQL:

```sql
CREATE DATABASE jobconnect;
```

Tạo file `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và sửa chuỗi kết nối PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:MAT_KHAU@localhost:5432/jobconnect?schema=public"
```

Đồng thời cấu hình tối thiểu:

```env
OTP_PEPPER="chuoi-bi-mat-co-it-nhat-32-ky-tu"
JWT_SECRET="chuoi-bi-mat-jwt-dai-va-kho-doan"

SEED_ADMIN_EMAIL="admin@jobconnect.local"
SEED_ADMIN_USERNAME="admin"
SEED_ADMIN_PASSWORD="Admin@123456"
```

Không đưa file `.env` lên Git.

## 5. Cài thư viện

Tại thư mục gốc của dự án, chạy:

```powershell
npm.cmd install
```

Nếu npm yêu cầu duyệt install script:

```powershell
npm.cmd approve-scripts
```

Cho phép các gói cần thiết như Prisma, bcrypt, esbuild, sharp,
`@prisma/engines` và `unrs-resolver`.

## 6. Khởi tạo database mới

Phần này dành cho thành viên tạo database `jobconnect` mới và database đang
trống.

```powershell
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
npm.cmd run db:seed
```

`migrate deploy` tự chạy lần lượt toàn bộ file trong `prisma/migrations`.
Không cần mở từng file SQL để chạy thủ công.

## 7. Cập nhật database sau khi Git pull

Mỗi khi nhận code mới, chạy:

```powershell
git pull
npm.cmd install
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
npm.cmd run dev
```

Nếu migration đã được áp dụng trước đó, Prisma sẽ tự bỏ qua và chỉ chạy các
migration mới.

## 8. Xử lý database cũ báo lỗi P3005

Lỗi `P3005: The database schema is not empty` xảy ra khi database đã có bảng
nhưng chưa có lịch sử Prisma Migration. Không xóa database nếu đang có dữ liệu.

Sao lưu database, sau đó chỉ đánh dấu các migration cũ tương ứng với cấu trúc
đã tồn tại:

```powershell
npx.cmd prisma migrate resolve --applied 00000000000000_init
npx.cmd prisma migrate resolve --applied 20260727000000_make_employer_profile_optional_fields_nullable
npx.cmd prisma migrate resolve --applied 20260730000000_add_interview_invitation
npx.cmd prisma migrate resolve --applied 20260731000000_add_job_matching_fields
```

Tiếp theo chạy migration mới:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
```

Không chạy lệnh `resolve --applied` cho migration
`20260802000000_add_account_permissions` trước `migrate deploy`, vì migration
này phải thực sự tạo bảng `phan_quyen_tai_khoan`.

Kiểm tra bằng pgAdmin:

```sql
SELECT * FROM public.phan_quyen_tai_khoan;
```

## 9. Chạy dự án

Chạy đồng thời frontend và backend:

```powershell
npm.cmd run dev
```

Địa chỉ truy cập:

- Website: `http://localhost:3000`
- Backend API: `http://localhost:3001`

Nhấn `Ctrl + C` để dừng cả hai.

Các lệnh chạy riêng:

```powershell
npm.cmd run dev:backend
npm.cmd run dev:frontend
npm.cmd run prisma:studio
npm.cmd run build
```

## 10. Phân quyền RBAC

Phân quyền không phải là đổi vai trò tài khoản. Vai trò Người lao động hoặc
Nhà tuyển dụng được xác định khi đăng ký và không bị thay đổi trong quá trình
phân quyền.

Mỗi vai trò có một nhóm quyền mặc định. Cán bộ quản trị có thể cấp hoặc giới
hạn quyền riêng cho từng tài khoản tại:

```text
Quản trị → Tài khoản → Chi tiết → Phân quyền tài khoản
```

Các quyền được chia theo dữ liệu và hành động Xem, Thêm, Sửa, Xóa, gồm:

- Hồ sơ cá nhân và CV.
- Hồ sơ ứng tuyển và việc làm đã lưu.
- Hồ sơ nhà tuyển dụng.
- Tin tuyển dụng.
- Hồ sơ ứng viên.
- Thông báo.
- Tài khoản người dùng.
- Danh mục ngành nghề.
- Kiểm duyệt nhà tuyển dụng và tin tuyển dụng.
- Thống kê và xuất báo cáo.

Quyền riêng được lưu trong bảng `phan_quyen_tai_khoan`. Backend kiểm tra quyền
trên từng API nên người dùng không thể vượt quyền bằng cách nhập URL hoặc gọi
API trực tiếp. Phân quyền không xóa hồ sơ, tin tuyển dụng hoặc lịch sử ứng
tuyển của người dùng.

## 11. Chức năng chính

### Người lao động

- Đăng ký, xác thực OTP và đăng nhập.
- Quản lý hồ sơ, học vấn, kinh nghiệm, kỹ năng và CV.
- Tìm kiếm, lọc, lưu và ứng tuyển việc làm.
- Theo dõi trạng thái hồ sơ ứng tuyển.
- Xem thông báo và đổi mật khẩu.

### Nhà tuyển dụng

- Đăng ký và hoàn thiện hồ sơ doanh nghiệp.
- Tạo, xem và chỉnh sửa tin tuyển dụng.
- Xem ứng viên theo từng tin tuyển dụng.
- Xem CV, cập nhật trạng thái và mời phỏng vấn.
- Xem thông báo kết quả kiểm duyệt.

### Cán bộ quản trị

- Tìm kiếm, lọc, khóa và mở khóa tài khoản.
- Cấp hoặc giới hạn quyền theo từng tài khoản.
- Quản lý danh mục ngành nghề.
- Kiểm duyệt hồ sơ nhà tuyển dụng và tin tuyển dụng.
- Xem thống kê và xuất báo cáo.

## 12. Email OTP

Cấu hình SMTP trong `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FORCE_IPV4=false
SMTP_USER="email-cua-ban@gmail.com"
SMTP_PASSWORD="mat-khau-ung-dung"
SMTP_FROM_NAME="JobConnect"
SMTP_FROM_EMAIL="email-cua-ban@gmail.com"
```

Với Gmail, `SMTP_PASSWORD` phải là mật khẩu ứng dụng, không phải mật khẩu đăng
nhập Gmail thông thường.

## 13. Đưa thay đổi lên Git

Phải commit cả Prisma schema và migration:

```powershell
git add README.md prisma/schema.prisma prisma/migrations src frontend
git commit -m "feat: them phan quyen RBAC theo chuc nang"
git push
```

Không đưa các nội dung sau lên Git:

```text
.env
node_modules/
dist/
frontend/.next/
```

Migration phân quyền bắt buộc phải có trên Git:

```text
prisma/migrations/20260802000000_add_account_permissions/migration.sql
```

## 14. Một số lỗi thường gặp

### Bảng phân quyền chưa tồn tại

```text
The table public.phan_quyen_tai_khoan does not exist
```

Chạy:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run prisma:generate
```

### Không kết nối được backend

Kiểm tra backend đang chạy tại `http://localhost:3001` và biến
`NEXT_PUBLIC_API_URL` trong `.env`.

### Prisma không nhận biến DATABASE_URL

Kiểm tra file `.env` nằm tại thư mục gốc và `DATABASE_URL` đúng tên database,
cổng, tài khoản và mật khẩu PostgreSQL.

### Không chạy được seed

Đảm bảo đã khai báo `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME` và
`SEED_ADMIN_PASSWORD` trong `.env`.
