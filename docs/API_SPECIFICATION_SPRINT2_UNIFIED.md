# API SPRINT 2 — HỢP ĐỒNG CHO CẢ NHÓM

**Dự án:** Sports Center Management System (SCMS)
**Sprint:** 2 — Flow 2: Class Booking & Schedule Management (UC17–UC32)
**Ngày:** 13/10/2026
**Trạng thái:** bản phân tích hợp nhất. **Chưa endpoint nào tồn tại ở backend**, trừ ba endpoint Sprint 1 ghi ở §9.

---

## 0. Tài liệu này được dựng từ đâu

Không phải gộp cơ học hai bản nháp của FE. Thứ tự ưu tiên khi có mâu thuẫn:

1. **[PRODUCT.md](../PRODUCT.md)** — FR-05→FR-09 (bộ môn, phòng, lớp, lịch, đăng ký), FR-17 (thông báo), FR-22 (phân quyền), FR-23 (audit), BR-01→BR-05 và BR-11. Đây là yêu cầu gốc, cao nhất.
2. **[Sprint2.md](../Sprint2.md)** §4 swimlane và §6 bảng quyết định nghiệp vụ.
3. **Code backend Sprint 1 đang chạy** — quyết định mọi câu hỏi về hình dạng response, DTO và endpoint đã tồn tại. Tôi đọc `Controllers/`, `APIViewModel/` và `Services/` chứ không suy đoán.
4. Hai bản nháp của FE: [của Minh](API_SPECIFICATION_SPRINT2_MINH.md) (UC19, 21, 24, 25, 29, 30) và của Tâm (UC18, 20, 27, 28, 32).

**Long chưa có bản nháp**, nên UC17, 22, 23, 26, 31 ở đây tôi dựng thẳng từ FR-05, FR-09, FR-17 và swimlane. Long cần đọc lại §4.1, §6.1, §7.1 và §8.

### Ba thứ cả hai bản nháp FE đều bỏ sót

| Thiếu | Căn cứ | Hệ quả nếu bỏ qua |
|---|---|---|
| `Sport.description` | FR-05: bộ môn có "Tên, **Mô tả**, Trạng thái" | Màn hình UC17 thiếu trường, phải sửa API sau |
| `Room.roomType` | FR-06: phòng có "Room ID, Tên, Vị trí, **Sức chứa, Loại phòng**, Trạng thái" | Như trên |
| **Endpoint cấu hình quyền bộ môn của gói** | FR-09: "Gói **cho phép tham gia lớp đó**" | UC24 không chạy được: có luật `PACKAGE_NOT_ELIGIBLE` nhưng không ai cấu hình được gói nào vào được bộ môn nào |

Thứ ba là lỗ hổng thật: cả hai bản nháp đều ghi entitlement là "câu hỏi mở", nhưng FR-09 đã nói rõ đây là luật bắt buộc. Thiếu endpoint cấu hình thì luật đó vĩnh viễn không bật được. Xem §4.3.

---

## 1. Mười điểm hai bản nháp nói khác nhau — chốt và căn cứ

| # | Vấn đề | **Chốt** | Căn cứ | Ai phải sửa |
|---:|---|---|---|---|
| 1 | Envelope response thành công | **Trả thẳng payload, không bọc `{success, data}`** | Mọi controller Sprint 1 đều `return Ok(result)`; grep toàn bộ `Controllers/` không có chỗ nào bọc | Tâm: `roomApi.ts`, `assignCoachApi.ts` đang đọc `response.data.items` → sẽ `undefined` |
| 2 | Lấy danh sách buổi học | **`GET /ClassSession`**, bỏ `/ScheduleQuery/center` | Một nguồn cho 4 màn hình; tránh BE làm hai endpoint cùng dữ liệu | Tâm: `assignCoachApi.getSessions()` |
| 3 | Đổi Coach cho buổi | **Giữ cả hai**: `PUT /ClassSession/{id}` (UC21) và `PUT /ClassSession/{id}/coach` (UC20) | Chính Tâm nêu rủi ro ghi đè khi gửi payload đầy đủ; hai endpoint dùng chung một bộ kiểm tra trùng lịch | Không ai |
| 4 | Lịch dạy của Coach | **`GET /ClassSession/me`** thay cho `/my-teaching-schedule` | Đồng bộ với `/ClassRegistration/me`; cùng quy tắc "danh tính từ token" | Tâm khi làm UC27 |
| 5 | Trường của Coach | **`status` + `specialization` (chuỗi)** | DTO `/Coach` **đã tồn tại** Sprint 1, không đổi vì Flow 2 | Không ai — `mapCoachOption` đã nhận cả hai dạng |
| 6 | Roster buổi học | **Phân trang, `includeCanceled` mặc định `false`** | Lịch của Minh cần cả bản đã hủy thì truyền `true` | Minh |
| 7 | Bộ lọc AuditLog | **`fromDate`, `toDate` (đã có) + thêm `actorId`, `entityId`** | `AuditLogController` hiện có `page, pageSize, search, action, entityType, fromDate, toDate` | Tâm: dùng đúng tên tham số |
| 8 | Mã lỗi phòng | **Lấy hợp cả hai** (thêm `ROOM_NAME_DUPLICATE`, `ROOM_CAPACITY_BELOW_SCHEDULE`) | Hai mã mới là luật thật của UC18 | Tâm: thêm vào `apiErrors.ts` |
| 9 | `pageSize` cho dropdown | **Mặc định 20, tối đa 100** | Cho phép cả hai cách lấy; chặn query nặng | Không ai |
| 10 | Kiểu ID | **`Sport/Room/Class/ClassSession/ClassRegistration.Id` là `int`; `Coach.AccountId`, `Member.AccountId` là `varchar(400)`** | Schema đề xuất ở [file SQL](sql/2026-10-11-flow2-class-schedule.sql) | Không ai |

---

## 2. Hai sai lệch giữa yêu cầu gốc và thiết kế Sprint 2 — cần nhóm biết

**① FR-07 ghi Coach và Room thuộc về *lớp*; Sprint 2 đặt chúng ở *buổi học*.**

FR-07 liệt kê thông tin lớp gồm "Coach, Room, Capacity". Sprint2.md §6 lại chốt "Gán Coach/phòng: lưu tại buổi; lớp có thể có nhiều buổi và Coach khác nhau".

Tài liệu này **theo Sprint2.md**, vì FR-08 yêu cầu chống trùng Coach và phòng theo *khoảng thời gian* — mà thời gian chỉ tồn tại ở buổi học. Đặt Coach ở cấp lớp thì một lớp kéo dài 3 tháng sẽ khóa cứng một Coach cho toàn bộ, và không cách nào đổi người dạy bù một buổi. Hệ quả: `Class` **không có** `coachId` / `roomId`; `ClassSession` có.

Nếu nhóm muốn giữ nguyên FR-07 thì phải sửa Sprint2.md §6 trước, và FE của cả Minh lẫn Tâm đều phải dựng lại.

**② "Xem lịch sử dụng phòng" (FR-06) không cần endpoint mới.**

Dùng `GET /ClassSession?roomId=1&from=…&to=…`. Đừng tạo `/Room/{id}/schedule`.

---

## 3. Toàn bộ API Sprint 2

**37 endpoint: 34 mới + 3 tái sử dụng.** Cột "FR/BR" để truy ngược về yêu cầu gốc.

### 3.1 Bộ môn — `/Sport` (UC17, Long)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 1 | GET | `/Sport` | FR-05 | mọi vai trò đăng nhập | Long (danh mục), Minh (dropdown tạo lớp) |
| 2 | POST | `/Sport` | FR-05 | Manager | Long |
| 3 | PUT | `/Sport/{id}` | FR-05 | Manager | Long |
| 4 | PATCH | `/Sport/{id}/status` | FR-05 | Manager | Long |

### 3.2 Phòng tập — `/Room` (UC18, Tâm)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 5 | GET | `/Room` | FR-06 | mọi vai trò đăng nhập | Tâm (danh mục), Minh (dropdown lập lịch) |
| 6 | POST | `/Room` | FR-06 | Manager | Tâm |
| 7 | PUT | `/Room/{id}` | FR-06 | Manager | Tâm |
| 8 | PATCH | `/Room/{id}/status` | FR-06 | Manager | Tâm |

### 3.3 Quyền bộ môn của gói — `/MembershipPackage/{id}/sports` (UC24, **chưa ai nhận**)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 9 | GET | `/MembershipPackage/{id}/sports` | FR-09 | Manager | người làm màn hình gói |
| 10 | PUT | `/MembershipPackage/{id}/sports` | FR-09 | Manager | người làm màn hình gói |

### 3.4 Lớp học — `/Class` (UC19 Minh, UC23 Long, UC30 Minh)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 11 | GET | `/Class` | FR-07 | mọi vai trò¹ | Minh, Long |
| 12 | GET | `/Class/{id}` | FR-07 | mọi vai trò¹ | Long (chi tiết lớp cho Member) |
| 13 | POST | `/Class` | FR-07 | Manager | Minh |
| 14 | PUT | `/Class/{id}` | FR-07 | Manager | Minh |
| 15 | PATCH | `/Class/{id}/status` | FR-07 | Manager | Minh |
| 16 | GET | `/Class/{id}/cancel-impact` | FR-07 | Manager | Minh |
| 17 | POST | `/Class/{id}/cancel-future-sessions` | FR-07, BR-11 | Manager | Minh |

¹ Member chỉ thấy lớp `OPEN`.

