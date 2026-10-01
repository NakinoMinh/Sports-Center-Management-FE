# SPORTS CENTER MANAGEMENT SYSTEM
## SYSTEM DESIGN DOCUMENT

**Project:** Sports Center Management System  
**Vietnamese Name:** Hệ thống Quản lý Trung tâm Thể thao  
**Document:** DESIGN.md  
**Version:** 1.1

---

# 0. Thiết kế áp dụng và đối chiếu implementation

### Bổ sung FE ngày 28/09/2026

Giao diện dùng bảng màu chung tại `src/styles/theme.css`: forest `#163d34`, nền tối `#102c26`, primary `#176b51`, lime `#d4ed9d`, nền giấy `#f8f9f5`, chữ `#203a32`. Áp dụng cho trang chủ, danh mục công khai, đăng nhập/đăng ký và toàn bộ workspace/dialog. Màu đỏ/vàng/tím chỉ giữ vai trò phản hồi lỗi, cảnh báo và tạm ngưng; không dùng làm màu thương hiệu từng trang.

UC5/6/10/13/14 tiếp tục dùng React hooks → service → dữ liệu trình duyệt, chưa thay contract hay gọi BE. `accessControl.ts` là chính sách role dùng chung; service re-read account để chặn role giả, tài khoản bị khóa, inactive hoặc đã xóa. API sau này vẫn phải kiểm tra danh tính từ token, role và ownership bằng middleware/policy trên mọi request.

`User` thêm `isActive?: boolean` và `deletedAt?: string`; dữ liệu cũ thiếu `isActive` mặc định hoạt động. Xóa Member là xóa mềm để bảo toàn FK logic với lịch sử; email của tài khoản đã xóa vẫn được giữ duy nhất. Phân biệt active/inactive của tài khoản với khóa do đăng nhập sai và trạng thái gói. Phân trang Member cố định 20 bản ghi, clamp trang khi lọc/xóa làm giảm số trang.

`memberService` cung cấp list/create/update/remove cho Manager. `registerMemberWithGeneratedCredentials` bọc luồng đăng ký tại quầy có sẵn, kiểm tra ngày sinh, tạo mật khẩu bằng Web Crypto, chỉ lưu BCrypt, giữ rollback tài khoản nếu tạo gói lỗi. Kết quả trả mật khẩu dùng một lần trong UI và `emailDelivery: NOT_CONNECTED`; không tạo log hoặc giả lập email thành công. Lưu trữ trình duyệt không thay thế transaction và gửi email server.

Danh mục `/packages` dùng `listPublicPackages`, loại gói ẩn và không trả dữ liệu Member. Ma trận quyền `/manager/access` là quyền cố định, không phải màn hình thay đổi role tài khoản. Kiểm thử bổ sung tại `memberService.test.ts` cho role, inactive/deleted, phân trang, validation và credential tại quầy; kiểm thử UC14 nằm tại `membershipService.test.ts`.

**Ngày đối chiếu:** 27/09/2026. **Phiên bản:** 1.1. Phạm vi nghiệp vụ và ưu tiên theo [PRODUCT.md](PRODUCT.md), đặc biệt mục 0.

Mục 1–74 bên dưới giữ thiết kế mục tiêu từ bản gốc, ngoại trừ lộ trình mục 70 được điều chỉnh theo sáu flow. Schema, endpoint và kiến trúc đề xuất trong bản gốc **không phải** danh sách những gì đã triển khai. Khi khác biệt, các ghi chú áp dụng tại mục 0 này có ưu tiên. Không đổi tên bảng, thay toàn bộ kiến trúc hay nối FE vào endpoint chỉ vì ví dụ thiết kế dùng tên khác.

## 0.1. Kiến trúc đang có

```text
FE: React 19 + TypeScript 6 + Vite 8 + React Router 7
main.tsx -> App.tsx -> AuthContext / WorkspaceLayout
                    -> pages/components -> services -> LocalStorage/sessionStorage

                    CHƯA NỐI API NGHIỆP VỤ

BE: ASP.NET Core net10.0 + Autofac + NSwag
SportsCenterManagement/Controllers
              -> Services -> DataAccess/Entities (EF Core SQL Server)
APIViewModel: request/response DTO
SportsCenterManagement.Tests: test xác thực
```

Phiên bản lấy từ package.json/csproj của checkout hiện tại, không phải khuyến nghị nâng cấp. FE tổ chức component, hook, context, service; không dùng MVVM. BE service truy cập DbContext trực tiếp; chưa có repository riêng, cũng chưa chia thành Domain/Application/Infrastructure như ví dụ mục 53. Mở rộng trong cấu trúc đang có, chỉ tái cấu trúc khi có nhu cầu và kế hoạch cụ thể.

FE HEAD `6557581` có thay đổi chưa commit, gồm màn hình trạng thái gói và nghiệp vụ lễ tân; chúng được tính vào đối chiếu. BE HEAD `e273a16`. Chưa chạy hệ thống/DB/API để chứng nhận tích hợp.

| Thành phần | Nguồn code |
| --- | --- |
| Route và quyền màn hình | [App.tsx](src/App.tsx), [WorkspaceLayout](src/components/layout/WorkspaceLayout.tsx) |
| Phiên demo, tài khoản | [authService](src/services/authService.ts), [mockDb](src/services/mockDb.ts), [auth types](src/types/auth.ts) |
| Gói/đơn/thu tiền | [membershipService](src/services/membershipService.ts), [membership types](src/types/membership.ts) |
| Điểm danh/đặt lớp/hỗ trợ tại quầy | [receptionService](src/services/receptionService.ts) |
| Controllers BE | `SportsCenterManagement/Controllers/AccountController.cs`, `AuthController.cs` trong repo BE |
| Service BE | `Services/AccountService`, `AuthService`, `AccessTokenService`, `PasswordHashService` |
| EF model BE | `DataAccess/Entities/SportsCenterManagementContext.cs` và entity cùng thư mục |
| Cấu hình pipeline BE | `SportsCenterManagement/Program.cs` |

