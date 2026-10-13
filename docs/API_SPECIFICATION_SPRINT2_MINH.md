# API FRONTEND CẦN CHO SPRINT 2 — PHẦN CỦA MINH

**Dự án:** Sports Center Management System (SCMS)
**Sprint:** 2 — Flow 2: Class Booking & Schedule Management
**Phạm vi:** UC19, UC21, UC24, UC25, UC29, UC30 (phân công FE: Minh — xem [Sprint2.md](../Sprint2.md) §5)
**Người lập:** FE (Minh) · **Ngày:** 11/10/2026
**Trạng thái:** Đề xuất contract từ phía FE. **Chưa có endpoint nào trong số này tồn tại ở backend.**

---

## 0. Cách đọc tài liệu này

FE đã dựng xong màn hình và chạy được bằng **dữ liệu mẫu trong bộ nhớ**
(`src/services/classMockServer.ts`). Mock đó mô phỏng đúng tập quy tắc và
**ném đúng các mã lỗi liệt kê ở §6**, nên khi backend lên đúng contract này,
FE chỉ cần cấu hình `VITE_API_BASE_URL`; không phải sửa màn hình.

Đây là **đề xuất**, không phải quyết định. Hai nhóm chốt đường dẫn, kiểu ID và
tên trường trong buổi planning ngày đầu sprint; nếu backend đặt khác, FE sửa
duy nhất `src/services/classApi.ts`.

Bảng đối chiếu nhanh giữa màn hình và endpoint:

| UC | Màn hình FE | Endpoint cần |
| --- | --- | --- |
| UC19 | `/manager/classes` | §2.1 → §2.4 |
| UC21 | `/manager/class-schedule` | §3.1 → §3.2 |
| UC30 | `/manager/class-schedule` (dialog hủy) | §3.3 → §3.5 |
| UC24 | Component đăng ký trên trang lớp của Member (Long ghép) | §4.1, §4.3 |
| UC25 | Component đăng ký trên trang lớp của Member (Long ghép) | §4.1, §4.5 |
| UC29 | `/receptionist/classes` | §4.2, §4.4, §4.6, §5.4 |

---

## 1. Quy ước chung

### 1.1 Base URL, xác thực

- Base URL lấy từ `VITE_API_BASE_URL` (mặc định môi trường dev:
  `http://localhost:5198/api`). Đường dẫn dưới đây viết **tương đối** so với
  base, giữ nguyên quy ước đặt tên controller của Sprint 1
  (`/MembershipPackage`, `/Member`…), nên dùng `/Class`, `/ClassSession`,
  `/ClassRegistration`, `/Sport`, `/Room`, `/Coach`.
- Mọi endpoint đều yêu cầu `Authorization: Bearer <jwt>`.
- **Danh tính lấy từ token, không lấy từ body.** FE không bao giờ gửi
  `memberAccountId` của chính người đang đăng nhập; chỉ màn hình quầy mới gửi
  ID của người khác, và server phải kiểm tra người gọi có vai trò
  `RECEPTIONIST` (hoặc vai trò được chốt thêm).

### 1.2 Phân quyền từng nhóm

| Nhóm | Vai trò được gọi |
| --- | --- |
| `/Class`, `/ClassSession` ghi (POST/PUT/PATCH/cancel) | `CENTER_MANAGER` |
| `/Class`, `/ClassSession` đọc | `CENTER_MANAGER`, `RECEPTIONIST`, `COACH`, `MEMBER` (Member chỉ thấy lớp `OPEN` và buổi chưa hủy) |
| `/ClassRegistration/register`, `/{id}/cancel` | `MEMBER` (chỉ cho chính mình) |
| `/ClassRegistration/counter-register`, `/{id}/counter-cancel` | `RECEPTIONIST` |
| `/ClassSession/{id}/registrations` (roster) | `CENTER_MANAGER`, `COACH` được phân công buổi đó |

Đổi ID trong URL **không** được lấy ra dữ liệu ngoài quyền: Member xem/hủy
đăng ký của người khác phải nhận `403`, không phải `404` mơ hồ hay `200`.

### 1.3 Kiểu dữ liệu và thời gian