### 3.5 Buổi học — `/ClassSession` (UC20 Tâm, UC21/30 Minh, UC22/23 Long, UC27/28 Tâm)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 18 | GET | `/ClassSession` | FR-08 | mọi vai trò² | Minh, Tâm, Long — **4 màn hình dùng chung** |
| 19 | GET | `/ClassSession/{id}` | FR-08 | mọi vai trò² | Long (chi tiết buổi cho Member) |
| 20 | POST | `/ClassSession` | FR-08, BR-04, BR-05 | Manager | Minh |
| 21 | PUT | `/ClassSession/{id}` | FR-08, BR-04, BR-05 | Manager | Minh |
| 22 | PUT | `/ClassSession/{id}/coach` | FR-07, BR-04 | Manager | Tâm |
| 23 | GET | `/ClassSession/me` | FR-08 | Coach | Tâm |
| 24 | GET | `/ClassSession/{id}/cancel-impact` | FR-07 | Manager | Minh |
| 25 | POST | `/ClassSession/{id}/cancel` | FR-07, BR-11 | Manager | Minh |
| 26 | GET | `/ClassSession/{id}/registrations` | FR-09, BR-07 | Manager, Coach được phân công | Tâm (roster), Minh (xem ảnh hưởng) |

² Member chỉ thấy buổi `SCHEDULED` của lớp `OPEN`.

### 3.6 Đăng ký buổi học — `/ClassRegistration` (UC24/25/29 Minh, UC26 Long)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 27 | GET | `/ClassRegistration/me` | FR-09, BR-08 | Member | Minh (component), Long (lịch cá nhân) |
| 28 | GET | `/ClassRegistration` | FR-09 | Receptionist, Manager | Minh (quầy) |
| 29 | POST | `/ClassRegistration/register` | FR-09, BR-01→03 | Member | Minh |
| 30 | POST | `/ClassRegistration/counter-register` | FR-09 | Receptionist | Minh |
| 31 | POST | `/ClassRegistration/{id}/cancel` | FR-09, BR-08 | Member (của mình) | Minh |
| 32 | POST | `/ClassRegistration/{id}/counter-cancel` | FR-09 | Receptionist | Minh |

### 3.7 Thông báo — `/Notification` (UC31, P1, Long)

| # | Method | Đường dẫn | FR/BR | Quyền | Ai gọi |
|---:|---|---|---|---|---|
| 33 | GET | `/Notification/me` | FR-17 | Member, Coach | Long |
| 34 | PATCH | `/Notification/{id}/read` | FR-17 | người nhận | Long |

### 3.8 Tái sử dụng Sprint 1 — **đã có, không viết lại**

| # | Method | Đường dẫn | UC | Việc BE cần làm thêm |
|---:|---|---|---|---|
| 35 | GET | `/Coach` | 20, 21 | Không — xem §9.1 |
| 36 | GET | `/Member` | 29 | Không |
| 37 | GET | `/AuditLog` | 32 | Thêm filter `actorId`, `entityId` |

### 3.9 Thứ tự nên làm

Phụ thuộc dữ liệu quyết định thứ tự, không phải độ ưu tiên UC:

```
①  Sport, Room                     (#1–8)    — không phụ thuộc gì
②  MembershipPackage/{id}/sports   (#9–10)   — cần Sport
③  Class                           (#11–17)  — cần Sport
④  ClassSession                    (#18–26)  — cần Class, Room, Coach
⑤  ClassRegistration               (#27–32)  — cần ClassSession + gói + entitlement
⑥  AuditLog filter, Notification   (#33–34, #37)
```

Nhóm ⑤ là nhóm khó nhất (transaction, concurrency, quyền) và **phải làm sau cùng** — đừng bắt đầu từ đó.

---

## 4. Danh mục

### 4.1 `/Sport` — bộ môn (FR-05)

```json
{ "id": 7, "name": "Yoga", "description": "Các lớp yoga cơ bản và nâng cao",
  "isActive": true, "createdAt": "…", "updatedAt": null }
```

- `GET /Sport` — query `page`, `pageSize`, `search`, `isActive`. **Bỏ `isActive` thì trả cả bộ môn ngừng hoạt động** — form sửa lớp cũ cần hiển thị lại bộ môn đã ngừng.
- `POST /Sport` body `{ "name", "description" }` → `201`, `isActive` mặc định `true`.
- `PUT /Sport/{id}` body như POST → `200`.
- `PATCH /Sport/{id}/status` body `{ "isActive": false }` → `200`.

| Luật | Mã lỗi |
|---|---|
| Tên không trùng sau chuẩn hóa (bỏ dấu, gộp khoảng trắng, không phân biệt hoa thường) | `SPORT_NAME_DUPLICATE` |
| Không tồn tại | `SPORT_NOT_FOUND` |
| Bộ môn ngừng hoạt động không dùng tạo lớp mới | `SPORT_INACTIVE` |
| Không xóa cứng bộ môn đã có lớp tham chiếu — FE không gọi `DELETE` | — |

### 4.2 `/Room` — phòng tập (FR-06)

```json
{ "id": 1, "name": "Studio A", "location": "Tầng 2", "capacity": 20,
  "roomType": "STUDIO", "isActive": true, "createdAt": "…", "updatedAt": null }
```

`roomType` theo FR-06 ("Loại phòng"). Đề xuất enum chuỗi: `STUDIO`, `GYM`, `POOL`, `COURT`, `OTHER`; cho phép `null` để không chặn Sprint 2.

- `GET /Room` — query `page`, `pageSize`, `search`, `isActive`. Bỏ `isActive` thì trả cả phòng ngừng hoạt động.
- `POST /Room` body `{ "name", "location", "capacity", "roomType" }` → `201`.
- `PUT /Room/{id}` → `200`. `PATCH /Room/{id}/status` body `{ "isActive": false }` → `200`.
- **Không xóa cứng** vì `ClassSession.RoomId` có khóa ngoại.

| Luật | Mã lỗi |
|---|---|
| Tên bắt buộc, ≤ 80 ký tự, không trùng | `ROOM_NAME_DUPLICATE` |
| Vị trí ≤ 120 ký tự | `VALIDATION_ERROR` |
| Sức chứa nguyên dương | `VALIDATION_ERROR` |
| Không tồn tại | `ROOM_NOT_FOUND` |
| Phòng ngừng hoạt động không dùng cho lịch mới | `ROOM_INACTIVE` |
| Không hạ sức chứa xuống dưới `capacity` của **buổi `SCHEDULED` chưa bắt đầu** đang dùng phòng | `ROOM_CAPACITY_BELOW_SCHEDULE` |

**Quyết định:** phạm vi kiểm tra khi giảm sức chứa chỉ xét buổi `SCHEDULED` **chưa bắt đầu** — buổi đã diễn ra là lịch sử, chặn sửa phòng vì nó là vô lý. Phòng đang có lịch tương lai **vẫn được** chuyển sang ngừng hoạt động: lịch cũ giữ nguyên, chỉ không dùng cho buổi mới.

### 4.3 `/MembershipPackage/{id}/sports` — quyền bộ môn của gói (FR-09)

**Đây là endpoint không bản nháp FE nào liệt kê, và thiếu nó thì UC24 không hoàn chỉnh.**

FR-09 ghi Member chỉ được đăng ký khi "Gói cho phép tham gia lớp đó". Luật đó cần chỗ cấu hình, nếu không `PACKAGE_NOT_ELIGIBLE` mãi mãi không bật được.

```http
GET /MembershipPackage/12/sports
→ { "packageId": 12, "sportIds": [7, 9], "allowsAllSports": false }
```

```http
PUT /MembershipPackage/12/sports
{ "sportIds": [7, 9] }
→ 200, object như trên
```

**Quy ước:** `sportIds` rỗng nghĩa là **gói vào được mọi bộ môn** (`allowsAllSports: true`). Cách này giữ mọi gói Sprint 1 chạy nguyên trạng mà không cần migration dữ liệu — gói cũ không có dòng nào trong bảng liên kết nên mặc định toàn quyền.

Bảng `MembershipPackageSport` đã có trong [file SQL](sql/2026-10-11-flow2-class-schedule.sql) §5.

---

## 5. Lớp học (FR-07)

### 5.1 `GET /Class`, `GET /Class/{id}`

Query: `page`, `pageSize`, `search`, `sportId`, `status`.

```json
{
  "id": 12, "sportId": 7, "sportName": "Yoga",
  "name": "Yoga cân bằng cơ bản",
  "description": "Lớp nhập môn cho người mới.",
  "capacity": 15, "status": "OPEN",
  "upcomingSessionCount": 4, "totalSessionCount": 5,
  "activeRegistrationCount": 9,
  "createdAt": "2026-10-01T02:00:00.000Z",
  "updatedAt": "2026-10-09T02:00:00.000Z"
}
```

`status`: `DRAFT` | `OPEN` | `CLOSED` | `ARCHIVED`. Giá trị lạ FE quy về `DRAFT` để không vô tình mở bán.

`upcomingSessionCount` = số buổi `SCHEDULED` còn ở tương lai, dùng để biết lớp đủ điều kiện mở đăng ký chưa. `activeRegistrationCount` làm **sàn** cho ô sức chứa khi sửa lớp.

**Lưu ý:** `Class` **không có** `coachId` / `roomId` — xem §2①.

### 5.2 `POST /Class`, `PUT /Class/{id}`, `PATCH /Class/{id}/status`

```json
{ "sportId": 7, "name": "Yoga cân bằng cơ bản", "description": "", "capacity": 15, "status": "DRAFT" }
```

`PATCH status` body `{ "status": "ARCHIVED" }`.

| Luật | Mã lỗi |
|---|---|
| Tên không trùng sau chuẩn hóa, xét trên lớp chưa `ARCHIVED` | `CLASS_NAME_DUPLICATE` |
| Bộ môn tồn tại | `SPORT_NOT_FOUND` |
| Bộ môn ngừng hoạt động không dùng cho lớp mới (lớp cũ trỏ vào thì giữ được) | `SPORT_INACTIVE` |
| `capacity` nguyên dương, ≥ số đăng ký còn hiệu lực của buổi đông nhất, ≥ `capacity` của buổi đã lập | `CAPACITY_BELOW_REGISTRATIONS` |
| Chỉ sang `OPEN` khi có ≥ 1 buổi `SCHEDULED` ở tương lai | `CLASS_HAS_NO_VALID_SESSION` |
| Không xóa cứng lớp đã có đăng ký | `CLASS_HAS_REGISTRATIONS` |

