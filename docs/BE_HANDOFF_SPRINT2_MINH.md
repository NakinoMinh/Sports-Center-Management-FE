# HƯỚNG DẪN TRIỂN KHAI BACKEND — FLOW 2, PHẦN CỦA MINH

**Dự án:** Sports Center Management System (SCMS)
**Sprint:** 2 — Flow 2: Class Booking & Schedule Management
**UC phủ bởi tài liệu này:** 19, 21, 24, 25, 29, 30 (phụ thuộc 17, 18, 20)
**Người lập:** FE (Minh) · **Ngày:** 11/10/2026

Đi kèm:

- [API_SPECIFICATION_SPRINT2_MINH.md](API_SPECIFICATION_SPRINT2_MINH.md) — contract HTTP (đọc trước).
- [sql/2026-10-11-flow2-class-schedule.sql](sql/2026-10-11-flow2-class-schedule.sql) — schema + dữ liệu demo, chạy được ngay.

File này trả lời ba câu mà contract không trả lời: **dữ liệu lưu thế nào**,
**viết service ra sao để không vỡ ở các ca đồng thời**, và **kiểm tra bằng gì
để biết nối API xong là chạy**.

> Đây là đề xuất từ phía FE dựa trên schema và code backend đang có. Backend
> là người quyết định cuối cùng; chỗ nào đổi, báo lại để FE sửa
> `src/services/classApi.ts` — chỉ một file.

---

## 1. Tóm tắt những gì cần làm

| Hạng mục | Số lượng | Ghi chú |
| --- | ---: | --- |
| Bảng mới | 5 | `Sport`, `Room`, `Class`, `ClassSession`, `ClassRegistration` |
| Bảng tùy chọn | 1 | `MembershipPackageSport` — chỉ khi nhóm chốt luật quyền bộ môn |
| Cột thêm vào bảng cũ | 2 | `MemberSubscription.IsSuspended`, `SuspensionReason` |
| Entity | 5–6 | `DataAccess/Entities/` |
| Service | 3 | `ClassService`, `ClassSessionService`, `ClassRegistrationService` |
| Controller | 3 | `ClassController`, `ClassSessionController`, `ClassRegistrationController` |
| Controller cho UC17/18/20 | 2 | `SportController`, `RoomController` — của Huy/Phuc, FE chỉ đọc |
| Endpoint | 16 | xem §6 |
| Mã lỗi | 26 | đã dịch sẵn ở FE, xem §7 |

Chạy script SQL rồi scaffold lại entity theo cách dự án đang dùng
(DB-first, entity là `partial class` trong `DataAccess/Entities/`):

```bash
dotnet ef dbcontext scaffold "Name=ConnectionStrings:DefaultConnection" Microsoft.EntityFrameworkCore.SqlServer --context SportsCenterManagementContext --output-dir Entities --force
```

---

## 2. Thiết kế dữ liệu — vì sao từng chỗ như vậy

Chi tiết DDL nằm trong file SQL. Dưới đây là lý do của những quyết định sẽ bị
hỏi lại khi review.

### 2.1 `Class.Name` — unique index có điều kiện, không phải unique constraint

```sql
CREATE UNIQUE NONCLUSTERED INDEX UQ_Class_Name_Active
    ON dbo.Class (Name) WHERE Status <> 'ARCHIVED';
```

Yêu cầu nghiệp vụ là "tên không trùng **sau chuẩn hóa**", nhưng lớp đã lưu trữ
vẫn giữ tên cũ của nó. Unique constraint thường sẽ chặn luôn việc mở lại một
lớp cùng tên ở mùa sau — sai nghiệp vụ. Filtered index làm đúng.

Phần "sau chuẩn hóa" chia làm hai:

- **Hoa/thường và dấu tiếng Việt:** cột khai báo `COLLATE Vietnamese_CI_AI`,
  database tự lo. `"YOGA"`, `"Yoga"`, `"Yôga"` là một.
- **Khoảng trắng thừa:** collation không xử lý được. Service phải
  `Regex.Replace(name.Trim(), @"\s+", " ")` **trước khi lưu**, nếu không
  `"Yoga  cân bằng"` vẫn lọt qua.

### 2.2 `ClassSession` lưu giờ trung tâm, không lưu UTC

`SessionDate date` + `StartTime time(0)` + `EndTime time(0)`, hiểu theo giờ
Asia/Ho_Chi_Minh. Không có cột UTC song song.

