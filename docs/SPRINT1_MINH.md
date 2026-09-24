# Sprint 1 — phần FE của Minh

Nguồn: `Sprint1_SCMS.xlsx`, sheet **Sprint 1 - Swimlane**, các dòng 5, 6, 7, 13, 15, 19. Người dùng đã xác nhận ưu tiên bảng chi tiết khi sheet Team Distribution ghi khác (SCMS-3 / SCMS-5).

## Phạm vi bàn giao

| Issue   | Màn hình / chức năng         | Đã triển khai                                                                                                              |
| ------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SCMS-1  | Register                     | Username, email, mật khẩu, xác nhận mật khẩu; email/username duy nhất; đăng ký Member; bcrypt trong adapter demo.          |
| SCMS-2  | Login                        | Email + mật khẩu; khóa sau 5 lần sai liên tiếp; reset số lần sai khi đăng nhập đúng; phiên demo 24 giờ; ghi nhớ đăng nhập. |
| SCMS-3  | Logout                       | Xóa phiên/token của adapter demo, về `/login`; Back hoặc mở URL nội bộ sau logout không vào lại nội dung.                  |
| SCMS-9  | Manage Membership Packages   | Thêm/sửa/xóa/ẩn/hiện gói tháng, quý, năm; giá, quyền lợi; tìm/lọc; gói có lịch sử đăng ký chỉ được ẩn.                     |
| SCMS-11 | Register/Renew Membership    | Đăng ký, gia hạn nối tiếp, nâng gói, lên lịch hạ gói; báo giá và hóa đơn chờ thanh toán. |
| SCMS-15 | Counter Registration/Renewal | Chọn Member hoặc tạo Member mới bắt buộc kèm gói; xác nhận thu tiền mặt; xem và in/lưu PDF hóa đơn. |

Chỉ sửa dự án FE. Không sửa hoặc gọi BE. Giữ React + TypeScript của repo; dùng function components, hooks, Context và service đơn giản, không có ViewModel/MVVM. Theo yêu cầu bổ sung, triển khai cả xác nhận tiền mặt **mô phỏng** cho Receptionist / Center Manager. Thanh toán thực, báo cáo, lớp học và AI chưa nằm trong phạm vi. Chặn route theo vai trò chỉ là hỗ trợ truy cập những màn hình trên, không phải triển khai toàn bộ SCMS-5.

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
- Mọi yêu cầu mới có subscription và invoice `PENDING_PAYMENT`, chưa cấp quyền tập. Một thành viên chỉ có một yêu cầu chờ; Member được hủy yêu cầu của chính mình, nhân viên được hủy yêu cầu chờ của Member. Hóa đơn đã trả tiền không được hủy/hoàn tiền trong phạm vi này.
- `/payments/cash`: chỉ Receptionist / Center Manager truy cập và xác nhận tiền mặt. Nhập đúng số tiền, tích đã kiểm tra tiền; service kiểm tra lại quyền, phương thức CASH, trạng thái pending, thành viên không bị khóa, kỳ không trùng. Lưu invoice `PAID`, người và thời điểm xác nhận cùng subscription `CONFIRMED` bằng một lần ghi. Xác nhận lặp bị chặn. `CONFIRMED` là đã thanh toán; trạng thái hiển thị `ACTIVE`, `UPCOMING`, `SCHEDULED_DOWNGRADE`, `EXPIRED` được suy ra theo ngày.
- Chuyển khoản/thẻ mới ghi phương thức dự kiến, **chưa có luồng đối soát/kích hoạt**. Nếu chọn nhầm, hủy yêu cầu chưa thanh toán rồi lập lại bằng tiền mặt; không nhập số thẻ, không tự giả lập thanh toán thành công.
- Ngày được lưu dạng `YYYY-MM-DD`, ngày bắt đầu và ngày kết thúc đều được tính vào kỳ sử dụng. Kỳ mới bắt đầu ngày kế tiếp sau ngày cuối cùng còn hạn; nếu hết hạn thì bắt đầu hôm nay. Cộng theo tháng lịch, chặn về ngày cuối tháng khi tháng đích ngắn hơn; ngày cuối sử dụng bằng ngày kỷ niệm trừ một ngày.
- Thông tin tên gói, giá, quyền lợi và thành viên trên hóa đơn là bản chụp tại thời điểm tạo; sửa danh mục không thay đổi hóa đơn cũ. Gói có bất kỳ lịch sử đăng ký/hóa đơn nào không thể xóa.
- Bản in dùng `window.print()` và CSS A4. Trên trình duyệt hỗ trợ in (Chrome/Edge), chọn **Save as PDF** để lưu PDF. Bản in là tài liệu demo, không phải hóa đơn thuế; khung trình duyệt nhúng có thể không mở hộp thoại in.

## Bổ sung: tại quầy, nâng/hạ gói và tiền mặt

