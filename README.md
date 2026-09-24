# Hệ thống Quản lý Trung tâm Thể thao (Sports Center Management System)

**Công nghệ:** Sử dụng React JS (Vite + TypeScript) cho hiệu năng tốt và hỗ trợ type chặt chẽ.

## Kiến trúc FE (Không dùng MVVM)

Dự án tổ chức theo hướng **Component-based** và **React Hooks**, không dùng mô hình MVVM (Model-View-ViewModel). Giao diện nằm trong component/page, trạng thái dùng chung đặt trong Context, còn nghiệp vụ và dữ liệu được tách vào Service. Cách tổ chức này giúp UI dễ tái sử dụng và sau này có thể thay LocalStorage bằng API backend mà ít ảnh hưởng đến màn hình.

- `src/assets/`: Ảnh, SVG, logo và các tài nguyên được import vào giao diện.
- `src/components/`: Các UI tái sử dụng như Input, Alert, Dialog, sidebar/header, form gói tập và mẫu hóa đơn.
- `src/context/`: State dùng chung cho toàn ứng dụng. Hiện có `AuthContext` quản lý phiên đăng nhập, user hiện tại và logout.
- `src/hooks/`: Custom hooks. `useAuth` giúp component lấy dữ liệu từ `AuthContext`.
- `src/pages/`: Các trang hoàn chỉnh: Login, Register, quản lý gói tập của Manager, đăng ký/gia hạn của Member và hỗ trợ tại quầy cho Receptionist.
- `src/services/`: Xử lý nghiệp vụ và dữ liệu. Hiện dùng mock data/LocalStorage cho xác thực, gói tập, gia hạn và hóa đơn; khi backend sẵn sàng sẽ thay phần này bằng API calls.
- `src/styles/`: CSS cho vùng làm việc sau khi đăng nhập: sidebar, bảng, card, responsive mobile và in hóa đơn.
- `src/types/`: Các kiểu TypeScript như `User`, `UserRole`, `MembershipPackage`, `MemberSubscription` và `MembershipInvoice`.
- `src/utils/`: Hàm dùng chung để format tiền VND, ngày tháng và điều hướng theo vai trò.
- `src/App.tsx`: Khai báo route, bảo vệ các trang đã đăng nhập và điều hướng theo role.
- `src/App.css`: CSS cho Login/Register.
- `src/index.css`: CSS toàn cục, font, màu và reset cơ bản.
- `src/main.tsx`: Điểm khởi chạy, render `<App />` vào phần tử `#root`.

Luồng chính của FE:

```text
main.tsx → App.tsx → AuthProvider/AuthContext
         → Login/Register hoặc WorkspaceLayout
         → Page theo role → Service → LocalStorage (hiện tại) / API BE (sau này)
```

## 👥 Các Actor (Vai trò)
- **Center Manager** – Quản lý trung tâm
- **Coach** – Huấn luyện viên
- **Member** – Học viên / Thành viên
- **Receptionist** – Nhân viên lễ tân

## 🔄 Các luồng chính (Main Flows)
- **Flow 1**: User and membership management
- **Flow 2**: Class booking and schedule management
- **Flow 3**: Payment and report management

## 🚀 Hướng dẫn chạy dự án
```bash
npm install
npm run dev
```
