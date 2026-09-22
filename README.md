# Hệ thống Quản lý Trung tâm Thể thao (Sports Center Management System)

**Công nghệ:** Sử dụng React JS (Vite + TypeScript) cho hiệu năng tốt và hỗ trợ type chặt chẽ.

**Kiến trúc (Không dùng MVVM):** Mình đã thiết lập cấu trúc thư mục tiêu chuẩn của React theo Component-based và Hooks thay vì MVVM (Model-View-ViewModel):
- `src/components/`: Chứa các thành phần UI dùng lại (Button, Input, Form...).
- `src/pages/`: Chứa các giao diện trang (Dashboard, Schedule, Member, Payment...).
- `src/services/`: Chứa các hàm giao tiếp API (thay cho Model/ViewModel gửi request).
- `src/hooks/`: Chứa logic nghiệp vụ được tách ra (thay thế phần xử lý logic của ViewModel).
- `src/context/`: Quản lý state toàn cục.
- `src/utils/`: Chứa các hàm hỗ trợ format.

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