- ID: FE luôn xử lý ID dưới dạng chuỗi và chấp nhận cả số (`12`) lẫn chuỗi
  (`"12"`) trong response. Request gửi lên dạng số nếu ID là số.
- `date`: `YYYY-MM-DD` theo lịch trung tâm.
- `startTime` / `endTime`: `HH:mm` (chấp nhận `HH:mm:ss`, FE cắt còn `HH:mm`).
- `startsAt` / `endsAt`: ISO-8601 **có offset** (`2026-10-20T08:00:00+07:00`).
  Đây là mốc FE dùng để biết buổi đã bắt đầu chưa. Thiếu offset thì giờ sẽ bị
  hiểu là UTC và lệch 7 tiếng.
- Khoảng giờ là nửa mở `[start, end)`: buổi kết thúc 09:00 **không** trùng
  buổi bắt đầu 09:00. Áp dụng như nhau cho Coach, phòng và thành viên.
- `bookedCount` và `remainingCapacity` **do server tính**. FE hiển thị nguyên
  con số đó, không tự đếm từ danh sách đăng ký.

### 1.4 Hình dạng response

Danh sách dùng phân trang như Sprint 1, mặc định `pageSize=20`:

```json
{ "items": [ ... ], "page": 1, "pageSize": 20, "totalItems": 37, "totalPages": 2 }
```

Lỗi dùng đúng envelope đang có của dự án, `apiErrors.ts` dịch `code` sang
tiếng Việt:

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

`details` là `{ tênTrường: [thông điệp] }` và được FE gắn thẳng xuống dưới ô
nhập tương ứng. Tên trường gửi về theo **PascalCase hay camelCase đều được**
(`fieldErrorsOf` tự hạ chữ đầu), nhưng phải trùng tên trường trong request:
`sportId`, `name`, `capacity`, `status`, `classId`, `coachId`, `roomId`,
`date`, `startTime`, `endTime`, `notes`, `reason`.

---

## 2. Lớp học (UC19)

### 2.1 `GET /Class` — danh sách lớp

Query: `page`, `pageSize`, `search`, `sportId`, `status`.

Item:

```json
{
  "id": 12,
  "sportId": 7,
  "sportName": "Yoga",
  "name": "Yoga cân bằng cơ bản",
  "description": "Lớp nhập môn cho người mới.",
  "capacity": 15,
  "status": "OPEN",
  "upcomingSessionCount": 4,
  "totalSessionCount": 5,
  "activeRegistrationCount": 9,
  "createdAt": "2026-10-01T02:00:00.000Z",
  "updatedAt": "2026-10-09T02:00:00.000Z"
}
```

- `status`: `DRAFT` | `OPEN` | `CLOSED` | `ARCHIVED`. Giá trị lạ được FE quy về
  `DRAFT` (trạng thái không cho đặt chỗ) để không vô tình mở bán.
- `upcomingSessionCount`: số buổi `SCHEDULED` còn ở tương lai. Màn hình dùng
  nó để biết lớp có đủ điều kiện mở đăng ký chưa.
- `activeRegistrationCount`: tổng đăng ký còn hiệu lực trên mọi buổi của lớp.
  Dùng làm **sàn** cho ô sức chứa khi sửa lớp.

### 2.2 `POST /Class` — tạo lớp

```json
{ "sportId": 7, "name": "Yoga cân bằng cơ bản", "description": "", "capacity": 15, "status": "DRAFT" }
```

Trả `201` kèm object như §2.1.

### 2.3 `PUT /Class/{id}` — sửa lớp

Body như §2.2.

### 2.4 `PATCH /Class/{id}/status`

```json
{ "status": "ARCHIVED" }
```

**Business rules cho §2.2–§2.4:**

