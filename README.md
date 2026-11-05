# Sports Center Management FE

Frontend cho hệ thống quản lý trung tâm thể thao, xây dựng bằng React 19, TypeScript và Vite. Ứng dụng cung cấp các luồng xác thực, hồ sơ, thành viên, nhân sự, gói tập, thanh toán tại quầy, quản lý lớp/lịch học, huấn luyện – điểm danh – vận hành quầy và nhật ký hoạt động theo từng vai trò.

Repository: [NakinoMinh/Sports-Center-Management-FE](https://github.com/NakinoMinh/Sports-Center-Management-FE)

## Tài liệu định hướng phát triển

- [PRODUCT.md](PRODUCT.md): yêu cầu toàn dự án, bốn actor, sáu flow, ma trận đối chiếu code FE/BE và phần còn thiếu.
- [DESIGN.md](DESIGN.md): kiến trúc hiện tại, thiết kế mục tiêu, khác biệt schema/API và lộ trình triển khai.
- [Sprint3.md](Sprint3.md): kế hoạch đề xuất Flow 3 — thanh toán, hóa đơn và báo cáo.

## Kiến trúc FE (Không dùng MVVM)

Dự án tổ chức theo hướng **Component-based** và **React Hooks**, không dùng mô hình MVVM (Model-View-ViewModel). Giao diện nằm trong component/page, trạng thái dùng chung đặt trong Context, còn nghiệp vụ và dữ liệu được tách vào Service.

- `src/assets/`: Ảnh, SVG, logo và các tài nguyên được import vào giao diện.
- `src/components/`: Các UI tái sử dụng như Input, Alert, Dialog, sidebar/header, form gói tập và mẫu hóa đơn.
- `src/context/`: State dùng chung cho toàn ứng dụng (`AuthContext`, `ToastContext`).
- `src/hooks/`: Custom hooks (`useAuth`).
- `src/pages/`: Các trang hoàn chỉnh theo từng vai trò (Center Manager, Receptionist, Coach, Member).
- `src/services/`: API client, xác thực, thành viên, nhân sự, gói tập, lớp học, lịch tập, huấn luyện – vận hành (`trainingOperationsApi.ts`), báo cáo và audit log.
- `src/styles/`: CSS cho vùng làm việc sau khi đăng nhập: sidebar, bảng, card, không gian huấn luyện, responsive mobile và in hóa đơn.
- `src/types/`: Các kiểu TypeScript cho `User`, `UserRole`, `MembershipPackage`, `MemberSubscription`, `MembershipInvoice`, lớp học và vận hành.
- `src/utils/`: Hàm dùng chung để format tiền VND, ngày tháng, lịch học và điều hướng theo vai trò.
- `src/App.tsx`: Khai báo route, bảo vệ các trang đã đăng nhập (kết hợp phân quyền động) và điều hướng theo role.

Luồng chính của FE:

```text
main.tsx → App.tsx → AuthProvider → ToastProvider
         → Login/Register hoặc WorkspaceLayout
         → Page theo role → Service → API backend
```

## 👥 Các Actor (Vai trò)
- **Center Manager** – Quản lý trung tâm
- **Coach** – Huấn luyện viên
- **Member** – Học viên / Thành viên
- **Receptionist** – Nhân viên lễ tân

## 🔄 Các luồng chính (Main Flows)
- **Flow 1**: User and membership management (Quản lý tài khoản, nhân sự, hội viên & gói tập)
- **Flow 2**: Class booking and schedule management (Quản lý bộ môn, phòng tập, lớp học, lịch dạy & đặt lịch)
- **Flow 3**: Payment and report management (Hóa đơn, xác nhận thu tiền mặt tại quầy & báo cáo thống kê)
- **Flow 4**: Training progress, attendance and center operations (Điểm danh, lộ trình huấn luyện, vận hành quầy lễ tân & phân quyền động)

---

## ✨ Các tính năng bổ sung & Cải thiện nghiệp vụ chi tiết

### 1. Phân hệ Huấn luyện, Điểm danh & Theo dõi Tiến độ Tập luyện
- **Không gian Huấn luyện dành cho HLV (`/coach/training`, `/coach/classes`, `/coach/schedule`):**
  - **Điểm danh buổi học theo thời gian thực:** Ghi nhận trạng thái chuyên cần (`PRESENT` - Có mặt, `LATE` - Đi trễ, `EXCUSED` - Có phép, `ABSENT` - Vắng mặt) kèm ghi chú cho từng học viên; đồng bộ trạng thái hoàn thành buổi học (`COMPLETED`) và tự động tính tỷ lệ chuyên cần tích lũy.
  - **Hồ sơ thể chất & Mục tiêu học viên:** Cập nhật mục tiêu tập luyện (`FitnessGoal`), trình độ (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`), cân nặng hiện tại / cân nặng mục tiêu và lưu ý thể trạng cho từng học viên.
  - **Thiết kế Giáo án / Lộ trình Tập luyện (`TrainingPlan`):** Hỗ trợ lập giáo án **Cá nhân (`INDIVIDUAL`)** hoặc **Cả lớp (`CLASS`)** với danh sách bài tập chi tiết (số hiệp `sets`, số lần lặp `reps`, thời lượng `durationMinutes`, lưu ý kỹ thuật) và bài tập về nhà (`Homework`).
  - **Đánh giá Kết quả Buổi tập (`TrainingResult`) & Giao bài tập về nhà:** Ghi nhận khối lượng bài tập đã hoàn thành, tỷ lệ hoàn thành (`0–100%`), mức độ tiến bộ (`EXCEEDED` - Vượt mục tiêu, `ON_TRACK` - Đúng lộ trình, `NEEDS_ATTENTION` - Cần cải thiện), nhận xét chuyên môn của HLV và gửi thông báo bài tập về nhà trực tiếp tới hộp thư học viên.
- **Trang Lộ trình & Tiến độ dành cho Hội viên (`/my-training`, `/my-schedule`):**
  - Theo dõi mục tiêu thể chất cá nhân, chênh lệch cân nặng hiện tại so với mục tiêu và tổng quan tỷ lệ chuyên cần (`Có mặt`, `Đi trễ`, `Có phép`, `Vắng mặt`).
  - Xem chi tiết các giáo án cá nhân và giáo án chung của lớp đang theo học, lịch sử đánh giá sau từng buổi tập từ HLV và danh sách bài tập về nhà ngay trên trang lộ trình và lịch học cá nhân.

### 2. Vận hành Quầy Lễ tân, Check-in/Check-out & Bảo lưu Gói tập (`/reception/operations`, `/memberships/status`)
- **Check-in / Check-out tại quầy (`CenterVisit`):**
  - Kiểm tra tự động hiệu lực gói tập trước khi cho phép hội viên check-in vào trung tâm; ghi nhận thời điểm vào/ra, nhân viên thực hiện và lịch sử lượt đến trong ngày.
- **Tạm ngưng (Bảo lưu) & Kích hoạt lại Gói tập (`SUSPEND` / `RESUME`):**
  - Cho phép tạm ngưng gói tập đang hoạt động kèm lý do bảo lưu.
  - Khi kích hoạt lại (`RESUME`), hệ thống **tự động tính số ngày gói bị tạm ngưng và cộng bù tương ứng vào ngày hết hạn (`EndDate`)**, đảm bảo hội viên không bị mất ngày sử dụng, đồng thời khôi phục trạng thái hoạt động của tài khoản hội viên.
- **Tiếp nhận & Xử lý Yêu cầu Hỗ trợ (`SupportRequest`):**
  - Tạo mới, phân loại danh mục (`Gói tập`, `Lớp học`, `Thiết bị & Cơ sở vật chất`, `Khiếu nại / Góp ý`) và cập nhật tiến độ xử lý (`OPEN`, `IN_PROGRESS`, `RESOLVED`) kèm ghi chú phản hồi.

### 3. Phân quyền Động theo Vai trò (`/manager/access-control`)
- Ma trận cấu hình quyền truy cập chức năng theo vai trò (`Center Manager`, `Receptionist`, `Coach`, `Member`) lưu trữ đồng bộ trên Backend (`RolePermissionConfig`).
- Tự động đồng bộ menu điều hướng (`WorkspaceLayout.tsx`), bộ bảo vệ đường dẫn (`App.tsx`) và kiểm tra quyền truy cập tại các API vận hành.

### 4. Các cải tiến & Siết chặt Logic Nghiệp vụ Thực tế (Business Logic Hardening)
- **Kiểm soát chặt thời gian Điểm danh & Đánh giá kết quả:**
  - Chặn điểm danh cho các buổi học trong tương lai hoặc chưa tới giờ bắt đầu (`ATTENDANCE_TOO_EARLY`).
  - Ràng buộc ngày ghi nhận kết quả tập luyện (`RecordedDate`) không được vượt quá ngày hiện tại và phải nằm trong khoảng hiệu lực (`StartDate` – `EndDate`) của giáo án đã chọn; kiểm tra học viên phải có đăng ký `BOOKED` trong buổi học tương ứng.
- **Ràng buộc Gói tập khi Check-in và Bảo lưu:**
  - Chặn check-in khi gói tập đang trong trạng thái bảo lưu (`MEMBERSHIP_SUSPENDED`), chưa tới ngày bắt đầu hoặc đã hết hạn.
  - Khi tạm ngưng gói tập (`SUSPEND`), tự động hủy các lượt đặt lịch lớp học sắp tới của hội viên và hoàn lại chỗ trống (`BookedCount`) cho lớp.
- **Chuẩn hóa Nghiệp vụ Nâng cấp (`UPGRADE`) & Hạ cấp (`DOWNGRADE`) Gói tập:**
  - **Nâng cấp (`UPGRADE`):** Tính toán tự động phần tiền dư chưa sử dụng của gói hiện tại theo số ngày còn lại (`Prorated Credit`), khấu trừ trực tiếp vào số tiền thanh toán trên hóa đơn, kích hoạt gói mới ngay trong ngày và đóng gói cũ ở ngày liền trước. Hiển thị bảng khấu trừ chi tiết trên phiếu báo giá (`MembershipPage.tsx`) và biên lai (`InvoiceDocument.tsx`).
  - **Hạ cấp (`DOWNGRADE`):** Giữ nguyên quyền lợi gói hiện tại cho đến hết hạn và tự động nối tiếp gói mới từ ngày kế tiếp (`EndDate + 1`).
- **Bảo vệ toàn vẹn dữ liệu Tài khoản, Lớp học & Lịch tập:**
  - Chặn vô hiệu hóa tài khoản HLV khi vẫn còn lịch dạy `SCHEDULED` trong tương lai (`COACH_HAS_UPCOMING_SESSIONS`).
  - Khi khóa hoặc xóa mềm Hội viên, tự động giải phóng chỗ các buổi học sắp tới và hủy toàn bộ hóa đơn/đơn đăng ký gói tập `PENDING_PAYMENT` đang chờ thu tiền.
  - Chặn đổi bộ môn của lớp học khi lớp đã có buổi học được lên lịch (`CLASS_SPORT_LOCKED`) và chặn lưu trữ lớp (`ARCHIVED`) khi vẫn còn buổi tập sắp tới (`CLASS_HAS_UPCOMING_SESSIONS`).
  - Áp dụng quy tắc hội viên chỉ được tự hủy đặt lịch trước giờ học tối thiểu **7 tiếng** (`CANCELLATION_DEADLINE_PASSED`).
- **Đồng bộ Nhật ký Hoạt động (`AuditLogPage.tsx`), Thông báo (`NotificationsPage.tsx`) & Việt hóa Lỗi (`apiErrors.ts`):**
  - Bổ sung nhóm lọc và nhãn tiếng Việt cho toàn bộ thao tác huấn luyện, điểm danh, bảo lưu gói tập, vận hành quầy và mở khóa/đổi trạng thái tài khoản.
  - Việt hóa toàn diện các thông báo lỗi trả về từ API sang ngôn ngữ tự nhiên, rõ ràng cho người dùng.

---

## 🚀 Hướng dẫn chạy dự án

### 1. Cài đặt công cụ cần thiết

Cần cài [Node.js](https://nodejs.org/) phiên bản **20 LTS trở lên**. Node.js đã bao gồm npm, là công cụ dùng để cài thư viện và chạy các lệnh của dự án.

Mở Terminal, PowerShell hoặc Command Prompt và kiểm tra:

```bash
node --version
npm --version
```

### 2. Clone hoặc mở source code

```bash
git clone https://github.com/NakinoMinh/Sports-Center-Management-FE.git
cd Sports-Center-Management-FE
```

### 3. Cài đặt thư viện

```bash
npm install
```

### 4. Cấu hình môi trường

Tạo file `.env.local` từ file mẫu:

```bash
cp .env.example .env.local
```

Giá trị mặc định kết nối tới backend tại `http://localhost:5198/api`:

```env
VITE_API_BASE_URL=http://localhost:5198/api
```

### 5. Chạy môi trường phát triển

```bash
npm run dev
```

Terminal sẽ hiển thị một địa chỉ tương tự `http://localhost:5173/`. Mở địa chỉ đó trên trình duyệt để sử dụng giao diện.

### 6. Kiểm tra code trước khi commit

```bash
npm run lint
npm test
npm run build
```

- `npm run lint`: kiểm tra lỗi style và chất lượng code.
- `npm test`: chạy bộ kiểm thử đơn vị (Vitest — `199/199` tests pass).
- `npm run build`: kiểm tra TypeScript và tạo bản production trong thư mục `dist/`.