Đường dẫn BE ở bảng trên tính từ `D:/SWP/SportsCenterManagement`. Không sao chép cấu hình bí mật/connection string vào tài liệu.

## 0.2. Domain thực tế và mapping sang thiết kế đích

| Thiết kế gốc | Hiện tại | Hướng áp dụng |
| --- | --- | --- |
| User, UserRole N:N, Permission | BE Account có một RoleId; Role; chưa có UserRole/Permission/RolePermission | Giữ Account và một role hiện tại; nhiều role/permission động là mở rộng cần thiết kế migration, không giả định đã có |
| Member, Coach, Staff | BE Member, Coach, CenterManager, Receptionist có liên kết Account 1:1 | Không tạo thêm User/Staff trùng dữ liệu; map DTO và xem xét nhu cầu Staff chung sau |
| MembershipPackage | FE durationMonths: 1/3/12, benefits[], price, isActive; BE chưa có | Dùng kỳ hạn tháng theo hành vi FE; duration_days ở mục 14 chỉ là phương án gốc, không đổi tháng thành 30 ngày |
| Subscription | FE lưu CONFIRMED/PENDING_PAYMENT/CANCELED; suy ra trạng thái hiển thị theo ngày, replacedOn, isSuspended | Tách trạng thái thanh toán, quyền sử dụng theo ngày và tạm ngưng; không map CONFIRMED trực tiếp thành ACTIVE |
| Payment + Invoice | FE MembershipInvoice gộp thông tin đơn/thu tiền, chưa có Payment entity riêng | BE cần mô hình đơn/pending, payment và invoice có liên kết; snapshot giá/quyền lợi; chỉ paid cấp quyền theo ngày |
| Sport/Room/Class/Schedule | FE ClassSession mẫu gộp name/discipline/coach/room/date/time/capacity bằng chuỗi | BE cần ID/quan hệ thực như mục 9–13; không dùng tên Coach/phòng làm khóa |
| Registration | FE BOOKED/CANCELED theo sessionId | Chuẩn hóa mapping sang REGISTERED/CANCELLED/COMPLETED nếu chọn enum gốc; lưu lịch sử hủy |
| Attendance | FE CenterVisit có ngày vào/ra, không gắn buổi học | Tách CenterVisit/CheckIn với điểm danh lớp; không bắt buộc classScheduleId cho check-in trung tâm |
| SupportRequest | FE OPEN/IN_PROGRESS/RESOLVED và updates[] | Cần persistence, quyền, lịch sử; CLOSED trong bản gốc chưa được FE hỗ trợ |
| AuditLog | BE đã có entity/DbSet | Chưa thấy code ghi log nghiệp vụ hoặc endpoint đọc; metadata createdBy/paidBy không thay thế audit |
| Training/AI/Notification/Report | Chưa thấy module nghiệp vụ | Thiết kế mục tiêu, không báo đã hoàn thành |

Bảy DbSet hiện có: Account, AuditLog, CenterManager, Coach, Member, Receptionist, Role. EF có unique index Email, MemberCode, Role.Name. Các index/constraint khác ở mục 68–69 là việc cần bổ sung, không mô tả DB đã triển khai; DB thực tế chưa được kiểm tra.

## 0.3. API thật tìm thấy trong source BE

Tất cả endpoint dưới đây là POST và chưa được FE hiện tại gọi:

| Endpoint | Hành vi trong controller |
| --- | --- |
| `/api/Account/Create_center_manager` | Tạo Account + hồ sơ Manager, trả chuỗi hoặc lỗi |
| `/api/Account/Create_coach` | Tạo Account + Coach |
| `/api/Account/Create_member` | Tạo Account + Member; DTO cần Email/Password/FullName/Phone/MemberCode |
| `/api/Account/Create_receptionist` | Tạo Account + Receptionist |
| `/api/Auth/Login_center_manager` | Login role CenterManager, trả chuỗi JWT |
| `/api/Auth/Login_coach` | Login role Coach, trả chuỗi JWT |
| `/api/Auth/Login_member` | Login role Member, trả chuỗi JWT |
| `/api/Auth/Login_receptionist` | Login role Receptionist, trả chuỗi JWT |
| `/api/Auth/Logout` | Authorize; blacklist token bằng IMemoryCache 60 phút |
| `/api/Auth/check-token` | Authorize + AuthFilter; trả AccountId/Email/Role |

Chưa có API package/subscription/payment/invoice/class/report/training/AI trong checkout BE này. Các endpoint `/api/v1/...` tại mục 27–43 là **đề xuất đích**.

## 0.4. Contract tích hợp cần thống nhất

Tài liệu handoff BE riêng đã được gỡ khỏi repo. Bản DESIGN gốc đề xuất `/api/v1`, `{ success, message, data }` và `totalItems`. Backend thật đang trả chuỗi/DTO riêng. Chưa có contract thống nhất đã triển khai.

Khi nối API, cần công bố OpenAPI trước; versioning/envelope cuối cùng phải được thống nhất giữa FE/BE và cập nhật tài liệu trong cùng thay đổi. Không triển khai song song hai biến thể vì đọc các ví dụ khác nhau. Việc chuẩn hóa không được âm thầm phá endpoint đang sử dụng.