| Luật | Mã lỗi khi vi phạm |
| --- | --- |
| Tên lớp không trùng sau chuẩn hóa (bỏ dấu, gộp khoảng trắng, không phân biệt hoa thường), xét trên các lớp chưa `ARCHIVED` | `CLASS_NAME_DUPLICATE` |
| Bộ môn phải tồn tại | `SPORT_NOT_FOUND` |
| Bộ môn ngừng hoạt động không dùng cho lớp mới (lớp cũ đang trỏ vào nó thì giữ nguyên được) | `SPORT_INACTIVE` |
| `capacity` nguyên dương, không nhỏ hơn số đăng ký còn hiệu lực của buổi đông nhất, không nhỏ hơn sức chứa của buổi đã lập | `CAPACITY_BELOW_REGISTRATIONS` |
| Chỉ chuyển sang `OPEN` khi lớp có ≥ 1 buổi `SCHEDULED` ở tương lai | `CLASS_HAS_NO_VALID_SESSION` |
| Không xóa cứng lớp đã có lịch sử đăng ký — FE **không gọi** `DELETE /Class` | `CLASS_HAS_REGISTRATIONS` nếu BE vẫn mở endpoint xóa |

Mọi thay đổi ghi audit: actor từ token, `entityId`, trường đã đổi.

---

## 3. Buổi học (UC21, UC30)

### 3.1 `GET /ClassSession` — danh sách buổi

Query: `from`, `to` (ngày, bao gồm hai đầu), `classId`, `coachId`, `roomId`,
`sportId`, `status`, `page`, `pageSize`.

Item:

```json
{
  "id": 44,
  "classId": 12,
  "className": "Yoga cân bằng cơ bản",
  "sportId": 7,
  "sportName": "Yoga",
  "coachId": "7b1f…",
  "coachName": "Trần Thu Hà",
  "roomId": 3,
  "roomName": "Studio A",
  "date": "2026-10-20",
  "startTime": "08:00",
  "endTime": "09:00",
  "startsAt": "2026-10-20T08:00:00+07:00",
  "endsAt": "2026-10-20T09:00:00+07:00",
  "capacity": 15,
  "bookedCount": 4,
  "remainingCapacity": 11,
  "status": "SCHEDULED",
  "notes": "",
  "cancelReason": null,
  "canceledAt": null,
  "updatedAt": "2026-10-11T02:00:00.000Z"
}
```

`status`: `SCHEDULED` | `CANCELED` | `COMPLETED` (FE chấp nhận cả
`CANCELLED`).

### 3.2 `POST /ClassSession` và `PUT /ClassSession/{id}`

```json
{
  "classId": 12,
  "coachId": "7b1f…",
  "roomId": 3,
  "date": "2026-10-20",
  "startTime": "08:00",
  "endTime": "09:00",
  "capacity": 15,
  "notes": ""
}
```

**Business rules — thứ tự kiểm tra như dưới, để thông báo trỏ đúng nguyên
nhân đầu tiên:**

| Luật | Mã lỗi |
| --- | --- |
| `startTime < endTime`, định dạng giờ/ngày hợp lệ | `VALIDATION_ERROR` + `details.endTime` |
| Không lập hoặc chuyển buổi về thời điểm đã qua | `SESSION_IN_PAST` |
| Lớp tồn tại, không ở trạng thái `ARCHIVED` | `CLASS_NOT_FOUND` / `CLASS_ARCHIVED` |
| Coach tồn tại và đang hoạt động (giữ được Coach cũ đã ngừng hoạt động khi chỉ sửa giờ) | `COACH_NOT_FOUND` / `COACH_INACTIVE` |
| Phòng tồn tại và đang hoạt động | `ROOM_NOT_FOUND` / `ROOM_INACTIVE` |
| `capacity` ≤ sức chứa lớp, ≤ sức chứa phòng, ≥ số đã đăng ký | `VALIDATION_ERROR` + `details.capacity` |
| Coach không trùng giờ với buổi `SCHEDULED` khác | `COACH_SCHEDULE_CONFLICT` |
| Phòng không trùng giờ với buổi `SCHEDULED` khác | `ROOM_SCHEDULE_CONFLICT` |
| Khi đổi ngày/giờ của buổi **đã có người đăng ký**: mọi học viên phải còn gói hợp lệ vào ngày mới và không trùng buổi khác. Có một người không hợp lệ thì **từ chối toàn bộ**, không chuyển một phần | `MEMBER_SCHEDULE_CONFLICT` |
| Buổi đã `CANCELED` thì không sửa | `SESSION_CANCELLED` |

Thất bại phải rollback hoàn toàn (không ghi một phần).

### 3.3 `GET /ClassSession/{id}/cancel-impact`

### 3.4 `GET /Class/{id}/cancel-impact`