1. **Thành viên mới tại quầy:** nhập họ tên, email, số điện thoại, username, mật khẩu khởi tạo và bắt buộc chọn gói. Không tạo Member nếu gói thiếu/ẩn hoặc giá đã đổi. Email/username phải duy nhất; mật khẩu được hash, không hiển thị trên hóa đơn. Lễ tân bàn giao mật khẩu riêng; chưa gửi email tự động. Không đăng nhập thay Member và không đổi phiên nhân viên. Khi lưu gói thất bại, adapter thử hoàn tác tài khoản vừa tạo.
2. **Gia hạn / chống trùng:** service tự xác định loại yêu cầu theo gói đã thanh toán, không tin `kind` do UI gửi. Cùng gói hoặc cùng hạng thì gia hạn sau ngày cuối kỳ đã trả tiền, kể cả các kỳ trả trước. Ví dụ 01/09–30/09 → 01/10–31/10. Chưa có lịch sử thì đăng ký mới; đã hết hạn thì bắt đầu từ ngày thu tiền.
3. **Nâng gói Basic → Premium:** phí bằng **toàn bộ giá gói đích trừ giá gói gốc đã chụp khi mua**, không chia theo ngày còn lại (chính sách người dùng đã chọn). Giữ nguyên ngày hết hạn; chỉ thay quyền lợi từ ngày xác nhận thu tiền. Kỳ cũ lưu `replacedOn`, không sửa/xóa hóa đơn cũ. Nếu gói gốc đã hết hạn trước khi thu tiền, từ chối thu, hướng dẫn hủy yêu cầu nâng và lập lại. Giá đích phải cao hơn giá gốc; trường hợp kỳ hạn khác nhau dẫn tới chênh lệch không dương cần quản lý cấu hình giá, chưa có chính sách hoàn tiền/bù trừ. Các kỳ tương lai đã trả trước được giữ nguyên, nâng chỉ áp dụng kỳ đang hoạt động.
4. **Hạ gói Premium → Basic:** yêu cầu `DOWNGRADE` chờ thanh toán; sau xác nhận hiển thị `SCHEDULED_DOWNGRADE`. Bắt đầu ngày kế tiếp sau toàn bộ kỳ đã trả tiền, không cắt mất ngày Premium. Đến ngày bắt đầu, UI tự hiển thị `ACTIVE` (kiểm tra lại mỗi phút/focus/tải trang). Chưa trả tiền thì vẫn pending dù đã đến ngày dự kiến.
5. **Thu tiền trễ:** đối với đăng ký/gia hạn/hạ gói, nếu ngày bắt đầu dự kiến đã qua, bắt đầu từ hôm xác nhận và tính đủ kỳ hạn. Với nâng gói còn hiệu lực, bắt đầu từ hôm xác nhận và giữ hạn cũ. Số tiền/quyền lợi giữ theo báo giá đã tạo. Hộp xác nhận hiển thị kỳ hiệu lực sẽ ghi nhận trước khi thu tiền.

Hạng `BASIC` / `PREMIUM` độc lập với `durationMonths` 1/3/12. Manager chọn hạng ở form gói. Không đổi hạng gói đã có lịch sử; hãy tạo gói mới. Dữ liệu khởi tạo mới có cả hai hạng, giá Premium minh họa bằng 2 lần Basic, có thể cấu hình giá qua Manager.

**Tương thích dữ liệu cũ:** giữ key `scms_memberships_v1` nhưng schema lên version 2. Đọc version 1 sẽ ánh xạ `PENDING` → `PENDING_PAYMENT`, thêm hạng Basic và chụp `packagePrice` từ số tiền cũ; lưu version 2 khi có thao tác ghi tiếp theo. Không tự thêm gói hoặc xóa lịch sử trong kho cũ. Nếu đang dùng dữ liệu Sprint 1 trước đây, Manager cần tạo một gói hạng Premium để demo nâng/hạ; không cần reset localStorage.

**Giới hạn demo:** hai key users/membership không có transaction thật; hoàn tác tài khoản là best-effort và báo rõ nếu hoàn tác thất bại. Các lệnh ghi đồng bộ re-read dữ liệu trước khi commit, nhưng localStorage không bảo đảm transaction giữa nhiều tab/máy. BE sau này phải kiểm tra quyền dựa trên phiên/token, khóa giao dịch, unique/idempotency và thực thi toàn bộ quy tắc trong transaction; không tin giá, role hay trạng thái từ FE.

## Cấu trúc chính