Lý do: Việt Nam không có DST nên quy đổi luôn cố định `-07:00`; thêm cột UTC
là thêm một nguồn sự thật nữa phải giữ đồng bộ, và chỉ cần một chỗ quên cập
nhật là lịch lệch 7 tiếng mà không báo lỗi. Khi trả JSON, service dựng
`DateTimeOffset` một dòng — xem §4.2.

`CHECK (StartTime < EndTime)` đặt ở tầng dữ liệu để buổi học ngược giờ không
bao giờ tồn tại, kể cả khi có ai đó ghi thẳng vào DB.

### 2.3 `ClassSession.BookedCount` — phi chuẩn hóa có chủ ý

Thường thì đếm `COUNT(*)` từ bảng đăng ký sẽ sạch hơn. Ở đây cố ý lưu cột
đếm, vì nó cho phép giành chỗ cuối bằng **một câu UPDATE có điều kiện**
(§5.3) thay vì phải khóa cả dải bản ghi đăng ký. Kèm theo:

```sql
CONSTRAINT CK_ClassSession_BookedCount CHECK (BookedCount >= 0 AND BookedCount <= Capacity)
```

Đây là chốt chặn cuối: service có lỗi logic thì database vẫn không cho vượt
sức chứa. §8.1 trong file SQL là truy vấn đối chiếu cột đếm với số đăng ký
thật — chạy sau mỗi đợt test.

### 2.4 `UQ_ClassRegistration_ActiveBooking` — ràng buộc quan trọng nhất

```sql
CREATE UNIQUE NONCLUSTERED INDEX UQ_ClassRegistration_ActiveBooking
    ON dbo.ClassRegistration (SessionId, MemberId) WHERE Status = 'BOOKED';
```

Một thành viên chỉ có tối đa một đăng ký **còn hiệu lực** trên một buổi, nhưng
vẫn được đăng ký lại sau khi đã hủy (bản ghi cũ mang `CANCELED` nên nằm ngoài
index). Unique constraint thường sẽ chặn cả lần đăng ký lại.

Index này là thứ bảo đảm `DUPLICATE_REGISTRATION` kể cả khi hai request vào
cùng lúc — kiểm tra bằng `SELECT` rồi `INSERT` thì không bảo đảm được. Service
bắt `SqlException` với `Number` là `2601` hoặc `2627` và trả mã lỗi đó.

### 2.5 `RegisteredVia` và `RegisteredBy` là hai thứ khác nhau

`MemberId` là học viên. `RegisteredBy` là tài khoản bấm nút. `RegisteredVia`
là kênh (`MEMBER` / `RECEPTIONIST`). Lễ tân đặt thay thì ba giá trị này khác
nhau cả ba — đó là điều kiện để audit trả lời được "ai đã đặt cho ai".

### 2.6 Giá trị `MemberSubscription.Status`

`MemberSubscriptionService` ghi `'CONFIRMED'` và `'PENDING_PAYMENT'`, còn vài
dòng trong script seed gốc ghi `'Confirmed'`. Hiện vẫn khớp nhờ collation
không phân biệt hoa thường, nhưng truy vấn điều kiện gói nên so với chuỗi của
code (`'CONFIRMED'`), và dữ liệu mới chỉ ghi theo chuỗi đó.

### 2.7 Hai cột thêm vào `MemberSubscription`

Luật "gói đang tạm ngưng thì không đặt lớp" (Sprint2.md §6) hiện **không có
dữ liệu để kiểm tra** — `MemberSubscription` chưa có cột nào về tạm ngưng dù
type `MemberSubscription` phía FE đã có `isSuspended`. Script thêm
`IsSuspended` + `SuspensionReason`. Nếu nhóm quyết bỏ luật tạm ngưng thì bỏ
qua đoạn đó, nhưng đừng để luật nằm trong tài liệu mà không có chỗ nào kiểm.

---

## 3. Phân quyền

| Endpoint | Vai trò |
| --- | --- |
| `GET /Sport`, `/Room`, `/Coach`, `/Class`, `/ClassSession` | Mọi vai trò đã đăng nhập. Member chỉ thấy lớp `OPEN` và buổi chưa hủy |
| `POST/PUT/PATCH /Class`, `/ClassSession`, mọi endpoint `cancel` của lịch | `CenterManager` |
| `POST /ClassRegistration/register`, `/{id}/cancel` | `Member`, chỉ cho chính mình |
| `POST /ClassRegistration/counter-register`, `/{id}/counter-cancel` | `Receptionist` |
| `GET /ClassRegistration?memberAccountId=…` | `Receptionist`, `CenterManager` |
| `GET /ClassSession/{id}/registrations` | `CenterManager`, và `Coach` được phân công đúng buổi đó |