Dialog xác nhận gọi trước khi hủy, để quản lý thấy hậu quả:

```json
{
  "scope": "CLASS_FUTURE_SESSIONS",
  "affectedSessionCount": 3,
  "affectedRegistrationCount": 7,
  "affectedMemberCount": 6,
  "nextSessionStartsAt": "2026-10-20T08:00:00+07:00"
}
```

**Quan trọng:** `affectedSessionCount` phải đếm **đúng tập buổi mà lệnh hủy ở
§3.5 sẽ hủy** (buổi `SCHEDULED` chưa bắt đầu). Nếu preview đếm cả buổi đã bắt
đầu còn lệnh hủy thì bỏ qua, con số trong dialog sẽ sai đúng vào lúc người
dùng cần tin nó nhất.

### 3.5 Hủy — `POST /ClassSession/{id}/cancel` và `POST /Class/{id}/cancel-future-sessions`

Body: `{ "reason": "Huấn luyện viên nghỉ bệnh" }` — lý do bắt buộc, 3–500 ký
tự.

Response của lệnh hủy theo lớp trả về số buổi đã hủy, FE dùng để thông báo
đúng con số:

```json
{ "canceledSessionCount": 3 }
```

**Business rules:**

- Hủy một buổi: buổi phải `SCHEDULED` và chưa bắt đầu → ngược lại
  `SESSION_CANCELLED` / `SESSION_ALREADY_STARTED`.
- Hủy theo lớp: chỉ đụng tới buổi `SCHEDULED` chưa bắt đầu; buổi đã diễn ra
  giữ nguyên. Không còn buổi nào → `NO_CANCELABLE_SESSION`.
- **Nguyên tử:** hủy buổi và hủy mọi đăng ký còn hiệu lực của buổi đó trong
  cùng một giao dịch. Không được để tồn đăng ký `BOOKED` trỏ vào buổi đã hủy.
- Giữ nguyên lịch sử đăng ký (chuyển `CANCELED` kèm lý do), chặn đặt mới.
- **Không tự hoàn tiền gói tập.**
- Ghi audit cho từng buổi và từng đăng ký bị ảnh hưởng.

---

## 4. Đăng ký buổi học (UC24, UC25, UC29)

Mọi response đăng ký dùng chung hình dạng:

```json
{
  "id": 501,
  "sessionId": 44,
  "memberAccountId": "9c2e…",
  "memberName": "Nguyễn Hoàng An",
  "memberCode": "MEM0001",
  "status": "BOOKED",
  "registeredAt": "2026-10-11T02:10:00.000Z",
  "registeredVia": "RECEPTIONIST",
  "registeredByName": "Lễ tân Nguyễn Thị Mai",
  "canceledAt": null,
  "canceledByName": null,
  "cancelReason": null,
  "session": { "...": "nguyên object ở §3.1" }
}
```

`session` lồng bên trong là **bắt buộc**: danh sách đăng ký hiển thị tên lớp,
giờ, phòng và trạng thái buổi mà không gọi thêm request nào.

### 4.1 `GET /ClassRegistration/me?includeCanceled=false`

Đăng ký của **chính người gọi**, lấy danh tính từ token.

### 4.2 `GET /ClassRegistration?memberAccountId=…&includeCanceled=true`

Dùng ở màn hình quầy. Chỉ `RECEPTIONIST` và `CENTER_MANAGER` gọi được.

### 4.3 `POST /ClassRegistration/register`

Body: `{ "sessionId": 44 }` — **không có memberId**, server lấy từ token.

### 4.4 `POST /ClassRegistration/counter-register`

Body: `{ "sessionId": 44, "memberAccountId": "9c2e…" }`.

### 4.5 `POST /ClassRegistration/{id}/cancel`

Body: `{ "reason": "Trùng lịch công việc" }` — **tùy chọn** với Member.

### 4.6 `POST /ClassRegistration/{id}/counter-cancel`

Body: `{ "reason": "Thành viên gọi điện xin hủy" }` — **bắt buộc**, 3–500 ký
tự, để audit nói được vì sao lễ tân hủy thay.

**Business rules khi đăng ký (§4.3, §4.4) — áp dụng y hệt cho cả hai:**