---

## 6. Buổi học (FR-08, BR-04, BR-05)

### 6.1 `GET /ClassSession`, `GET /ClassSession/{id}`

Query: `from`, `to` (ngày, bao gồm hai đầu), `classId`, `coachId`, `roomId`, `sportId`, `status`, `page`, `pageSize`.

```json
{
  "id": 44, "classId": 12, "className": "Yoga cân bằng cơ bản",
  "sportId": 7, "sportName": "Yoga",
  "coachId": "acc-coa-001", "coachName": "Trần Thu Hà",
  "roomId": 1, "roomName": "Studio A",
  "date": "2026-10-20", "startTime": "08:00", "endTime": "09:00",
  "startsAt": "2026-10-20T08:00:00+07:00",
  "endsAt": "2026-10-20T09:00:00+07:00",
  "capacity": 15, "bookedCount": 4, "remainingCapacity": 11,
  "status": "SCHEDULED", "notes": "",
  "cancelReason": null, "canceledAt": null,
  "updatedAt": "2026-10-11T02:00:00.000Z"
}
```

`status`: `SCHEDULED` | `CANCELED` | `COMPLETED` (FE nhận cả `CANCELLED`).

**Một endpoint phục vụ năm màn hình:** lịch tuần Manager (UC21), chọn buổi để phân công (UC20), lịch trung tâm (UC22), danh sách buổi cho Member (UC23), và "lịch sử dụng phòng" của FR-06 qua `?roomId=`.

### 6.2 `POST /ClassSession`, `PUT /ClassSession/{id}`

```json
{ "classId": 12, "coachId": "acc-coa-001", "roomId": 1, "date": "2026-10-20",
  "startTime": "08:00", "endTime": "09:00", "capacity": 15, "notes": "" }
```

Thứ tự kiểm tra (để thông báo trỏ đúng nguyên nhân đầu tiên):

| Luật | Mã lỗi |
|---|---|
| `startTime < endTime`, định dạng hợp lệ | `VALIDATION_ERROR` + `details.endTime` |
| Không lập/chuyển buổi về thời điểm đã qua | `SESSION_IN_PAST` |
| Lớp tồn tại, không `ARCHIVED` | `CLASS_NOT_FOUND` / `CLASS_ARCHIVED` |
| Coach tồn tại và đang hoạt động (giữ Coach cũ đã ngừng hoạt động khi chỉ sửa giờ) | `COACH_NOT_FOUND` / `COACH_INACTIVE` |
| Phòng tồn tại và đang hoạt động | `ROOM_NOT_FOUND` / `ROOM_INACTIVE` |
| `capacity` ≤ sức chứa lớp, ≤ sức chứa phòng, ≥ số đã đăng ký | `VALIDATION_ERROR` + `details.capacity` |
| **BR-04** Coach không trùng giờ buổi `SCHEDULED` khác | `COACH_SCHEDULE_CONFLICT` |
| **BR-05** Phòng không trùng giờ buổi `SCHEDULED` khác | `ROOM_SCHEDULE_CONFLICT` |
| Đổi ngày/giờ buổi **đã có đăng ký**: mọi học viên phải còn gói hợp lệ ngày mới và không trùng buổi khác. Một người không hợp lệ → **từ chối toàn bộ** | `MEMBER_SCHEDULE_CONFLICT` |
| Buổi đã `CANCELED` không sửa | `SESSION_CANCELLED` |

Thất bại rollback hoàn toàn, không ghi một phần.

### 6.3 `PUT /ClassSession/{id}/coach` (UC20)

```json
{ "coachId": "acc-coa-002" }
```

→ `200` + object ClassSession. **Chỉ đổi Coach**, không đụng ngày/giờ/phòng/sức chứa.

Dùng chung bộ kiểm tra với §6.2: `COACH_NOT_FOUND`, `COACH_INACTIVE`, `COACH_SCHEDULE_CONFLICT` (BR-04), `SESSION_NOT_FOUND`, `SESSION_CANCELLED`, `SESSION_ALREADY_STARTED`.

**Quyết định:** không cho đổi Coach sau khi buổi đã bắt đầu. Buổi đã có học viên đăng ký thì **vẫn cho đổi** — đổi người dạy không làm học viên mất quyền tham gia — nhưng ghi audit và (khi có UC31) phát thông báo. **Không** ràng buộc Coach đúng chuyên môn ở Sprint 2, vì `Coach.Specialization` hiện là chuỗi tự do chưa liên kết `Sport`.

### 6.4 `GET /ClassSession/me` — lịch dạy của Coach (UC27)

Query: `from`, `to`, `status`, `page`, `pageSize`. Server lọc theo `ClassSession.CoachId` = danh tính trong token, **không nhận `coachId` từ client**. Response dùng y nguyên item §6.1.

Mặc định: `from` = hôm nay, `to` = +7 ngày, trả cả `CANCELED` để Coach biết buổi bị hủy.

### 6.5 `GET /ClassSession/{id}/cancel-impact`, `GET /Class/{id}/cancel-impact`

```json
{ "scope": "CLASS_FUTURE_SESSIONS", "affectedSessionCount": 3,
  "affectedRegistrationCount": 7, "affectedMemberCount": 6,
  "nextSessionStartsAt": "2026-10-20T08:00:00+07:00" }
```

`affectedSessionCount` phải đếm **đúng tập buổi mà §6.6 sẽ hủy** (`SCHEDULED`, chưa bắt đầu). Lệch là con số trong hộp thoại xác nhận sai đúng lúc người dùng cần tin nó nhất.

### 6.6 `POST /ClassSession/{id}/cancel`, `POST /Class/{id}/cancel-future-sessions`

Body `{ "reason": "Huấn luyện viên nghỉ bệnh" }` — bắt buộc, 3–500 ký tự.
Hủy theo lớp trả `{ "canceledSessionCount": 3 }`.

- Hủy một buổi: phải `SCHEDULED` và chưa bắt đầu → `SESSION_CANCELLED` / `SESSION_ALREADY_STARTED`.
- Hủy theo lớp: chỉ buổi `SCHEDULED` chưa bắt đầu; hết buổi → `NO_CANCELABLE_SESSION`.
- **Nguyên tử:** hủy buổi và hủy mọi đăng ký `BOOKED` của buổi trong cùng giao dịch. Kết thúc không được còn đăng ký `BOOKED` trỏ vào buổi đã hủy.
- Giữ lịch sử, chặn đặt mới, **không tự hoàn tiền gói tập**. Audit từng buổi và từng đăng ký (BR-11).

### 6.7 `GET /ClassSession/{id}/registrations` — roster (UC28, UC21)

Query: `page`, `pageSize`, `includeCanceled` (mặc định `false`).

```json
{ "items": [ { "id": 501, "sessionId": 44, "memberAccountId": "acc-mem-101",
  "memberName": "Nguyễn Hoàng An", "memberCode": "MB0101",
  "status": "BOOKED", "registeredVia": "MEMBER" } ],
  "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
```

Quyền: Manager, hoặc Coach **được phân công đúng buổi đó** — server đối chiếu `ClassSession.CoachId` với token (BR-07). Coach khác → `403`.

**Không** trả email, số điện thoại, thanh toán hay dữ liệu ngoài phạm vi.

**Quyết định:** Coach đã bị đổi khỏi buổi **không** còn xem được roster — quyền bám theo phân công hiện tại.

---

## 7. Đăng ký buổi học (FR-09, BR-01→BR-03)

Mọi response đăng ký dùng chung hình dạng:

```json
{
  "id": 501, "sessionId": 44,
  "memberAccountId": "acc-mem-101",
  "memberName": "Nguyễn Hoàng An", "memberCode": "MB0101",
  "status": "BOOKED",
  "registeredAt": "2026-10-11T02:10:00.000Z",
  "registeredVia": "RECEPTIONIST",
  "registeredByName": "Lễ tân Nguyễn Thị Mai",
  "canceledAt": null, "canceledByName": null, "cancelReason": null,
  "session": { "…": "nguyên object §6.1" }
}
```

`session` lồng bên trong **bắt buộc** cho §7.1 và §7.2 — danh sách đăng ký hiển thị tên lớp, giờ, phòng, trạng thái buổi mà không gọi thêm request. Roster §6.7 không cần vì đã biết buổi nào.

| § | Endpoint | Body | Ghi chú |
|---|---|---|---|
| 7.1 | `GET /ClassRegistration/me?includeCanceled=false` | — | danh tính từ token (BR-08) |
| 7.2 | `GET /ClassRegistration?memberAccountId=…&includeCanceled=true` | — | chỉ Receptionist, Manager |
| 7.3 | `POST /ClassRegistration/register` | `{ "sessionId": 44 }` | **không có memberId** |
| 7.4 | `POST /ClassRegistration/counter-register` | `{ "sessionId": 44, "memberAccountId": "…" }` | chỉ Receptionist |
| 7.5 | `POST /ClassRegistration/{id}/cancel` | `{ "reason": "…" }` | lý do **tùy chọn** |
| 7.6 | `POST /ClassRegistration/{id}/counter-cancel` | `{ "reason": "…" }` | lý do **bắt buộc**, 3–500 ký tự |

**Luật khi đăng ký — §7.3 và §7.4 giống hệt nhau:**

