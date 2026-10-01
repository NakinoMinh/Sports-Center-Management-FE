# TÀI LIỆU ĐẶC TẢ CHI TIẾT API BACKEND (BE API SPECIFICATION)
## DỰ ÁN: HỆ THỐNG QUẢN LÝ TRUNG TÂM THỂ THAO (SPORTS CENTER MANAGEMENT SYSTEM - SCMS)

- **Phiên bản:** 2.0 (Đồng bộ toàn diện theo mã nguồn Frontend mới nhất)
- **Ngày lập:** 29/09/2026
- **Đối tượng áp dụng:** Nhóm phát triển Backend (.NET Core / C#) và Nhóm Frontend (React / TypeScript)
- **Mục đích:** Cung cấp tài liệu hợp đồng giao tiếp (API Contract) chi tiết, chuẩn xác, đầy đủ Request/Response/Business Rules để BE triển khai API sẵn sàng kết nối trực tiếp với Frontend.

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
- **CORS:** Cần cấu hình cho phép Frontend gọi API (gồm `http://localhost:5173`, `http://localhost:3000`). Cho phép các HTTP Methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`) và Headers (`Authorization`, `Content-Type`, `Idempotency-Key`).

### 1.2. Xác thực & Phân quyền (JWT Bearer Token)
- Các endpoint yêu cầu đăng nhập nhận Token qua Header:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Hạn dùng Token:** 24 giờ ($1440$ phút). Token chứa claims:
  - `nameid` / `sub` / `userId`: ID tài khoản (GUID / UUID).
  - `unique_name` / `username`: Tên đăng nhập.
  - `email`: Địa chỉ email.
  - `role`: Vai trò người dùng (Uppercase chuẩn hóa: `CENTER_MANAGER`, `COACH`, `MEMBER`, `RECEPTIONIST`).
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
- **Endpoint:** `POST /api/auth/login`
- **Quyền hạn:** Công khai (Public).
- **Mục đích:** Đăng nhập dùng chung cho tất cả vai trò (`CENTER_MANAGER`, `COACH`, `MEMBER`, `RECEPTIONIST`). BE tự tra cứu tài khoản và nhận diện vai trò trong CSDL.
- **Business Rules:**
  - Kiểm tra tài khoản bằng Email và mật khẩu (BCrypt compare).
  - Khóa tài khoản (`isLocked = true`) nếu nhập sai liên tiếp **5 lần**.
  - Mỗi lần nhập sai trả về số lần thử còn lại (`failedAttemptsRemaining`).
  - Khi đăng nhập đúng, reset `failedAttempts = 0`.
  - Chặn đăng nhập nếu `isActive == false` (tài khoản bị vô hiệu hóa) hoặc `deletedAt != null`.
- **Request Body:**
  ```json
  {
    "email": "manager@sportscenter.com",
    "password": "Pass@1234",
    "rememberMe": true
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đăng nhập thành công.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2026-09-30T12:00:00.000Z",
      "user": {
        "id": "usr_manager_01",
        "username": "manager_admin",
        "email": "manager@sportscenter.com",
        "fullName": "Nguyễn Văn Quản Lý",
        "role": "CENTER_MANAGER",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        "phone": "0901234567",
        "dateOfBirth": "1988-05-15",
        "isLocked": false,
        "isActive": true
      }
    }
  }
  ```
- **Response Errors:**
  - `401 Unauthorized` (Mật khẩu sai, còn lượt thử):
    ```json
    {
      "success": false,
      "code": "INVALID_CREDENTIALS",
      "message": "Mật khẩu không chính xác. Bạn còn 3 lần thử trước khi tài khoản bị khóa.",
      "failedAttemptsRemaining": 3,
      "isLocked": false
    }
    ```
  - `423 Locked` (Khóa sau 5 lần nhập sai):
    ```json
    {
      "success": false,
      "code": "ACCOUNT_LOCKED",
      "message": "Tài khoản đã bị khóa sau 5 lần nhập sai liên tiếp. Vui lòng liên hệ quản lý trung tâm.",
      "failedAttemptsRemaining": 0,
      "isLocked": true
    }
    ```

---

### API 3: Lấy thông tin tài khoản hiện tại từ Token
- **Endpoint:** `GET /api/auth/me`
- **Quyền hạn:** Người dùng đã đăng nhập (Token hợp lệ).
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_coach_01",
      "username": "coach_pro",
      "email": "coach@sportscenter.com",
      "fullName": "Trần Huấn Luyện Viên",
      "role": "COACH",
      "phone": "0912345678",
      "dateOfBirth": "1992-08-20",
      "specialization": "Fitness, Gym, Thể hình, Cardio",
      "workSchedule": "Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)",
      "avatar": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5",
      "isLocked": false,
      "isActive": true
    }
  }
  ```

---

### API 4: Đăng xuất & Thu hồi Token (UC3)
- **Endpoint:** `POST /api/auth/logout`
- **Quyền hạn:** Người dùng hiện tại.
- **Business Rules:** Đưa `jti` hoặc chuỗi JWT vào danh sách thu hồi (Token Blacklist/Distributed Cache) cho tới thời điểm hết hạn của token.
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đăng xuất thành công."
  }
  ```

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
- **Endpoint:** `GET /api/manager/members`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Query Parameters:**
  - `query` (string, tùy chọn): Tìm kiếm theo họ tên (không phân biệt dấu tiếng Việt), email, SĐT, mã ID.
  - `status` (string, tùy chọn): `ALL` (mặc định), `ACTIVE`, `INACTIVE`.
  - `page` (int, mặc định = 1).
  - `pageSize` (int, mặc định = 20).
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "usr_member_01",
          "username": "member_vip",
          "fullName": "Lê Thành Viên",
          "email": "member@sportscenter.com",
          "phone": "0987654321",
          "dateOfBirth": "1998-12-10",
          "isActive": true,
          "createdAt": "2026-09-20T08:00:00.000Z"
        }
      ],
      "total": 45,
      "page": 1,
      "pageSize": 20,
      "totalPages": 3
    }
  }
  ```

---

