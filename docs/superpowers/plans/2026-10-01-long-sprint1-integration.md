# Kế hoạch tích hợp Sprint 1 của Long

> Thực hiện trên hai worktree `long/swp-sprint1-integration`. Mỗi phần phải đi theo RED → GREEN → commit nhỏ.

## Bản đồ thay đổi

### Backend

- `DataAccess/Entities/Account.cs`: thêm thời điểm soft-delete.
- `DataAccess/Entities/MemberSubscription.cs`: thêm trạng thái tạm ngưng.
- `DataAccess/Entities/SportsCenterManagementContext.cs`: map ba cột mới.
- `Database/2026-10-01-long-sprint1-patch.sql`: patch DB idempotent.
- `APIViewModel/Member/*`: DTO quản lý và trạng thái hội viên.
- `APIViewModel/MemberSubscription/*`: request/response đăng ký mới tại quầy.
- `Services/MemberService/*`: tạo, cập nhật, soft-delete, tra trạng thái.
- `Services/MemberSubscriptionService/*`: transaction đăng ký mới và pending renewal.
- `Services/AuthService/*`, `SportsCenterManagement/Filter/AuthFilter.cs`: từ chối account đã xóa.
- `Services/EmailService/*`: gửi thông tin tài khoản mới nhưng không thay OTP hiện có.
- `SportsCenterManagement/Controllers/MemberController.cs`: expose các endpoint.
- `SportsCenterManagement.Tests/*`: test mapping, transaction, RBAC và session.
- `scripts/*`: import/clone DB và smoke test Sprint 1.

### Frontend

- `src/services/memberApi.ts`: gọi API đăng ký nguyên tử, không sinh mã/mật khẩu phía client.
- `src/components/membership/CounterRegistrationForm.tsx`: dùng một request và hiển thị kết quả pending.
- `src/services/apiIntegration.test.ts`: khóa contract request/response mới.

## Task 1 — Schema tối thiểu

1. Thêm test reflection/EF metadata cho `DeletedAt`, `IsSuspended`, `SuspensionReason` và chạy để thấy fail.
2. Thêm property + mapping tối thiểu.
3. Thêm SQL patch idempotent, không `USE` hoặc hard-code database.
4. Chạy test mapping và full BE tests.
5. Commit: `feat: add Sprint 1 membership state fields`.

## Task 2 — Đăng ký mới tại quầy nguyên tử

1. Thêm test service chứng minh request hợp lệ tạo đủ 4 bản ghi ở trạng thái pending.
2. Thêm test lỗi giữa transaction không để lại Account/Member.
3. Thêm DTO request/response và method service transactional.
4. Server sinh `AccountId`, `MemberCode`, mật khẩu, hash và invoice number.
5. Mở `POST /api/Member/counter-registration` cho Receptionist và CenterManager.
6. Mở rộng email service bằng method riêng, giữ nguyên toàn bộ method OTP/xác minh email.
7. Chạy test service, integration/RBAC và full BE tests.
8. Commit: `feat: add atomic counter member registration`.

## Task 3 — Gia hạn luôn chờ thanh toán

1. Thêm regression test cho counter renewal: invoice `PENDING_PAYMENT`, subscription `PENDING_PAYMENT`, chưa có `PaidAt/PaidBy`.
2. Sửa tối thiểu luồng renewal hiện tại.
3. Chạy test subscription/invoice và full BE tests.
4. Commit: `fix: keep counter renewals pending payment`.

## Task 4 — Quản lý và tra trạng thái hội viên

1. Thêm test create/update/soft-delete cho CenterManager.
2. Thêm test membership-status cho Receptionist với active, expiring, expired, suspended và pending.
3. Port DTO/service/controller tối thiểu, giữ endpoint profile hiện có.
4. Chạy test member service, authorization và full BE tests.
5. Commit: `feat: complete Sprint 1 member management APIs`.

## Task 5 — Chặn phiên của account đã xóa

1. Thêm test đăng nhập account có `DeletedAt` và request bằng token phát trước khi xóa.
2. Cập nhật auth/filter để cả hai trường hợp bị từ chối.
3. Không thay contract OTP, JWT claim hoặc CORS.
4. Chạy auth tests và full BE tests.
5. Commit: `fix: reject sessions for deleted accounts`.

## Task 6 — Nối frontend bằng một request

1. Sửa test integration để mong đợi đúng một request `POST /Member/counter-registration` và response pending; chạy để thấy fail.
2. Sửa adapter và form, bỏ sinh `MemberCode`/password phía client.
3. Không chỉnh layout hoặc CSS.
4. Chạy FE test, lint và build.
5. Commit: `feat: connect atomic counter registration`.

## Task 7 — Kiểm thử DB thật và host demo

1. Clone `SportsCenterManagement_SWP` thành `SportsCenterManagement_SWP_E2E`.
2. Ghi lại row count DB chính, áp patch lên DB clone.
3. Host BE bằng DB clone trên cổng `5299`, host FE trỏ vào BE đó.
4. Chạy smoke: login Receptionist/Manager, đăng ký mới, thanh toán, gia hạn, tra trạng thái, soft-delete và kiểm tra quyền.
5. Xác nhận row count DB chính không đổi; xóa dữ liệu E2E khi cần.
6. Chạy lại full BE test/build và FE test/lint/build.
7. Commit script/điều chỉnh cuối; push chỉ `long/swp-sprint1-integration` khi mọi kiểm tra đạt.