Hai điểm dễ sót:

1. **Ownership phải kiểm ở service, không chỉ ở `[Authorize]`.** Member gọi
   `POST /ClassRegistration/{id}/cancel` với ID của người khác phải nhận `403`.
   Trả `404` cũng được nếu nhóm muốn giấu sự tồn tại, nhưng **không được trả
   `200`**. Kịch bản nghiệm thu §10.8 Sprint2.md kiểm đúng chỗ này.
2. **Manager hiện không được đặt thay.** FE chỉ mở nút đó cho lễ tân. Nếu nhóm
   muốn Manager cũng đặt thay được thì phải mở ở server chứ không chỉ ở UI.

---

## 4. DTO — tên trường phải khớp đúng

FE đọc theo tên trường, không theo thứ tự. Sai tên thì màn hình hiện `—` hoặc
`0` mà **không báo lỗi gì**, nên đây là chỗ tốn thời gian nhất nếu lệch.

### 4.1 Bảng ánh xạ

| Entity | Trường DTO FE đọc | Kiểu JSON |
| --- | --- | --- |
| `Sport` | `id`, `name`, `isActive` | number/string, string, bool |
| `Room` | `id`, `name`, `location`, `capacity`, `isActive` | |
| `Coach` | `accountId`, `fullName`, `isActive` **hoặc** `status`, `specializations` | `specializations` nhận mảng hoặc chuỗi phân cách bằng dấu phẩy |
| `Class` | `id`, `sportId`, `sportName`, `name`, `description`, `capacity`, `status`, `upcomingSessionCount`, `totalSessionCount`, `activeRegistrationCount`, `createdAt`, `updatedAt` | |
| `ClassSession` | `id`, `classId`, `className`, `sportId`, `sportName`, `coachId`, `coachName`, `roomId`, `roomName`, `date`, `startTime`, `endTime`, `startsAt`, `endsAt`, `capacity`, `bookedCount`, `remainingCapacity`, `status`, `notes`, `cancelReason`, `canceledAt`, `updatedAt` | |
| `ClassRegistration` | `id`, `sessionId`, `memberAccountId`, `memberName`, `memberCode`, `status`, `registeredAt`, `registeredVia`, `registeredByName`, `canceledAt`, `canceledByName`, `cancelReason`, `session` | `session` là **nguyên object ClassSession** |

`JsonNamingPolicy.CamelCase` đã bật sẵn trong dự án nên đặt tên property
PascalCase ở C# là ra đúng camelCase.

### 4.2 Ba trường hay làm sai

**`startsAt` / `endsAt` phải có offset.**

```csharp
// Việt Nam không có DST nên offset cố định +07:00.
private static readonly TimeSpan CenterOffset = TimeSpan.FromHours(7);

var startsAt = new DateTimeOffset(
    session.SessionDate.ToDateTime(session.StartTime), CenterOffset);
// -> "2026-10-20T08:00:00+07:00"
```

Trả `"2026-10-20T08:00:00"` (không offset) thì trình duyệt hiểu là giờ máy
khách; trả `"...Z"` thì lệch đúng 7 tiếng và buổi sáng sẽ bị coi là đã bắt
đầu từ 1 giờ sáng. FE dùng chính trường này để quyết định bật/tắt nút đăng ký.

**`bookedCount` và `remainingCapacity` do server tính.** FE hiển thị nguyên
con số nhận được và không tự đếm. `remainingCapacity = Capacity - BookedCount`,
không bao giờ âm.

**`session` lồng trong mỗi đăng ký là bắt buộc.** Danh sách đăng ký hiển thị
tên lớp, giờ, phòng, trạng thái buổi mà không gọi thêm request nào. Thiếu
trường này, bảng đăng ký ở màn hình quầy sẽ trống cột đầu.

### 4.3 Hình dạng response

Danh sách dùng `Paged*ResultAPIViewModel` như Sprint 1
(`items`, `page`, `pageSize`, `totalItems`, `totalPages`), mặc định
`pageSize=20`. FE tự lấy hết các trang rồi lọc tại chỗ.

Lỗi dùng `ApiErrorResponseAPIViewModel` đang có:

```json
{
  "success": false,
  "error": {
    "code": "COACH_SCHEDULE_CONFLICT",
    "message": "Coach already has a session in this time range.",
    "details": { "coachId": ["Trùng với buổi 08:00–09:00."] }
  },
  "traceId": "00-ab12…"
}
```

