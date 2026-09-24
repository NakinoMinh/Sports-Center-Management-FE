# Sprint 1 — phần FE của Minh

Nguồn: `Sprint1_SCMS.xlsx`, sheet **Sprint 1 - Swimlane**, các dòng 5, 6, 7, 13, 15, 19. Người dùng đã xác nhận ưu tiên bảng chi tiết khi sheet Team Distribution ghi khác (SCMS-3 / SCMS-5).

## Phạm vi bàn giao

| Issue   | Màn hình / chức năng         | Đã triển khai                                                                                                              |
| ------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SCMS-1  | Register                     | Username, email, mật khẩu, xác nhận mật khẩu; email/username duy nhất; đăng ký Member; bcrypt trong adapter demo.          |
| SCMS-2  | Login                        | Email + mật khẩu; khóa sau 5 lần sai liên tiếp; reset số lần sai khi đăng nhập đúng; phiên demo 24 giờ; ghi nhớ đăng nhập. |
| SCMS-3  | Logout                       | Xóa phiên/token của adapter demo, về `/login`; Back hoặc mở URL nội bộ sau logout không vào lại nội dung.                  |
| SCMS-9  | Manage Membership Packages   | Thêm/sửa/xóa/ẩn/hiện gói tháng, quý, năm; giá, quyền lợi; tìm/lọc; gói có lịch sử đăng ký chỉ được ẩn.                     |
| SCMS-11 | Register/Renew Membership    | Member đăng ký/gia hạn; xem trước giá và kỳ hạn; cộng dồn phần còn hạn; tạo hóa đơn pending.                               |
| SCMS-15 | Counter Registration/Renewal | Lễ tân chọn Member, đăng ký/gia hạn, chọn phương thức thanh toán, xem và in/lưu PDF hóa đơn.                               |

Chỉ sửa dự án FE. Không sửa hoặc gọi BE. Giữ React + TypeScript của repo; dùng function components, hooks, Context và service đơn giản, không có ViewModel/MVVM. Các màn hình thuộc Tâm/Long, thanh toán thực, báo cáo, lớp học và AI không nằm trong lần bàn giao này. Chặn route theo vai trò chỉ là hỗ trợ truy cập những màn hình trên, không phải triển khai toàn bộ SCMS-5.

## Chạy và kiểm tra

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Mở URL Vite in ra (thông thường `http://localhost:5173`). Khi deploy SPA, cấu hình host trả về `index.html` cho các route frontend.

Tài khoản mẫu đều dùng mật khẩu `Pass@1234`:

| Vai trò      | Email                         | Route                                             |
| ------------ | ----------------------------- | ------------------------------------------------- |
| Manager      | manager@sportscenter.com      | `/manager/packages`                               |
| Member       | member@sportscenter.com       | `/member/membership`                              |
| Receptionist | receptionist@sportscenter.com | `/receptionist/memberships`                       |
| Coach        | coach@sportscenter.com        | `/coach` — màn hình chào, chưa có nghiệp vụ Coach |

Tài khoản Member mẫu có một gói tháng đã xác nhận để demo gia hạn. Thành viên tự đăng ký mới chưa có gói. Dữ liệu mẫu chỉ được tạo khi chưa có dữ liệu cục bộ, không ghi đè dữ liệu đã lưu.

## Quy tắc mô phỏng cần biết

- Dữ liệu tài khoản: `scms_users_database`. Danh mục gói, đăng ký và hóa đơn: `scms_memberships_v1`.
- Phiên dùng `scms_auth_token` và `scms_demo_session_v1`. Ghi nhớ bật dùng localStorage; tắt dùng sessionStorage. Kiểm tra hết phiên bằng timer, focus, visibility và thay đổi storage. Token cũ không sử dụng lại sau logout.
- Token hiện là mã phiên **mock**, không phải JWT được máy chủ ký. FE không giữ signing secret. Xác thực JWT, blacklist/revoke và bcrypt ở máy chủ phải được nối qua API sau; không thể hoàn thành bảo mật máy chủ chỉ bằng FE.
- Mật khẩu demo yêu cầu ít nhất 8 ký tự, tối đa 72 byte theo giới hạn bcrypt. Public registration luôn tạo `MEMBER`.
- Tất cả đơn đăng ký/gia hạn mới đều tạo subscription `PENDING` và invoice `PENDING`. Chưa có thao tác thu tiền/xác nhận thanh toán trong phạm vi này. Chọn CASH/BANK_TRANSFER/CARD chỉ ghi phương thức dự kiến, không tạo giao dịch hoặc yêu cầu nhập số thẻ.
- Thời hạn đang chờ thanh toán chỉ là dự kiến, không cấp quyền tập. Một thành viên chỉ có một yêu cầu pending để tránh tạo đơn lặp. Muốn tiếp tục gia hạn sau đó cần luồng xác nhận thanh toán của sprint/API tương ứng.
- Ngày được lưu dạng `YYYY-MM-DD`, ngày bắt đầu và ngày kết thúc đều được tính vào kỳ sử dụng. Kỳ mới bắt đầu ngày kế tiếp sau ngày cuối cùng còn hạn; nếu hết hạn thì bắt đầu hôm nay. Cộng theo tháng lịch, chặn về ngày cuối tháng khi tháng đích ngắn hơn; ngày cuối sử dụng bằng ngày kỷ niệm trừ một ngày.
- Thông tin tên gói, giá, quyền lợi và thành viên trên hóa đơn là bản chụp tại thời điểm tạo; sửa danh mục không thay đổi hóa đơn cũ. Gói có bất kỳ lịch sử đăng ký/hóa đơn nào không thể xóa.
- Bản in dùng `window.print()` và CSS A4. Trên trình duyệt hỗ trợ in (Chrome/Edge), chọn **Save as PDF** để lưu PDF. Bản in là tài liệu demo, không phải hóa đơn thuế; khung trình duyệt nhúng có thể không mở hộp thoại in.