| Điểm không khớp | Cần xử lý |
| --- | --- |
| Role BE CenterManager/Coach/Member/Receptionist, FE CENTER_MANAGER/COACH/MEMBER/RECEPTIONIST | Map rõ ở DTO/adapter; authorization kiểm tra theo claim/schema chính thức |
| FE login chung không chọn role, BE 4 endpoint | Bổ sung login chung hoặc contract phù hợp; không thử tuần tự 4 login API |
| FE register có username, fullName tùy chọn; BE không có Username, yêu cầu Phone/MemberCode/FullName | Tách public registration khỏi hồ sơ tại quầy; mã Member sinh ở server theo quyết định contract; không điền dữ liệu giả |
| FE session opaque `scms-demo.*`, 24 giờ, iat/exp milliseconds | Không gửi token demo sang BE; JWT thật do BE cấp, JWT NumericDate dùng giây, adapter chuyển rõ đơn vị |
| BE JwtOptions mặc định 60 phút; FE 24 giờ | Thống nhất thời hạn cấu hình và response expiresAt; refresh-token trong mục 28/61 là đề xuất, chưa có implementation |
| ID FE user/member | Handoff đề xuất dùng Account.Id cho memberId; công bố rõ mapping với Member profile và MemberCode |
| Tiền/ngày/trạng thái | VND số nguyên, lưu số tiền chính xác; ngày quyền tập YYYY-MM-DD tính cả hai đầu; chuẩn nghiệp vụ Asia/Ho_Chi_Minh, timestamp UTC; code FE hiện dựa đồng hồ trình duyệt |

Không lấy actor/createdBy/paidBy do client gửi để quyết định quyền; server xác định người thao tác từ danh tính đã xác thực và kiểm tra ownership.

## 0.5. Khoảng trống cần sửa trước tích hợp thật

1. AccountController hiện chưa gắn Authorize, Program chưa có fallback policy; tạo Manager/Coach/Receptionist phải được bảo vệ. Đăng ký public chỉ cấp Member. Không coi route guard FE là bảo vệ dữ liệu server.
2. AuthService có BCrypt, kiểm tra trạng thái/khóa và đếm sai tới 5; chưa reset FailedLoginCount khi login đúng. Chuẩn hóa lỗi và xử lý trường hợp chưa seed role.
3. Blacklist mới được kiểm tra bằng AuthFilter ở check-token; cần áp dụng trên mọi API bảo vệ, thời hạn tới lúc JWT hết hạn. IMemoryCache không giữ qua restart/không chia sẻ giữa instance.
4. Program chưa có AddCors/UseCors cho frontend chạy origin riêng. Cấu hình origin theo môi trường khi tích hợp.
5. Chưa thấy transaction/locking cho các nghiệp vụ membership/payment/booking vì BE chưa có module. Một lần ghi LocalStorage không bảo đảm đồng thời giữa nhiều thiết bị/tab.
6. Chưa có module phân quyền chi tiết, audit service/API, notification/background job hoặc báo cáo. Có entity hoặc dashboard placeholder không đủ đáp ứng FR.

Đây là kết quả đối chiếu source, không phải thay đổi code đã thực hiện trong lần cập nhật tài liệu này.

## 0.6. Ràng buộc thiết kế cho phần tiếp theo

- **Membership/payment (F1/F3):** lưu snapshot khi lập đơn; pending không cấp quyền. Xác nhận thu tiền cập nhật Payment/Invoice/Subscription nguyên tử; dùng idempotency và kiểm tra trạng thái để chống thu lặp. Báo giá và khấu trừ do server tính lại/kiểm chứng theo PRODUCT 0.4. Paid trong tương lai hiển thị UPCOMING, không ACTIVE. Giữ lịch sử khi đổi gói.
- **Booking (F2):** kiểm tra tài khoản, membership vào ngày học, quyền bộ môn/lớp, sức chứa, duplicate và khoảng giờ giao nhau. Chống trùng phòng/Coach khi tạo hoặc sửa lịch; kiểm tra đăng ký hiện có khi đổi/hủy lịch. Transaction phải kèm cơ chế serialization/lock/optimistic retry phù hợp cho slot cuối; transaction đơn thuần không tự ngăn race condition.
- **Package permission:** benefits là nội dung hiển thị; nếu gói hạn chế bộ môn thì cần quan hệ package_sports hoặc entitlement có cấu trúc. Không suy diễn quyền từ chuỗi mô tả.
- **Reports (F3):** API Manager, lọc từ/đến theo ngày nghiệp vụ. Doanh thu dựa trên giao dịch đã thu và paidAt, không tính pending/canceled; định nghĩa hoàn tiền trước khi bổ sung refund. Thống nhất cách đếm Member active, số đăng ký và các kỳ tương lai để báo cáo khớp chi tiết.
- **Audit/notifications/support:** ghi người thao tác/sự kiện/thực thể/thời điểm phía server; log không chứa password/token. Notification gắn người nhận và ownership; job nhắc lịch/hạn gói cần tránh gửi trùng. Support lưu cả lịch sử cập nhật.
- **Training/attendance (F4):** plan có đúng một đích cá nhân hoặc lớp; Coach chỉ thao tác phạm vi được phân công. CenterVisit khác class attendance. Bổ sung model bài tập về nhà và mục tiêu/trình độ vì bản model gốc chưa mô tả đầy đủ phần này.
- **AI (F5/F6):** backend chọn context tối thiểu sau kiểm tra quyền; chỉ gợi ý, Coach quyết định lưu. Chưa chọn nhà cung cấp; không thêm phụ thuộc AI vào các flow bắt buộc.

## 0.7. Lộ trình và kiểm chứng

Ưu tiên thực hiện theo PRODUCT 0.5 và mục 70 đã chỉnh: nền tảng/F1 → F2 → hoàn thiện F3/báo cáo, bổ sung yêu cầu actor → F4/F5/F6 tùy chọn. Payment có thể phát triển song song F1. Không đẩy báo cáo sang sau AI hoặc coi attendance là điều kiện bắt buộc để xong MVP.

Các bộ test hiện có: FE `src/services/*.test.ts`, `src/utils/format.test.ts` dùng Vitest; BE `SportsCenterManagement.Tests` tập trung authentication/password/JWT. Trong lần tài liệu này chỉ đọc source, không chạy lại test ứng dụng. Khi triển khai nghiệp vụ mới, cần kiểm thử server cho quyền/ownership, rollback, retry thanh toán, hai đăng ký tranh chỗ cuối, biên tháng và múi giờ; sau đó kiểm tra đường đi FE–API–DB. Cập nhật ma trận PRODUCT bằng kết quả thực tế và ngày xác minh.