`details` dùng **đúng tên trường trong request** (`sportId`, `name`,
`capacity`, `status`, `classId`, `coachId`, `roomId`, `date`, `startTime`,
`endTime`, `notes`, `reason`) — FE gắn thẳng thông điệp xuống dưới ô nhập
tương ứng. PascalCase hay camelCase đều được, FE tự hạ chữ đầu.

Nội dung trong `details` **hiển thị trực tiếp cho người dùng Việt Nam**, nên
viết tiếng Việt, ngắn, nói rõ phải sửa gì: `"Trùng với buổi 08:00–09:00."`
chứ không phải `"Conflict detected"`.

---

## 5. Công thức service cho các ca khó

Bốn đoạn dưới đây là phần dễ sai nhất của Flow 2. Viết đúng bốn chỗ này thì
phần còn lại chỉ là CRUD.

### 5.1 Kiểm tra trùng Coach / phòng khi tạo hoặc sửa buổi

Kiểm tra bằng `SELECT` rồi `INSERT` ở hai giao dịch khác nhau sẽ lọt khi hai
quản lý thao tác cùng lúc. Dùng khóa dải trong cùng một transaction:

```sql
-- Trong transaction, trước khi INSERT/UPDATE ClassSession
SELECT TOP 1 1
FROM dbo.ClassSession WITH (UPDLOCK, HOLDLOCK)
WHERE Status = 'SCHEDULED'
  AND SessionDate = @date
  AND Id <> ISNULL(@excludeSessionId, -1)
  AND CoachId = @coachId
  AND StartTime < @endTime      -- khoảng nửa mở [start, end):
  AND @startTime < EndTime;     -- liền kề KHÔNG tính là trùng
```

Lặp lại nguyên văn cho `RoomId = @roomId`. `UPDLOCK, HOLDLOCK` trên index
`IX_ClassSession_Date_Coach` / `_Room` khóa đúng dải ngày đó, không khóa cả
bảng.

**Chú ý dấu `<` chứ không phải `<=`.** Đây là quy tắc đã chốt ở Sprint2.md §6
và là một ca nghiệm thu riêng: buổi 08:00–09:00 và buổi 09:00–10:00 **phải**
lưu được cùng phòng.

### 5.2 Đổi lịch buổi đã có người đăng ký

Trước khi `UPDATE`, nếu ngày/giờ thay đổi, kiểm tra lại **từng** học viên
đang giữ chỗ:

```sql
SELECT m.AccountId, m.FullName
FROM dbo.ClassRegistration r
INNER JOIN dbo.Member m ON m.AccountId = r.MemberId
WHERE r.SessionId = @sessionId AND r.Status = 'BOOKED'
  AND (
        -- (a) gói không còn bao phủ ngày mới
        NOT EXISTS (
            SELECT 1 FROM dbo.MemberSubscription s
            WHERE s.MemberId = r.MemberId
              AND s.Status = 'CONFIRMED' AND s.IsSuspended = 0
              AND @newDate BETWEEN s.StartDate AND s.EndDate)
        -- (b) trùng giờ với buổi khác họ đã đặt
     OR EXISTS (
            SELECT 1 FROM dbo.ClassRegistration r2
            INNER JOIN dbo.ClassSession cs2 ON cs2.Id = r2.SessionId
            WHERE r2.MemberId = r.MemberId AND r2.Status = 'BOOKED'
              AND r2.SessionId <> @sessionId
              AND cs2.Status = 'SCHEDULED' AND cs2.SessionDate = @newDate
              AND cs2.StartTime < @newEndTime AND @newStartTime < cs2.EndTime)
  );
```

Có bất kỳ dòng nào → `409 MEMBER_SCHEDULE_CONFLICT`, **rollback toàn bộ**,
`details.date` ghi số người không hợp lệ, `message` liệt kê tên họ. Không
được chuyển một phần hay âm thầm hủy đăng ký của họ.

### 5.3 Giành chỗ cuối — một câu UPDATE, không cần khóa

Đây là cách gọn nhất thỏa yêu cầu "hai người đặt chỗ cuối đồng thời chỉ một
người thành công":

