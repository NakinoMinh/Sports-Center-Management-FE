# Hệ thống Quản lý Trung tâm Thể thao (Sports Center Management System)

**Công nghệ:** Sử dụng React JS (Vite + TypeScript) cho hiệu năng tốt và hỗ trợ type chặt chẽ.

## Tài liệu định hướng phát triển

- [PRODUCT.md](PRODUCT.md): yêu cầu toàn dự án, bốn actor, sáu flow, ma trận đối chiếu code FE/BE và phần còn thiếu.
- [DESIGN.md](DESIGN.md): kiến trúc hiện tại, thiết kế mục tiêu, khác biệt schema/API và lộ trình triển khai.

Đọc mục 0 của hai tài liệu trước khi phát triển. Đối chiếu ngày 27/09/2026 phân biệt rõ FE mock, code backend và chức năng chưa triển khai; không coi giao diện demo là flow đã tích hợp hoàn chỉnh. Flow 1–3 (user/membership, class/schedule, payment/report) bắt buộc; Flow 4–6 (training/attendance, AI recommendation, AI assistant) tùy chọn. Tài liệu Sprint 1 và bàn giao API bên dưới có phạm vi hẹp hơn toàn dự án.

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

### 1. Cài đặt công cụ cần thiết

Cần cài [Node.js](https://nodejs.org/) phiên bản **20 LTS trở lên**. Node.js đã bao gồm npm, là công cụ dùng để cài thư viện và chạy các lệnh của dự án.

Mở Terminal, PowerShell hoặc Command Prompt và kiểm tra:

```bash
node --version
npm --version
```

Nếu cả hai lệnh đều trả về số phiên bản, môi trường đã sẵn sàng. Dự án hiện đã được kiểm tra với Node.js `24.16.0` và npm `11.13.0`.

### 2. Clone hoặc mở source code

Nếu chưa có source code trên máy:

```bash
git clone https://github.com/NakinoMinh/Sports-Center-Management-System-FE.git
cd Sports-Center-Management-System-FE
git switch Minh
```

Nếu đã tải source code, chỉ cần mở terminal tại thư mục `Sports-Center-Management-System-FE`.

### 3. Cài đặt thư viện

```bash
npm install
```

Lệnh này đọc `package.json` và cài React, Vite, TypeScript, React Router, Lucide icons, bcryptjs cùng các thư viện phát triển vào thư mục `node_modules`.

### 4. Chạy môi trường phát triển

```bash
npm run dev
```

Terminal sẽ hiển thị một địa chỉ tương tự `http://localhost:5173/`. Mở địa chỉ đó trên trình duyệt để sử dụng giao diện. Khi sửa code, Vite tự cập nhật trang.

Giao diện đăng nhập dành cho web desktop/laptop (từ 1024px), giữ bố cục hai cột và cuộn toàn trang khi cần. Bấm **Khám phá bằng tài khoản mẫu** để mở danh sách tài khoản dùng thử.

### 5. Tài khoản demo

Mật khẩu mặc định của các tài khoản dưới đây là `Pass@1234`:

| Vai trò | Email |
| --- | --- |
| Center Manager | `manager@sportscenter.com` |
| Coach | `coach@sportscenter.com` |
| Member | `member@sportscenter.com` |
| Receptionist | `receptionist@sportscenter.com` |

Bạn cũng có thể tạo tài khoản Member mới tại màn hình đăng ký. Dữ liệu của bản demo hiện lưu ở LocalStorage của trình duyệt, nên mỗi trình duyệt hoặc profile có dữ liệu riêng.

### Luồng gói tập và xác nhận tiền mặt

- **Receptionist → Đăng ký & gia hạn tại quầy:** chọn Member hiện có hoặc bấm **Đăng ký thành viên mới tại quầy**. Tạo Member tại quầy bắt buộc chọn gói; chỉ tạo yêu cầu chờ thanh toán, không tự kích hoạt.
- **Receptionist / Center Manager → Xác nhận tiền mặt** (`/payments/cash`): tìm hóa đơn, kiểm tra thông tin, nhập đúng số tiền và tích xác nhận đã thu. Hóa đơn chuyển từ `PENDING_PAYMENT` sang `PAID`; gói hoạt động ngay hoặc chờ đúng ngày bắt đầu.
- **Member → Gói tập của tôi:** cùng gói/cùng giá tự chuyển sang gia hạn. Gói giá cao hơn được khấu trừ giá trị ngày chưa sử dụng; kỳ mới bắt đầu đủ 1/3/12 tháng từ ngày thanh toán. Gói giá thấp hơn bắt đầu sau toàn bộ kỳ đã trả tiền. Nếu đã có kỳ tương lai trả trước, gói giá cao hơn cũng nối tiếp và thu đủ giá.
- Gói chỉ có tên, giá, quyền lợi và kỳ hạn tháng/quý/năm; không phân hạng. Khấu trừ = giá gói cũ lúc mua × số ngày còn lại / tổng ngày kỳ cũ, làm tròn đến đồng. Ví dụ gói 450.000đ còn 15/30 ngày: chuyển sang gói năm 4.200.000đ cần trả 3.975.000đ. Báo giá nâng gói chỉ có hiệu lực trong ngày; yêu cầu cũ phải hủy và lập lại trước khi thu tiền. Dữ liệu lịch sử được giữ nguyên.
- Chuyển khoản/thẻ chưa có đối soát. Mọi thanh toán và phân quyền hiện chỉ mô phỏng FE, không thay thế kiểm tra tại BE. Hướng dẫn chi tiết và trường hợp biên: [Sprint 1](docs/Sprint1.md).

### 6. Kiểm tra code trước khi commit

```bash
npm run lint
npm test
npm run build
```

- `npm run lint`: kiểm tra lỗi style và chất lượng code.
- `npm test`: chạy kiểm thử cho xác thực, gói tập, gia hạn và hóa đơn.
- `npm run build`: kiểm tra TypeScript và tạo bản production trong thư mục `dist/`.

### Lỗi thường gặp

| Vấn đề | Cách xử lý |
| --- | --- |
| `node` hoặc `npm` không được nhận diện | Cài Node.js LTS, đóng/mở lại terminal rồi chạy lại `node --version`. |
| Thiếu package hoặc lỗi `Cannot find module` | Xóa `node_modules` và chạy lại `npm install`. |
| Cổng `5173` đang được sử dụng | Vite sẽ đề xuất cổng khác; mở đúng URL mà terminal hiển thị. |
| Dữ liệu demo không như mong muốn | Mở DevTools → Application → Local Storage, xóa `scms_users_database`, `scms_memberships_v1`, `scms_auth_token` và `scms_demo_session_v1`, sau đó tải lại trang. |