### API 9: Tạo tài khoản thành viên thủ công từ trang quản trị
- **Endpoint:** `POST /api/manager/members`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Nhập họ tên, email, SĐT, ngày sinh, trạng thái.
  - Hệ thống tự sinh username duy nhất và mật khẩu khởi tạo ngẫu nhiên (chứa chữ hoa, chữ thường, số, ký tự đặc biệt).
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
    "success": true,
    "message": "Tạo thành viên thành công.",
    "data": {
      "member": {
        "id": "usr_member_new_guid",
        "username": "member_hoangngan",
        "fullName": "Hoàng Kim Ngân",
        "email": "ngan.hoang@gmail.com",
        "phone": "0918273645",
        "dateOfBirth": "2000-04-18",
        "isActive": true,
        "createdAt": "2026-09-29T12:00:00.000Z"
      },
      "initialPassword": "Tt9!randomPassword88"
    }
  }
  ```

---

### API 10: Cập nhật thông tin thành viên
- **Endpoint:** `PUT /api/manager/members/{id}`
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
  ```json
  {
    "success": true,
    "message": "Cập nhật thành viên thành công.",
    "data": { ... }
  }
  ```

---

### API 11: Xóa mềm thành viên (Soft Delete)
- **Endpoint:** `DELETE /api/manager/members/{id}`
- **Quyền hạn:** `CENTER_MANAGER`.
- **Business Rules:**
  - Không xóa cứng trong CSDL nhằm lưu vết hóa đơn, hợp đồng gói tập và điểm danh.
  - Đặt `deletedAt = DateTime.UtcNow`, `isActive = false`. Chặn đăng nhập và chặn đăng ký gói mới.
  - Ghi Audit Log hành động `DEACTIVATE` cho đối tượng `MEMBER`.
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã ngừng hoạt động và xóa mềm thành viên."
  }
  ```

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
- **Endpoint:** `GET /api/packages/public`
- **Quyền hạn:** Công khai (Anonymous).
- **Business Rules:** Chỉ trả về các gói tập đang mở hoạt động (`isActive == true`).
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "pkg_monthly",
        "name": "Gói Tháng",
        "price": 450000,
        "durationMonths": 1,
        "benefits": [
          "Tập luyện tại phòng gym không giới hạn",
          "Sử dụng tủ đồ cá nhân an toàn",
          "Đánh giá thể lực ban đầu cùng HLV"
        ]
      },
      {
        "id": "pkg_quarterly",
        "name": "Gói Quý",
        "price": 1200000,
        "durationMonths": 3,
        "benefits": [
          "Toàn bộ quyền lợi Gói Tháng",
          "Tham gia tất cả các lớp tập nhóm (Yoga, Zumba, HIIT)",
          "Tư vấn kế hoạch dinh dưỡng & tập luyện"
        ]
      },
      {
        "id": "pkg_yearly",
        "name": "Gói Năm",
        "price": 4200000,
        "durationMonths": 12,
        "benefits": [
          "Toàn bộ quyền lợi Gói Quý",
          "Đánh giá tiến độ InBody định kỳ hàng tháng",
          "Ưu tiên đăng ký lịch tập lớp học hot"
        ]
      }
    ]
  }
  ```

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
- **Endpoint:** `GET /api/reception/membership-status`
- **Quyền hạn:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Query Parameters:**
  - `query` (tùy chọn): Tìm theo Họ tên, Email, SĐT, Mã thành viên.
  - `filter` (tùy chọn): `ALL`, `ACTIVE`, `EXPIRING` (< 7 ngày), `EXPIRED`, `SUSPENDED`.
- **Mục đích:** Hỗ trợ quầy lễ tân tra cứu nhanh tình trạng thẻ tập của khách khi đến trung tâm.
- **Response Success (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "member": {
          "id": "usr_member_01",
          "fullName": "Lê Thành Viên",
          "email": "member@sportscenter.com",
          "phone": "0987654321"
        },
        "status": "ACTIVE",
        "packageName": "Gói Tháng",
        "startDate": "2026-09-01",
        "endDate": "2026-09-30",
        "remainingDays": 2,
        "expiringSoon": true,
        "upcoming": null
      }
    ]
  }
  ```

---

## 2.8. Phân hệ Đăng ký tại quầy & Thanh toán tiền mặt (UC13, UC15)

### API 26: Đăng ký thành viên mới tại quầy + Tự sinh mật khẩu + Đăng ký gói (UC13)
- **Endpoint:** `POST /api/reception/register-member`
- **Quyền hạn:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Business Rules:**
  - Nhận họ tên, email, SĐT, ngày sinh, gói tập bắt buộc chọn (`packageId`), hình thức thanh toán.
  - Tạo tài khoản thành viên mới trong CSDL (kiểm tra không trùng email).
  - Tự động sinh mật khẩu khởi tạo ngẫu nhiên và mã hóa BCrypt.
  - Tự động tạo bản ghi `Subscription` và `Invoice` trạng thái `PENDING_PAYMENT`.
  - Gửi email thông báo thông tin đăng nhập và hợp đồng gói tập cho khách.
  - Toàn bộ thao tác phải nằm trong một **Database Transaction** (nếu thất bại phải Rollback cả tài khoản lẫn gói).
- **Request Body:**
  ```json
  {
    "fullName": "Nguyễn Văn Khách Hàng",
    "email": "khachhang@gmail.com",
    "phone": "0988776655",
    "dateOfBirth": "1995-10-25",
    "packageId": "pkg_quarterly",
    "expectedPrice": 1200000,
    "paymentMethod": "CASH"
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Đăng ký thành viên tại quầy thành công.",
    "data": {
      "member": {
        "id": "usr_member_uuid",
        "fullName": "Nguyễn Văn Khách Hàng",
        "email": "khachhang@gmail.com",
        "phone": "0988776655"
      },
      "initialPassword": "Tt9!generatedPassword22",
      "order": {
        "invoiceId": "inv_uuid_123",
        "number": "HD-20260929-123456",
        "amount": 1200000,
        "status": "PENDING_PAYMENT"
      },
      "emailDelivery": "SENT"
    }
  }
  ```

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

Dựa trên việc kiểm tra mã nguồn Backend tại `D:\SWP\SportsCenterManagement`:

| Controller BE hiện tại | Hiện trạng mã nguồn BE | Công việc cụ thể cần BE xử lý để hoàn tất |
| :--- | :--- | :--- |
| **`AuthController.cs`** | Đang chia 4 API login riêng: `Login_center_manager`, `Login_coach`, `Login_member`, `Login_receptionist`. Dùng IMemoryCache để lưu Blacklist. Chưa reset `FailedLoginCount`. | 1. Xây dựng endpoint duy nhất **`POST /api/auth/login`** nhận email/password và tự động phân giải role.<br>2. Bổ sung **`GET /api/auth/me`** trả thông tin user đầy đủ.<br>3. Reset `FailedLoginCount` khi login thành công.<br>4. Trả đúng cấu trúc lỗi có `isLocked`, `failedAttemptsRemaining`. |
| **`AccountController.cs`** | Đang có `Create_center_manager`, `Create_coach`, `Create_member`, `Create_receptionist`. Thiếu `[Authorize]` trên các endpoint tạo vai trò quản trị. | 1. Tách endpoint công khai `POST /api/auth/register` (chỉ tạo MEMBER).<br>2. Bổ sung `[Authorize(Roles = "CENTER_MANAGER")]` cho các API quản lý nhân sự.<br>3. Thêm các endpoint cho Hồ sơ cá nhân: `PUT /api/profile`, `POST /api/profile/request-change-password-otp`, `POST /api/profile/change-password`. |
| **`MembershipPackageController.cs`** | Đã có `GET /api/MembershipPackage/active`. Chưa có API quản lý CRUD cho Manager. | 1. Bổ sung endpoint cho Manager: `GET`, `POST`, `PUT`, `DELETE`, `PATCH visibility`.<br>2. Đảm bảo ràng buộc không xóa gói khi đã có người đăng ký. |
| **`CounterRegistrationController.cs`** | Đã tạo stub `POST /api/counterregistration/register-member`. | 1. Kết nối lưu CSDL tài khoản và tạo đồng thời bản ghi Subscription + Invoice.<br>2. Triển khai dịch vụ Email thực tế để gửi thông tin mật khẩu khởi tạo cho khách. |
| **`AuditLogController.cs`** | Đã có endpoint truy vấn theo bộ lọc. | 1. Tích hợp tự động ghi audit log trong các service nghiệp vụ (tạo user, đổi pass, thanh toán, đổi trạng thái).<br>2. Đảm bảo bảo mật chỉ role `CENTER_MANAGER` được xem. |
| **Chưa có Controller:**<br>`MembershipOrderController`<br>`PaymentController` | Chưa có API tính báo giá (Quote), tạo đơn gia hạn/nâng gói, danh sách hóa đơn pending, xác nhận thu tiền mặt. | 1. Xây dựng `POST /api/memberships/quote` (thuật toán khấu trừ nâng gói).<br>2. Xây dựng `POST /api/memberships/orders`.<br>3. Xây dựng `GET /api/payments/cash/pending` và `POST /api/payments/cash/{invoiceId}/confirm`. |
| **Cấu hình & Test:**<br>`Program.cs` & `.Tests` | Chưa bật CORS cho FE. Project Test bị lỗi thiếu reference `JwtBlacklistService`. | 1. Thêm `builder.Services.AddCors(...)` và `app.UseCors(...)` cho phép kết nối từ Frontend port 5173 / 3000.<br>2. Cập nhật hoặc dọn dẹp file test cũ trong `SportsCenterManagement.Tests`. |

---
*Tài liệu này được xuất bản làm căn cứ kỹ thuật chính thức giữa Frontend và Backend.*

---

# 4. BỔ SUNG ĐỐI CHIẾU FRONTEND NGÀY 30/09/2026

Phần này bổ sung cho API 1–32 ở trên, giữ nguyên nội dung và ví dụ của bản 2.0. Khi có điểm khác nhau, áp dụng chi tiết đối chiếu trong phần 4 khi tích hợp. Các đường dẫn là contract đề xuất cho BE; FE hiện dùng service mock/localStorage, chưa gửi HTTP request đến các đường dẫn này.

## 4.1. Phạm vi màn hình và dữ liệu cần cung cấp

| Màn hình FE | Nguồn FE | API/dữ liệu cần có |
| :--- | :--- | :--- |
| `/`, `/packages` | `HomePage`, `PackageCatalogPage` | API 16, danh mục công khai chỉ chứa gói đang mở |
| `/login`, `/register`, `/profile` | `authService`, `AuthContext`, `ProfilePage` | API 1–7, khôi phục phiên và toàn bộ hồ sơ hiện tại |
| `/manager/members` | `memberService`, `MembersPage` | API 8–11 và subscription từng thành viên |
| `/manager/coaches`, `/manager/staff` | `personnelService` | API 12–15, mật khẩu khởi tạo trả một lần |
| `/manager/packages` | `MembershipPackagesPage` | API 17–20 và danh sách subscription để đếm thành viên theo gói |
| `/member/membership`, `/receptionist/memberships` | `membershipService`, `MembershipPage` | Catalog, thành viên, subscription, invoice, quote, order và hủy order |
| `/payments/cash` | `CashPaymentsPage`, `InvoiceDocument` | Hóa đơn CASH ở cả ba trạng thái và dữ liệu đầy đủ để in |
| `/receptionist/membership-status` | `getMembershipStatusSummary` | Thành viên, kỳ hiện tại/kỳ tiếp theo, số ngày và trạng thái |
| `/manager/audit-log` | `auditService` | API 29, bộ lọc và toàn bộ kết quả tương ứng |
| `/receptionist/attendance`, `/receptionist/classes`, `/receptionist/support` | `receptionService` | API 30–32 và danh sách booking bổ sung |

`/manager/access` chỉ hiển thị ma trận quyền cố định; chưa có thao tác chỉnh quyền. `/coach` hiện là màn hình chào. FE có đọc `isLocked`, `isSuspended`, `suspensionReason` nhưng chưa có màn hình mở khóa tài khoản hoặc thao tác tạm ngưng gói; không coi các mutation này là yêu cầu đã có trong UI.

## 4.2. Quy ước chuyển từ mock sang HTTP