| Luật | FR/BR | Mã lỗi |
|---|---|---|
| Buổi tồn tại | | `SESSION_NOT_FOUND` |
| Buổi chưa bị hủy | | `SESSION_CANCELLED` |
| Buổi chưa bắt đầu (giờ server) | | `SESSION_ALREADY_STARTED` |
| Lớp đang `OPEN` | | `CLASS_NOT_OPEN` |
| Tài khoản thành viên còn hoạt động | FR-09 | `ACCOUNT_INACTIVE` |
| Gói đã thanh toán, không tạm ngưng, bao phủ **ngày diễn ra buổi** | BR-01 | `MEMBERSHIP_NOT_VALID_FOR_SESSION` |
| Gói cho phép bộ môn của lớp (§4.3) | FR-09 | `PACKAGE_NOT_ELIGIBLE` |
| Chưa có đăng ký còn hiệu lực cho đúng buổi này | | `DUPLICATE_REGISTRATION` |
| Không trùng giờ buổi khác đã đặt | BR-03 | `MEMBER_SCHEDULE_CONFLICT` |
| Còn chỗ | BR-02 | `CLASS_FULL` |

**Chống vượt sức chứa (BR-02):** hai request tranh chỗ cuối chỉ một được `201`. Cần unique index có điều kiện trên `(SessionId, MemberId) WHERE Status='BOOKED'` cộng `UPDATE … WHERE BookedCount < Capacity` — công thức đầy đủ ở [BE_HANDOFF §5.3](BE_HANDOFF_SPRINT2_MINH.md).

**Luật khi hủy:**

| Luật | Mã lỗi |
|---|---|
| Đăng ký tồn tại và **thuộc về người gọi** (§7.5) | `REGISTRATION_NOT_FOUND` / `403` |
| Chưa bị hủy trước đó — gửi lặp **không** trả chỗ lần hai | `REGISTRATION_ALREADY_CANCELED` |
| Buổi chưa bắt đầu | `SESSION_ALREADY_STARTED` |
| Lý do hợp lệ (bắt buộc ở §7.6) | `VALIDATION_ERROR` + `details.reason` |

Hủy xong trả chỗ **đúng một lần**, giữ bản ghi `CANCELED` + người hủy + lý do, audit ghi actor thật.

---

## 8. Thông báo (FR-17, UC31 — P1)

FR-17 liệt kê 9 loại thông báo cho toàn hệ thống. **Sprint 2 chỉ làm 4 loại thuộc Flow 2:**

| `type` | Phát khi | Người nhận |
|---|---|---|
| `CLASS_REGISTERED` | đăng ký thành công (§7.3, §7.4) | Member |
| `SESSION_RESCHEDULED` | đổi ngày/giờ/phòng buổi (§6.2) | Member đang giữ chỗ + Coach |
| `SESSION_COACH_CHANGED` | đổi Coach (§6.3) | Member đang giữ chỗ + Coach cũ + Coach mới |
| `SESSION_CANCELED` | hủy buổi hoặc hủy lớp (§6.6) | Member đang giữ chỗ + Coach |

Năm loại còn lại (gói sắp hết hạn, kế hoạch tập luyện, nhận xét…) thuộc Flow 3/Flow 4, **không làm ở Sprint 2**.

```http
GET /Notification/me?page=1&pageSize=20&isRead=false
```

```json
{ "id": 77, "type": "SESSION_CANCELED",
  "title": "Buổi học ngày 20/10 đã bị hủy",
  "body": "Lý do: Huấn luyện viên nghỉ bệnh.",
  "entityType": "ClassSession", "entityId": "44",
  "isRead": false, "createdAt": "2026-10-13T02:00:00.000Z" }
```

`PATCH /Notification/{id}/read` body `{ "isRead": true }` → `200`.

**Chống trùng khi retry** (yêu cầu Sprint2.md §4): bảng thông báo cần khóa duy nhất `(recipientId, type, entityType, entityId, eventAt)`. Hủy một buổi hai lần do retry chỉ tạo một thông báo. Không gồm email/push.

---

## 9. Endpoint Sprint 1 được dùng lại

### 9.1 `GET /Coach` — **đã có, không cần sửa**

DTO hiện tại (`CoachListItemAPIViewModel`): `accountId`, `email`, `fullName`, `phone`, `specialization` (chuỗi, số ít), `workSchedule`, `status`, `createdAt`.

Query `page`, `pageSize`, `search`, `status`. Không truyền `status` thì trả **cả `Active` lẫn `Inactive`** — đúng cái Flow 2 cần để form sửa buổi cũ hiển thị lại Coach đã gán. `status` chỉ nhận `Active` hoặc `Inactive`, giá trị khác trả lỗi; FE không được gửi `status=All`.

> **Lưu ý cho Tâm:** `assignCoachApi.getCoaches()` đang gọi `?status=Active`, nên Coach ngừng hoạt động biến mất khỏi dropdown và không hiển thị lại được phân công cũ. Bỏ tham số đó.

### 9.2 `GET /Member` — **đã có**, dùng nguyên trạng cho tìm thành viên ở quầy (UC29).

### 9.3 `GET /AuditLog` — **đã có** (UC32, FR-23)

Query hiện có: `page`, `pageSize`, `search`, `action`, `entityType`, `fromDate`, `toDate`.
Item hiện có: `id`, `accountId`, `accountName`, `action`, `entityType`, `entityId`, `description`, `createdAt` — khớp đủ sáu trường FR-23 yêu cầu.

**Việc BE cần làm:** thêm hai filter `actorId`, `entityId`. Không cần endpoint mới.

`entityType` cho Flow 2: `Sport`, `Room`, `Class`, `ClassSession`, `ClassRegistration`.
`action` — đặt tên một lần để UC32 lọc được:

```
SPORT_CREATED        SPORT_UPDATED        SPORT_STATUS_CHANGED
ROOM_CREATED         ROOM_UPDATED         ROOM_STATUS_CHANGED
CLASS_CREATED        CLASS_UPDATED        CLASS_STATUS_CHANGED
SESSION_CREATED      SESSION_UPDATED      SESSION_COACH_CHANGED
SESSION_CANCELED     CLASS_SESSIONS_CANCELED
CLASS_REGISTERED     CLASS_REGISTRATION_CANCELED
```

Actor luôn lấy từ token (BR-11). Không ghi mật khẩu, token hay dữ liệu thanh toán vào `description`.

---

## 10. Quy ước chung

### 10.1 Xác thực và phân quyền

- Base URL `VITE_API_BASE_URL`, dev `http://localhost:5198/api`; đường dẫn trên tương đối với `/api`.
- Mọi endpoint yêu cầu `Authorization: Bearer <jwt>`.
- **Danh tính từ token.** Endpoint `/me` không nhận `coachId` / `memberAccountId` từ client.
- Đổi ID trong URL không được lấy dữ liệu ngoài quyền → `403` (FR-22). Không `404` mơ hồ, không `200`.

### 10.2 Hình dạng response