```csharp
using var tx = await db.Database.BeginTransactionAsync();

// 1) Chiếm chỗ. Điều kiện BookedCount < Capacity nằm NGAY TRONG câu UPDATE,
//    nên hai request đồng thời chỉ một request có @@ROWCOUNT = 1.
var taken = await db.Database.ExecuteSqlInterpolatedAsync($@"
    UPDATE dbo.ClassSession
    SET BookedCount = BookedCount + 1, UpdatedAt = SYSUTCDATETIME()
    WHERE Id = {sessionId} AND Status = 'SCHEDULED' AND BookedCount < Capacity");

if (taken == 0) throw new BusinessException("CLASS_FULL", ...);   // 409

// 2) Ghi đăng ký. Trùng sẽ bị filtered unique index chặn.
try
{
    db.ClassRegistrations.Add(registration);
    await db.SaveChangesAsync();
}
catch (DbUpdateException ex) when (IsUniqueViolation(ex))   // 2601 / 2627
{
    await tx.RollbackAsync();                                // trả lại chỗ
    throw new BusinessException("DUPLICATE_REGISTRATION", ...);  // 409
}

await db.Database.ExecuteSqlInterpolatedAsync($@"
    INSERT INTO dbo.AuditLog ...");
await tx.CommitAsync();
```

Không cần `SELECT ... FOR UPDATE`, không cần `SERIALIZABLE` cho toàn bộ giao
dịch. Mọi kiểm tra nghiệp vụ khác (buổi đã bắt đầu, lớp `OPEN`, gói hợp lệ,
trùng giờ) chạy **trước** bước 1.

### 5.4 Hủy đăng ký — không trả chỗ hai lần

Thứ tự quan trọng: cập nhật bản ghi đăng ký **trước**, kiểm `@@ROWCOUNT`,
rồi mới giảm bộ đếm.

```sql
BEGIN TRANSACTION;

UPDATE dbo.ClassRegistration
SET Status = 'CANCELED', CanceledAt = SYSUTCDATETIME(),
    CanceledBy = @actorId, CancelReason = @reason
WHERE Id = @registrationId AND Status = 'BOOKED';   -- chỉ bản ghi còn hiệu lực

IF @@ROWCOUNT = 0
BEGIN
    ROLLBACK;
    -- Gửi lặp rơi vào đây: KHÔNG giảm bộ đếm lần hai.
    -- -> 409 REGISTRATION_ALREADY_CANCELED
END

UPDATE dbo.ClassSession
SET BookedCount = BookedCount - 1, UpdatedAt = SYSUTCDATETIME()
WHERE Id = @sessionId AND BookedCount > 0;

COMMIT;
```

Làm ngược thứ tự (giảm đếm trước) thì một request retry sẽ trả chỗ hai lần và
`BookedCount` tụt xuống dưới số người thật — lỗi này chỉ lộ ra khi lớp đầy.

### 5.5 Hủy buổi và hủy cả lớp (UC30)

Cùng một transaction, và **cùng một bộ lọc** với endpoint xem trước tác động:

```sql
-- Tập buổi bị ảnh hưởng, dùng CHUNG cho cancel-impact và cancel
WHERE ClassId = @classId
  AND Status = 'SCHEDULED'
  AND (SessionDate > @today
       OR (SessionDate = @today AND StartTime > @nowTime))   -- chưa bắt đầu
```

Nếu `cancel-impact` đếm cả buổi đã bắt đầu còn lệnh hủy thì bỏ qua, con số
trong hộp thoại xác nhận sẽ sai đúng vào lúc người dùng cần tin nó nhất. FE
hiển thị nguyên con số server trả về.

Trong transaction, theo thứ tự: hủy mọi đăng ký `BOOKED` của các buổi đó →
đặt `Status='CANCELED'`, `CancelReason`, `CanceledAt`, `CanceledBy` cho từng
buổi → `BookedCount = 0` → ghi audit → commit. Kết thúc **không được còn**
đăng ký `BOOKED` nào trỏ vào buổi đã hủy (truy vấn §8.2 trong file SQL kiểm
đúng điều này).

Response của `/Class/{id}/cancel-future-sessions`:
`{ "canceledSessionCount": 3 }`.

**Không tự hoàn tiền gói tập** — ngoài phạm vi Sprint 2.

---

## 6. Danh sách endpoint và tiêu chí nghiệm thu

Checklist để BE tự test trước khi báo xong. Mỗi dòng ghi **request → kết quả
mong đợi**. Dữ liệu demo ở §7 của file SQL đủ để chạy hết bảng này.

### 6.1 Danh mục (UC17, UC18, UC20 — của Huy/Phuc, FE chỉ đọc)

| # | Request | Mong đợi |
| --- | --- | --- |
| 1 | `GET /Sport` | `200`, có cả bộ môn `isActive=false` kèm cờ trạng thái |
| 2 | `GET /Room` | `200`, có `location` và `capacity` |
| 3 | `GET /Coach` | `200`, có cả Coach đã ngừng hoạt động |