- Envelope `{ success, message, data }` ở mục 1 là contract mạng đề xuất. Adapter FE phải lấy `data`, chuyển lỗi HTTP thành thông báo và chuyển các service đồng bộ sang bất đồng bộ; chỉ triển khai BE chưa đủ để FE tự kết nối.
- ID trong model FE là `string`. Nếu BE trả ID số, adapter phải chuyển nhất quán cả ID và khóa ngoại; không thay dữ liệu thật bằng ID seed `pkg_monthly`.
- JWT chuẩn dùng giây; `JWTPayload` demo của FE dùng mili giây. Adapter cần chuyển `iat/exp` trước khi dùng timer hiện tại hoặc sửa timer sang đơn vị chuẩn.
- `rememberMe` hiện quyết định localStorage/sessionStorage, không làm token sống lâu hơn 24 giờ.
- Optional field trong TypeScript có thể vắng mặt. Nếu BE trả `null`, adapter chuẩn hóa sang `undefined` nơi cần thiết; các mảng luôn trả `[]` khi không có dữ liệu.
- `memberService.list` trả `{ items, total, page, pages }`, page size 20. Khi dùng envelope phân trang, map `totalPages` sang `pages`.
- Các màn hình khác đang tính tổng/lọc từ toàn bộ mảng. Nếu BE phân trang, FE phải tải đủ trang hoặc được sửa để dùng pagination và tổng số do BE trả; không lấy trang đầu rồi coi là toàn bộ dữ liệu.
- Actor và các trường `createdBy`, `paidBy`, `canceledBy`, thời gian phải lấy từ phiên/server; không tin giá trị do client gửi. Ownership được kiểm tra trên server ở mọi endpoint theo ID.
- FE hiện lấy ngày theo máy người dùng. Khi tích hợp cần thống nhất ngày nghiệp vụ của trung tâm theo `Asia/Ho_Chi_Minh`, đặc biệt quote, thanh toán và đặt lớp.

## 4.3. Bổ sung validation và hồ sơ cho API 1–15

- **API 1:** `fullName` là tùy chọn trên form; mock dùng username khi họ tên trống. `confirmPassword` có trong input FE và phải khớp password. Code đăng ký công khai hiện chỉ kiểm tra username tối thiểu 3 ký tự; giới hạn 3–30 và regex ở bản cũ là quy tắc mục tiêu chặt hơn, cần đồng bộ validation FE khi áp dụng.
- **API 2–3:** Trả đủ `id`, `username`, `email`, `fullName`, `role`, `createdAt`, `isLocked`, `isActive`; thêm `avatar`, `phone`, `dateOfBirth`, `specialization`, `workSchedule` khi có. Không trả hash. `failedAttempts` đang nằm trong type demo; nên loại khỏi public type khi tích hợp hoặc map rõ ràng, không nhầm với `failedAttemptsRemaining` của lỗi login.
- **API 5:** Profile cho phép để trống phone/dateOfBirth/avatar. Nếu có phone phải gồm 10 số bắt đầu 0; ngày sinh hợp lệ từ năm 1900 đến hôm nay; avatar HTTPS tối đa 500 ký tự. Email bất biến chỉ áp dụng tự sửa profile; Manager vẫn sửa email thành viên qua API 10.
- **API 6:** Không cần body theo service hiện tại. Trả `email`, `expiresInSeconds=300`. Mock trả thêm mã OTP và UI hiển thị mã mô phỏng; phải bỏ cơ chế này khi nối email thật. Giới hạn gửi lại/số lần thử OTP là yêu cầu bảo mật bổ sung cho BE.
- **API 7:** Password mới tối thiểu 8 ký tự, tối đa 72 byte UTF-8, khác password hiện tại; xác nhận trùng; OTP đúng user, chưa hết hạn và dùng một lần.
- **API 8:** Mock tìm không dấu theo tên/email/phone, chưa tìm ID như mô tả cũ; ID search là mở rộng phía BE. Không trả thành viên đã xóa mềm; thứ tự tạo mới nhất trước.
- **API 9–10:** Họ tên 2–80, email hợp lệ tối đa 254, phone bắt buộc 10 số bắt đầu 0, ngày sinh bắt buộc hợp lệ từ 1900 đến hôm nay, `isActive` boolean. Email duy nhất kể cả tài khoản đã xóa mềm. API 9 trả `{ member, initialPassword }`; username được sinh tự động.
- **API 12–15:** Email/username duy nhất không phân biệt hoa thường; username tạo nhân sự theo regex `^[a-zA-Z0-9_]{3,30}$`. Phone bắt buộc 10 số bắt đầu 0, họ tên 2–80, specialization tối đa 200, workSchedule tối đa 300. API 13 trả `{ user, initialPassword }`. API 14 sửa thông tin và trạng thái, không đổi role/email/username. Danh sách sắp xếp tên tiếng Việt; FE lọc tên/email/phone/chuyên môn.

## 4.4. DTO đầy đủ cho API 21–28 và dữ liệu in hóa đơn

Các response rút gọn ở phần 2 cần được mở rộng theo schema dưới đây. Ký hiệu `?` là tùy chọn; `DateString` là `YYYY-MM-DD`, `Timestamp` là ISO-8601 UTC. Schema mô tả **data bên trong envelope**, không phải DB entity.

```typescript
type DateString = string;
type Timestamp = string;
type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD";
type OrderKind = "REGISTER" | "RENEW" | "UPGRADE" | "DOWNGRADE";

interface MembershipQuote {
  memberId: string;
  memberName: string;
  memberEmail: string;
  packageId: string;
  packageName: string;
  durationMonths: 1 | 3 | 12;
  benefits: string[];
  paymentMethod: PaymentMethod;
  kind: OrderKind;
  packagePrice: number;
  amount: number;
  startDate: DateString;
  endDate: DateString;
  previousSubscriptionId?: string;
  previousPackagePrice?: number;
  creditAmount?: number;
  remainingDays?: number;
  previousPeriodDays?: number;
}

interface MemberSubscription {
  id: string;
  memberId: string;
  packageId: string;
  packageName: string;
  durationMonths: 1 | 3 | 12;
  benefits: string[];
  amount: number;
  packagePrice: number;
  startDate: DateString;
  endDate: DateString;
  kind: OrderKind;
  previousSubscriptionId?: string;
  replacedOn?: DateString;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELED";
  isSuspended?: boolean;
  suspensionReason?: string;
  invoiceId: string;
  createdAt: Timestamp;
}

interface MembershipInvoice extends MembershipQuote {
  id: string;
  number: string;
  subscriptionId: string;
  status: "PAID" | "PENDING_PAYMENT" | "CANCELED";
  createdAt: Timestamp;
  createdBy: string;
  paidAt?: Timestamp;
  paidBy?: string;
  paidByName?: string;
  canceledAt?: Timestamp;
  canceledBy?: string;
}

interface MembershipOrder {
  subscription: MemberSubscription;
  invoice: MembershipInvoice;
}
```