| Luật | Mã lỗi |
| --- | --- |
| Buổi tồn tại | `SESSION_NOT_FOUND` |
| Buổi chưa bị hủy | `SESSION_CANCELLED` |
| Buổi chưa bắt đầu (so theo giờ server) | `SESSION_ALREADY_STARTED` |
| Lớp đang ở trạng thái `OPEN` | `CLASS_NOT_OPEN` |
| Tài khoản thành viên còn hoạt động | `ACCOUNT_INACTIVE` |
| Gói đã thanh toán, không tạm ngưng, bao phủ **ngày diễn ra buổi học** | `MEMBERSHIP_NOT_VALID_FOR_SESSION` |
| Gói cho phép bộ môn của lớp (nếu nhóm chốt dùng entitlement theo bộ môn) | `PACKAGE_NOT_ELIGIBLE` |
| Chưa có đăng ký còn hiệu lực cho đúng buổi này | `DUPLICATE_REGISTRATION` |
| Không trùng giờ với buổi khác thành viên đã đặt | `MEMBER_SCHEDULE_CONFLICT` |
| Còn chỗ | `CLASS_FULL` |

**Chống vượt sức chứa:** hai request tranh chỗ cuối chỉ một request được
`201`, request kia nhận `CLASS_FULL`. Bọc transaction không đủ — cần
unique constraint cho đăng ký còn hiệu lực `(sessionId, memberId)` cộng với
khóa/isolation phù hợp SQL Server hoặc optimistic concurrency có retry.

**Business rules khi hủy (§4.5, §4.6):**

| Luật | Mã lỗi |
| --- | --- |
| Đăng ký tồn tại và **thuộc về người gọi** (với §4.5) | `REGISTRATION_NOT_FOUND` / `403 FORBIDDEN` |
| Chưa bị hủy trước đó — gửi lặp **không** trả chỗ lần hai | `REGISTRATION_ALREADY_CANCELED` |
| Buổi chưa bắt đầu | `SESSION_ALREADY_STARTED` |
| Lý do hợp lệ (bắt buộc ở §4.6) | `VALIDATION_ERROR` + `details.reason` |

Hủy xong trả chỗ **đúng một lần**, giữ nguyên bản ghi với `status: "CANCELED"`,
`canceledAt`, người hủy và lý do. Ghi audit kèm actor thật (lễ tân, không phải
thành viên).

### 4.7 `GET /ClassSession/{id}/registrations` — roster

Danh sách đăng ký của một buổi, gồm cả bản ghi đã hủy. Trang lịch dùng để
hiện ai bị ảnh hưởng trước khi đổi hoặc hủy lịch. Chỉ trả thông tin tối thiểu
(tên, mã thành viên, trạng thái, nguồn đăng ký) — **không** kèm thanh toán,
email, số điện thoại hay dữ liệu ngoài phạm vi.

---

## 5. Dữ liệu tham chiếu (dùng lại của UC17, UC18, Sprint 1)

FE chỉ **đọc** các danh mục này; màn hình quản lý chúng thuộc Long (bộ môn) và
Tam (phòng).

| § | Endpoint | Dùng ở đâu | Trường FE cần |
| --- | --- | --- | --- |
| 5.1 | `GET /Sport` | Dropdown bộ môn khi tạo lớp | `id`, `name`, `isActive` |
| 5.2 | `GET /Room` | Dropdown phòng khi lập lịch | `id`, `name`, `location`, `capacity`, `isActive` |
| 5.3 | `GET /Coach` | Dropdown phân công | `accountId`, `fullName`, `isActive` hoặc `status`, `specializations` |
| 5.4 | `GET /Member?search=…` (đã có từ Sprint 1) | Tìm thành viên ở quầy | giữ nguyên DTO Sprint 1 |

Ba endpoint đầu cần trả **cả mục đã ngừng hoạt động** kèm cờ trạng thái: form
phải hiển thị lại được Coach/phòng cũ của một buổi đã lập, nếu lọc mất thì
không sửa nổi giờ của buổi đó. `specializations` nhận mảng hoặc chuỗi ngăn
cách bằng dấu phẩy, FE tự tách.

---

## 6. Danh sách mã lỗi FE đã dịch sẵn

