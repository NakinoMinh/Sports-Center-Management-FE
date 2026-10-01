# SPRINT 1

Project: Sports Center Management System (SCMS) | Sprint: 1 | Duration: 22/09/2026 - 05/10/2026 | Flow 1: User & Membership Management

## Sprint 1 - Swimlane

| UC | Fun/Screen | Level | BE | FE | Sprint | From - To | Business Rule |
| ---: | --- | --- | --- | --- | ---: | --- | --- |
| 1 | Register | Simple | Huy | Minh | 1 | 22/9 -> 5/10 | - Chỉ đăng ký = username & PW.<br>- PW phải mã hóa (bcrypt).<br>- Email không được trùng.<br>- Validate email format. |
| 2 | Login | Simple | Huy | Minh | 1 | 22/9 -> 5/10 | - Đăng nhập bằng email + PW.<br>- Sử dụng JWT token.<br>- Khóa tài khoản sau 5 lần đăng nhập sai.<br>- Token hết hạn sau 24h. |
| 3 | Logout | Simple | Phuc | Minh | 1 | 22/9 -> 5/10 | - Huy JWT token khi logout.<br>- Redirect ve trang login.<br>- Xoa token khoi local storage. |
| 4 | View/Update Profile | Simple | Phuc | Tam | 1 | 22/9 -> 5/10 | - Cap nhat: ho ten, SDT, ngay sinh, anh dai dien.<br>- Khong duoc thay doi email.<br>- Validate SDT (10 so). |
| 5 | Role-based Access Control | Complex | Huy | Long | 1 | 22/9 -> 5/10 | - 4 roles: Manager, Coach, Member, Receptionist.<br>- Phan quyen theo role khi truy cap API.<br>- Middleware kiem tra quyen moi request.<br>- Manager co quyen cao nhat. |
| 6 | Manage Member List (Manager) | Medium | Huy | Long | 1 | 22/9 -> 5/10 | - CRUD danh sach thanh vien.<br>- Tim kiem theo ten, email, SDT.<br>- Loc theo trang thai (active/inactive).<br>- Phan trang 20 items/page. |
| 7 | Manage Coach List (Manager) | Medium | Phuc | Tam | 1 | 22/9 -> 5/10 | - CRUD danh sach HLV.<br>- Thong tin: ten, chuyen mon, lich lam viec, SDT.<br>- Mot HLV co the day nhieu bo mon. |
| 8 | Manage Staff List (Manager) | Medium | Phuc | Tam | 1 | 22/9 -> 5/10 | - CRUD nhan vien (Receptionist).<br>- Thong tin: ten, vai tro, ca lam viec, SDT.<br>- Khong cho phep xoa Manager cuoi cung. |
| 9 | Manage Membership Packages (Manager) | Medium | Huy | Minh | 1 | 22/9 -> 5/10 | - CRUD goi thanh vien (thang/quy/nam).<br>- Thong tin: ten goi, gia, thoi han, mo ta quyen loi.<br>- Goi da co nguoi dang ky khong duoc xoa, chi an. |
| 10 | View Membership Packages (Member) | Simple | Phuc | Long | 1 | 22/9 -> 5/10 | - Hien thi danh sach goi tap (public).<br>- So sanh cac goi.<br>- Chi hien thi goi dang active. |
| 11 | Register/Renew Membership (Member) | Medium | Huy | Minh | 1 | 22/9 -> 5/10 | - Dang ky/gia han goi tap.<br>- Tinh ngay bat dau & het han tu dong.<br>- Gia han cong don thoi gian neu con han.<br>- Tao hoa don pending. |
| 12 | Search Member (Receptionist) | Simple | Huy | Tam | 1 | 22/9 -> 5/10 | - Tim kiem theo ten, email, SDT, ma thanh vien.<br>- Hien thi thong tin nhanh: ten, goi tap, trang thai, ngay het han. |
| 13 | Register New Member at Counter (Receptionist) | Medium | Phuc | Long | 1 | 22/9 -> 5/10 | - Tao tai khoan moi cho member tai quay.<br>- Nhap: ho ten, email, SDT, ngay sinh.<br>- He thong tu tao PW mac dinh va gui email.<br>- Dong thoi dang ky goi thanh vien. |
| 14 | Check Membership Status (Receptionist) | Simple | Phuc | Long | 1 | 22/9 -> 5/10 | - Xem trang thai goi tap: active/expired/suspended.<br>- Hien thi so ngay con lai.<br>- Canh bao goi sap het han (< 7 ngay). |
| 15 | Manage Member Registration/Renewal (Receptionist) | Medium | Huy | Minh | 1 | 22/9 -> 5/10 | - Dang ky/gia han goi tap ho thanh vien.<br>- Chon goi va phuong thuc thanh toan.<br>- In bien lai/hoa don. |
| 16 | View System Audit Log (Manager) | Medium | Phuc | Tam | 1 | 22/9 -> 5/10 | - Xem lich su thao tac quan trong.<br>- Log: ai, lam gi, luc nao, tren doi tuong nao.<br>- Loc theo thoi gian, user, loai thao tac.<br>- Khong cho phep xoa log. |

## TEAM DISTRIBUTION - SPRINT 1

### BE Team

| Name | Issues Count | Issue Keys | Level Mix |
| --- | ---: | --- | --- |
| Huy | 8 | SCMS-1, 2, 5, 6, 9, 11, 12, 15 | 3 Simple + 4 Medium + 1 Complex |
| Phuc | 8 | SCMS-3, 4, 7, 8, 10, 13, 14, 16 | 4 Simple + 4 Medium |

### FE Team

| Name | Issues Count | Issue Keys | Level Mix |
| --- | ---: | --- | --- |
| Minh | 6 | SCMS-1, 2, 5, 9, 11, 15 | 2 Simple + 3 Medium + 1 Complex |
| Long | 5 | SCMS-3, 6, 10, 13, 14 | 3 Simple + 2 Medium |
| Tam | 5 | SCMS-4, 7, 8, 12, 16 | 2 Simple + 3 Medium |