Tên gói, quyền lợi, giá niêm yết, tên/email thành viên trên invoice là snapshot lúc tạo. Sửa catalog hoặc profile không được viết lại hóa đơn cũ. `packagePrice` khác `amount`: khi nâng gói, `amount` là tiền thực thu sau khấu trừ. Component `InvoiceDocument` in từ dữ liệu này; chưa cần endpoint xuất PDF riêng.

Ví dụ response API 22 đầy đủ cho một order mới:

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_01", "memberId": "usr_01", "packageId": "pkg_01",
      "packageName": "Gói Tháng", "durationMonths": 1,
      "benefits": ["Tập gym"], "amount": 450000, "packagePrice": 450000,
      "startDate": "2026-09-30", "endDate": "2026-10-29",
      "kind": "REGISTER", "status": "PENDING_PAYMENT",
      "invoiceId": "inv_01", "createdAt": "2026-09-30T03:00:00.000Z"
    },
    "invoice": {
      "id": "inv_01", "number": "HD-20260930-ABC12345", "subscriptionId": "sub_01",
      "memberId": "usr_01", "memberName": "Nguyễn Văn A", "memberEmail": "a@example.com",
      "packageId": "pkg_01", "packageName": "Gói Tháng", "durationMonths": 1,
      "benefits": ["Tập gym"], "packagePrice": 450000, "amount": 450000,
      "paymentMethod": "CASH", "kind": "REGISTER",
      "startDate": "2026-09-30", "endDate": "2026-10-29", "status": "PENDING_PAYMENT",
      "createdAt": "2026-09-30T03:00:00.000Z", "createdBy": "usr_receptionist"
    }
  }
}
```

## 4.5. API danh sách bổ sung cho FE

### API 33: Thành viên phục vụ tra cứu và chọn tại quầy

- **Endpoint đề xuất:** `GET /api/reception/members?query=`.
- **Quyền:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Nguồn:** `membershipService.listMembers`, các trang Membership/Status/ReceptionOperations.
- **Response:** `{ success: true, data: User[] }`, không có passwordHash; gồm id, username, fullName, email, phone, role, createdAt, isActive, isLocked và ngày sinh khi có.
- Không trả account xóa mềm. Vẫn trả account ngừng hoạt động/khóa để tra cứu, nhưng BE chặn nghiệp vụ cần account hoạt động.
- `query` tùy chọn tìm tên/email/phone/ID. Bỏ query lấy toàn bộ tập kết quả cần cho UI; nếu phân trang phải dùng adapter như mục 4.2.

### API 34: Lịch sử subscription cho nhân viên

- **Endpoint đề xuất:** `GET /api/reception/subscriptions?memberId=`.
- **Quyền:** `RECEPTIONIST`, `CENTER_MANAGER`.
- **Response:** `{ success: true, data: MemberSubscription[] }` đầy đủ mục 4.4, mới nhất trước.
- Có memberId: lấy lịch sử thành viên đó. Không có: lấy tập subscription phục vụ tra cứu trạng thái và Manager thống kê gói.
- API 23 `my-subscriptions` vẫn dành riêng Member và lấy owner từ token.
- Manager hiện đếm **thành viên duy nhất** theo package từ toàn bộ subscription trả về, kể cả pending/canceled; không đếm số invoice làm số thành viên. Nếu đổi sang chỉ đếm người đang tập phải thống nhất lại cách tính và nhãn thống kê trên FE.

### API 35: Danh sách hóa đơn đầy đủ cho nhân viên

- **Endpoint đề xuất:** `GET /api/reception/invoices?memberId=&paymentMethod=&status=&query=`.
- **Quyền:** `RECEPTIONIST`, `CENTER_MANAGER`.
- `status`: bỏ trống/`ALL`, `PENDING_PAYMENT`, `PAID`, `CANCELED`.
- `paymentMethod`: bỏ trống hoặc `CASH`, `BANK_TRANSFER`, `CARD`.
- `query`: số hóa đơn, tên và email thành viên; không phân biệt hoa thường. Mới nhất trước.
- **Response:** `{ success: true, data: MembershipInvoice[] }` đầy đủ mục 4.4.
- API 27 `/payments/cash/pending` tiếp tục phục vụ pending; màn hình CashPayments còn có lịch sử đã trả/đã hủy nên cần API 35 với `paymentMethod=CASH`.
- API 23 `my-invoices` trả cùng DTO nhưng chỉ dữ liệu của owner. Mỗi endpoint nhận ID hóa đơn đều phải kiểm tra quyền truy cập tương ứng.

### Bổ sung API 16–20: Catalog và response mutation

API 16 trả danh mục công khai như cũ. API 17 trả mảng đầy đủ `{ id, name, price, durationMonths, benefits, isActive, createdAt, updatedAt }` cho Manager. Member/Receptionist dùng catalog public; adapter có thể gắn `isActive=true` cho lựa chọn gói đang mở. Không suy ra metadata riêng tư từ catalog.

API 18 tạo trả `201`, sửa trả `200`, `data` là gói đầy đủ. API 19 trả `200` và gói đã cập nhật. API 20 thành công trả `200` với `data:null`; giữ lỗi gói đã có lịch sử theo contract cũ. Kiểm tra lịch sử **cả subscription và invoice**, kể cả đã hủy. Benefit trim, bỏ dòng trống, kiểm tra 1–12 mục, mỗi mục tối đa 200, loại trùng. Tên gói so sánh không phân biệt hoa thường; không có trường tier/hạng gói trong FE hiện tại.

## 4.6. Bổ sung thuật toán quote, order và thanh toán

Nguồn: `resolveOrderKind`, `buildQuote`, `confirmCashPayment` và `membershipService.test.ts`.

### API 21–22: Xác định REGISTER/RENEW/UPGRADE/DOWNGRADE

Input FE có `memberId`, `packageId`, `paymentMethod`, `kind`. API 21 có thể nhận thêm `kind` để tương thích input hiện tại; giá trị này chỉ là gợi ý và BE luôn tính lại, không dùng để bỏ qua quy tắc. BE không nhận giá, khấu trừ hoặc ngày từ FE làm nguồn quyết định.

1. Xét các kỳ `CONFIRMED` chưa có `replacedOn`. Lấy kỳ `ACTIVE` làm tham chiếu; nếu không có thì lấy kỳ có endDate lớn nhất còn trong hiện tại/tương lai.
2. Không có kỳ tham chiếu: có lịch sử confirmed thì `RENEW`, chưa có thì `REGISTER`.
3. Cùng package hoặc giá gói mới bằng giá đã mua của kỳ tham chiếu: `RENEW`.
4. Giá mới thấp hơn: `DOWNGRADE`, dùng sau kỳ đã trả cuối cùng.
5. Giá mới cao hơn: chỉ `UPGRADE` khi có kỳ active và không có kỳ confirmed bắt đầu trong tương lai. Nếu đã trả trước kỳ tương lai thì `RENEW`, xếp sau các kỳ đó.
6. Với nâng gói: bắt đầu hôm nay. Với các loại khác: bắt đầu ngày sau endDate lớn nhất nếu còn kỳ đã trả, nếu không thì hôm nay.
7. Ngày kết thúc = cộng số tháng (chặn về ngày cuối tháng nếu cần) rồi trừ 1 ngày. Không thay tháng bằng 30 ngày cố định.

Khấu trừ nâng gói dùng số ngày lịch thực tế, tính cả hai đầu; làm tròn một lần đến VND nguyên, dùng giá snapshot `packagePrice` của kỳ cũ. Ví dụ kỳ 31/01/2024–29/04/2024 có 90 ngày; nâng ngày 29/02 còn 61 ngày, giá cũ 1.200.000 thì credit = 813.333. Gói mới 4.200.000 thì amount = 3.386.667.

Quote và tạo order đều kiểm tra account còn hoạt động, package đang mở, paymentMethod hợp lệ, chưa có bất kỳ invoice hoặc subscription pending nào của member. Tạo order tính lại theo dữ liệu hiện tại và transaction. FE hiện gọi lại quote trước khi tạo; BE vẫn phải chống race giữa các request. Idempotency cho tạo/thu tiền là đề xuất bổ sung cho BE, cần thiết kế retry phía FE tương ứng.

### API 28: Điều kiện thu tiền và ngày hiệu lực

Quy tắc “có hiệu lực ngay lập tức” ở API 28 cần hiểu chính xác: trả tiền chuyển sang `CONFIRMED`; quyền sử dụng còn phụ thuộc ngày bắt đầu, ngày kết thúc, replacedOn và isSuspended.

- Chỉ thu invoice `CASH`, invoice và subscription đều pending, member còn hoạt động và không khóa/xóa. Số tiền nhận là số nguyên bằng amount, không đổi theo giá catalog mới.
- Với order không phải upgrade: nếu ngày bắt đầu dự kiến đã qua, dời startDate sang hôm nay và tính lại endDate cho cả subscription/invoice. Nếu startDate còn ở tương lai, giữ nguyên, chưa cấp quyền tập ngay.
- Upgrade: kỳ gốc phải vẫn ACTIVE, invoice phải có creditAmount và startDate đúng hôm nay. Nếu không, từ chối thu tiền và yêu cầu hủy/lập lại. Không tự âm thầm thay amount.
- Upgrade thành công đặt replacedOn=hôm nay cho kỳ gốc. Kỳ mới không được chồng khoảng ngày với bất kỳ kỳ CONFIRMED chưa bị thay thế nào khác.
- Toàn bộ cập nhật phải rollback nếu kiểm tra chồng kỳ hoặc ghi dữ liệu thất bại; hai lần bấm thu tiền không được tạo hai giao dịch.
- Response API 28 trả đủ `MembershipOrder` mục 4.4, bao gồm paidAt/paidBy/paidByName trên invoice.

API 24 chỉ hủy khi **cả invoice và subscription** pending, cập nhật cả hai sang CANCELED trong cùng transaction, lưu canceledAt/canceledBy và audit. Không xóa lịch sử và không hủy hóa đơn đã PAID qua endpoint này.

## 4.7. Bổ sung API 25: Trạng thái và response tra cứu

Thứ tự suy ra trạng thái một subscription đúng theo FE:

1. CANCELED hoặc PENDING_PAYMENT theo trạng thái lưu.
2. replacedOn <= hôm nay: REPLACED.
3. startDate > hôm nay: SCHEDULED_DOWNGRADE nếu kind=DOWNGRADE, còn lại UPCOMING.
4. endDate < hôm nay: EXPIRED.
5. isSuspended=true: SUSPENDED; còn lại ACTIVE.

Summary bỏ các kỳ canceled/replaced khỏi nhóm đã trả; ưu tiên kỳ hiện tại, rồi kỳ tương lai gần nhất, rồi kỳ hết hạn gần nhất. Nếu không có các kỳ đó mới lấy pending; không có gì thì NONE. `remainingDays` tính cả hôm nay và ngày cuối nếu có kỳ hiện tại, các trường hợp khác bằng 0. `expiringSoon` đúng khi còn 1–6 ngày (kể cả kỳ hiện tại đang suspended theo helper FE). Filter UPCOMING bao gồm SCHEDULED_DOWNGRADE.

Mở rộng filter API 25 thêm `UPCOMING`, `PENDING_PAYMENT`, `NONE`. Giữ các field phẳng của response cũ; thêm `subscription` và `upcoming` là DTO đầy đủ mục 4.4 (hoặc null). Trạng thái gói không thay thế trạng thái account: gói ACTIVE nhưng account bị khóa vẫn không được check-in.

## 4.8. Bổ sung API 26: Tạo tài khoản kèm order tại quầy

- Form thực tế gọi `registerMemberWithGeneratedCredentials`; ngày sinh bắt buộc, hợp lệ từ 1900 đến hôm nay. Ho tên 2–80; email tối đa 254; phone cho phép 10 số bắt đầu 0 hoặc dạng +84, bỏ khoảng trắng/dấu chấm/gạch ngang trước kiểm tra.
- BE sinh username duy nhất và password ngẫu nhiên. Hàm mock cấp thấp có username/password trong input nhưng UI hiện không nhập hai trường này; không cần thêm endpoint công khai cho hàm cấp thấp.
- Kiểm tra email/username không trùng, package active, giá bằng expectedPrice; giá thay đổi thì báo lỗi yêu cầu tải lại và không tạo account dở dang.
- `data.order` phải là `{ subscription, invoice }` đầy đủ mục 4.4, không chỉ là invoiceId/number/amount như ví dụ rút gọn cũ. `data.member` chứa hồ sơ an toàn; `initialPassword` chỉ trả một lần cho nhân viên.
- Mock hiện trả `emailDelivery: "NOT_CONNECTED"`, UI đang có câu thông báo email chưa gửi. BE có thể hỗ trợ `SENT`, `FAILED`, `NOT_CONNECTED` nhưng cần sửa UI theo kết quả thật; không báo SENT nếu chưa gửi. Gửi email sau khi transaction thành công, tránh gửi thông tin của account đã rollback.
- Tạo thành viên không thay token/phiên đăng nhập nhân viên. Member mới và order pending không đồng nghĩa đã thanh toán.

## 4.9. Bổ sung chi tiết API 30: Điểm danh

Giữ nguyên ba endpoint API 30. Tất cả yêu cầu `RECEPTIONIST` hoặc `CENTER_MANAGER`.

```typescript
interface CenterVisit {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  checkedInAt: string; // Timestamp UTC
  checkedOutAt?: string;
  createdBy: string;
}
```

- `GET /api/reception/attendance/visits?date=YYYY-MM-DD&memberId=`: trả `{ success:true, data:CenterVisit[] }`; memberId là bộ lọc tùy chọn; thứ tự mới nhất trước, trả cả visit đã checkout.
- `POST /api/reception/attendance/check-in`: nhận `{ "memberId":"usr_01" }`, trả `201` và CenterVisit mới trong data. Server lấy ngày/giờ/createdBy. Account phải hoạt động, có subscription ACTIVE không suspended hôm nay. Chỉ một check-in/member/ngày, kể cả lượt trước đã checkout.
- `POST /api/reception/attendance/check-out`: nhận `{ "visitId":"visit_01" }`, trả `200` và visit có checkedOutAt. Visit phải tồn tại và chưa checkout; không yêu cầu đổi ngày của lượt cũ.
- Lỗi: `404` member/visit không tồn tại; `403` account không được phép sử dụng; `409` chưa có gói hợp lệ, đã check-in trong ngày hoặc đã checkout. Check-in trùng phải được bảo vệ bằng transaction/unique constraint, không chỉ kiểm tra trước insert.

Ví dụ response check-in:

```json
{
  "success": true,
  "data": {
    "id": "visit_01", "memberId": "usr_01", "date": "2026-09-30",
    "checkedInAt": "2026-09-30T03:00:00.000Z", "createdBy": "usr_receptionist"
  }
}
```

## 4.10. Bổ sung chi tiết API 31 và API 36: Lớp học

Giữ route `/classes/book` và `/classes/bookings/{id}/cancel` ở bản cũ. Tất cả yêu cầu `RECEPTIONIST` hoặc `CENTER_MANAGER`.

```typescript
interface ClassSession {
  id: string;
  name: string;
  discipline: string;
  coach: string; // Tên hiển thị
  room: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm, giờ tại trung tâm
  endTime: string;
  capacity: number;
}
interface ClassBooking {
  id: string;
  memberId: string;
  sessionId: string;
  status: "BOOKED" | "CANCELED";
  createdAt: string;
  createdBy: string;
  canceledAt?: string;
  canceledBy?: string;
  cancelReason?: string;
}
```

- API 31 GET sessions trả `{ success:true, data:ClassSession[] }`, lọc ngày; dữ liệu phải đủ name/discipline/coach/room/capacity, không chỉ ID. Nếu giới hạn theo ngày, vẫn cần thông tin session tương ứng để hiển thị lịch sử booking ngoài ngày đang chọn.
- **API 36 đề xuất:** `GET /api/reception/classes/bookings?memberId=&date=` trả `{ success:true, data:ClassBooking[] }`, mới nhất trước, gồm cả BOOKED và CANCELED. Bỏ filter lấy lịch sử cần thiết. Đây là danh sách còn thiếu ở API 31 cũ.
- UI tính số chỗ đã đặt từ **tất cả** booking BOOKED của session. Không dùng riêng booking của member đang chọn để tính sức chứa. Nếu server phân trang/lọc member, bổ sung bookedCount tổng theo session và sửa adapter/UI sử dụng trường đó.
- POST book nhận `{ "memberId":"usr_01", "sessionId":"session_01" }`; trả `201` và ClassBooking. Account hoạt động; gói phải ACTIVE không suspended **vào ngày buổi học**, session chưa bắt đầu, còn chỗ, chưa có booking BOOKED cùng session.
- Kiểm tra trùng lịch cùng ngày: `other.startTime < session.endTime && other.endTime > session.startTime`; hai buổi nối tiếp đúng giờ không bị coi là trùng. Kiểm tra capacity/duplicate/overlap phải an toàn trước request đồng thời.
- POST cancel nhận `{ "reason":"Thành viên đổi lịch" }`; reason trim 3–500 ký tự. Chỉ hủy BOOKED trước giờ bắt đầu; trả `200` và booking cập nhật CANCELED, canceledAt/canceledBy/cancelReason. Giữ lịch sử, trả lại chỗ; cho phép đăng ký mới sau hủy nếu còn hợp lệ.
- Lỗi `404` session/booking/member không tồn tại; `409` buổi đã bắt đầu, hết chỗ, trùng lịch, đã đặt/đã hủy hoặc gói không đủ điều kiện; `400` reason không hợp lệ.

## 4.11. Bổ sung chi tiết API 32: Hỗ trợ

Giữ tên route `/support/tickets` của bản cũ; adapter map sang `SupportRequest` trong FE. Quyền `RECEPTIONIST`, `CENTER_MANAGER`.

```typescript
interface SupportRequest {
  id: string;
  memberId: string;
  category: "Gói tập" | "Lớp học" | "Thanh toán" | "Cơ sở vật chất" | "Khác";
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  createdBy: string;
  updates: { status: "OPEN" | "IN_PROGRESS" | "RESOLVED"; note: string; at: string; by: string }[];
}
```

GET `/api/reception/support/tickets?memberId=&status=ALL&query=` trả mảng SupportRequest đầy đủ trong data, mới nhất trước. Bộ lọc tìm member theo tên/email/phone như UI; status ALL hoặc một giá trị enum. Nếu BE dùng mã category nội bộ cần adapter chuyển đúng nhãn tiếng Việt có dấu ở trên.

POST nhận:

```json
{
  "memberId": "usr_01", "category": "Gói tập",
  "subject": "Kiểm tra thời hạn", "description": "Nhờ kiểm tra ngày hết hạn gói tập."
}
```

Member phải tồn tại; không yêu cầu gói còn hạn để gửi hỗ trợ. Subject trim 3–120, description trim 10–2000, category đúng enum. Trả `201`, status OPEN và updates rỗng.

PATCH `/api/reception/support/tickets/{id}/status` nhận:

```json
{ "status": "RESOLVED", "note": "Đã thông báo thời hạn cho thành viên." }
```

Note trim 3–2000; trạng thái đúng enum; append `{status,note,at,by}` vào updates theo thứ tự thời gian và cập nhật status hiện tại, trả `200` với SupportRequest đầy đủ. FE cho phép mở lại OPEN hoặc ghi chú với cùng trạng thái, không áp đặt luồng một chiều. `404` ticket/member không tồn tại; `400` dữ liệu không hợp lệ. Không xóa lịch sử xử lý.

## 4.12. Bổ sung API 29 và lỗi nghiệp vụ

Audit query hiện tìm actorName, action, entity, entityId, description; from/to so sánh ngày UTC từ createdAt trong mock. Khi BE đổi sang ngày tại trung tâm cần đồng bộ bộ lọc FE. UI chưa có pagination audit nên adapter phải xử lý đầy đủ kết quả hoặc cập nhật UI như mục 4.2. Không áp dụng giới hạn lưu 1.000 dòng của mock làm chính sách lưu trữ BE.

Đề xuất mã lỗi để FE xử lý nhất quán (đây là bổ sung contract, mock hiện chỉ throw Error với message):

| HTTP | code | Tình huống và xử lý |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Trả fieldErrors cho form |
| 401 | INVALID_CREDENTIALS / SESSION_EXPIRED | Sai đăng nhập hoặc phiên hết hạn |
| 403 | FORBIDDEN / ACCOUNT_INACTIVE | Sai role/ownership hoặc account ngừng hoạt động |
| 423 | ACCOUNT_LOCKED | Có isLocked và failedAttemptsRemaining khi login |
| 404 | NOT_FOUND | Đối tượng không tồn tại |
| 409 | PENDING_ORDER_EXISTS | Xử lý order cũ trước khi tạo mới |
| 409 | PACKAGE_PRICE_CHANGED | Tải lại gói khi expectedPrice không khớp |
| 409 | STALE_UPGRADE_QUOTE | Hủy và tạo lại báo giá nâng gói |
| 409 | INVALID_ORDER_STATE / PERIOD_OVERLAP | Tải lại invoice, không thu tiền lần nữa |
| 409 | DUPLICATE_CHECK_IN / CLASS_FULL / BOOKING_CONFLICT | Tải lại dữ liệu nghiệp vụ quầy |

Không yêu cầu đồng nhất tất cả lỗi cũ sang 409 ngay: các status đã ghi tại API 1–32 cần được BE/adapter chốt nhất quán. Không hiển thị lỗi SQL/stack trace trực tiếp cho người dùng.

## 4.13. Cập nhật kết quả đối chiếu BE cho bảng mục 3

Đối chiếu ngày 30/09/2026 tại commit `7cb1462` trên `master` (remote không có nhánh main). Bảng mục 3 là thông tin cũ; các cập nhật sau là trạng thái đã kiểm tra:

- `AuthService` đã reset FailedLoginCount khi login đúng; AccountController đã có Authorize cho các endpoint tạo account quản trị và endpoint Register_member công khai.
- `MembershipPackageController` đã có CRUD, status, active catalog và kiểm tra xóa gói có subscription. Cần map route/DTO và kiểm tra đầy đủ quy tắc FE.
- Đã có `MemberSubscriptionController` (register-or-renew, counter-register-or-renew) và `MembershipInvoiceController` (pay, receipt). Không kết luận thiếu nghiệp vụ chỉ vì không có controller tên MembershipOrder/Payment.
- `CounterRegistrationController` và `AuditLogController` không có trên master đã kiểm tra; thông tin “đã có stub/controller” ở bảng cũ không áp dụng cho commit này.
- Auth vẫn tách bốn endpoint và trả token string; role dùng CenterManager/Member/Coach/Receptionist, response phần lớn DTO trực tiếp hoặc text. Chưa tương thích trực tiếp envelope/role/User của FE.
- Chưa cấu hình CORS; chưa có auth/me đầy đủ, quote riêng, invoice list, cancel order, các API quầy bổ sung, OTP/profile toàn bộ role và personnel CRUD đủ contract.
- Build BE thành công. Lần kiểm tra trước: 12/16 test pass, bốn integration test auth trả 500; không còn kết luận thiếu reference JwtBlacklistService. Đây là kết quả lần chạy, chưa khẳng định nguyên nhân 500.

## 4.14. Các ca nghiệm thu cần đối chiếu khi triển khai

1. Khôi phục phiên với me; Member không đọc invoice/subscription của người khác; account bị khóa/ngừng hoạt động mất quyền thao tác.
2. Tạo Member/nhân sự trả mật khẩu một lần; xóa mềm giữ lịch sử; tạo tại quầy không đổi phiên staff và rollback đủ khi tạo order lỗi.
3. Không có hai pending order/member khi gửi đồng thời; paid/canceled không thể thu lần nữa.
4. Nâng gói ngày cuối vẫn được khấu trừ một ngày; dùng lịch năm nhuận và giá snapshot; quote sang ngày khác phải lập lại.
5. Hạ gói và gia hạn giữ các kỳ đã trả trước; CONFIRMED tương lai chưa cấp quyền tập; thanh toán muộn không mất ngày sử dụng; từ chối mọi khoảng kỳ chồng nhau.
6. Check-in chỉ một lần/ngày; booking kiểm tra gói vào ngày học, capacity, trùng giờ, hạn hủy và lịch sử CANCELED.
7. Ticket giữ toàn bộ updates và đúng nhãn category; danh sách đủ dữ liệu cho các bộ đếm/lọc/in hóa đơn đang có trên FE.