Cả ba **phải trả cả mục ngừng hoạt động**: form sửa một buổi cũ cần hiển thị
lại Coach/phòng đã gán cho nó; lọc mất thì không sửa nổi giờ của buổi đó.

### 6.2 Lớp học (UC19)

| # | Request | Mong đợi |
| --- | --- | --- |
| 4 | `GET /Class` | `200`, đủ `upcomingSessionCount`, `totalSessionCount`, `activeRegistrationCount` |
| 5 | `POST /Class` hợp lệ | `201` + object lớp |
| 6 | `POST /Class` tên `"  yoga   CÂN bằng cơ bản "` khi đã có "Yoga cân bằng cơ bản" | `409 CLASS_NAME_DUPLICATE` |
| 7 | `POST /Class` với bộ môn `Dance fitness` (inactive) | `409 SPORT_INACTIVE`, `details.sportId` |
| 8 | `PUT /Class/{id}` hạ `capacity` xuống dưới số đã đăng ký | `409 CAPACITY_BELOW_REGISTRATIONS`, `details.capacity` |
| 9 | `PATCH /Class/{id}/status` = `OPEN` cho lớp "Yoga nâng cao buổi tối" (chưa có buổi) | `409 CLASS_HAS_NO_VALID_SESSION`, `details.status` |
| 10 | `PATCH /Class/{id}/status` = `ARCHIVED` cho lớp đã có đăng ký | `200`, **giữ nguyên** mọi bản ghi đăng ký |

### 6.3 Buổi học (UC21)

| # | Request | Mong đợi |
| --- | --- | --- |
| 11 | `POST /ClassSession` hợp lệ | `201` |
| 12 | `startTime=09:00`, `endTime=08:00` | `400 VALIDATION_ERROR`, `details.endTime` |
| 13 | Ngày hôm qua | `400 SESSION_IN_PAST`, `details.date` |
| 14 | Trùng giờ Coach `acc-coa-001` | `409 COACH_SCHEDULE_CONFLICT`, `details.coachId` |
| 15 | Trùng giờ phòng Studio A | `409 ROOM_SCHEDULE_CONFLICT`, `details.roomId` |
| 16 | **Buổi 09:00–10:00 cùng phòng với buổi 08:00–09:00** | `201` — liền kề không phải trùng |
| 17 | `capacity` lớn hơn sức chứa phòng | `400 VALIDATION_ERROR`, `details.capacity` |
| 18 | Phân công Coach `acc-coa-004` (inactive) | `409 COACH_INACTIVE` |
| 19 | `PUT` đổi giờ buổi đã có người đăng ký sang khung trùng buổi khác của họ | `409 MEMBER_SCHEDULE_CONFLICT`, DB **không đổi gì** |
| 20 | `PUT` một buổi đã `CANCELED` | `409 SESSION_CANCELLED` |

### 6.4 Hủy buổi và hủy lớp (UC30)

| # | Request | Mong đợi |
| --- | --- | --- |
| 21 | `GET /ClassSession/{id}/cancel-impact` | `200`, số đăng ký khớp thực tế |
| 22 | `GET /Class/{id}/cancel-impact` | `200`, `affectedSessionCount` **bằng đúng** số buổi lệnh hủy sẽ hủy |
| 23 | `POST /ClassSession/{id}/cancel` thiếu `reason` | `400 VALIDATION_ERROR`, `details.reason` |
| 24 | `POST /ClassSession/{id}/cancel` buổi đã diễn ra | `409 SESSION_ALREADY_STARTED` |
| 25 | `POST /ClassSession/{id}/cancel` hợp lệ | `200`; mọi đăng ký của buổi chuyển `CANCELED`; truy vấn §8.2 rỗng |
| 26 | `POST /Class/{id}/cancel-future-sessions` | `200` + `canceledSessionCount`; buổi đã diễn ra **không đổi** |
| 27 | Gọi lại #26 ngay sau đó | `409 NO_CANCELABLE_SESSION` |

### 6.5 Đăng ký (UC24, UC25, UC29)

Dùng các tài khoản demo (mật khẩu `Admin@123`):

