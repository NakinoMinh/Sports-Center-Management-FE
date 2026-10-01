# Kịch bản demo Sprint 1 của Long

## 1. Phần Long phụ trách

| UC | Chức năng | Vai trò demo |
| --- | --- | --- |
| SCMS-5 | Phân quyền theo vai trò | Manager, Receptionist, Member, Coach |
| SCMS-6 | Quản lý danh sách thành viên | Center Manager |
| SCMS-10 | Xem và so sánh gói đang hoạt động | Public/Member |
| SCMS-13 | Đăng ký thành viên mới tại quầy kèm gói | Receptionist |
| SCMS-14 | Kiểm tra trạng thái, ngày còn lại, sắp hết hạn và tạm ngưng | Receptionist |

SCMS-15 (gia hạn, xác nhận thanh toán, in hóa đơn) thuộc Minh. Kịch bản chỉ dùng bước xác nhận tiền mặt như chức năng phối hợp để chứng minh thành viên SCMS-13 chuyển từ chờ thanh toán sang hoạt động.

## 2. Chuẩn bị trên máy mới

### Công cụ

- Git, Docker Desktop, PowerShell 7, .NET 10 SDK và Node.js 20 trở lên.

### Clone đúng hai nhánh

~~~powershell
git clone --branch long/swp-sprint1-integration https://github.com/GiaHuyTranTra/SportsCenterManagement.git
git clone --branch long/swp-sprint1-integration https://github.com/NakinoMinh/Sports-Center-Management-System-FE.git
~~~

### Terminal 1 — database

~~~powershell
cd SportsCenterManagement
$saPassword = Read-Host "SQL Server sa password" -AsSecureString
$demoPassword = Read-Host "Demo account password" -AsSecureString
.\scripts\setup-long-local.ps1 -SaPassword $saPassword -DemoPassword $demoPassword
~~~

Mật khẩu SQL Server tự chọn phải đủ mạnh, ví dụ có chữ hoa, chữ thường, số và ký tự đặc biệt. Mật khẩu demo phải có ít nhất 8 ký tự và được dùng chung cho các tài khoản bên dưới; không dùng chung hai mật khẩu này.

### Terminal 1 — API

~~~powershell
.\scripts\run-long-api.ps1 -SaPassword $saPassword
~~~

Chờ dòng `Now listening on: http://localhost:5299`.

### Terminal 2 — frontend

~~~powershell
cd Sports-Center-Management-System-FE
.\scripts\run-long-fe.ps1
~~~

Mở `http://localhost:5174`.

## 3. Tài khoản demo

Mật khẩu chung: mật khẩu demo bạn vừa nhập khi dựng database.

| Vai trò | Email |
| --- | --- |
| Center Manager | `manager.test@sportscenter.local` |
| Receptionist | `receptionist.test@sportscenter.local` |
| Member | `member.active@sportscenter.local` |
| Coach | `coach.test@sportscenter.local` |

Khi đăng nhập: nhập email/mật khẩu → bấm **Gửi mã** → dùng **Mã xác nhận demo** đang hiển thị → bấm **Đăng nhập**.

## 4. Kịch bản trình bày

### Demo A — SCMS-5 phân quyền

1. Đăng nhập Receptionist.
2. Kiểm tra có menu **Đăng ký tại quầy** và **Kiểm tra gói tập**.
3. Truy cập trực tiếp `/manager/members`.
4. Kết quả mong đợi: không được sử dụng màn hình Manager.
5. Đăng xuất, đăng nhập Center Manager và mở **Quản lý thành viên** thành công.
6. Có thể lặp lại bằng Member/Coach để chứng minh mỗi vai trò chỉ thấy chức năng được cấp.

### Demo B — SCMS-10 danh sách gói

1. Tại trang chủ chọn **Khám phá & so sánh gói**.
2. Kết quả mong đợi: hiển thị 7 gói đang hoạt động với kỳ hạn 1/3/12 tháng.
3. Gói **Gói cũ ngừng bán 3 tháng** không xuất hiện ở danh mục public.

### Demo C — SCMS-13 đăng ký mới tại quầy