Đã thêm vào bảng `MESSAGES` trong `src/services/apiErrors.ts`. Backend trả mã
ngoài danh sách này thì người dùng sẽ thấy thông điệp tiếng Anh của server —
thêm mã mới phải báo FE.

```
CLASS_NOT_FOUND            CLASS_NAME_DUPLICATE        CLASS_HAS_NO_VALID_SESSION
CLASS_NOT_OPEN             CLASS_ARCHIVED              CLASS_HAS_REGISTRATIONS
SPORT_NOT_FOUND            SPORT_INACTIVE
ROOM_NOT_FOUND             ROOM_INACTIVE               ROOM_SCHEDULE_CONFLICT
COACH_NOT_FOUND            COACH_INACTIVE              COACH_SCHEDULE_CONFLICT
MEMBER_SCHEDULE_CONFLICT   CAPACITY_BELOW_REGISTRATIONS
SESSION_NOT_FOUND          SESSION_IN_PAST             SESSION_ALREADY_STARTED
SESSION_CANCELLED          NO_CANCELABLE_SESSION
CLASS_FULL                 DUPLICATE_REGISTRATION
REGISTRATION_NOT_FOUND     REGISTRATION_ALREADY_CANCELED
MEMBERSHIP_NOT_VALID_FOR_SESSION                       PACKAGE_NOT_ELIGIBLE
```

Dùng lại từ Sprint 1: `UNAUTHORIZED`, `FORBIDDEN`, `ACCOUNT_INACTIVE`,
`VALIDATION_ERROR`, `CONCURRENCY_CONFLICT`, `INTERNAL_SERVER_ERROR`.

---

## 7. Những điểm còn phải chốt trước khi code API

Ghi lại để không ai tự quyết một mình:

1. **Quyền bộ môn theo gói.** FE đã dựng nhánh `PACKAGE_NOT_ELIGIBLE`. Nếu
   nhóm chốt "gói nào cũng vào được mọi bộ môn" thì bỏ hẳn mã này, đừng để
   server im lặng cho qua. Nếu có giới hạn, cần quan hệ package–sport và chỗ
   cấu hình nó **trước** UC24.
2. **Hạn hủy.** Hiện đề xuất: hủy được tới trước giờ bắt đầu, không phạt. Nếu
   trung tâm muốn mốc 2h/24h thì chốt trước khi viết API, FE chỉ cần đổi thông
   điệp.
3. **Học phí riêng theo lớp.** Sprint 2 đề xuất chỉ đặt chỗ trong quyền lợi
   gói. Nếu thu riêng thì phải phối hợp Flow 3 và ước lượng lại.
4. **Manager có được đặt thay không.** Hiện FE chỉ cho `RECEPTIONIST` đặt thay
   (màn hình quầy vẫn mở cho Manager xem theo `accessRules.counter`). Nếu
   Manager cũng được đặt thay, phải mở quyền ở server, không chỉ ở UI.
5. **Kiểu ID của Coach.** Sprint 1 dùng `accountId` dạng GUID cho tài khoản,
   còn bộ môn/phòng có vẻ dùng số. FE chịu được cả hai nhưng contract phải
   ghi rõ từng chỗ.

---

## 8. Trạng thái phía FE tại thời điểm viết tài liệu

| Hạng mục | Trạng thái |
| --- | --- |
| UC19 trang quản lý lớp + form | Xong, chạy trên dữ liệu mẫu |
| UC21 form lập/sửa lịch, lịch tuần | Xong, chạy trên dữ liệu mẫu |
| UC30 dialog hủy buổi/lớp kèm số ảnh hưởng | Xong, chạy trên dữ liệu mẫu |
| UC24/UC25 component đăng ký/hủy | Xong, **đang chờ Long ghép** vào trang lớp của Member |
| UC29 đăng ký/hủy tại quầy | Xong, đã bỏ nguồn LocalStorage khỏi nhánh lớp học |
| Test | 25 test util + mapping DTO + quy tắc mock |
| Nối API thật | **Chưa** — chờ backend. Không UC nào được tính là Done ở trạng thái này |

Khi backend sẵn sàng: đặt `VITE_API_BASE_URL`, chạy lại các màn hình, rồi xóa
nhánh mock trong `classApi.ts` cùng file `classMockServer.ts`.