## Cấu trúc chính

- `src/pages/LoginPage.tsx`, `RegisterPage.tsx`: form xác thực.
- `src/context/AuthContext.tsx`, `src/services/authService.ts`, `mockDb.ts`: trạng thái và adapter xác thực demo.
- `src/pages/manager/MembershipPackagesPage.tsx`: quản lý danh mục gói.
- `src/pages/membership/MembershipPage.tsx`: luồng Member và lễ tân dùng chung, giới hạn người được thao tác theo vai trò.
- `src/services/membershipService.ts`: dữ liệu demo, kiểm tra nghiệp vụ và tính kỳ hạn.
- `src/components/membership/PackageForm.tsx`, `InvoiceDocument.tsx`: form gói và tài liệu hóa đơn.
- `src/components/common/Dialog.tsx`: modal có quản lý focus, đóng bằng Escape.
- `src/components/layout/WorkspaceLayout.tsx`, `src/styles/workspace.css`: khung ứng dụng và responsive.

## Điểm nối API sau này

Thay adapter trong các service khi API sẵn sàng và chuyển các call site sang async/loading tương ứng. Giữ các kiểu dữ liệu trả về dùng trong UI hoặc ánh xạ response BE tại adapter.

Auth cần đăng ký/đăng nhập/check-token/logout; FE gửi mật khẩu qua HTTPS và nhận token do BE phát hành. Thống nhất 24 giờ theo sprint với BE trước khi tích hợp. Các rule khóa tài khoản, phân quyền, unique email, revoke phải được BE thực thi; kiểm tra FE chỉ hỗ trợ UX.

Membership cần các thao tác list/create/update/hide/delete package, list Member để chọn tại quầy, lấy subscription/invoice theo Member, báo giá kỳ hạn và tạo đơn. Khi BE sẵn sàng, BE phải quyết định giá/thời hạn cuối cùng, xử lý giao dịch tạo đơn+hóa đơn và idempotency; dữ liệu localStorage không dùng cho production.

## Kiểm thử

`npm test` chạy 29 tests cho auth và membership, gồm email trùng, validation, bcrypt, khóa 5 lần, reset bộ đếm, phiên 24 giờ, remember-me, logout, dữ liệu lỗi, gói ẩn, hạn chế xóa, quyền sở hữu, cuối tháng/năm nhuận, gia hạn còn hạn/hết hạn, chặn đơn pending trùng, ảnh chụp hóa đơn và lưu trữ thất bại.

Đã kiểm tra trên trình duyệt: đăng nhập Manager/Member/Receptionist, đăng ký Member mới, logout, tạo/ẩn gói, chặn xóa gói đã đăng ký, báo giá gia hạn cộng dồn, tạo hóa đơn pending cho Member và tạo đơn tại quầy cho thành viên được chọn. Nút in gọi hộp thoại in của trình duyệt; việc xuất file PDF thực tế cần trình duyệt hỗ trợ in.

Checklist demo cho nhóm:

1. Manager tạo gói, sửa giá, tìm/lọc, ẩn/hiện. Thử xóa Gói Tháng đã có Member mẫu: chỉ cho phép ẩn.
2. Member mẫu gia hạn gói quý: ngày bắt đầu dự kiến nằm sau gói tháng còn hạn; hóa đơn pending, gói hiện tại vẫn giữ thời hạn cũ.
3. Đăng ký Member mới, rồi dùng lễ tân chọn đúng Member và đăng ký gói tháng; kiểm tra tên/email/phương thức/số tiền trên hóa đơn.
4. Đóng hộp thoại, tải lại trang và mở lại hóa đơn; kiểm tra thông tin không mất. Mở bằng Chrome/Edge và in/lưu PDF.
5. Thử trên màn hình hẹp; menu có nút mở/đóng, form không tràn ngang, bảng cuộn ngang.