1. Đăng nhập Receptionist → **Đăng ký tại quầy**.
2. Chọn **Đăng ký thành viên mới tại quầy**.
3. Nhập dữ liệu chưa dùng, ví dụ:
   - Họ tên: `Nguyễn Văn Demo`.
   - Email: `long.demo.<giờ-phút>@sportscenter.local`.
   - Số điện thoại: một số 10 chữ số chưa dùng.
   - Ngày sinh: `2000-01-01`.
   - Gói: **Gói Cơ bản 1 tháng**.
   - Thanh toán: **Tiền mặt tại quầy**.
4. Bấm **Tạo thành viên & đăng ký gói**.
5. Kết quả mong đợi:
   - Hệ thống tạo tài khoản, mã thành viên, mật khẩu ban đầu và hóa đơn trong một request.
   - Mật khẩu chỉ hiển thị một lần để lễ tân bàn giao.
   - Hóa đơn và gói ở trạng thái **Chờ thanh toán**, chưa cấp quyền tập.

### Demo D — bước phối hợp SCMS-15

1. Từ hóa đơn vừa tạo chọn **Đến xác nhận thu tiền**.
2. Nhập đúng số tiền, đánh dấu đã kiểm tra và bấm **Xác nhận đã thu tiền**.
3. Kết quả mong đợi: hóa đơn chuyển sang đã thanh toán và gói được kích hoạt.

### Demo E — SCMS-14 kiểm tra trạng thái

1. Mở **Kiểm tra gói tập**.
2. Tìm `member.active@sportscenter.local`: trạng thái hoạt động và có số ngày còn lại.
3. Tìm `member.expiring@sportscenter.local`: hiển thị cảnh báo còn dưới 7 ngày.
4. Tìm `member.suspended@sportscenter.local`: hiển thị tạm ngưng và lý do.
5. Tìm member vừa tạo: sau thanh toán phải hiển thị hoạt động.

### Demo F — SCMS-6 quản lý thành viên

1. Đăng nhập Center Manager → **Quản lý thành viên**.
2. Tìm member vừa tạo theo tên, email hoặc số điện thoại.
3. Thử bộ lọc đang hoạt động/ngừng hoạt động và chuyển trang khi có trên 20 bản ghi.
4. Cập nhật thông tin member vừa tạo.
5. Khóa hoặc xóa mềm member vừa tạo.
6. Kết quả mong đợi: dữ liệu lịch sử gói/hóa đơn còn giữ; tài khoản không thể đăng nhập hoặc dùng token cũ.

## 5. Checklist sau demo

- [ ] Không có `Failed to fetch`.
- [ ] Không có lỗi API `404`; API base phải kết thúc bằng `/api`.
- [ ] Public chỉ thấy 7 gói hoạt động.
- [ ] Đăng ký tại quầy tạo hóa đơn `PENDING_PAYMENT`.
- [ ] Thanh toán kích hoạt gói.
- [ ] Trạng thái active/expiring/suspended hiển thị đúng.
- [ ] Manager tìm, cập nhật và xóa mềm member được.
- [ ] Receptionist/Member/Coach không truy cập chức năng Manager.

## 6. Lỗi thường gặp

| Lỗi | Cách xử lý |
| --- | --- |
| `Failed to fetch` | Kiểm tra API đang chạy ở 5299 và FE ở 5174; chạy lại đúng hai script. |
| API `404` | API URL phải là `http://localhost:5299/api`, không được thiếu `/api`. |
| Sai tài khoản hoặc OTP | Bấm **Gửi mã** trước, dùng mã demo mới nhất và mật khẩu demo đã nhập khi dựng database. |
| Container đã có nhưng sai mật khẩu | Dùng đúng SA password đã tạo container hoặc chọn tên container/cổng khác. |
| Cổng đang được sử dụng | Truyền cổng khác cho các tham số `SqlPort`, `ApiPort`, `FrontendPort` và `Port`. |
| Muốn làm lại database sạch | Chủ động chạy `docker rm -f scms-sql`, sau đó chạy lại setup. Thao tác này xóa toàn bộ dữ liệu local trong container đó. |