- `src/pages/LoginPage.tsx`, `RegisterPage.tsx`: form xác thực.
- `src/context/AuthContext.tsx`, `src/services/authService.ts`, `mockDb.ts`: trạng thái và adapter xác thực demo.
- `src/pages/manager/MembershipPackagesPage.tsx`: quản lý danh mục gói.
- `src/pages/membership/MembershipPage.tsx`: luồng Member và lễ tân dùng chung, giới hạn người được thao tác theo vai trò.
- `src/components/membership/CounterRegistrationForm.tsx`: tạo Member kèm gói bắt buộc, không thay phiên lễ tân.
- `src/pages/membership/CashPaymentsPage.tsx`: tìm/lọc hóa đơn tiền mặt, đối chiếu số tiền, xác nhận và in biên nhận demo.
- `src/services/membershipService.ts`: dữ liệu demo, kiểm tra nghiệp vụ và tính kỳ hạn.
- `src/components/membership/PackageForm.tsx`, `InvoiceDocument.tsx`: form gói và tài liệu hóa đơn.
- `src/components/common/Dialog.tsx`: modal có quản lý focus, đóng bằng Escape.
- `src/components/layout/WorkspaceLayout.tsx`, `src/styles/workspace.css`: khung ứng dụng và responsive.

## Điểm nối API sau này

Thay adapter trong các service khi API sẵn sàng và chuyển các call site sang async/loading tương ứng. Giữ các kiểu dữ liệu trả về dùng trong UI hoặc ánh xạ response BE tại adapter.

Auth cần đăng ký/đăng nhập/check-token/logout; FE gửi mật khẩu qua HTTPS và nhận token do BE phát hành. Thống nhất 24 giờ theo sprint với BE trước khi tích hợp. Các rule khóa tài khoản, phân quyền, unique email, revoke phải được BE thực thi; kiểm tra FE chỉ hỗ trợ UX.

Membership cần các thao tác list/create/update/hide/delete package, list Member để chọn tại quầy, tạo Member kèm gói, lấy subscription/invoice theo Member, báo giá theo loại yêu cầu, tạo/hủy đơn chờ và xác nhận tiền mặt. Khi BE sẵn sàng, BE phải quyết định giá/thời hạn cuối cùng, xử lý giao dịch tạo đơn+hóa đơn, thu tiền+kích hoạt và idempotency; dữ liệu localStorage không dùng cho production.

## Kiểm thử

`npm test` hiện chạy **53 tests**: auth, membership và định dạng ngày hóa đơn. Bao gồm email trùng, validation, bcrypt, khóa tài khoản, phiên, quyền sở hữu, ngày cuối tháng/năm nhuận; đồng thời có test cho 5 quy tắc mới, quyền xác nhận tiền mặt, số tiền sai, xác nhận trùng, trả tiền trễ, nâng gói hết hạn, giữ các kỳ trả trước, hủy pending, migration và rollback khi lưu lỗi.

Đã kiểm tra trên trình duyệt: đăng nhập Manager/Member/Receptionist, đăng ký Member mới, logout, tạo/ẩn gói, chặn xóa gói đã đăng ký, báo giá gia hạn cộng dồn, tạo hóa đơn pending cho Member và tạo đơn tại quầy cho thành viên được chọn. Nút in gọi hộp thoại in của trình duyệt; việc xuất file PDF thực tế cần trình duyệt hỗ trợ in.

Lần bổ sung đã kiểm tra trực tiếp: nút tạo Member bị vô hiệu khi chưa chọn gói; tạo tài khoản tại quầy không đổi phiên; đăng nhập tài khoản vừa tạo; nhập sai số tiền bị chặn; thu tiền đăng ký và nâng gói; lên lịch hạ gói sau thanh toán vẫn giữ Premium; Manager truy cập trang thu tiền; Member bị chặn URL thu tiền. Màn hình thu tiền và form tại quầy được kiểm tra ở viewport 390px, không tràn ngang; không có lỗi console trong phiên kiểm thử.

Checklist demo cho nhóm:

1. Manager tạo gói, sửa giá, tìm/lọc, ẩn/hiện. Thử xóa Gói Tháng đã có Member mẫu: chỉ cho phép ẩn.
2. Member mẫu gia hạn gói Basic: ngày bắt đầu nằm sau kỳ còn hạn; hóa đơn pending. Lễ tân xác nhận tại `/payments/cash`, kỳ mới vẫn chờ đến ngày bắt đầu.
3. Lễ tân tạo Member mới ngay tại quầy; bỏ trống gói thì không thể gửi. Chọn Basic, tạo hóa đơn, sang trang tiền mặt, nhập số tiền và xác nhận. Đăng nhập tài khoản vừa tạo để xem gói đã hoạt động.
4. Đóng hộp thoại, tải lại trang và mở lại hóa đơn; kiểm tra thông tin không mất. Mở bằng Chrome/Edge và in/lưu PDF.
5. Thử trên màn hình hẹp; menu có nút mở/đóng, form không tràn ngang, bảng cuộn ngang.
6. Member Basic chọn Premium: xem toàn bộ chênh lệch và hạn không đổi; xác nhận thu tiền với Receptionist hoặc Manager. Sau đó chọn Basic: xem ngày hạ sau kỳ hiện tại; thanh toán xong vẫn giữ Premium đến hết kỳ.
7. Member/Coach mở thẳng `/payments/cash`: bị chặn. Với thu ngân, nhập thiếu/thừa tiền hoặc chưa tích xác nhận: không thể xác nhận.