---

# 1. System Overview

Sports Center Management System được thiết kế theo kiến trúc nhiều tầng nhằm tách biệt:

- User Interface.
- API.
- Business Logic.
- Data Access.
- Database.
- External Services.
- AI Services.

Kiến trúc tổng quát:

```text
┌───────────────────────────────┐
│          CLIENT               │
│                               │
│ Manager / Coach / Member      │
│ Receptionist                  │
└───────────────┬───────────────┘
                │ HTTPS
                ▼
┌───────────────────────────────┐
│          API LAYER            │
│                               │
│ Controllers / Endpoints       │
│ Authentication                │
│ Authorization                 │
│ Validation                    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│        SERVICE LAYER          │
│                               │
│ Business Rules                │
│ Membership Logic              │
│ Scheduling Logic              │
│ Attendance Logic              │
│ Payment Logic                 │
│ Training Logic                │
└───────────────┬───────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐   ┌──────────────┐
│ Repository   │   │ AI Service   │
│ / Data Layer │   │              │
└──────┬───────┘   └──────────────┘
       │
       ▼
┌───────────────────────────────┐
│           DATABASE            │
└───────────────────────────────┘
```

---

# 2. Recommended Architecture

```text
Frontend
   │
   │ REST API / HTTPS
   ▼
Backend API
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   │
   ▼
Application / Service Layer
   │
   ├── Business Logic
   ├── DTO Mapping
   ├── Transaction Management
   │
   ▼
Repository / Infrastructure
   │
   ▼
Database
```

External integrations:

```text
Backend
 ├── AI Provider
 ├── Email Service
 ├── Notification Service
 └── Payment Provider (optional)
```

---

# 3. Role Design

```text
User
│
├── Center Manager
├── Coach
├── Member
└── Receptionist
```

Mọi người dùng sử dụng một hệ thống tài khoản chung.

Quyền truy cập được xác định bởi:

```text
User
  ↓
UserRole
  ↓
Role
  ↓
RolePermission
  ↓
Permission
```

Thiết kế này cho phép mở rộng quyền mà không cần hard-code toàn bộ authorization.

---

# 4. Core Domain Model

Các domain chính:

```text
User
Role
Permission

Member
Coach
Staff

Sport
Room
Class
ClassSchedule
ClassRegistration

MembershipPackage
MembershipSubscription

Payment
Invoice

Attendance

TrainingPlan
TrainingPlanExercise
TrainingResult

Notification
SupportRequest

AuditLog
```

---

# 5. Database Design

## 5.1. Users

```text
users
-------------------------
id
full_name
email
phone
password_hash
date_of_birth
gender
address
status
created_at
updated_at
```

---

## 5.2. Roles

```text
roles
-------------------------
id
name
description
```

Role mặc định:

```text
CENTER_MANAGER
COACH
MEMBER
RECEPTIONIST
```

---

## 5.3. User Roles

```text
user_roles
-------------------------
user_id
role_id
```

Relationship:

```text
users N ---- N roles
```

---

# 6. Member

```text
members
-------------------------
id
user_id
member_code
join_date
status
created_at
updated_at
```

Relationship:

```text
User 1 ---- 0..1 Member
```

---

# 7. Coach

```text
coaches
-------------------------
id
user_id
coach_code
specialization
experience
bio
status
created_at
updated_at
```

---

# 8. Staff

```text
staff
-------------------------
id
user_id
staff_code
position
status
created_at
updated_at
```

Receptionist có thể được biểu diễn thông qua User + Role + Staff record.

---

# 9. Sports

```text
sports
-------------------------
id
name
description
status
created_at
updated_at
```

---

# 10. Rooms

```text
rooms
-------------------------
id
name
location
capacity
room_type
status
created_at
updated_at
```

---

# 11. Classes

```text
classes
-------------------------
id
sport_id
name
description
capacity
status
created_at
updated_at
```

Relationship:

```text
Sport
  │
  └── 1:N
      Class
```

---

# 12. Class Schedule

```text
class_schedules
-------------------------
id
class_id
coach_id
room_id
start_time
end_time
status
created_at
updated_at
```

Relationship:

```text
Class ──────┐
Coach ──────┼── ClassSchedule
Room ───────┘
```

Business constraints:

```text
start_time < end_time

No Coach time overlap.

No Room time overlap.
```

---

# 13. Class Registration

```text
class_registrations
-------------------------
id
member_id
class_schedule_id
registered_at
status
cancelled_at
created_at
updated_at
```

Status:

```text
REGISTERED
CANCELLED
COMPLETED
```

Relationship:

```text
Member
   │
   │ 1:N
   ▼
ClassRegistration
   │
   │ N:1
   ▼
ClassSchedule
```

---

# 14. Membership Package

```text
membership_packages
-------------------------
id
name
description
duration_days
price
status
created_at
updated_at
```

Nếu các package chỉ được tham gia một số bộ môn, có thể bổ sung:

```text
package_sports
-------------------------
package_id
sport_id
```

---

# 15. Membership Subscription

```text
membership_subscriptions
-------------------------
id
member_id
package_id
start_date
end_date
price
status
created_at
updated_at
```

Status:

```text
PENDING
ACTIVE
EXPIRED
CANCELLED
```

Relationship:

```text
Member
   │
   └── MembershipSubscription
              │
              └── MembershipPackage
```

---

# 16. Payment

```text
payments
-------------------------
id
member_id
subscription_id
amount
payment_method
payment_status
reference_code
paid_at
created_by
created_at
updated_at
```

Payment methods có thể gồm:

```text
CASH
BANK_TRANSFER
CARD
ONLINE_PAYMENT
```

Status:

```text
PENDING
PAID
FAILED
REFUNDED
```

---

# 17. Invoice

```text
invoices
-------------------------
id
payment_id
invoice_number
issued_at
total_amount
created_at
```

Relationship:

```text
Payment 1 ---- 0..1 Invoice
```

---

# 18. Attendance

```text
attendances
-------------------------
id
member_id
class_schedule_id
check_in_time
status
recorded_by
created_at
updated_at
```

Status:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

---

# 19. Training Plan

```text
training_plans
-------------------------
id
coach_id
member_id
class_id
title
goal
description
start_date
end_date
status
created_at
updated_at
```

Nếu:

```text
member_id != null
```

→ Individual Plan.

Nếu:

```text
class_id != null
```

→ Class Plan.

Hệ thống phải đảm bảo một plan có target hợp lệ.

---

# 20. Exercise

Nên tách Exercise thành entity riêng để tái sử dụng.

```text
exercises
-------------------------
id
name
description
difficulty
instructions
status
created_at
updated_at
```

---

# 21. Training Plan Exercise

```text
training_plan_exercises
-------------------------
id
training_plan_id
exercise_id
sets
repetitions
duration_minutes
rest_seconds
notes
exercise_order
```

Relationship:

```text
TrainingPlan
      │
      │ 1:N
      ▼
TrainingPlanExercise
      │
      │ N:1
      ▼
Exercise
```

---

# 22. Training Result

```text
training_results
-------------------------
id
member_id
training_plan_id
class_schedule_id
coach_id
result
completion_level
coach_comment
recorded_at
created_at
updated_at
```

---

# 23. Notifications

```text
notifications
-------------------------
id
user_id
title
message
type
is_read
created_at
read_at
```

Notification Type:

```text
CLASS_REMINDER
SCHEDULE_CHANGED
CLASS_CANCELLED
PACKAGE_EXPIRING
PACKAGE_EXPIRED
TRAINING_PLAN
COACH_MESSAGE
SYSTEM
```

---

# 24. Support Request

```text
support_requests
-------------------------
id
member_id
title
content
status
assigned_to
resolution
created_at
updated_at
resolved_at
```

---

# 25. Audit Log

```text
audit_logs
-------------------------
id
user_id
action
entity_type
entity_id
description
created_at
```

Ví dụ:

```text
User: Manager01

Action:
UPDATE_CLASS

Entity:
Class

EntityId:
CLS001

Description:
Changed class capacity from 20 to 25.
```

---

# 26. Entity Relationship Overview

```text
User
 ├──── UserRole ──── Role ──── Permission
 │
 ├──── Member
 │       │
 │       ├──── MembershipSubscription
 │       │          │
 │       │          └──── MembershipPackage
 │       │
 │       ├──── ClassRegistration
 │       │          │
 │       │          └──── ClassSchedule
 │       │
 │       ├──── Attendance
 │       │
 │       ├──── Payment
 │       │
 │       └──── TrainingResult
 │
 ├──── Coach
 │       │
 │       ├──── ClassSchedule
 │       └──── TrainingPlan
 │
 └──── Staff

Sport
 │
 └──── Class
         │
         └──── ClassSchedule
                  │
                  ├──── Coach
                  ├──── Room
                  ├──── ClassRegistration
                  └──── Attendance

TrainingPlan
 │
 └──── TrainingPlanExercise
             │
             └──── Exercise
```

---

# 27. API Design

Base URL:

```text
/api/v1
```

---

# 28. Authentication API

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

---

# 29. Member API

```http
GET    /api/v1/members
GET    /api/v1/members/{id}
POST   /api/v1/members
PUT    /api/v1/members/{id}
PATCH  /api/v1/members/{id}/status

GET    /api/v1/members/me
PUT    /api/v1/members/me
```

---

# 30. Coach API

```http
GET    /api/v1/coaches
GET    /api/v1/coaches/{id}
POST   /api/v1/coaches
PUT    /api/v1/coaches/{id}

GET    /api/v1/coaches/me
GET    /api/v1/coaches/me/classes
GET    /api/v1/coaches/me/schedules
```

---

# 31. Sports API

```http
GET    /api/v1/sports
GET    /api/v1/sports/{id}
POST   /api/v1/sports
PUT    /api/v1/sports/{id}
PATCH  /api/v1/sports/{id}/status
```

---

# 32. Room API

```http
GET    /api/v1/rooms
GET    /api/v1/rooms/{id}
POST   /api/v1/rooms
PUT    /api/v1/rooms/{id}
PATCH  /api/v1/rooms/{id}/status
```

---

# 33. Class API

```http
GET    /api/v1/classes
GET    /api/v1/classes/{id}

POST   /api/v1/classes
PUT    /api/v1/classes/{id}

PATCH  /api/v1/classes/{id}/status

GET    /api/v1/classes/{id}/members
```

---

# 34. Schedule API

```http
GET    /api/v1/schedules
GET    /api/v1/schedules/{id}

POST   /api/v1/schedules
PUT    /api/v1/schedules/{id}
DELETE /api/v1/schedules/{id}

GET    /api/v1/coaches/{coachId}/schedules
GET    /api/v1/classes/{classId}/schedules
```

---

# 35. Class Registration API

```http
POST
/api/v1/class-registrations

DELETE
/api/v1/class-registrations/{id}

GET
/api/v1/members/me/class-registrations
```

Receptionist:

```http
POST
/api/v1/members/{memberId}/class-registrations

DELETE
/api/v1/members/{memberId}/class-registrations/{registrationId}
```

---

# 36. Membership API

```http
GET    /api/v1/membership-packages
GET    /api/v1/membership-packages/{id}

POST   /api/v1/membership-packages
PUT    /api/v1/membership-packages/{id}

POST
/api/v1/membership-subscriptions

POST
/api/v1/membership-subscriptions/{id}/renew

GET
/api/v1/members/me/membership
```

---

