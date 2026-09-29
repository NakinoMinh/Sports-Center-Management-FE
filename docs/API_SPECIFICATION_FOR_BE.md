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