| # | Request | Mong đợi |
| --- | --- | --- |
| 28 | `an.nguyen@example.com` đăng ký buổi Yoga tương lai | `201`, `bookedCount` tăng đúng 1 |
| 29 | Lặp lại #28 | `409 DUPLICATE_REGISTRATION`, `bookedCount` **không đổi** |
| 30 | `em.vu@example.com` (account `Inactive`) | `403 ACCOUNT_INACTIVE` |
| 31 | `chi.le@example.com` (gói `PENDING_PAYMENT`) | `409 MEMBERSHIP_NOT_VALID_FOR_SESSION` |
| 32 | `dung.pham@example.com` đặt buổi sau ngày gói hết hạn | `409 MEMBERSHIP_NOT_VALID_FOR_SESSION` |
| 33 | `binh.tran@example.com` (gói Yoga) đặt lớp Boxing | `409 PACKAGE_NOT_ELIGIBLE` *(chỉ khi nhóm dùng entitlement)* |
| 34 | Đặt buổi thuộc lớp `CLOSED` (Bơi lội thiếu nhi) | `409 CLASS_NOT_OPEN` |
| 35 | Đặt buổi đã `CANCELED` | `409 SESSION_CANCELLED` |
| 36 | Đặt buổi đã bắt đầu | `409 SESSION_ALREADY_STARTED` |
| 37 | Đặt buổi trùng giờ buổi khác đã đặt | `409 MEMBER_SCHEDULE_CONFLICT` |
| 38 | Hạ `capacity` = `bookedCount` rồi cho người khác đặt | `409 CLASS_FULL` |
| 39 | **Hai request đồng thời tranh chỗ cuối** | đúng một `201`, một `409 CLASS_FULL`; `BookedCount = Capacity` |
| 40 | `POST /ClassRegistration/{id}/cancel` của chính mình | `200`, `bookedCount` giảm đúng 1 |
| 41 | Lặp lại #40 | `409 REGISTRATION_ALREADY_CANCELED`, `bookedCount` **không đổi** |
| 42 | Member hủy đăng ký của **người khác** | `403` (hoặc `404`), tuyệt đối không `200` |
| 43 | Hủy sau khi buổi đã bắt đầu | `409 SESSION_ALREADY_STARTED` |
| 44 | Lễ tân `POST /counter-register` cho member hợp lệ | `201`, `registeredVia="RECEPTIONIST"`, `registeredBy` = tài khoản lễ tân |
| 45 | Lễ tân `POST /counter-cancel` thiếu `reason` | `400 VALIDATION_ERROR`, `details.reason` |
| 46 | Member gọi `/counter-register` | `403` |
| 47 | `GET /ClassRegistration/me` | chỉ đăng ký của chính người gọi, mỗi dòng có `session` lồng bên trong |
| 48 | `GET /ClassSession/{id}/registrations` bởi Coach **không** phụ trách buổi | `403` |

Cách chạy #39 nhanh (PowerShell):

```powershell
1..2 | ForEach-Object -Parallel {
  Invoke-RestMethod -Method Post -Uri "$env:API/ClassRegistration/counter-register" `
    -Headers @{ Authorization = "Bearer $env:TOKEN" } -ContentType 'application/json' `
    -Body (@{ sessionId = 3; memberAccountId = "acc-mem-10$_" } | ConvertTo-Json)
} -ThrottleLimit 2
```

### 6.6 Sau mỗi đợt test

Chạy ba truy vấn ở §8 của file SQL. Cả ba phải rỗng:

1. `BookedCount` lệch số đăng ký thật → sai ở §5.3 hoặc §5.4.
2. Đăng ký `BOOKED` trỏ vào buổi `CANCELED` → sai ở §5.5.
3. Hai buổi trùng Coach/phòng → sai ở §5.1.

---

## 7. Mã lỗi

FE đã dịch sẵn 26 mã dưới đây sang tiếng Việt trong
`src/services/apiErrors.ts`. Trả mã ngoài danh sách thì người dùng thấy
nguyên thông điệp tiếng Anh của server — thêm mã mới phải báo FE.

| Nhóm | Mã | HTTP |
| --- | --- | ---: |
| Lớp | `CLASS_NOT_FOUND` | 404 |
| | `CLASS_NAME_DUPLICATE`, `CLASS_HAS_NO_VALID_SESSION`, `CLASS_NOT_OPEN`, `CLASS_ARCHIVED`, `CLASS_HAS_REGISTRATIONS` | 409 |
| Danh mục | `SPORT_NOT_FOUND`, `ROOM_NOT_FOUND`, `COACH_NOT_FOUND` | 404 |
| | `SPORT_INACTIVE`, `ROOM_INACTIVE`, `COACH_INACTIVE` | 409 |
| Lịch | `SESSION_NOT_FOUND` | 404 |
| | `SESSION_IN_PAST` | 400 |
| | `SESSION_ALREADY_STARTED`, `SESSION_CANCELLED`, `NO_CANCELABLE_SESSION` | 409 |
| | `COACH_SCHEDULE_CONFLICT`, `ROOM_SCHEDULE_CONFLICT`, `MEMBER_SCHEDULE_CONFLICT`, `CAPACITY_BELOW_REGISTRATIONS` | 409 |
| Đăng ký | `REGISTRATION_NOT_FOUND` | 404 |
| | `CLASS_FULL`, `DUPLICATE_REGISTRATION`, `REGISTRATION_ALREADY_CANCELED`, `MEMBERSHIP_NOT_VALID_FOR_SESSION`, `PACKAGE_NOT_ELIGIBLE` | 409 |

