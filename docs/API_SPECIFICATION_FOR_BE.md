# TÀI LIỆU ĐẶC TẢ CHI TIẾT API BACKEND (BE API SPECIFICATION)
## DỰ ÁN: HỆ THỐNG QUẢN LÝ TRUNG TÂM THỂ THAO (SPORTS CENTER MANAGEMENT SYSTEM - SCMS)

- **Phiên bản:** 2.1 (Chốt contract Long Sprint 1 đã tích hợp)
- **Ngày cập nhật:** 30/09/2026
- **Đối tượng áp dụng:** Nhóm phát triển Backend (.NET Core / C#) và Nhóm Frontend (React / TypeScript)
- **Mục đích:** Ghi nhận contract đã triển khai cho UC5, UC6, UC10, UC13, UC14; các phần use case khác tiếp tục là đặc tả mục tiêu của nhóm.

> UC5, UC6, UC10, UC13 và UC14 đã được kiểm thử HTTP với database SQL Server được cung cấp. Các API này trả DTO trực tiếp như mô tả bên dưới, không bọc trong envelope `success/data` của mục 1.3.

---

# MỤC LỤC
1. [QUY ƯỚC CHUNG VỀ THIẾT KẾ API](#1-quy-ước-chung-về-thiết-kế-api)
2. [DANH SÁCH & ĐẶC TẢ CHI TIẾT TỪNG API THEO USE CASE](#2-danh-sách--đặc-tả-chi-tiết-từng-api-theo-use-case)
   - [2.1. Phân hệ Xác thực & Phiên làm việc (UC1, UC2, UC3, UC5)](#21-phân-hệ-xác-thực--phiên-làm-việc-uc1-uc2-uc3-uc5)
   - [2.2. Phân hệ Hồ sơ cá nhân & Đổi mật khẩu OTP (UC4)](#22-phân-hệ-hồ-sơ-cá-nhân--đổi-mật-khẩu-otp-uc4)
   - [2.3. Phân hệ Quản lý Thành viên - Manager (UC6)](#23-phân-hệ-quản-lý-thành-viên---manager-uc6)
   - [2.4. Phân hệ Quản lý Huấn luyện viên & Lễ tân - Manager (UC7, UC8)](#24-phân-hệ-quản-lý-huấn-luyện-viên--lễ-tân---manager-uc7-uc8)
   - [2.5. Phân hệ Quản lý & Khám phá Gói tập (UC9, UC10)](#25-phân-hệ-quản-lý--khám-phá-gói-tập-uc9-uc10)
   - [2.6. Phân hệ Báo giá, Đăng ký & Gia hạn Gói tập (UC11)](#26-phân-hệ-báo-giá-đăng-ký--gia-hạn-gói-tập-uc11)
   - [2.7. Phân hệ Tra cứu Thành viên & Trạng thái Gói tại quầy (UC12, UC14)](#27-phân-hệ-tra-cứu-thành-viên--trạng-thái-gói-tại-quầy-uc12-uc14)
   - [2.8. Phân hệ Đăng ký tại quầy & Thanh toán tiền mặt (UC13, UC15)](#28-phân-hệ-đăng-ký-tại-quầy--thanh-toán-tiền-mặt-uc13-uc15)
   - [2.9. Phân hệ Nhật ký kiểm toán hệ thống - Audit Log (UC16)](#29-phân-hệ-nhật-ký-kiểm-toán-hệ-thống---audit-log-uc16)
   - [2.10. Phân hệ Nghiệp vụ quầy bổ sung (Điểm danh, Lớp học, Hỗ trợ)](#210-phân-hệ-nghiệp-vụ-quầy-bổ-sung-điểm-danh-lớp-học-hỗ-trợ)
3. [ĐỐI CHIẾU SOURCE BACKEND HIỆN TẠI VÀ CÔNG VIỆC CẦN LÀM](#3-đối-chiếu-source-backend-hiện-tại-và-công-việc-cần-làm)

---

# 1. QUY ƯỚC CHUNG VỀ THIẾT KẾ API

### 1.1. Base URL & Giao thức
- **Base URL:** `/api` (Ví dụ: `https://localhost:7000/api` hoặc môi trường staging).
- **Giao thức:** HTTPS, định dạng truyền nhận dữ liệu bắt buộc là `application/json; charset=utf-8`.
- **CORS:** Đã cấu hình origin development `http://localhost:5173`; cho phép `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` và headers `Authorization`, `Content-Type`, `Accept`. Origin khác phải thêm qua `Cors:AllowedOrigins`.

### 1.2. Xác thực & Phân quyền (JWT Bearer Token)
- Các endpoint yêu cầu đăng nhập nhận Token qua Header:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Hạn dùng Token:** 24 giờ ($1440$ phút). Token chứa claims:
  - `nameid` / `sub` / `userId`: ID tài khoản (GUID / UUID).
  - `unique_name` / `username`: Tên đăng nhập.
  - `email`: Địa chỉ email.
  - `role`: BE trả `CenterManager`, `Coach`, `Member`, `Receptionist`; FE ánh xạ sang `CENTER_MANAGER`, `COACH`, `MEMBER`, `RECEPTIONIST`.
  - `fullName`: Họ và tên hiển thị.
  - `iat`: Timestamp phát hành (seconds).
  - `exp`: Timestamp hết hạn (seconds).

### 1.3. Cấu trúc Response chuẩn
#### Phản hồi thành công (Success Response):
```json
{
  "success": true,
  "message": "Thông báo thân thiện nếu có",
  "data": { ... } // hoặc mảng [ ... ], hoặc null đối với thao tác DELETE
}
```

#### Phản hồi danh sách có phân trang (Pagination Response):
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 120,
    "page": 1,
    "pageSize": 20,
    "totalPages": 6
  }
}
```

#### Phản hồi lỗi (Error Response):
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Mô tả lỗi dễ hiểu cho người dùng bằng tiếng Việt",
  "fieldErrors": {
    "email": "Email đã được sử dụng.",
    "phone": "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0."
  },
  "isLocked": false,
  "failedAttemptsRemaining": 3
}
```

### 1.4. Định dạng kiểu dữ liệu
- **Ngày tháng định danh nghiệp vụ:** Dạng chuỗi ISO ngày `YYYY-MM-DD` (Ví dụ: `2026-09-29`). Ngày hết hạn tính đến hết 23:59:59 của ngày đó.
- **Thời gian hệ thống (Timestamp):** Chuỗi ISO-8601 UTC `YYYY-MM-DDTHH:mm:ss.sssZ` (Ví dụ: `2026-09-29T12:00:00.000Z`).
- **Tiền tệ (VND):** Số nguyên (`number`/`long`), không làm tròn thập phân, không gửi chuỗi định dạng (Ví dụ: `450000`, `4200000`).
- **Naming convention:** Thuộc tính JSON sử dụng **camelCase** (Frontend và BE DTO thống nhất cấu hình `JsonNamingPolicy.CamelCase`).

---

# 2. DANH SÁCH & ĐẶC TẢ CHI TIẾT TỪNG API THEO USE CASE

---

## 2.1. Phân hệ Xác thực & Phiên làm việc (UC1, UC2, UC3, UC5)

### API 1: Đăng ký tài khoản thành viên công khai (UC1)
- **Endpoint:** `POST /api/auth/register`
- **Quyền hạn:** Công khai (Public / Anonymous).
- **Mục đích:** Người dùng tự tạo tài khoản thành viên từ trang đăng ký.
- **Business Rules:**
  - Role luôn được gán mặc định là `MEMBER`.
  - `username`: 3–30 ký tự (chữ cái, chữ số, gạch dưới), duy nhất không phân biệt hoa thường.
  - `email`: định dạng email hợp lệ, duy nhất trong toàn hệ thống.
  - `password`: tối thiểu 8 ký tự, tối đa 72 byte, mã hóa bằng BCrypt ($10$ rounds).
  - Tự động tạo bản ghi trong bảng `Account` và bảng `Member`.
  - Đăng ký thành công tự động phát hành phiên đăng nhập (JWT token).
- **Request Body:**
  ```json
  {
    "username": "minh_member",
    "email": "minh.member@gmail.com",
    "password": "Password123@",
    "fullName": "Nguyễn Văn Minh"
  }
  ```
- **Response Success (`201 Created` hoặc `200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đăng ký thành công. Chào mừng bạn đến với Titan Arena!",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2026-09-30T12:00:00.000Z",
      "user": {
        "id": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "username": "minh_member",
        "email": "minh.member@gmail.com",
        "fullName": "Nguyễn Văn Minh",
        "role": "MEMBER",
        "avatar": null,
        "isLocked": false,
        "createdAt": "2026-09-29T12:00:00.000Z"
      }
    }
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: Thiếu thông tin hoặc email/username đã tồn tại.

---

### API 2: Đăng nhập hệ thống thống nhất cho 4 vai trò (UC2)
- **Endpoint:** `POST /api/Auth/login`
- **Quyền hạn:** Công khai (Public).
- **Mục đích:** Đăng nhập dùng chung cho `CenterManager`, `Coach`, `Member`, `Receptionist`; FE tự ánh xạ role hiển thị.
- **Business Rules:**
  - Kiểm tra tài khoản bằng Email và mật khẩu (BCrypt compare).
  - Khóa tài khoản (`isLocked = true`) nếu nhập sai liên tiếp **5 lần**.
  - Khi đăng nhập đúng, reset `failedAttempts = 0`.
  - Chặn đăng nhập nếu `status != Active`, `isLocked == true` hoặc `deletedAt != null`.
- **Request Body:**
  ```json
  {
    "email": "manager@sportscenter.com",
    "password": "<mat-khau>"
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresAtUtc": "2026-10-01T12:00:00Z",
    "accountId": "986f0852-eda3-4f6d-af50-335b5ad4ebd5",
    "email": "manager@sportscenter.com",
    "role": "CenterManager",
    "fullName": "Nguyen Van Manager",
    "createdAt": "2026-09-28T21:32:09.5633333Z"
  }
  ```
- **Response Errors:**
  - `401 Unauthorized` với code `INVALID_CREDENTIALS`.
  - `403 Forbidden` với code `ACCOUNT_INACTIVE`.
  - `423 Locked` với code `ACCOUNT_LOCKED`.
    ```json
    {
      "success": false,
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "The email or password is incorrect.",
        "details": null
      },
      "traceId": "..."
    }
    ```

---

### API 3: Lấy thông tin tài khoản hiện tại từ Token
- **Endpoint:** `POST /api/Auth/check-token`
- **Quyền hạn:** Người dùng đã đăng nhập (Token hợp lệ).
- **Response Success (`200 OK`):**
  ```json
  {
    "accountId": "853eb8ce-6265-46e9-84ac-25ea2fc6c165",
    "email": "coach.rbac@sportscenter.local",
    "role": "Coach",
    "fullName": "Coach RBAC",
    "createdAt": "2026-09-29T10:59:34.53Z"
  }
  ```

---

### API 4: Đăng xuất & Thu hồi Token (UC3)
- **Endpoint:** `POST /api/Auth/Logout`
- **Quyền hạn:** Người dùng hiện tại.
- **Business Rules:** Đưa `jti` vào blacklist trong `IMemoryCache` tới đúng thời điểm token hết hạn. Bộ lọc xác thực chung từ chối token đã thu hồi trên mọi API có `[Authorize]`.
- **Response Success:** `200 OK`, body rỗng.

---

## 2.2. Phân hệ Hồ sơ cá nhân & Đổi mật khẩu OTP (UC4)

### API 5: Cập nhật thông tin hồ sơ cá nhân
- **Endpoint:** `PUT /api/profile`
- **Quyền hạn:** Mọi vai trò đã đăng nhập (cập nhật hồ sơ của chính mình).
- **Business Rules:**
  - **Tuyệt đối không cho phép đổi Email** (email là định danh bất biến).
  - Validate họ tên (2–80 ký tự), SĐT (10 số, bắt đầu bằng 0).
  - Nếu là HLV (`COACH`): hỗ trợ cập nhật `specialization` (tối đa 200 ký tự) và `workSchedule` (tối đa 300 ký tự).
  - Nếu là Lễ tân (`RECEPTIONIST`): hỗ trợ cập nhật `workSchedule`.
  - Tự động ghi 1 bản ghi Audit Log: `UPDATE_PROFILE`.
- **Request Body:**
  ```json
  {
    "fullName": "Trần Huấn Luyện Viên",
    "phone": "0912345678",
    "dateOfBirth": "1992-08-20",
    "avatar": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200",
    "specialization": "Fitness, Gym, Yoga nâng cao",
    "workSchedule": "Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)"
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Cập nhật hồ sơ thành công.",
    "data": {
      "id": "usr_coach_01",
      "fullName": "Trần Huấn Luyện Viên",
      "email": "coach@sportscenter.com",
      "phone": "0912345678",
      "dateOfBirth": "1992-08-20",
      "avatar": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200",
      "specialization": "Fitness, Gym, Yoga nâng cao",
      "workSchedule": "Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)"
    }
  }
  ```

---

### API 6: Yêu cầu mã OTP đổi mật khẩu qua Email (UC4)
- **Endpoint:** `POST /api/profile/request-change-password-otp`
- **Quyền hạn:** Người dùng đã đăng nhập.
- **Business Rules:**
  - Sinh mã OTP ngẫu nhiên gồm 6 chữ số.
  - Lưu mã OTP vào Cache/Database với thời hạn 5 phút ($300$ giây) gắn liền với `UserId`.
  - Gửi mã OTP qua dịch vụ Email (SMTP/SendGrid) tới email của người dùng.
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Mã xác thực OTP đã được gửi đến email của bạn.",
    "data": {
      "email": "coach@sportscenter.com",
      "expiresInSeconds": 300
    }
  }
  ```

---

### API 7: Xác nhận đổi mật khẩu bằng mã OTP (UC4)
- **Endpoint:** `POST /api/profile/change-password`
- **Quyền hạn:** Người dùng đã đăng nhập.
- **Business Rules:**
  - Kiểm tra mật khẩu hiện tại (`currentPassword`) với hash trong CSDL.
  - Kiểm tra mã OTP: phải khớp với mã đã sinh và chưa hết hạn.
  - Kiểm tra mật khẩu mới: $\ge 8$ ký tự, không trùng mật khẩu hiện tại.
  - Mã hóa mật khẩu mới bằng BCrypt và cập nhật CSDL.
  - Hủy mã OTP sau khi sử dụng thành công.
  - Ghi Audit Log hành động `CHANGE_PASSWORD`.
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123@",
    "newPassword": "NewPassword456@",
    "confirmPassword": "NewPassword456@",
    "otpCode": "849201"
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đổi mật khẩu thành công. Hãy sử dụng mật khẩu mới trong các lần đăng nhập tiếp theo."
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: Mã OTP không chính xác hoặc đã hết hạn; mật khẩu mới không hợp lệ.
  - `401 Unauthorized`: Mật khẩu hiện tại không đúng.

---

## 2.3. Phân hệ Quản lý Thành viên - Manager (UC6)

### API 8: Lấy danh sách thành viên (Có phân trang, tìm kiếm & lọc)
- **Endpoint:** `GET /api/Member`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Query Parameters:**
  - `search` (string, tùy chọn): Tìm theo mã thành viên, họ tên, email hoặc SĐT.
  - `status` (string, tùy chọn): `Active` hoặc `Inactive`; bỏ tham số để lấy tất cả.
  - `page` (int, mặc định = 1).
  - `pageSize` (int, mặc định = 20).
- **Response Success (`200 OK`):**
  ```json
  {
    "items": [
      {
        "accountId": "7a0873f3-6223-43ab-99cc-6a9716f4eaa2",
        "memberCode": "MEM001",
        "fullName": "Nguyen Van An",
        "email": "member01@sportscenter.local",
        "phone": "0987654321",
        "status": "Active",
        "dateOfBirth": "2002-05-21",
        "createdAt": "2026-09-28T21:42:32.5933333Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
  ```

---

### API 9: Tạo tài khoản thành viên thủ công từ trang quản trị
- **Endpoint:** `POST /api/Member`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Nhập họ tên, email, SĐT, ngày sinh, trạng thái.
  - Hệ thống tự sinh `memberCode` duy nhất và mật khẩu khởi tạo ngẫu nhiên.
  - Trả về mật khẩu khởi tạo để Manager bàn giao cho học viên.
  - Ghi Audit Log hành động `CREATE` cho đối tượng `MEMBER`.
- **Request Body:**
  ```json
  {
    "fullName": "Hoàng Kim Ngân",
    "email": "ngan.hoang@gmail.com",
    "phone": "0918273645",
    "dateOfBirth": "2000-04-18",
    "isActive": true
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "member": {
      "accountId": "<guid>",
      "memberCode": "MB2609301234",
      "fullName": "Hoàng Kim Ngân",
      "dateOfBirth": "2000-04-18",
      "avatarUrl": null,
      "email": "ngan.hoang@gmail.com",
      "phone": "0918273645",
      "status": "Active",
      "createdAt": "2026-09-30T12:00:00Z",
      "updatedAt": null
    },
    "initialPassword": "<chi-hien-thi-mot-lan>"
  }
  ```

---

### API 10: Cập nhật thông tin thành viên
- **Endpoint:** `PATCH /api/Member/{accountId}`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Request Body:**
  ```json
  {
    "fullName": "Hoàng Kim Ngân",
    "email": "ngan.hoang@gmail.com",
    "phone": "0918273645",
    "dateOfBirth": "2000-04-18",
    "isActive": true
  }
  ```
- **Response Success (`200 OK`):**
  Trả trực tiếp `MemberDetailAPIViewModel` gồm `accountId`, `memberCode`, `fullName`, `dateOfBirth`, `avatarUrl`, `email`, `phone`, `status`, `createdAt`, `updatedAt`.

---

### API 11: Xóa mềm thành viên (Soft Delete)
- **Endpoint:** `DELETE /api/Member/{accountId}`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Không xóa cứng trong CSDL nhằm lưu vết hóa đơn, hợp đồng gói tập và điểm danh.
  - Đặt `DeletedAt = DateTime.UtcNow`, `Status = Inactive`; lịch sử gói và hóa đơn vẫn được giữ.
- **Response Success:** `204 No Content`.

---

## 2.4. Phân hệ Quản lý Huấn luyện viên & Lễ tân - Manager (UC7, UC8)

### API 12: Lấy danh sách nhân sự theo vai trò (COACH hoặc RECEPTIONIST)
- **Endpoint:** `GET /api/manager/personnel`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Query Parameters:**
  - `role` (bắt buộc): `COACH` hoặc `RECEPTIONIST`.
  - `query` (tùy chọn): Tìm theo tên, email, SĐT, chuyên môn.
  - `status` (tùy chọn): `ALL`, `ACTIVE`, `INACTIVE`.
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "usr_coach_01",
        "username": "coach_pro",
        "fullName": "Trần Huấn Luyện Viên",
        "email": "coach@sportscenter.com",
        "phone": "0912345678",
        "role": "COACH",
        "specialization": "Fitness, Gym, Thể hình cá nhân, Cardio",
        "workSchedule": "Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)",
        "avatar": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5",
        "isActive": true,
        "createdAt": "2026-09-20T08:00:00.000Z"
      }
    ]
  }
  ```

---

### API 13: Thêm mới Huấn luyện viên / Lễ tân (UC7, UC8)
- **Endpoint:** `POST /api/manager/personnel`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Role bắt buộc: `COACH` hoặc `RECEPTIONIST`.
  - Tự sinh mật khẩu khởi tạo ngẫu nhiên bảo mật, hash BCrypt và trả về `initialPassword`.
  - Ghi Audit Log hành động `CREATE` cho đối tượng `COACH` hoặc `RECEPTIONIST`.
- **Request Body:**
  ```json
  {
    "role": "COACH",
    "fullName": "Nguyễn Thể Hình",
    "email": "coach.nguyen@sportscenter.com",
    "username": "coach_nguyen",
    "phone": "0933445566",
    "specialization": "Yoga, Pilates, Giảm cân",
    "workSchedule": "Ca chiều: Thứ 2 - Chủ Nhật (14:00 - 22:00)",
    "isActive": true
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Thêm nhân sự thành công.",
    "data": {
      "user": {
        "id": "usr_new_guid",
        "fullName": "Nguyễn Thể Hình",
        "email": "coach.nguyen@sportscenter.com",
        "username": "coach_nguyen",
        "phone": "0933445566",
        "role": "COACH",
        "specialization": "Yoga, Pilates, Giảm cân",
        "workSchedule": "Ca chiều: Thứ 2 - Chủ Nhật (14:00 - 22:00)",
        "isActive": true
      },
      "initialPassword": "Tt9!randomPass99"
    }
  }
  ```

---

### API 14: Cập nhật thông tin Huấn luyện viên / Lễ tân (UC7, UC8)
- **Endpoint:** `PUT /api/manager/personnel/{id}`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Cho phép sửa: `fullName`, `phone`, `specialization`, `workSchedule`, `isActive`.
  - Email và Username không được thay đổi.
  - Ghi Audit Log hành động `UPDATE`.
- **Request Body:**
  ```json
  {
    "fullName": "Nguyễn Thể Hình Cập Nhật",
    "phone": "0933445577",
    "specialization": "Gym chuyên sâu, Boxing",
    "workSchedule": "Ca sáng: Thứ 2 - Thứ 6 (06:00 - 14:00)",
    "isActive": true
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Cập nhật nhân sự thành công.",
    "data": { ... }
  }
  ```

---

### API 15: Kích hoạt / Vô hiệu hóa tài khoản nhân sự (UC7, UC8)
- **Endpoint:** `PATCH /api/manager/personnel/{id}/status`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Request Body:**
  ```json
  {
    "isActive": false
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã vô hiệu hóa tài khoản thành công."
  }
  ```

---

## 2.5. Phân hệ Quản lý & Khám phá Gói tập (UC9, UC10)

### API 16: Danh mục gói tập công khai (UC10)
- **Endpoint:** `GET /api/MembershipPackage/active`
- **Quyền hạn:** Công khai (Anonymous).
- **Business Rules:** Chỉ trả về các gói tập đang mở hoạt động (`isActive == true`).
- **Response Success (`200 OK`):**
  ```json
  [
    {
      "id": 11,
      "name": "UC11 Monthly Test",
      "price": 500000,
      "durationMonths": 1,
      "benefits": ["Gym access", "Locker access"]
    }
  ]
  ```
  `id` là số nguyên ở BE; FE chỉ chuyển sang chuỗi tại biên HTTP.

---

### API 17: Danh sách quản lý gói tập toàn diện (UC9)
- **Endpoint:** `GET /api/manager/packages`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Mục đích:** Trả về tất cả các gói bao gồm cả gói đang hoạt động và gói đã ẩn.

---

### API 18: Tạo mới / Chỉnh sửa gói tập (UC9)
- **Endpoint:** `POST /api/manager/packages` (Tạo mới) hoặc `PUT /api/manager/packages/{id}` (Cập nhật).
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Tên gói: 2–80 ký tự, không trùng với gói khác.
  - Giá: số nguyên dương ($1$ đến $1.000.000.000$ VND).
  - Thời hạn: chỉ chấp nhận 1, 3 hoặc 12 tháng.
  - Quyền lợi: từ 1 đến 12 quyền lợi, mỗi mục tối đa 200 ký tự.
  - Ghi Audit Log: `CREATE` hoặc `UPDATE` cho đối tượng `MEMBERSHIP_PACKAGE`.
- **Request Body:**
  ```json
  {
    "name": "Gói Năm Thể Thao Vàng",
    "price": 4500000,
    "durationMonths": 12,
    "benefits": [
      "Tập luyện toàn thời gian",
      "Xông hơi và hồ bơi",
      "Khám sức khỏe định kỳ"
    ]
  }
  ```

---

### API 19: Ẩn / Mở lại gói tập (UC9)
- **Endpoint:** `PATCH /api/manager/packages/{id}/visibility`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Request Body:** `{ "isActive": false }`
- **Response Success (`200 OK`):** Cập nhật trạng thái hiển thị của gói.

---

### API 20: Xóa gói tập chưa có lịch sử đăng ký (UC9)
- **Endpoint:** `DELETE /api/manager/packages/{id}`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - **Chỉ cho phép xóa** nếu gói này **chưa từng có bất kỳ ai đăng ký hoặc có hóa đơn liên quan**.
  - Nếu đã có thành viên đăng ký trong quá khứ: Trả về lỗi `400 Bad Request` yêu cầu chỉ được Ẩn gói để bảo toàn lịch sử giao dịch.

---

## 2.6. Phân hệ Báo giá, Đăng ký & Gia hạn Gói tập (UC11)

### API 21: Báo giá xem trước & tính khấu trừ nâng gói (Quote)
- **Endpoint:** `POST /api/memberships/quote`
- **Quyền hạn:** `MEMBER`, `RECEPTIONIST`, `CENTER_MANAGER`.
- **Mục đích:** Tính toán chính xác ngày bắt đầu, ngày kết thúc, số tiền thanh toán, và khấu trừ số ngày chưa sử dụng nếu là trường hợp Nâng gói (`UPGRADE`).
- **Thuật toán nghiệp vụ:**
  - Nếu gia hạn cùng gói hoặc mua thêm khi còn hạn: Ngày bắt đầu nối tiếp ngày hết hạn cũ + 1 ngày.
  - Nếu nâng gói giá cao hơn: Bắt đầu ngay từ hôm nay. Số tiền thanh toán = Giá gói mới trừ đi giá trị quy đổi của các ngày chưa dùng của gói cũ:
    $$\text{Khấu trừ} = \text{round}\left( \text{Giá gói cũ} \times \frac{\text{Số ngày còn lại}}{\text{Tổng số ngày kỳ cũ}} \right)$$
- **Request Body:**
  ```json
  {
    "memberId": "usr_member_01",
    "packageId": "pkg_yearly",
    "paymentMethod": "CASH"
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "memberId": "usr_member_01",
      "memberName": "Lê Thành Viên",
      "packageId": "pkg_yearly",
      "packageName": "Gói Năm",
      "kind": "UPGRADE",
      "startDate": "2026-09-29",
      "endDate": "2027-09-28",
      "packagePrice": 4200000,
      "creditAmount": 150000,
      "amount": 4050000,
      "paymentMethod": "CASH"
    }
  }
  ```

---

### API 22: Lập yêu cầu đăng ký / gia hạn gói tập (Tạo đơn & Hóa đơn Pending)
- **Endpoint:** `POST /api/memberships/orders`
- **Quyền hạn:** `MEMBER`, `RECEPTIONIST`, `CENTER_MANAGER`.
- **Business Rules:**
  - Tạo 1 bản ghi `Subscription` và 1 bản ghi `Invoice` với trạng thái `PENDING_PAYMENT`.
  - Mã hóa đơn sinh tự động dạng `HD-YYYYMMDD-XXXXXXXX`.
  - Thành viên không được có 2 yêu cầu cùng lúc ở trạng thái `PENDING_PAYMENT`.
  - Ghi Audit Log: `CREATE` cho `MEMBERSHIP_ORDER`.
- **Request Body:**
  ```json
  {
    "memberId": "usr_member_01",
    "packageId": "pkg_yearly",
    "paymentMethod": "CASH",
    "kind": "REGISTER"
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "subscription": {
        "id": "sub_772183",
        "memberId": "usr_member_01",
        "packageId": "pkg_yearly",
        "packageName": "Gói Năm",
        "amount": 4200000,
        "startDate": "2026-09-29",
        "endDate": "2027-09-28",
        "status": "PENDING_PAYMENT",
        "invoiceId": "inv_998124"
      },
      "invoice": {
        "id": "inv_998124",
        "number": "HD-20260929-998124",
        "amount": 4200000,
        "paymentMethod": "CASH",
        "status": "PENDING_PAYMENT",
        "createdAt": "2026-09-29T12:00:00.000Z"
      }
    }
  }
  ```

---

### API 23: Lấy danh sách gói tập & hóa đơn của cá nhân thành viên
- **Endpoint:** `GET /api/memberships/my-subscriptions` và `GET /api/memberships/my-invoices`
- **Quyền hạn:** `MEMBER`.
- **Response Success (`200 OK`):** Danh sách các kỳ gói tập và hóa đơn của chính mình.

---

### API 24: Hủy yêu cầu đăng ký chưa thanh toán
- **Endpoint:** `POST /api/memberships/orders/{invoiceId}/cancel`
- **Quyền hạn:** Thành viên sở hữu đơn hoặc Lễ tân/Quản lý.
- **Business Rules:** Chỉ cho phép hủy khi hóa đơn đang ở trạng thái `PENDING_PAYMENT`.

---

## 2.7. Phân hệ Tra cứu Thành viên & Trạng thái Gói tại quầy (UC12, UC14)

### API 25: Tra cứu thành viên và trạng thái gói tập tức thì (UC12, UC14)
- **Endpoint:** `GET /api/Member/membership-status`
- **Quyền hạn:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Query Parameters:**
  - `search` (tùy chọn): Tìm theo họ tên, email, SĐT hoặc `memberCode`.
  - `filter` (mặc định `ALL`): `ALL`, `ACTIVE`, `EXPIRING`, `EXPIRED`, `SUSPENDED`, `UPCOMING`, `PENDING_PAYMENT`, `NONE`.
- **Mục đích:** Hỗ trợ quầy lễ tân tra cứu nhanh tình trạng thẻ tập của khách khi đến trung tâm.
- **Business Rules:** `status`, `remainingDays`, `expiringSoon` và kỳ sắp tới được tính theo ngày/múi giờ phía server; FE không tự tính lại.
- **Response Success (`200 OK`):**
  ```json
  [
    {
      "accountId": "7a0873f3-6223-43ab-99cc-6a9716f4eaa2",
      "memberCode": "MEM001",
      "fullName": "Nguyen Van An",
      "email": "member01@sportscenter.local",
      "phone": "0987654321",
      "status": "ACTIVE",
      "remainingDays": 6,
      "expiringSoon": true,
      "subscriptionId": 1,
      "packageId": 11,
      "packageName": "UC11 Monthly Test",
      "startDate": "2026-09-01",
      "endDate": "2026-10-05",
      "suspensionReason": null,
      "upcomingSubscriptionId": null,
      "upcomingPackageName": null,
      "upcomingStartDate": null,
      "upcomingEndDate": null
    }
  ]
  ```

---

## 2.8. Phân hệ Đăng ký tại quầy & Thanh toán tiền mặt (UC13, UC15)

### API 26: Đăng ký thành viên mới tại quầy + Tự sinh mật khẩu + Đăng ký gói (UC13)
- **Endpoint:** `POST /api/Member/counter-registration`
- **Quyền hạn:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Business Rules:**
  - Nhận họ tên, email, SĐT, ngày sinh, gói tập bắt buộc chọn (`packageId`), hình thức thanh toán.
  - Tạo tài khoản thành viên mới trong CSDL (kiểm tra không trùng email).
  - Tự động sinh mật khẩu khởi tạo ngẫu nhiên và mã hóa BCrypt.
  - Tự động tạo bản ghi `Subscription` và `Invoice` trạng thái `PENDING_PAYMENT`.
  - Tạo Account, Member, Subscription và Invoice trong một **database transaction**; lỗi trước commit rollback toàn bộ.
  - Gửi email sau commit; lỗi email không rollback dữ liệu và được báo qua `emailDelivery`.
- **Request Body:**
  ```json
  {
    "fullName": "Nguyễn Văn Khách Hàng",
    "email": "khachhang@gmail.com",
    "phone": "0988776655",
    "dateOfBirth": "1995-10-25",
    "packageId": 11,
    "expectedPrice": 500000,
    "paymentMethod": "CASH"
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "member": {
      "accountId": "<guid>",
      "memberCode": "MB2609301234",
      "fullName": "Nguyễn Văn Khách Hàng",
      "dateOfBirth": "1995-10-25",
      "avatarUrl": null,
      "email": "khachhang@gmail.com",
      "phone": "0988776655",
      "status": "Active",
      "createdAt": "2026-09-30T12:00:00Z",
      "updatedAt": null
    },
    "receipt": {
      "invoiceId": 4,
      "invoiceNumber": "INV-20260930-ABC123",
      "amount": 500000,
      "paymentMethod": "CASH",
      "invoiceStatus": "PENDING_PAYMENT",
      "createdAt": "2026-09-30T12:00:00Z",
      "paidAt": null,
      "paidByStaffId": null,
      "paidByStaffName": null,
      "subscriptionId": 3,
      "subscriptionStatus": "PENDING_PAYMENT",
      "kind": "REGISTER",
      "startDate": "2026-09-30",
      "endDate": "2026-10-29",
      "packageId": 11,
      "packageName": "UC11 Monthly Test",
      "packagePrice": 500000,
      "durationMonths": 1,
      "benefits": ["Gym access", "Locker access"],
      "memberAccountId": "<guid>",
      "memberCode": "MB2609301234",
      "memberFullName": "Nguyễn Văn Khách Hàng",
      "memberEmail": "khachhang@gmail.com",
      "memberPhone": "0988776655"
    },
    "initialPassword": "<chi-hien-thi-mot-lan>",
    "emailDelivery": "SENT"
  }
  ```
  `emailDelivery` nhận một trong `SENT`, `FAILED`, `NOT_CONFIGURED`; response tuyệt đối không có `passwordHash`.

---

### API 27: Lấy danh sách hóa đơn chờ thu tiền mặt (UC15)
- **Endpoint:** `GET /api/payments/cash/pending`
- **Quyền hạn:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Mục đích:** Phục vụ màn hình `/payments/cash` tại quầy để thu ngân chọn hóa đơn và xác nhận tiền mặt.
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "inv_998124",
        "number": "HD-20260929-998124",
        "memberId": "usr_member_01",
        "memberName": "Lê Thành Viên",
        "memberEmail": "member@sportscenter.com",
        "packageName": "Gói Năm",
        "amount": 4200000,
        "paymentMethod": "CASH",
        "createdAt": "2026-09-29T12:00:00.000Z"
      }
    ]
  }
  ```

---

### API 28: Xác nhận thu tiền mặt & Kích hoạt gói tập (UC15)
- **Endpoint:** `POST /api/payments/cash/{invoiceId}/confirm`
- **Quyền hạn:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Business Rules:**
  - `receivedAmount` bắt buộc phải bằng chính xác số tiền trên hóa đơn (`amount`).
  - Hóa đơn chuyển trạng thái sang `PAID`, lưu `paidAt`, `paidBy` (lấy từ Token của lễ tân).
  - Gói tập tương ứng chuyển sang `CONFIRMED` và có hiệu lực ngay lập tức.
  - Nếu là Nâng gói (`UPGRADE`): Gói cũ được gán `replacedOn = today`, gói mới kích hoạt từ hôm nay.
  - Thao tác thực hiện trong Transaction để đảm bảo tiền và thẻ tập cập nhật đồng thời.
  - Ghi Audit Log: `CONFIRM_PAYMENT`.
- **Request Body:**
  ```json
  {
    "receivedAmount": 4200000
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã xác nhận thanh toán tiền mặt thành công. Gói tập đã được kích hoạt.",
    "data": {
      "invoice": {
        "id": "inv_998124",
        "number": "HD-20260929-998124",
        "status": "PAID",
        "paidAt": "2026-09-29T12:05:00.000Z",
        "paidByName": "Phạm Lễ Tân"
      },
      "subscription": {
        "id": "sub_772183",
        "status": "CONFIRMED",
        "startDate": "2026-09-29",
        "endDate": "2027-09-28"
      }
    }
  }
  ```

---

## 2.9. Phân hệ Nhật ký kiểm toán hệ thống - Audit Log (UC16)

### API 29: Truy vấn lịch sử thao tác hệ thống (UC16)
- **Endpoint:** `GET /api/manager/audit-logs`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Query Parameters:**
  - `query` (tùy chọn): Tìm theo tên người thực hiện, đối tượng, mô tả chi tiết.
  - `action` (tùy chọn): `CREATE`, `UPDATE`, `UPDATE_PROFILE`, `CHANGE_PASSWORD`, `ACTIVATE`, `DEACTIVATE`, `DELETE`, `CONFIRM_PAYMENT`, `CANCEL`.
  - `from` (tùy chọn, `YYYY-MM-DD`).
  - `to` (tùy chọn, `YYYY-MM-DD`).
  - `page` (int, mặc định = 1).
  - `pageSize` (int, mặc định = 50).
- **Business Rules:**
  - Bản ghi nhật ký chỉ được đọc (`Read-only`), **tuyệt đối không cung cấp API sửa hoặc xóa nhật ký**.
  - Sắp xếp thời gian giảm dần (mới nhất lên đầu).
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "log_a1b2c3d4",
          "actorId": "usr_recept_01",
          "actorName": "Phạm Lễ Tân",
          "action": "CONFIRM_PAYMENT",
          "entity": "INVOICE",
          "entityId": "inv_998124",
          "description": "Xác nhận thanh toán tiền mặt 4.200.000đ cho Lê Thành Viên.",
          "createdAt": "2026-09-29T12:05:00.000Z"
        },
        {
          "id": "log_e5f6g7h8",
          "actorId": "usr_coach_01",
          "actorName": "Trần Huấn Luyện Viên",
          "action": "CHANGE_PASSWORD",
          "entity": "USER",
          "entityId": "usr_coach_01",
          "description": "Đổi mật khẩu thành công qua xác thực OTP cho tài khoản coach@sportscenter.com.",
          "createdAt": "2026-09-29T11:45:00.000Z"
        }
      ],
      "total": 128,
      "page": 1,
      "pageSize": 50,
      "totalPages": 3
    }
  }
  ```

---

## 2.10. Phân hệ Nghiệp vụ quầy bổ sung (Điểm danh, Lớp học, Hỗ trợ)

### API 30: Điểm danh thành viên ra/vào trung tâm
- `POST /api/reception/attendance/check-in` (Nhận `{ "memberId": "..." }`, kiểm tra thẻ tập còn hạn và active).
- `POST /api/reception/attendance/check-out` (Nhận `{ "visitId": "..." }`).
- `GET /api/reception/attendance/visits?date=YYYY-MM-DD` (Lấy danh sách lượt tập trong ngày).

### API 31: Đăng ký lớp học tại quầy
- `GET /api/reception/classes/sessions?date=YYYY-MM-DD` (Danh sách ca học, lớp học, HLV, phòng, số chỗ trống).
- `POST /api/reception/classes/book` (Nhận `{ "memberId": "...", "sessionId": "..." }`, kiểm tra sức chứa và trùng lịch).
- `POST /api/reception/classes/bookings/{id}/cancel` (Hủy lịch đăng ký).

### API 32: Yêu cầu hỗ trợ & Phản hồi thành viên
- `GET /api/reception/support/tickets` (Danh sách yêu cầu hỗ trợ).
- `POST /api/reception/support/tickets` (Tạo phiếu hỗ trợ mới).
- `PATCH /api/reception/support/tickets/{id}/status` (Cập nhật trạng thái `OPEN`, `IN_PROGRESS`, `RESOLVED` kèm ghi chú).

---

# 3. ĐỐI CHIẾU SOURCE BACKEND HIỆN TẠI VÀ CÔNG VIỆC CẦN LÀM

Dựa trên việc kiểm tra mã nguồn repository Backend `SportsCenterManagement`:

| Controller BE hiện tại | Hiện trạng mã nguồn BE | Công việc cụ thể cần BE xử lý để hoàn tất |
| :--- | :--- | :--- |
| **`AuthController.cs`** | Đã có `POST /api/Auth/login`, `POST /api/Auth/check-token`, `POST /api/Auth/Logout`; login reset bộ đếm, trả session DTO và phân giải role từ DB. Token logout bị chặn trên pipeline chung tới khi hết hạn. | UC5 Sprint 1 đã nối FE và smoke test; blacklist hiện dùng `IMemoryCache`, cần đổi sang distributed store khi triển khai nhiều instance. |
| **`AccountController.cs`** | Đang có `Create_center_manager`, `Create_coach`, `Create_member`, `Create_receptionist`. Thiếu `[Authorize]` trên các endpoint tạo vai trò quản trị. | 1. Tách endpoint công khai `POST /api/auth/register` (chỉ tạo MEMBER).<br>2. Bổ sung `[Authorize(Roles = "CENTER_MANAGER")]` cho các API quản lý nhân sự.<br>3. Thêm các endpoint cho Hồ sơ cá nhân: `PUT /api/profile`, `POST /api/profile/request-change-password-otp`, `POST /api/profile/change-password`. |
| **`MemberController.cs`** | Đã có UC6 `GET/POST/PATCH/DELETE /api/Member`, UC13 `POST /api/Member/counter-registration` và UC14 `GET /api/Member/membership-status`. | Các luồng Long Sprint 1 đã nối FE, kiểm thử service/integration và smoke với SQL Server. |
| **`MembershipPackageController.cs`** | Đã có `GET /api/MembershipPackage/active` công khai và CRUD/status/delete cho Manager. | UC10 đã nối FE. Các quy tắc UC9 ngoài phạm vi Long tiếp tục do chủ use case xác nhận. |
| **`AuditLogController.cs`** | Đã có endpoint truy vấn theo bộ lọc. | 1. Tích hợp tự động ghi audit log trong các service nghiệp vụ (tạo user, đổi pass, thanh toán, đổi trạng thái).<br>2. Đảm bảo bảo mật chỉ role `CENTER_MANAGER` được xem. |
| **Chưa có Controller:**<br>`MembershipOrderController`<br>`PaymentController` | Chưa có API tính báo giá (Quote), tạo đơn gia hạn/nâng gói, danh sách hóa đơn pending, xác nhận thu tiền mặt. | 1. Xây dựng `POST /api/memberships/quote` (thuật toán khấu trừ nâng gói).<br>2. Xây dựng `POST /api/memberships/orders`.<br>3. Xây dựng `GET /api/payments/cash/pending` và `POST /api/payments/cash/{invoiceId}/confirm`. |
| **Cấu hình & Test:**<br>`Program.cs` & `.Tests` | Đã bật CORS theo `Cors:AllowedOrigins` (development: `http://localhost:5173`). Bộ test hiện chạy 70/70; có script import DB và smoke UC5/6/10/13/14. | Khi thêm origin hoặc môi trường mới, cấu hình ngoài source; không commit signing key, connection string hay SMTP secret. |

---
*Tài liệu này được xuất bản làm căn cứ kỹ thuật chính thức giữa Frontend và Backend.*