Thành công: **trả thẳng payload** (chốt #1). Danh sách phân trang:

```json
{ "items": [ … ], "page": 1, "pageSize": 20, "totalItems": 37, "totalPages": 2 }
```

`pageSize` mặc định 20, tối đa 100.

Lỗi: dùng `ApiErrorResponseAPIViewModel` đang có:

```json
{ "success": false,
  "error": { "code": "COACH_SCHEDULE_CONFLICT",
             "message": "Coach already has a session in this time range.",
             "details": { "coachId": ["Trùng với buổi 08:00–09:00."] } },
  "traceId": "00-ab12…" }
```

`details` là `{ tênTrường: [thông điệp] }`, tên trường **trùng tên trong request**, nội dung **tiếng Việt** vì FE gắn thẳng xuống dưới ô nhập.

### 10.3 Kiểu dữ liệu và thời gian

| Loại | Định dạng |
|---|---|
| `date` | `YYYY-MM-DD`, lịch trung tâm |
| `startTime`, `endTime` | `HH:mm` (nhận `HH:mm:ss`) |
| `startsAt`, `endsAt` | ISO-8601 **có offset**: `2026-10-20T08:00:00+07:00` |
| timestamp hệ thống | ISO-8601 UTC |
| tiền (VND) | số nguyên |
| khoảng giờ | nửa mở `[start, end)` — buổi kết thúc 09:00 **không** trùng buổi bắt đầu 09:00 |

`bookedCount` và `remainingCapacity` **do server tính**.

---

## 11. Quy tắc nghiệp vụ — bảng tổng

Các quy tắc đã nằm rải trong §4–§8 theo từng endpoint. Bảng dưới gom lại một
chỗ để BE không bỏ sót và QA có danh sách nghiệm thu, đồng thời truy ngược về
BR-01→BR-12 trong [PRODUCT.md](../PRODUCT.md).

**Ba nguyên tắc bao trùm:**

1. **Server là ranh giới duy nhất.** Mọi kiểm tra ở FE chỉ để người dùng biết
   sớm. Ẩn nút không phải là thực thi quy tắc — API bị gọi thẳng vẫn phải từ
   chối.
2. **Một quy tắc một mã lỗi.** Không gộp nhiều nguyên nhân vào một
   `VALIDATION_ERROR` chung, vì mỗi trường hợp FE hướng dẫn người dùng một
   cách khác nhau.
3. **Thất bại là nguyên tử.** Không ghi một phần rồi báo lỗi.

### 11.1. Quy tắc gốc trong PRODUCT.md

| BR | Nội dung | Thực thi ở đâu | Mã lỗi |
|---|---|---|---|
| BR-01 | Member phải có gói hợp lệ để dùng dịch vụ yêu cầu membership | §7.3, §7.4 khi đăng ký; §6.2 khi đổi lịch buổi đã có người đăng ký | `MEMBERSHIP_NOT_VALID_FOR_SESSION` |
| BR-02 | Không đăng ký vượt capacity, **kể cả hai người tranh chỗ cuối** | §7.3, §7.4 | `CLASS_FULL` |
| BR-03 | Member không đăng ký hai buổi trùng giờ | §7.3, §7.4 | `MEMBER_SCHEDULE_CONFLICT` |
| BR-04 | Coach không được phân công hai buổi trùng giờ | §6.2 khi lập/sửa lịch; §6.3 khi đổi Coach | `COACH_SCHEDULE_CONFLICT` |
| BR-05 | Một phòng không có hai buổi trùng giờ | §6.2 | `ROOM_SCHEDULE_CONFLICT` |
| BR-07 | Chỉ Coach được phân công mới thao tác trên lớp đó | §6.7 roster — Coach khác nhận `403` | `FORBIDDEN` |
| BR-08 | Member chỉ xem dữ liệu của chính mình | §7.1 lấy danh tính từ token; §7.5 kiểm ownership | `FORBIDDEN` |
| BR-11 | Thao tác quản trị quan trọng phải ghi Audit Log | mọi `POST`/`PUT`/`PATCH` của §4–§7 | — |
| BR-12 | Thanh toán thành công mới kích hoạt membership | gói `PENDING_PAYMENT` không cho đặt lớp | `MEMBERSHIP_NOT_VALID_FOR_SESSION` |

BR-06, BR-09, BR-10 không thuộc phạm vi Flow 2.

**"Trùng thời gian" của BR-03, BR-04, BR-05** là khoảng nửa mở
`[bắt đầu, kết thúc)` trên **buổi học**: buổi kết thúc 09:00 và buổi bắt đầu
09:00 **không** trùng. Đây là một ca nghiệm thu riêng (#16 ở
[BE_HANDOFF §6.3](BE_HANDOFF_SPRINT2_MINH.md)), không phải chi tiết nhỏ.

### 11.2. Danh mục — bộ môn và phòng

| # | Quy tắc | Endpoint | Mã lỗi |
|---:|---|---|---|
| 1 | Tên bộ môn không trùng sau chuẩn hóa (bỏ dấu, gộp khoảng trắng, không phân biệt hoa thường) | §4.1 | `SPORT_NAME_DUPLICATE` |
| 2 | Tên phòng không trùng sau chuẩn hóa, tối đa 80 ký tự | §4.2 | `ROOM_NAME_DUPLICATE` |
| 3 | Sức chứa phòng là số nguyên dương | §4.2 | `VALIDATION_ERROR` |
| 4 | Không hạ sức chứa phòng xuống dưới `capacity` của buổi `SCHEDULED` **chưa bắt đầu** đang dùng phòng | §4.2 | `ROOM_CAPACITY_BELOW_SCHEDULE` |
| 5 | Bộ môn/phòng ngừng hoạt động không dùng cho lớp hoặc lịch **mới**; dữ liệu cũ trỏ vào vẫn giữ nguyên | §5.2, §6.2 | `SPORT_INACTIVE`, `ROOM_INACTIVE` |
| 6 | Không xóa cứng bộ môn/phòng đã được tham chiếu — chỉ đổi trạng thái | không có `DELETE` | — |

### 11.3. Lớp học

| # | Quy tắc | Endpoint | Mã lỗi |
|---:|---|---|---|
| 7 | Tên lớp không trùng sau chuẩn hóa, xét trên lớp chưa `ARCHIVED` | §5.2 | `CLASS_NAME_DUPLICATE` |
| 8 | Lớp chỉ chuyển sang `OPEN` khi có ≥ 1 buổi `SCHEDULED` ở tương lai | §5.2 | `CLASS_HAS_NO_VALID_SESSION` |
| 9 | Sức chứa lớp là giới hạn trên của sức chứa từng buổi | §5.2, §6.2 | `CAPACITY_BELOW_REGISTRATIONS`, `VALIDATION_ERROR` |
| 10 | Không hạ sức chứa lớp xuống dưới số đăng ký còn hiệu lực | §5.2 | `CAPACITY_BELOW_REGISTRATIONS` |
| 11 | Không xóa lớp đã có lịch sử đăng ký — chỉ `ARCHIVED` | không có `DELETE` | `CLASS_HAS_REGISTRATIONS` |
| 12 | Lớp `ARCHIVED` không thêm buổi mới | §6.2 | `CLASS_ARCHIVED` |

### 11.4. Buổi học

| # | Quy tắc | Endpoint | Mã lỗi |
|---:|---|---|---|
| 13 | `startTime < endTime` | §6.2 | `VALIDATION_ERROR` + `details.endTime` |
| 14 | Không lập hoặc chuyển buổi về thời điểm đã qua | §6.2 | `SESSION_IN_PAST` |
| 15 | Sức chứa buổi ≤ sức chứa lớp, ≤ sức chứa phòng, ≥ số đã đăng ký | §6.2 | `VALIDATION_ERROR` + `details.capacity` |
| 16 | Coach phải đang hoạt động khi **gán mới**; Coach cũ đã ngừng hoạt động vẫn giữ được khi chỉ sửa giờ | §6.2, §6.3 | `COACH_INACTIVE` |
| 17 | Đổi ngày/giờ buổi **đã có đăng ký**: từng học viên phải còn gói hợp lệ ngày mới và không trùng buổi khác. Một người hỏng → từ chối **toàn bộ** | §6.2 | `MEMBER_SCHEDULE_CONFLICT` |
| 18 | Buổi `CANCELED` không sửa, không phân công lại Coach | §6.2, §6.3 | `SESSION_CANCELLED` |
| 19 | Không đổi Coach sau khi buổi đã bắt đầu | §6.3 | `SESSION_ALREADY_STARTED` |
| 20 | Hủy buổi: phải `SCHEDULED` và chưa bắt đầu | §6.6 | `SESSION_ALREADY_STARTED` |
| 21 | Hủy theo lớp chỉ đụng buổi `SCHEDULED` chưa bắt đầu; buổi đã diễn ra giữ nguyên | §6.6 | `NO_CANCELABLE_SESSION` khi không còn buổi nào |
| 22 | Hủy buổi phải hủy kèm mọi đăng ký `BOOKED` trong **cùng một giao dịch** | §6.6 | — |
| 23 | Lý do hủy bắt buộc, 3–500 ký tự | §6.6 | `VALIDATION_ERROR` + `details.reason` |
| 24 | Hủy lớp/buổi **không** tự hoàn tiền gói tập | §6.6 | — |
| 25 | `cancel-impact` đếm đúng tập buổi mà lệnh hủy sẽ hủy | §6.5 | — |

### 11.5. Đăng ký và hủy đăng ký

Mười điều kiện khi đăng ký, **áp dụng y hệt cho Member tự đặt (§7.3) và lễ tân
đặt thay (§7.4)** — không nới lỏng cho quầy:

| # | Quy tắc | Mã lỗi |
|---:|---|---|
| 26 | Buổi tồn tại | `SESSION_NOT_FOUND` |
| 27 | Buổi chưa bị hủy | `SESSION_CANCELLED` |
| 28 | Buổi chưa bắt đầu, so theo giờ server | `SESSION_ALREADY_STARTED` |
| 29 | Lớp đang `OPEN` | `CLASS_NOT_OPEN` |
| 30 | Tài khoản thành viên còn hoạt động | `ACCOUNT_INACTIVE` |
| 31 | Gói đã thanh toán, không tạm ngưng, bao phủ **ngày diễn ra buổi** | `MEMBERSHIP_NOT_VALID_FOR_SESSION` |
| 32 | Gói cho phép bộ môn của lớp | `PACKAGE_NOT_ELIGIBLE` |
| 33 | Chưa có đăng ký còn hiệu lực cho đúng buổi này | `DUPLICATE_REGISTRATION` |
| 34 | Không trùng giờ buổi khác đã đặt | `MEMBER_SCHEDULE_CONFLICT` |
| 35 | Còn chỗ | `CLASS_FULL` |

Khi hủy:

| # | Quy tắc | Mã lỗi |
|---:|---|---|
| 36 | Đăng ký thuộc về người gọi (Member tự hủy) | `REGISTRATION_NOT_FOUND` / `403` |
| 37 | Chưa bị hủy trước đó; gửi lặp **không** trả chỗ lần hai | `REGISTRATION_ALREADY_CANCELED` |
| 38 | Buổi chưa bắt đầu | `SESSION_ALREADY_STARTED` |
| 39 | Lý do bắt buộc khi lễ tân hủy thay; tùy chọn khi Member tự hủy | `VALIDATION_ERROR` + `details.reason` |
| 40 | Hủy xong trả chỗ **đúng một lần**, giữ nguyên bản ghi đã hủy kèm người hủy và lý do | — |

**Quy ước quyền bộ môn (quy tắc 32):** gói **chưa cấu hình bộ môn nào** thì
vào được **mọi** bộ môn. Nhờ vậy các gói đã bán từ Sprint 1 không mất quyền
lợi khi bật quy tắc. Cấu hình qua §4.3.

**Đổi cấu hình quyền bộ môn không hủy đăng ký đã có** — chỉ áp dụng cho lần
đặt chỗ tiếp theo.

### 11.6. Dữ liệu và quyền riêng tư

| # | Quy tắc | Endpoint |
|---:|---|---|
| 41 | Member chỉ thấy lớp `OPEN` và buổi `SCHEDULED`; server tự lọc, không tin query FE gửi lên | §5.1, §6.1 |
| 42 | Endpoint `/me` lấy danh tính từ token, **không nhận** `memberAccountId` / `coachId` | §6.4, §7.1 |
| 43 | Roster chỉ trả tên, mã thành viên, trạng thái, nguồn đăng ký — không email, điện thoại, gói tập, thanh toán | §6.7 |
| 44 | Đổi ID trong URL không lấy được dữ liệu ngoài quyền → `403`, không phải `404` mơ hồ hay `200` | toàn bộ |
| 45 | Audit ghi actor từ token; không ghi mật khẩu, token hay dữ liệu thanh toán vào `description` | §9.3 |
| 46 | Không có `PUT`/`DELETE` cho `/AuditLog`, kể cả Manager | §9.3 |

### 11.7. Hai quy tắc phải chứng minh bằng test, không bằng đọc code

**Chống vượt sức chứa (BR-02).** Bọc transaction không đủ. Cần unique index có
điều kiện trên `(SessionId, MemberId) WHERE Status='BOOKED'` cộng
`UPDATE … WHERE BookedCount < Capacity`. Nghiệm thu bằng hai request đồng thời:
đúng một `201`, một `409 CLASS_FULL` — ca #39 ở
[BE_HANDOFF §6.5](BE_HANDOFF_SPRINT2_MINH.md).

**Không trả chỗ hai lần (quy tắc 37).** Thứ tự câu lệnh quyết định: cập nhật
bản ghi đăng ký trước, kiểm `@@ROWCOUNT`, rồi mới giảm bộ đếm. Làm ngược thì
một lần retry sẽ làm `BookedCount` tụt xuống dưới số người thật, và lỗi chỉ lộ
ra khi lớp đầy — [BE_HANDOFF §5.4](BE_HANDOFF_SPRINT2_MINH.md).

---

## 12. Mã lỗi hợp nhất

| Nhóm | Mã | HTTP |
|---|---|---:|
| Bộ môn | `SPORT_NOT_FOUND` | 404 |
| | `SPORT_NAME_DUPLICATE`, `SPORT_INACTIVE` | 409 |
| Phòng | `ROOM_NOT_FOUND` | 404 |
| | `ROOM_NAME_DUPLICATE`, `ROOM_INACTIVE`, `ROOM_SCHEDULE_CONFLICT`, `ROOM_CAPACITY_BELOW_SCHEDULE` | 409 |
| Lớp | `CLASS_NOT_FOUND` | 404 |
| | `CLASS_NAME_DUPLICATE`, `CLASS_HAS_NO_VALID_SESSION`, `CLASS_NOT_OPEN`, `CLASS_ARCHIVED`, `CLASS_HAS_REGISTRATIONS`, `CAPACITY_BELOW_REGISTRATIONS` | 409 |
| Coach | `COACH_NOT_FOUND` | 404 |
| | `COACH_INACTIVE`, `COACH_SCHEDULE_CONFLICT` | 409 |
| Buổi học | `SESSION_NOT_FOUND` | 404 |
| | `SESSION_IN_PAST` | 400 |
| | `SESSION_ALREADY_STARTED`, `SESSION_CANCELLED`, `NO_CANCELABLE_SESSION`, `MEMBER_SCHEDULE_CONFLICT` | 409 |
| Đăng ký | `REGISTRATION_NOT_FOUND` | 404 |
| | `CLASS_FULL`, `DUPLICATE_REGISTRATION`, `REGISTRATION_ALREADY_CANCELED`, `MEMBERSHIP_NOT_VALID_FOR_SESSION`, `PACKAGE_NOT_ELIGIBLE` | 409 |
| Sprint 1 | `UNAUTHORIZED` (401), `FORBIDDEN` (403), `ACCOUNT_INACTIVE` (403), `VALIDATION_ERROR` (400), `CONCURRENCY_CONFLICT` (409), `INTERNAL_SERVER_ERROR` (500) | |

**Trạng thái mapping ở `apiErrors.ts`:** 26 mã nhóm lớp/lịch/đăng ký **đã có**. Ba mã còn **thiếu**, phải thêm trước khi tích hợp: `SPORT_NAME_DUPLICATE`, `ROOM_NAME_DUPLICATE`, `ROOM_CAPACITY_BELOW_SCHEDULE`.

---

## 13. Việc từng người phải làm sau khi chốt

| Người | Việc |
|---|---|
| **Huy, Phúc (BE)** | Làm theo thứ tự §3.9. Schema, công thức transaction và 48 ca nghiệm thu ở [BE_HANDOFF](BE_HANDOFF_SPRINT2_MINH.md) + [file SQL](sql/2026-10-11-flow2-class-schedule.sql). Bổ sung `Sport.description`, `Room.roomType`, bảng `MembershipPackageSport` và bảng `Notification`. |
| **Tâm** | ① Bỏ `?status=Active` trong `assignCoachApi.getCoaches()`. ② Bỏ giả định envelope `{success, data}` ở `roomApi.ts` và `assignCoachApi.ts`. ③ `getSessions()` đổi sang `/ClassSession`. ④ UC27 dùng `/ClassSession/me`. ⑤ Thêm `ROOM_NAME_DUPLICATE`, `ROOM_CAPACITY_BELOW_SCHEDULE` vào `apiErrors.ts`. ⑥ Gộp `types/assignCoach.ts` (đang khai báo lại `ClassSession`, `CoachOption` trùng tên với `types/classes.ts`). ⑦ Form phòng thêm `roomType`. |
| **Minh** | ① `listSessionRegistrations` truyền `includeCanceled=true`. ② Bỏ nhánh mock trong `classApi.ts`, xóa `classMockServer.ts` khi BE lên. |
| **Long** | ① Xác nhận §4.1 (Sport có `description`), §6.1, §7.1, §8. ② Thêm `SPORT_NAME_DUPLICATE` vào `apiErrors.ts`. ③ UC22, UC23, UC26 **không cần endpoint mới** — dùng lại `GET /ClassSession`, `GET /Class`, `GET /ClassRegistration/me`. |
| **Chưa ai nhận** | Màn hình cấu hình quyền bộ môn của gói (§4.3, endpoint #9–10). Việc nhỏ nhưng **UC24 không hoàn chỉnh nếu thiếu**. |

---

## 14. Bốn câu hỏi còn lại — chủ sản phẩm quyết, không phải kỹ thuật

Mọi câu hỏi kỹ thuật trong hai bản nháp đã được chốt ở §1, §2, §4, §6. Bốn câu dưới đây là chính sách kinh doanh, nhóm không nên tự quyết:

| # | Câu hỏi | Đề xuất của tôi | Ảnh hưởng nếu đổi |
|---:|---|---|---|
| 1 | Hạn hủy đăng ký — trước giờ bắt đầu, hay 2h/24h trước? | **Trước giờ bắt đầu, không phạt, không hoàn tiền** (PRODUCT.md không nêu mốc nào) | Chỉ đổi một điều kiện so sánh + thông điệp FE |
| 2 | Có thu học phí riêng theo lớp không? | **Không ở Sprint 2** — đặt chỗ nằm trong quyền lợi gói | Nếu có, phải kéo Flow 3 vào và ước lượng lại toàn bộ UC24/29 |
| 3 | Manager có được đặt/hủy lớp thay Member không? | **Không** — FR-09 chỉ nêu Receptionist | Mở quyền thì phải mở ở server, không chỉ ở UI |
| 4 | Gói "tạm ngưng" có phải trạng thái thật của nghiệp vụ không? | **Có** — Sprint2.md §6 nêu, nhưng DB **chưa có cột nào**; file SQL đã thêm `MemberSubscription.IsSuspended` | Nếu bỏ, xóa cột và bỏ điều kiện khỏi §7 |

---

## 15. Trạng thái Frontend

| UC | Người | Màn hình | Trạng thái |
|---|---|---|---|
| 19, 21, 30 | Minh | `/manager/classes`, `/manager/class-schedule` | Xong, chạy trên dữ liệu mẫu |
| 24, 25 | Minh | component đăng ký/hủy | Xong, chờ Long ghép vào trang lớp của Member |
| 29 | Minh | `/receptionist/classes` | Xong, đã bỏ nguồn LocalStorage |
| 18 | Tâm | `/manager/rooms` | Xong giao diện; service sai envelope, thiếu `roomType` |
| 20 | Tâm | `/manager/assign-coach` | Xong giao diện; service sai envelope, sai đường dẫn, lọc mất Coach inactive |
| 27, 28, 32 | Tâm | — | Chưa thấy trong PR |
| 17, 22, 23, 26, 31 | Long | — | Chưa thấy trong PR |
| — | chưa ai | cấu hình quyền bộ môn của gói | Chưa có người nhận |

**Không UC nào được tính Done** cho tới khi chạy trên API thật và qua checklist nghiệm thu ở [BE_HANDOFF §6](BE_HANDOFF_SPRINT2_MINH.md).

---

# PHỤ LỤC A — API THEO TỪNG USE CASE

Phần trên sắp xếp theo tài nguyên để BE dựng controller. Phần này sắp xếp theo
**UC trong [Sprint2.md](../Sprint2.md) §4**, để nghiệm thu từng UC một và để mỗi
người tự tra phần của mình. Cột "Tiêu chí" trích nguyên văn ô Business Rule
trong swimlane.

Ký hiệu: **(mới)** = BE phải viết; **(dùng lại)** = endpoint đã có hoặc đã được
UC khác định nghĩa, không viết lần hai.

---

## UC17 — Manage Sports (Manager) · BE Huy · FE Long

**Tiêu chí:** Thêm/sửa/ẩn bộ môn; tên không trùng sau chuẩn hóa; không xóa dữ liệu đã được lớp tham chiếu. Bộ môn ngừng hoạt động không dùng tạo lớp mới.

| API | Dùng để |
|---|---|
| `GET /Sport?page&pageSize&search&isActive` **(mới)** | Danh sách danh mục. Bỏ `isActive` để lấy cả bộ môn đã ẩn |
| `POST /Sport` **(mới)** | Thêm bộ môn |
| `PUT /Sport/{id}` **(mới)** | Sửa tên, mô tả |
| `PATCH /Sport/{id}/status` **(mới)** | Ẩn / hiện |

**Lưu ý triển khai:** không có `DELETE`. "Không xóa dữ liệu đã được lớp tham
chiếu" thực hiện bằng cách chỉ cho ẩn. Trùng tên sau chuẩn hóa →
`SPORT_NAME_DUPLICATE`; chi tiết §4.1.

---

## UC18 — Manage Rooms (Manager) · BE Phúc · FE Tâm

**Tiêu chí:** Tên, vị trí, sức chứa, trạng thái; sức chứa nguyên dương; phòng không hoạt động không dùng cho lịch mới. Không hạ sức chứa làm lịch hiện có không hợp lệ.

| API | Dùng để |
|---|---|
| `GET /Room?page&pageSize&search&isActive` **(mới)** | Danh sách phòng |
| `POST /Room` **(mới)** | Thêm phòng |
| `PUT /Room/{id}` **(mới)** | Sửa tên, vị trí, sức chứa, loại phòng |
| `PATCH /Room/{id}/status` **(mới)** | Ngừng / mở lại |
| `GET /ClassSession?roomId={id}&from&to` **(dùng lại, UC21)** | "Xem lịch sử dụng phòng" của FR-06 |

**Lưu ý triển khai:** "Không hạ sức chứa làm lịch hiện có không hợp lệ" →
`ROOM_CAPACITY_BELOW_SCHEDULE`, chỉ xét buổi `SCHEDULED` **chưa bắt đầu**
(§4.2). Form phòng cần thêm `roomType` theo FR-06.

---

## UC19 — Manage Classes (Manager) · BE Huy · FE Minh

**Tiêu chí:** Tạo/sửa/xem lớp với bộ môn, tên, mô tả, sức chứa, trạng thái; không xóa lịch sử đăng ký. Lớp chỉ mở đặt chỗ khi có buổi học hợp lệ.

| API | Dùng để |
|---|---|
| `GET /Class?page&pageSize&search&sportId&status` **(mới)** | Danh sách lớp kèm 3 bộ đếm |
| `POST /Class` **(mới)** | Tạo lớp |
| `PUT /Class/{id}` **(mới)** | Sửa lớp |
| `PATCH /Class/{id}/status` **(mới)** | Đổi trạng thái, gồm lưu trữ |
| `GET /Sport` **(dùng lại, UC17)** | Dropdown bộ môn |

**Lưu ý triển khai:** "Lớp chỉ mở đặt chỗ khi có buổi học hợp lệ" →
`PATCH status` sang `OPEN` phải kiểm `upcomingSessionCount > 0`, nếu không trả
`CLASS_HAS_NO_VALID_SESSION`. "Không xóa lịch sử đăng ký" → không có `DELETE`,
chỉ `ARCHIVED`.

---

## UC20 — Assign Coach (Manager) · BE Phúc · FE Tâm

**Tiêu chí:** Chọn Coach đang hoạt động cho từng buổi; lưu bằng ID. Đổi Coach phải kiểm tra trùng giờ; thất bại không ghi một phần.

| API | Dùng để |
|---|---|
| `GET /ClassSession?from&to&classId&coachId` **(dùng lại, UC21)** | Danh sách buổi để chọn |
| `GET /Coach?page&pageSize&search` **(dùng lại, Sprint 1)** | Dropdown HLV — **không truyền `status`** để giữ cả HLV đã ngừng hoạt động |
| `PUT /ClassSession/{id}/coach` **(mới)** | Đổi Coach, chỉ đổi đúng trường này |

**Lưu ý triển khai:** "lưu bằng ID" → body là `{ "coachId": "acc-coa-002" }`,
không gửi tên. "Thất bại không ghi một phần" → kiểm `COACH_SCHEDULE_CONFLICT`
trong cùng transaction với `UPDATE`. Chi tiết §6.3.

---

## UC21 — Create/Update Class Schedule (Manager) · BE Huy · FE Minh

**Tiêu chí:** Chọn lớp, Coach, phòng, ngày/giờ; bắt đầu < kết thúc; chống trùng Coach/phòng; sức chứa không vượt giới hạn lớp/phòng. Đổi lịch đã có đăng ký phải kiểm tra xung đột và quyền gói của học viên.

| API | Dùng để |
|---|---|
| `GET /ClassSession?from&to&classId&coachId&roomId&sportId&status` **(mới)** | Lịch theo tuần |
| `POST /ClassSession` **(mới)** | Thêm buổi |
| `PUT /ClassSession/{id}` **(mới)** | Sửa buổi |
| `GET /ClassSession/{id}/registrations?includeCanceled=true` **(mới)** | Xem ai bị ảnh hưởng trước khi đổi |
| `GET /Class`, `GET /Room`, `GET /Coach` **(dùng lại)** | Ba dropdown |

**Lưu ý triển khai:** đây là endpoint khó nhất của nhóm lịch — xem bảng thứ tự
kiểm tra ở §6.2. "Quyền gói của học viên" khi đổi lịch là phần hay bị quên:
phải kiểm **từng** học viên đang giữ chỗ còn gói hợp lệ vào ngày mới, một
người hỏng là từ chối toàn bộ (`MEMBER_SCHEDULE_CONFLICT`).

---

## UC22 — View Center Schedule (Manager/Receptionist) · BE Phúc · FE Long

**Tiêu chí:** Xem lịch theo ngày/tuần; lọc bộ môn, Coach, phòng, trạng thái; có trạng thái rỗng/lỗi và số chỗ còn lại từ server.

| API | Dùng để |
|---|---|
| `GET /ClassSession?from&to&sportId&coachId&roomId&status` **(dùng lại, UC21)** | Toàn bộ màn hình |
| `GET /Sport`, `GET /Coach`, `GET /Room` **(dùng lại)** | Ba dropdown lọc |

**Không phát sinh endpoint mới.** "Số chỗ còn lại từ server" đã nằm trong
`remainingCapacity` của item §6.1 — FE không được tự tính. "Trạng thái rỗng"
là việc của FE khi `items` rỗng, không phải lỗi API.

---

## UC23 — View Classes & Sessions (Member) · BE Phúc · FE Long

**Tiêu chí:** Xem/lọc lớp mở đăng ký và buổi sắp tới; chi tiết Coach, phòng, thời gian, số chỗ; không cho đăng ký buổi đã bắt đầu hoặc bị hủy.

| API | Dùng để |
|---|---|
| `GET /Class?status=OPEN&sportId&search` **(dùng lại, UC19)** | Danh sách lớp Member xem được |
| `GET /Class/{id}` **(mới)** | Chi tiết một lớp |
| `GET /ClassSession?classId&from&status=SCHEDULED` **(dùng lại, UC21)** | Buổi sắp tới của lớp |
| `GET /ClassSession/{id}` **(mới)** | Chi tiết một buổi |

**Lưu ý triển khai — đây là chỗ dễ lộ dữ liệu nhất:** khi người gọi là Member,
server phải **tự lọc** chỉ trả lớp `OPEN` và buổi `SCHEDULED`, không dựa vào
query FE gửi lên. Member đổi `?status=DRAFT` trên URL không được thấy gì thêm.

"Không cho đăng ký buổi đã bắt đầu hoặc bị hủy" được bảo đảm ở UC24
(`SESSION_ALREADY_STARTED`, `SESSION_CANCELLED`); FE chỉ ẩn nút cho đẹp.

---

## UC24 — Register Class Session (Member) · BE Huy · FE Minh

**Tiêu chí:** Kiểm tra Member active, gói hợp lệ vào ngày học, quyền tham gia, còn chỗ, không trùng buổi/giờ. Server chống vượt sức chứa khi hai người đặt chỗ cuối đồng thời.

| API | Dùng để |
|---|---|
| `POST /ClassRegistration/register` **(mới)** | Đặt chỗ, body chỉ có `sessionId` |
| `GET /ClassRegistration/me` **(mới)** | Biết buổi nào mình đã đặt để đổi nút |
| `GET /MembershipPackage/{id}/sports` **(mới)** | Cấu hình "quyền tham gia" — xem ghi chú dưới |

**Lưu ý triển khai:** năm điều kiện trong tiêu chí ánh xạ thành năm mã lỗi
khác nhau (§7), không gộp thành một `VALIDATION_ERROR` chung — FE hiển thị
mỗi trường hợp một hướng dẫn khác nhau.

**"Quyền tham gia" cần một thứ chưa ai làm:** FR-09 ghi Member chỉ đăng ký
được khi "gói cho phép tham gia lớp đó". Luật này cần chỗ cấu hình, nếu không
`PACKAGE_NOT_ELIGIBLE` không bao giờ bật được. Xem §4.3 và UC bổ sung ở cuối
phụ lục này.

**Chống vượt sức chứa** là yêu cầu nghiệm thu riêng, không phải "bọc
transaction là xong" — công thức ở [BE_HANDOFF §5.3](BE_HANDOFF_SPRINT2_MINH.md).

---

## UC25 — Cancel Class Registration (Member) · BE Huy · FE Minh

**Tiêu chí:** Chỉ hủy đăng ký của mình trước giờ bắt đầu theo chính sách đề xuất; giữ lịch sử, trả lại chỗ; gửi lặp không hoàn chỗ hai lần.

| API | Dùng để |
|---|---|
| `POST /ClassRegistration/{id}/cancel` **(mới)** | Hủy, `reason` tùy chọn |
| `GET /ClassRegistration/me?includeCanceled=true` **(dùng lại, UC24)** | Hiển thị cả lịch sử đã hủy |

**Lưu ý triển khai:** "chỉ hủy đăng ký của mình" kiểm bằng ownership ở server
→ `403`, không tin FE. "Gửi lặp không hoàn chỗ hai lần" là ca nghiệm thu
riêng: lần hai phải trả `REGISTRATION_ALREADY_CANCELED` và **không** giảm
`BookedCount` thêm lần nữa — thứ tự câu lệnh ở [BE_HANDOFF §5.4](BE_HANDOFF_SPRINT2_MINH.md).

---

## UC26 — My Class Schedule (Member) · BE Phúc · FE Long

**Tiêu chí:** Hiển thị buổi đã đăng ký theo tuần/danh sách, trạng thái hủy và thông tin Coach; không xem được lịch riêng của Member khác qua thay ID.

| API | Dùng để |
|---|---|
| `GET /ClassRegistration/me?includeCanceled=true&page&pageSize` **(dùng lại, UC24)** | Toàn bộ màn hình |

**Không phát sinh endpoint mới.** "Thông tin Coach" đã nằm trong object
`session` lồng bên trong mỗi đăng ký (§7) — đó là lý do trường đó bắt buộc,
nếu không màn hình này phải gọi thêm N request.

"Không xem được lịch của Member khác qua thay ID" được bảo đảm bằng thiết kế:
endpoint **không nhận** `memberAccountId`, danh tính lấy từ token. Đừng thêm
tham số đó vào `/me`.

---

## UC27 — My Teaching Schedule (Coach) · BE Phúc · FE Tâm

**Tiêu chí:** Coach xem đúng buổi được phân công, lịch ngày/tuần và thay đổi mới nhất; không sửa lịch do Manager quản lý.

| API | Dùng để |
|---|---|
| `GET /ClassSession/me?from&to&status&page&pageSize` **(mới)** | Lịch dạy |

**Lưu ý triển khai:** lọc theo `ClassSession.CoachId` = danh tính trong token,
**không nhận `coachId` từ client**. "Không sửa lịch" → Coach gọi
`PUT /ClassSession/{id}` hay `PUT /ClassSession/{id}/coach` phải nhận `403`.
"Thay đổi mới nhất" → trả cả buổi `CANCELED` kèm `cancelReason` để Coach biết
buổi bị hủy.

---

## UC28 — View Assigned Class Members (Coach) · BE Phúc · FE Tâm

**Tiêu chí:** Chỉ xem roster của buổi phụ trách; phân trang, tìm học viên; trả thông tin cơ bản cần thiết, không lộ thanh toán/password hoặc hồ sơ ngoài phạm vi.

| API | Dùng để |
|---|---|
| `GET /ClassSession/{id}/registrations?page&pageSize&search&includeCanceled` **(mới)** | Roster |

**Lưu ý triển khai:** "chỉ buổi phụ trách" → server đối chiếu
`ClassSession.CoachId` với token (BR-07); Coach khác trả `403`, **không** trả
danh sách rỗng. "Không lộ hồ sơ ngoài phạm vi" → response chỉ có
`memberAccountId`, `memberName`, `memberCode`, `status`, `registeredVia`. Không
email, không điện thoại, không gói tập, không thanh toán.

`search` lọc theo tên và mã thành viên.

---

## UC29 — Register/Cancel Class at Counter (Receptionist) · BE Huy · FE Minh

**Tiêu chí:** Tìm Member rồi đăng ký/hủy thay bằng API, áp dụng cùng quy tắc UC24/25; lưu người thao tác, lý do hủy; bỏ nguồn booking LocalStorage khỏi luồng thật.

| API | Dùng để |
|---|---|
| `GET /Member?search&page&pageSize` **(dùng lại, Sprint 1)** | Tìm thành viên |
| `GET /ClassSession?from&to&status=SCHEDULED` **(dùng lại, UC21)** | Buổi trong ngày |
| `GET /ClassRegistration?memberAccountId&includeCanceled=true` **(mới)** | Đăng ký của thành viên đó |
| `POST /ClassRegistration/counter-register` **(mới)** | Đăng ký thay |
| `POST /ClassRegistration/{id}/counter-cancel` **(mới)** | Hủy thay, `reason` **bắt buộc** |

**Lưu ý triển khai:** "cùng quy tắc UC24/25" nghĩa là **đúng mười điều kiện**
ở §7, không nới lỏng cho quầy. "Lưu người thao tác" → `RegisteredBy` /
`CanceledBy` là tài khoản lễ tân, `MemberId` là học viên; ba trường khác nhau.
Audit phải ghi actor thật là lễ tân.

---

## UC30 — Cancel Session/Class (Manager) · BE Huy · FE Minh

**Tiêu chí:** Hủy buổi tương lai hoặc mọi buổi tương lai của lớp bằng thao tác rõ phạm vi; hủy đăng ký liên quan nguyên tử, giữ lịch sử, chặn đặt mới. Không tự hoàn tiền gói tập.

| API | Dùng để |
|---|---|
| `GET /ClassSession/{id}/cancel-impact` **(mới)** | Số liệu cho hộp thoại xác nhận, phạm vi một buổi |
| `GET /Class/{id}/cancel-impact` **(mới)** | Như trên, phạm vi cả lớp |
| `POST /ClassSession/{id}/cancel` **(mới)** | Hủy một buổi |
| `POST /Class/{id}/cancel-future-sessions` **(mới)** | Hủy mọi buổi tương lai |

**Lưu ý triển khai:** hai endpoint `cancel-impact` phải đếm **đúng tập buổi mà
lệnh hủy sẽ hủy**; lệch là con số trong hộp thoại sai. "Nguyên tử" → hủy buổi
và hủy mọi đăng ký `BOOKED` trong cùng một transaction, kết thúc không còn
đăng ký nào trỏ vào buổi đã hủy (truy vấn kiểm tra ở §8.2 file SQL).

---

## UC31 — Class Change Notifications (Member/Coach) · BE Phúc · FE Long · **P1**

**Tiêu chí:** Thông báo trong ứng dụng khi lịch/Coach/phòng thay đổi hoặc hủy; chỉ người liên quan nhận; tránh trùng do retry; có trạng thái đã đọc. Không bao gồm email/push.

| API | Dùng để |
|---|---|
| `GET /Notification/me?page&pageSize&isRead` **(mới)** | Danh sách thông báo |
| `PATCH /Notification/{id}/read` **(mới)** | Đánh dấu đã đọc |

**Lưu ý triển khai:** thông báo **không có endpoint tạo** — chúng được phát ra
như hiệu ứng phụ của UC20, UC21, UC24 và UC30 (4 loại ở §8). "Tránh trùng do
retry" → khóa duy nhất `(recipientId, type, entityType, entityId, eventAt)`.
"Chỉ người liên quan" → người đang giữ chỗ tại buổi đó và Coach phụ trách.

---

## UC32 — Class & Schedule Audit Filters (Manager) · BE Huy · FE Tâm · **P1**

**Tiêu chí:** Mở rộng tra cứu audit theo lớp/buổi/người/thời gian; ghi rõ hành động và thay đổi quan trọng; không cho sửa/xóa log từ UI.

| API | Dùng để |
|---|---|
| `GET /AuditLog?page&pageSize&search&action&entityType&fromDate&toDate&actorId&entityId` **(dùng lại Sprint 1 + 2 filter mới)** | Toàn bộ màn hình |

**Lưu ý triển khai:** `fromDate`/`toDate` đã có; chỉ cần thêm `actorId` và
`entityId`. **Không tạo endpoint mới.** "Không cho sửa/xóa log từ UI" → không
viết `PUT`/`DELETE` cho `/AuditLog`, kể cả cho Manager. Danh sách `action` và
`entityType` của Flow 2 ở §9.3.

---

## UC bổ sung — Package Sport Entitlement (Manager) · **chưa ai nhận**

Không có trong swimlane Sprint 2, nhưng **UC24 không hoàn chỉnh nếu thiếu**:
FR-09 yêu cầu kiểm "gói cho phép tham gia lớp đó", mà không có màn hình nào
cấu hình quan hệ đó.

| API | Dùng để |
|---|---|
| `GET /MembershipPackage` **(dùng lại, Sprint 1)** | Danh sách gói |
| `GET /Sport` **(dùng lại, UC17)** | Danh sách bộ môn |
| `GET /MembershipPackage/{id}/sports` **(mới)** | Bộ môn gói đang cho phép |
| `PUT /MembershipPackage/{id}/sports` **(mới)** | Lưu cấu hình |

**Quy ước:** `sportIds` rỗng = gói vào được **mọi** bộ môn. Nhờ vậy 7 gói của
Sprint 1 chạy nguyên trạng, không cần migration dữ liệu.

Chi tiết DTO ở §4.3. Màn hình FE đã dựng tại `/manager/package-sports`.

---

# PHỤ LỤC B — ĐỐI CHIẾU NGƯỢC: ENDPOINT → UC

Để BE biết một endpoint hỏng sẽ làm gãy những UC nào.

| Endpoint | Phục vụ UC |
|---|---|
| `GET /Sport` | 17, 19, 22, bổ sung |
| `POST/PUT/PATCH /Sport` | 17 |
| `GET /Room` | 18, 21, 22 |
| `POST/PUT/PATCH /Room` | 18 |
| `GET /Class` | 19, 23 |
| `GET /Class/{id}` | 23 |
| `POST/PUT/PATCH /Class` | 19 |
| `GET /Class/{id}/cancel-impact` | 30 |
| `POST /Class/{id}/cancel-future-sessions` | 30 |
| `GET /ClassSession` | 18 (lịch phòng), 20, 21, 22, 23, 29 |
| `GET /ClassSession/{id}` | 23 |
| `POST /ClassSession` | 21 |
| `PUT /ClassSession/{id}` | 21 |
| `PUT /ClassSession/{id}/coach` | 20 |
| `GET /ClassSession/me` | 27 |
| `GET /ClassSession/{id}/cancel-impact` | 30 |
| `POST /ClassSession/{id}/cancel` | 30 |
| `GET /ClassSession/{id}/registrations` | 21, 28 |
| `GET /ClassRegistration/me` | 24, 25, 26 |
| `GET /ClassRegistration` | 29 |
| `POST /ClassRegistration/register` | 24 |
| `POST /ClassRegistration/counter-register` | 29 |
| `POST /ClassRegistration/{id}/cancel` | 25 |
| `POST /ClassRegistration/{id}/counter-cancel` | 29 |
| `GET/PUT /MembershipPackage/{id}/sports` | 24, bổ sung |
| `GET /Notification/me`, `PATCH /Notification/{id}/read` | 31 |
| `GET /Coach` | 20, 21 |
| `GET /Member` | 29 |
| `GET /AuditLog` | 32 |

**`GET /ClassSession` phục vụ 6 UC** — hỏng endpoint này là gãy hơn một phần ba
sprint. Nên làm sớm và test kỹ nhất.