Dùng lại từ Sprint 1: `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`ACCOUNT_INACTIVE` (403), `VALIDATION_ERROR` (400), `CONCURRENCY_CONFLICT`
(409), `INTERNAL_SERVER_ERROR` (500).

---

## 8. Audit

Ghi vào bảng `AuditLog` đang có, `AccountId` lấy **từ token** chứ không từ
body. Thao tác tối thiểu phải ghi:

| Action | EntityType | EntityId | Description nên có |
| --- | --- | --- | --- |
| `CLASS_CREATED` / `CLASS_UPDATED` / `CLASS_STATUS_CHANGED` | `Class` | id lớp | trạng thái cũ → mới |
| `SESSION_CREATED` / `SESSION_UPDATED` | `ClassSession` | id buổi | ngày giờ cũ → mới, Coach/phòng cũ → mới |
| `SESSION_CANCELED` | `ClassSession` | id buổi | lý do, số đăng ký bị hủy theo |
| `CLASS_SESSIONS_CANCELED` | `Class` | id lớp | lý do, số buổi và số đăng ký bị ảnh hưởng |
| `CLASS_REGISTERED` | `ClassRegistration` | id đăng ký | buổi nào, kênh nào; nếu quầy thì ghi rõ lễ tân nào đặt cho ai |
| `CLASS_REGISTRATION_CANCELED` | `ClassRegistration` | id đăng ký | lý do, người hủy |

Không ghi mật khẩu, token hay dữ liệu thanh toán vào `Description`. UC32 (P1)
sẽ lọc trên đúng các `Action` này nên đặt tên một lần cho chuẩn.

---

## 9. Còn phải chốt trước khi code

Năm điểm này **không phải việc riêng của backend** — cần quyết tại planning,
nếu không UC24 sẽ kẹt giữa chừng:

1. **Quyền bộ môn theo gói.** FE đã dựng sẵn nhánh `PACKAGE_NOT_ELIGIBLE` và
   script có bảng `MembershipPackageSport`. Nếu nhóm chốt "gói nào cũng vào
   được mọi bộ môn" thì bỏ bảng đó và bỏ luôn mã lỗi — đừng để server im lặng
   cho qua.
2. **Gói tạm ngưng.** Script thêm cột `IsSuspended`. Nếu bỏ luật thì bỏ cột.
3. **Hạn hủy.** Hiện là "hủy được tới trước giờ bắt đầu, không phạt". Muốn mốc
   2h/24h thì chốt trước khi viết API; FE chỉ cần đổi thông điệp.
4. **Manager có được đặt thay không.** Hiện chỉ lễ tân.
5. **Học phí riêng theo lớp.** Sprint 2 đề xuất chỉ đặt chỗ trong quyền lợi
   gói. Thu riêng thì phải phối hợp Flow 3 và ước lượng lại.

---

## 10. Quy trình nối API

1. Chạy [sql/2026-10-11-flow2-class-schedule.sql](sql/2026-10-11-flow2-class-schedule.sql),
   kiểm ba truy vấn §8 đều rỗng.
2. Scaffold entity, viết service/controller theo §4–§5.
3. BE tự chạy hết checklist §6.
4. FE đặt `VITE_API_BASE_URL` trỏ vào BE, chạy `npm run dev`, mở
   `/manager/classes` → `/manager/class-schedule` → `/receptionist/classes`.
   Lúc này nhãn vàng "đang dùng dữ liệu mẫu" phải **biến mất**; còn hiện tức
   là FE chưa đọc được biến môi trường.
5. Chạy lại kịch bản nghiệm thu §10 Sprint2.md trên dữ liệu thật.
6. FE xóa `src/services/classMockServer.ts` và các nhánh
   `if (runsOnMockData())` trong `classApi.ts`.

Bước 6 là lúc UC được tính Done — không phải trước đó.