# 37. Payment API

```http
POST
/api/v1/payments

GET
/api/v1/payments/{id}

GET
/api/v1/members/{memberId}/payments

GET
/api/v1/members/me/payments
```

---

# 38. Attendance API

Coach:

```http
POST
/api/v1/schedules/{scheduleId}/attendance
```

Receptionist:

```http
POST
/api/v1/check-ins
```

Member:

```http
GET
/api/v1/members/me/attendance
```

---

# 39. Training API

```http
POST
/api/v1/training-plans

GET
/api/v1/training-plans/{id}

PUT
/api/v1/training-plans/{id}

GET
/api/v1/members/{memberId}/training-plans

GET
/api/v1/members/me/training-plans
```

Results:

```http
POST
/api/v1/training-results

GET
/api/v1/members/{memberId}/training-results

GET
/api/v1/members/me/training-results
```

---

# 40. Notification API

```http
GET
/api/v1/notifications/me

PATCH
/api/v1/notifications/{id}/read

PATCH
/api/v1/notifications/read-all
```

---

# 41. AI API

Coach exercise recommendation:

```http
POST
/api/v1/ai/exercise-recommendation
```

Example request:

```json
{
  "memberId": "MEM001",
  "goal": "Weight Loss",
  "level": "Beginner"
}
```

Member assistant:

```http
POST
/api/v1/ai/chat
```

Request:

```json
{
  "message": "Lịch tập tuần này của tôi là gì?"
}
```

Backend xác định Member từ authenticated user thay vì cho client tự truyền Member ID khi truy cập dữ liệu cá nhân.

---

# 42. Reports API

```http
GET
/api/v1/reports/members

GET
/api/v1/reports/classes

GET
/api/v1/reports/revenue
```

Ví dụ:

```http
GET /api/v1/reports/revenue?from=2026-01-01&to=2026-12-31
```

Chỉ Center Manager được truy cập.

---

# 43. Audit API

```http
GET /api/v1/audit-logs
GET /api/v1/audit-logs/{id}
```

Hỗ trợ:

```text
Pagination
Filtering
Sorting
Date Range
User Filter
Action Filter
```

---

# 44. Standard API Response

Success:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Class registration failed",
  "errors": [
    "Class capacity has been reached"
  ]
}
```

---

# 45. Pagination

Request:

```http
GET /api/v1/members?page=1&pageSize=20
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

---

# 46. Authentication Flow

```text
User
 │
 │ Login
 ▼
Frontend
 │
 │ POST /auth/login
 ▼
Backend
 │
 ├── Validate account
 ├── Validate password
 └── Generate token
 │
 ▼
Frontend
 │
 │ Store/use token securely
 ▼
Protected API
 │
 │ Authorization
 ▼
Role / Permission Check
```

---

# 47. Class Registration Flow

```text
Member
   │
   ▼
Select Class Schedule
   │
   ▼
Check Membership
   │
   ├── Invalid → Reject
   │
   ▼
Check Package Permission
   │
   ├── Invalid → Reject
   │
   ▼
Check Capacity
   │
   ├── Full → Reject
   │
   ▼
Check Schedule Conflict
   │
   ├── Conflict → Reject
   │
   ▼
Create Registration
   │
   ▼
Send Notification
```

Capacity checking và registration creation nên được xử lý trong cùng transaction để tránh nhiều người đăng ký đồng thời làm vượt sức chứa.

---

# 48. Membership Purchase Flow

```text
Member
   │
   ▼
Select Package
   │
   ▼
Create Subscription
(PENDING)
   │
   ▼
Create Payment
   │
   ▼
Payment Successful?
   │
   ├── No
   │     ↓
   │   Keep Pending / Failed
   │
   └── Yes
         ↓
     Activate Subscription
         ↓
      Create Invoice
         ↓
      Notify Member
```

---

# 49. Attendance Flow

```text
Member arrives
     │
     ▼
Receptionist searches Member
     │
     ▼
Check Account
     │
     ▼
Check Membership
     │
     ├── Invalid → Warning/Reject according to policy
     │
     ▼
Create Check-in
```

Đối với lớp:

```text
Coach
  ↓
Open Class Session
  ↓
View Registered Members
  ↓
Mark Attendance
  ↓
Save
```

---

# 50. AI Recommendation Flow

```text
Coach
 │
 ▼
Select Member
 │
 ▼
Backend
 │
 ├── Get Member Goal
 ├── Get Training History
 ├── Get Previous Results
 └── Build AI Context
 │
 ▼
AI Service
 │
 ▼
Exercise Recommendation
 │
 ▼
Coach Reviews Recommendation
 │
 ├── Accept
 ├── Modify
 └── Reject
 │
 ▼
Coach creates/updates Training Plan
```

AI không được tự động ghi recommendation thành Training Plan.

---

# 51. Member AI Chat Flow

```text
Member
   │
   ▼
Ask Question
   │
   ▼
Backend
   │
   ├── Authenticate Member
   ├── Determine Intent
   ├── Load Authorized Data
   └── Build Context
   │
   ▼
AI
   │
   ▼
Generate Answer
   │
   ▼
Member
```

Ví dụ:

```text
Member:
"Lịch tập ngày mai của tôi?"

System:
→ xác định authenticated member
→ lấy registrations/schedules
→ chỉ gửi dữ liệu cần thiết cho AI
→ trả câu trả lời.
```

---

# 52. Authorization Design

Có thể áp dụng:

```text
Role-Based Access Control (RBAC)
```

Ví dụ permission:

```text
MEMBER_VIEW
MEMBER_CREATE
MEMBER_UPDATE

CLASS_VIEW
CLASS_CREATE
CLASS_UPDATE
CLASS_CANCEL

ATTENDANCE_CREATE
ATTENDANCE_VIEW

TRAINING_PLAN_CREATE
TRAINING_PLAN_UPDATE

PAYMENT_CREATE
PAYMENT_VIEW

REPORT_VIEW

ROLE_MANAGE
AUDIT_VIEW
```

