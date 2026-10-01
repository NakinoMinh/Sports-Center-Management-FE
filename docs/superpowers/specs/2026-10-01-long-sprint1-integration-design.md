# Thiết kế tích hợp Sprint 1 của Long

## Mục tiêu

Tích hợp phần **Đăng ký & gia hạn hội viên tại quầy** từ backend cũ vào bộ mã mới trong thư mục `SWP`, giữ nguyên các tính năng OTP, xác minh email, hồ sơ, hóa đơn và cấu hình bảo mật đang có.

## Phạm vi

- Chỉ làm trên nhánh `long/swp-sprint1-integration` của FE và BE.
- Chỉ đánh giá/tích hợp tính năng; không chỉnh thiết kế màn hình.
- Dùng database `SportsCenterManagement_SWP`; thử nghiệm phá dữ liệu chạy trên bản sao `SportsCenterManagement_SWP_E2E`.
- Không merge nguyên nhánh cũ vì sẽ ghi đè phần OTP và tạo xung đột với code của Minh.

## Nghiệp vụ được chốt

### 1. Đăng ký hội viên mới tại quầy

- Receptionist hoặc CenterManager gọi một API nguyên tử: `POST /api/Member/counter-registration`.
- Server tự sinh `AccountId`, `MemberCode`, mật khẩu ban đầu và số hóa đơn.
- Một transaction tạo Account, Member, MemberSubscription và MembershipInvoice.
- Subscription và invoice bắt đầu ở trạng thái `PENDING_PAYMENT`; thanh toán dùng API hóa đơn hiện có.
- Nếu bất kỳ bước nào lỗi, toàn bộ transaction rollback; không để lại Member mồ côi.
- Email chào mừng là best-effort: lỗi gửi email không rollback dữ liệu, response phải báo trạng thái gửi.

### 2. Gia hạn tại quầy

- Dùng luồng counter renewal hiện có.
- Gia hạn chỉ tạo đơn/hóa đơn `PENDING_PAYMENT`; không tự đánh dấu `PAID/CONFIRMED`.
- Sau khi thu tiền, Receptionist/CenterManager gọi API thanh toán hóa đơn hiện có.

### 3. Quản lý hội viên

- CenterManager có thể tạo hội viên do hệ thống sinh mã/mật khẩu và soft-delete hội viên.
- Soft-delete ghi `Account.DeletedAt`, khóa phiên đăng nhập mới và từ chối token cũ.
- Không xóa vật lý dữ liệu liên quan.

### 4. Tra cứu trạng thái gói tập

- Receptionist có API tra cứu trạng thái hội viên, gồm gói hiện tại, số ngày còn lại, sắp hết hạn, tạm ngưng và gói kế tiếp.
- Hỗ trợ tìm kiếm và lọc trạng thái; không thay đổi giao diện trong đợt này.

## Thay đổi database tối thiểu

- `Account.DeletedAt datetime2 NULL`.
- `MemberSubscription.IsSuspended bit NOT NULL DEFAULT 0`.
- `MemberSubscription.SuspensionReason nvarchar(500) NULL`.
- Cung cấp script idempotent, không hard-code tên database và không sao chép dữ liệu từ DB cũ.

## Tương thích bắt buộc

- Giữ nguyên đăng nhập thống nhất, OTP đổi mật khẩu và xác minh email của code mới.
- Giữ nguyên CORS và User Secrets của code mới.
- Giữ nguyên API danh sách/thanh toán/hủy/in biên nhận hóa đơn.
- FE chuyển từ hai request tạo Member + subscription sang một request `counter-registration`.

## Tiêu chí nghiệm thu

- Test chứng minh lỗi giữa transaction không tạo Member mồ côi.
- Test chứng minh đăng ký mới và gia hạn đều chờ thanh toán.
- Test chứng minh account đã soft-delete không đăng nhập và token cũ bị từ chối.
- Full test/build FE và BE thành công.
- Smoke test chạy trên DB clone; số lượng bản ghi của DB chính không đổi.
- Chỉ push nhánh của Long, không push `main`, `master`, `Minh` hoặc `MinhBE`.