Center Manager có tập permission quản trị.

Coach chỉ nhận permission chuyên môn.

Receptionist nhận permission nghiệp vụ tại quầy.

Member chủ yếu thao tác trên dữ liệu của chính mình.

---

# 53. Backend Project Structure

Cấu trúc đề xuất:

```text
src/
│
├── Api/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Filters/
│   └── Configuration/
│
├── Application/
│   ├── DTOs/
│   ├── Interfaces/
│   ├── Services/
│   ├── Validators/
│   └── Mappings/
│
├── Domain/
│   ├── Entities/
│   ├── Enums/
│   ├── Exceptions/
│   └── Rules/
│
└── Infrastructure/
    ├── Persistence/
    ├── Repositories/
    ├── Authentication/
    ├── AI/
    ├── Email/
    ├── Payment/
    └── Notifications/
```

Dependency direction:

```text
API
 ↓
Application
 ↓
Domain

Infrastructure
 ↓
Application / Domain interfaces
```

---

# 54. Frontend Structure

```text
src/
│
├── pages/
│   ├── auth/
│   ├── manager/
│   ├── coach/
│   ├── member/
│   └── receptionist/
│
├── components/
│
├── layouts/
│   ├── ManagerLayout
│   ├── CoachLayout
│   ├── MemberLayout
│   └── ReceptionistLayout
│
├── services/
│   ├── auth
│   ├── member
│   ├── class
│   ├── membership
│   ├── payment
│   ├── training
│   └── ai
│
├── hooks/
├── utils/
└── models/
```

---

# 55. Manager Dashboard

Manager Dashboard có thể hiển thị:

```text
┌──────────────────────────────────────────┐
│ Sports Center Management                │
├────────────┬────────────┬────────────────┤
│ Members    │ Classes    │ Revenue        │
│   1,250    │    32      │ 250,000,000đ   │
├────────────┴────────────┴────────────────┤
│                                          │
│ Revenue Chart                            │
│                                          │
├──────────────────────────────────────────┤
│ Membership Statistics                    │
├──────────────────────────────────────────┤
│ Upcoming Classes                         │
└──────────────────────────────────────────┘
```

Sidebar:

```text
Dashboard

Members
Coaches
Staff

Sports
Classes
Schedules
Rooms

Membership Packages
Payments

Reports

Roles & Permissions
Audit Logs
```

---

# 56. Coach Dashboard

```text
Dashboard

My Schedule
My Classes

Members

Training Plans
Training Results

Attendance

AI Exercise Assistant

Notifications
```

Trang Dashboard có thể hiển thị:

- Lớp hôm nay.
- Số học viên.
- Lịch dạy sắp tới.
- Các Training Plan đang hoạt động.
- Member cần cập nhật kết quả.

---

# 57. Member Dashboard

```text
Home

My Membership

Classes
My Classes
My Schedule

Training Plan
Training Results

Attendance History

AI Assistant

Payments

Notifications

Profile
```

Dashboard ưu tiên:

- Gói hiện tại.
- Ngày hết hạn.
- Buổi tập tiếp theo.
- Lớp đã đăng ký.
- Training Plan.
- Thông báo mới.

---

# 58. Receptionist Dashboard

```text
Dashboard

Members

Membership
Check-in

Class Registration

Payments
Invoices

Support Requests
```

Dashboard ưu tiên các thao tác nhanh:

```text
Search Member

New Member

Renew Membership

Check-in

Register Class

Create Payment
```

---

# 59. Validation

Ví dụ:

### Email

```text
Required
Valid email format
Unique
```

### Phone

```text
Required
Valid phone format
```

### Class Capacity

```text
capacity > 0
```

### Price

```text
price >= 0
```

### Schedule

```text
start_time < end_time
```

### Membership

```text
start_date <= end_date
```

Validation phải tồn tại ở backend ngay cả khi frontend đã kiểm tra.

---

# 60. Concurrency

Các nghiệp vụ cần đặc biệt chú ý concurrency:

```text
Class Registration
Membership Activation
Payment Processing
Attendance
```

Ví dụ hai Member đăng ký slot cuối cùng:

```text
Available = 1

Member A ─┐
          ├── Register simultaneously
Member B ─┘
```

Backend phải đảm bảo chỉ một registration thành công nếu capacity chỉ còn một chỗ.

---

# 61. Security

## Authentication

Có thể sử dụng access token + refresh token.

## Authorization

Mọi protected endpoint phải kiểm tra:

```text
Authentication
+
Role/Permission
+
Resource Ownership
```

Ví dụ:

```text
GET /members/me/training-results
```

Member ID phải lấy từ authenticated identity.

Không tin tưởng:

```json
{
  "memberId": "other-member"
}
```

từ client để quyết định quyền truy cập.

---

# 62. Password Security

Không lưu:

```text
password
```

dạng plaintext.

Chỉ lưu:

```text
password_hash
```

Sử dụng password hashing algorithm phù hợp với framework triển khai.

---

# 63. Error Handling

Backend nên có Global Exception Handler.

Ví dụ:

```json
{
  "success": false,
  "message": "Schedule conflict",
  "errors": [
    "Coach already has another class during this period"
  ]
}
```

Các lỗi phổ biến:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

---

# 64. Logging

Log nên ghi:

```text
Timestamp
Log Level
Request ID
User ID
Endpoint
Action
Error
```

Không log:

```text
Password
Access Token
Refresh Token
Sensitive payment information
```

---

# 65. Notification Design

Notification có thể được tạo dựa trên event.

Ví dụ:

```text
ClassScheduleChanged
        ↓
Notification Handler
        ↓
Find registered Members
        ↓
Create Notifications
```

Tương tự:

```text
MembershipExpiring
ClassCancelled
TrainingPlanCreated
PaymentCompleted
```

---

# 66. Background Jobs

Background Job có thể xử lý:

```text
Check Expiring Membership
Check Expired Membership
Send Class Reminder
Send Notifications
Generate Scheduled Reports
```

Ví dụ:

```text
Daily Job
   ↓
Find memberships expiring soon
   ↓
Create notification
   ↓
Notify Member
```

---

# 67. AI Security Design

Không gửi toàn bộ database cho AI.

Backend chỉ lấy context cần thiết.

Ví dụ Coach yêu cầu:

```text
"Suggest exercises for Member A"
```

Backend chỉ cung cấp dữ liệu cần thiết như:

```text
Goal
Level
Relevant training history
Recent results
```

Các trường không cần thiết không nên đưa vào AI context.

---

# 68. Recommended Indexes

Database nên có index cho:

```text
users.email
users.phone

members.member_code

coaches.coach_code

class_schedules.start_time
class_schedules.coach_id
class_schedules.room_id

class_registrations.member_id
class_registrations.class_schedule_id

membership_subscriptions.member_id
membership_subscriptions.end_date

payments.member_id
payments.paid_at

attendances.member_id

notifications.user_id

audit_logs.user_id
audit_logs.created_at
```

---

# 69. Core Constraints

Nên có unique constraints:

```text
users.email UNIQUE

members.member_code UNIQUE

coaches.coach_code UNIQUE

invoices.invoice_number UNIQUE
```

Đối với class registration nên ngăn duplicate active registration cho cùng Member + Schedule theo chiến lược phù hợp với DB được chọn.

---

# 70. MVP Scope

Phạm vi cập nhật theo yêu cầu người dùng ngày 27/09/2026; thay thế phân kỳ của bản 1.0. Chi tiết nghiệm thu ở PRODUCT mục 0.5.

| Mốc | Phạm vi | Mức độ |
| --- | --- | --- |
| A | Authentication, hồ sơ/tài khoản, Member/Coach/nhân viên, RBAC, package/subscription — F1 | Bắt buộc |
| B | Bộ môn/phòng/lớp/lịch, phân công Coach, Member và lễ tân đăng ký/hủy — F2 | Bắt buộc |
| C | Payment, invoice và báo cáo Member/lớp/doanh thu — F3; payment có thể làm song song A | Bắt buộc |
| D | Hoàn thiện thông báo lịch/hạn gói, hỗ trợ tại quầy, audit và phân quyền theo actor | Yêu cầu hỗ trợ toàn dự án |
| E | Training plan/result, tiến độ, nhận xét, bài tập về nhà, attendance — F4 | Tùy chọn |
| F | AI workout recommendation — F5; AI assistant — F6 | Tùy chọn |

Attendance không là điều kiện bắt buộc của F1–F3. Reports thuộc F3 bắt buộc. Advanced Analytics và các mở rộng mục 73 không tự động thuộc MVP.

---

# 71. Key Business Flow

Luồng tổng thể:

```text
                    CENTER MANAGER
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
           Coaches      Classes     Packages
              │           │           │
              └─────┬─────┘           │
                    ▼                 │
                 Schedule             │
                    │                 │
                    ▼                 ▼
MEMBER ──────► Membership ──────► Payment
   │                │
   │                ▼
   │             Active
   │                │
   ▼                ▼
View Classes ──► Register Class
                     │
                     ▼
                  Attend
                     │
              ┌──────┴──────┐
              ▼             ▼
         Attendance     Training Plan
                            │
                            ▼
                      Training Result
                            │
                            ▼
                         Progress
```

Receptionist hỗ trợ các bước:

```text
Member Registration
Membership Registration
Membership Renewal
Class Registration
Check-in
Payment
Invoice
Support Request
```

Coach chịu trách nhiệm:

```text
Class
Schedule
Attendance
Training Plan
Training Result
Member Progress
AI Exercise Recommendation
```

Center Manager chịu trách nhiệm:

```text
System Management
Resource Management
User Management
Authorization
Reports
Audit
```

---

# 72. Design Principles

Hệ thống cần tuân theo các nguyên tắc:

1. **Separation of Concerns**  
   Controller, Business Logic và Data Access phải tách biệt.

2. **Least Privilege**  
   Mỗi role chỉ có quyền cần thiết.

3. **Resource Ownership**  
   Member chỉ truy cập dữ liệu thuộc về mình.

4. **Server-side Validation**  
   Business rule luôn được kiểm tra ở backend.

5. **Transactional Consistency**  
   Payment, Membership và Class Registration cần transaction phù hợp.

6. **Auditability**  
   Các thao tác quản trị quan trọng phải truy vết được.

7. **AI as Assistant**  
   AI đưa ra đề xuất; không tự động thay thế quyết định của Coach.

8. **Scalability**  
   Thiết kế module hóa để sau này có thể mở rộng thêm chi nhánh, dịch vụ, payment gateway hoặc notification channel.

---

# 73. Future Extensions

Sau MVP, hệ thống có thể mở rộng:

```text
QR Check-in
Face Recognition Check-in

Online Payment Gateway

Email Notification
Push Notification

Multiple Sports Center Branches

Equipment Management

Personal Trainer Booking

Workout Tracking

Body Measurement Tracking

Mobile Application

Advanced AI Training Recommendation

AI Progress Analysis

Member Feedback & Rating

Promotion / Voucher

Revenue Forecasting
```

---

# 74. Conclusion

Sports Center Management System được thiết kế xoay quanh bốn actor:

```text
Center Manager
Coach
Member
Receptionist
```

Các domain cốt lõi là:

```text
User & RBAC

Member
Coach

Sport
Class
Room
Schedule

Membership
Registration

Payment
Attendance

Training Plan
Training Result

Notification
Support

AI

Report
Audit
```

Kiến trúc này đủ cho MVP nhưng vẫn cho phép mở rộng hệ thống trong tương lai mà không phải thay đổi toàn bộ thiết kế ban đầu.
