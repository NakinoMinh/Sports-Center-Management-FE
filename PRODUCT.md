# SPORTS CENTER MANAGEMENT SYSTEM
## PRODUCT REQUIREMENTS DOCUMENT

**Project Name:** Sports Center Management System  
**Vietnamese Name:** Hệ thống Quản lý Trung tâm Thể thao  
**Document:** PRODUCT.md  
**Version:** 1.1

---

# 0. Phạm vi chính thức và đối chiếu mã nguồn

### Bổ sung triển khai FE ngày 28/09/2026 — UC5, UC6, UC10, UC13, UC14

Đối chiếu mã UC theo sheet **Sprint 1 - Swimlane** của `Sprint1_SCMS.xlsx` (không phải số FR). Đây là **FE mock**, chưa nghiệm thu FE–API–DB:

- **UC5 / FR-22:** chính sách 4 role dùng chung ở `accessControl.ts`, guard route và service; Manager quản lý thành viên, danh mục và truy cập nghiệp vụ tại quầy; Member bị giới hạn dữ liệu bản thân. `/manager/access` hiển thị ma trận quyền cố định. Chưa có middleware API hoặc chỉnh permission động.
- **UC6 / FR-02:** `/manager/members` thêm/xem/sửa/xóa mềm Member, tìm tên không dấu/email/điện thoại, lọc active/inactive, 20 người/trang. Ngừng hoạt động/xóa mềm chặn đăng nhập và nghiệp vụ mới; giữ lịch sử hóa đơn/gói/điểm danh. `isActive` độc lập với khóa đăng nhập `isLocked` và tạm ngưng gói `isSuspended`.
- **UC10 / FR-10:** `/packages` công khai chỉ hiển thị gói đang mở, lọc tháng/quý/năm và so sánh 2–3 gói theo tổng giá, giá bình quân, thời hạn, quyền lợi.
- **UC13 / FR-02, FR-11:** form tại quầy nhập họ tên/email/điện thoại/ngày sinh, tự sinh username và mật khẩu ngẫu nhiên, lưu hash BCrypt và tạo yêu cầu gói/hóa đơn pending. Mật khẩu chỉ hiển thị trong kết quả thao tác, không lưu rõ trong storage/hóa đơn. **Chưa gửi email**; FE hiển thị thông báo bàn giao riêng, adapter trả `emailDelivery: NOT_CONNECTED`. BE cần tạo tài khoản + gói trong transaction, xử lý email/activation và retry trước nghiệm thu đầy đủ UC13.
- **UC14 / FR-11:** tra trạng thái active/expired/suspended, ngày còn lại tính cả ngày cuối sử dụng, cảnh báo 1–6 ngày. Phân biệt gói tương lai/chờ thanh toán/chưa có gói; chưa thêm nghiệp vụ tạm ngưng/mở lại gói.

Bằng chứng: `src/services/accessControl.ts`, `memberService.ts`, `membershipService.ts`; `src/pages/manager/MembersPage.tsx`, `AccessControlPage.tsx`, `src/pages/PackageCatalogPage.tsx`, `src/components/membership/CounterRegistrationForm.tsx`, `src/pages/membership/MembershipStatusPage.tsx`. Các dòng hiện trạng bên dưới là bản đối chiếu ngày 27/09; áp dụng phần bổ sung này cho những FR liên quan.

**Ngày đối chiếu:** 27/09/2026. **Phiên bản:** 1.1 — tích hợp yêu cầu người dùng và hiện trạng dự án.

Đây là tài liệu yêu cầu cho **toàn bộ Sports Center Management System**, không chỉ phần Sprint 1 của một thành viên. Đọc cùng [DESIGN.md](DESIGN.md). Các mục FR-01–FR-23 bên dưới giữ nguyên nội dung yêu cầu gốc; chúng mô tả đích cần đạt, không xác nhận hệ thống đã hoàn thành.

Thứ tự áp dụng khi có khác biệt: phạm vi người dùng chốt (bốn actor, sáu flow) → các điều chỉnh ở mục 0 của PRODUCT/DESIGN → nội dung yêu cầu/thiết kế gốc. Code là bằng chứng hiện trạng, không tự thay thế yêu cầu. Những khác biệt chưa chốt được ghi là cần quyết định trước khi triển khai phần liên quan.

Nguồn đối chiếu:

- Hai tài liệu PRODUCT và DESIGN người dùng cung cấp, cùng mô tả actor/flow ngày 27/09/2026.
- FE: `D:/SWP/Sports-Center-Management-System-FE`, HEAD `6557581`, **bao gồm các thay đổi chưa commit** tại thời điểm đọc.
- BE: `D:/SWP/SportsCenterManagement`, HEAD `e273a16`.
- [Sprint 1](docs/Sprint1.md) là tài liệu phạm vi hẹp; không giới hạn phạm vi toàn dự án.
- Đối chiếu tĩnh từ source; chưa xác nhận HTTP, database đang chạy hoặc nghiệm thu end-to-end. Có file test không đồng nghĩa các test đã chạy đạt trong lần đối chiếu này.

## 0.1. Sáu flow và mức ưu tiên

| Flow | Tên | Mức độ | Phạm vi |
| --- | --- | --- | --- |
| F1 | User and membership management | **Bắt buộc** | Tài khoản, hồ sơ, thành viên, Coach/nhân viên, phân quyền, gói tập, đăng ký/gia hạn, trạng thái/thời hạn |
| F2 | Class booking and schedule management | **Bắt buộc** | Bộ môn, phòng, lớp, phân công Coach, lịch hoạt động/lịch học, đăng ký/hủy, kiểm tra trùng lịch và sức chứa |
| F3 | Payment and report management | **Bắt buộc** | Ghi nhận thanh toán, hóa đơn, báo cáo thành viên/đăng ký lớp/doanh thu theo thời gian |
| F4 | Training and attendance management | **Tùy chọn** | Check-in trung tâm, điểm danh lớp, kế hoạch cá nhân/cả lớp, kết quả, tiến độ, nhận xét, bài tập về nhà |
| F5 | AI workout recommendation | **Tùy chọn** | Coach nhận gợi ý dựa trên mục tiêu, trình độ và lịch sử; Coach duyệt trước khi lưu kế hoạch |
| F6 | AI assistant | **Tùy chọn** | Member hỏi lịch tập, bài tập và dịch vụ; chỉ dùng dữ liệu Member được phép xem |

Thông báo, hỗ trợ thành viên và audit log vẫn thuộc yêu cầu actor, dù không có flow riêng. Thông báo phục vụ F1/F2 (lịch, đổi lịch, hạn gói), hỗ trợ tại quầy và audit thao tác quan trọng được đưa vào backlog nền tảng; thông báo về kế hoạch/kết quả đi theo F4. Điểm danh là tùy chọn theo F4 dù xuất hiện trong nhiệm vụ Coach và Receptionist. Không đánh dấu F4–F6 bắt buộc chỉ vì chúng có mã FR.

## 0.2. Trách nhiệm bốn actor

| Actor | Phạm vi cần đạt |
| --- | --- |
| Center Manager — Quản lý trung tâm | Quản lý Member/Coach/nhân viên; bộ môn/phòng/lớp/lịch; phân công Coach; gói, học phí, thời hạn; phân quyền; báo cáo và lịch sử thao tác |
| Coach — Huấn luyện viên | Xem lịch, lớp và học viên được phân công, thông tin cơ bản/mục tiêu; tạo kế hoạch, ghi kết quả/nhận xét/tiến độ, điểm danh; gửi thông báo/bài tập; dùng AI gợi ý khi triển khai F4/F5 |
| Member — Học viên / Thành viên | Đăng ký/cập nhật hồ sơ; xem/mua/gia hạn gói; xem lớp/lịch/Coach, đăng ký/hủy; nhận thông báo; xem dữ liệu tập luyện/điểm danh và hỏi AI khi triển khai F4/F6 |
| Receptionist — Nhân viên lễ tân | Tìm/xem/tạo Member tại quầy; đăng ký/gia hạn và kiểm tra gói; hỗ trợ đăng ký/hủy lớp; thu tiền/in hoặc xuất hóa đơn; ghi nhận hỗ trợ; check-in khi triển khai F4 |

Chi tiết giữ tại mục 3. Không thêm actor Admin riêng; quyền quản trị trung tâm thuộc Center Manager.

## 0.3. Ma trận yêu cầu so với code

**FE mock** = có xử lý/giao diện dựa trên dữ liệu trình duyệt; **BE một phần** = có code server nhưng chưa đủ toàn bộ nghiệp vụ; **chưa thấy** = không tìm thấy triển khai trong hai checkout đã đọc. Không có flow nào được xác nhận hoàn chỉnh FE–API–DB trong đợt này.

| Yêu cầu | Flow | FE hiện tại | BE hiện tại | Phần còn thiếu chính |
| --- | --- | --- | --- | --- |
| FR-01 xác thực | F1 | Mock đăng ký Member, login/logout, khóa sau 5 lần sai, phiên 24 giờ | Tạo tài khoản, login riêng 4 role, JWT, logout/check-token, BCrypt | Nối API; thống nhất DTO/phiên; đổi/quên/reset mật khẩu; reset bộ đếm khi login đúng |
| FR-02 thành viên | F1 | Tìm/chọn Member, tạo tại quầy, xem gói/trạng thái | Account + Member và API tạo | Hồ sơ đầy đủ, cập nhật cá nhân, quản lý trạng thái và danh sách qua API |
| FR-03 nhân viên, FR-04 Coach | F1/F2 | Tài khoản mẫu; Coach chỉ có trang chào | Entity và API tạo Coach/Receptionist/Manager | CRUD, khóa/mở, chuyên môn/lịch làm việc, phân công; bảo vệ API quản trị |
| FR-05 bộ môn, FR-06 phòng, FR-07 lớp, FR-08 lịch | F2 | Buổi học mẫu có tên bộ môn/Coach/phòng trong receptionService | Chưa thấy entity/service/controller nghiệp vụ | Danh mục và quản lý thực; lịch trung tâm; chống trùng Coach/phòng |
| FR-09 đăng ký/hủy lớp | F2 | Lễ tân đăng ký/hủy buổi mẫu; kiểm tra gói vào ngày học, đầy lớp, trùng lịch Member | Chưa thấy | Member tự đăng ký/lịch cá nhân; quyền bộ môn của gói; backend transaction/concurrency |
| FR-10 gói tập | F1 | Mock thêm/sửa/xóa/ẩn/hiện; danh mục public; kỳ hạn 1/3/12 tháng | Chưa thấy | API/DB và validation server; giữ snapshot lịch sử |
| FR-11 đăng ký/gia hạn | F1 | Mock Member/tại quầy; nâng/hạ theo giá, báo giá, trạng thái, hủy yêu cầu pending | Chưa thấy | Subscription server, nhất quán khi thu tiền, xử lý đồng thời |
| FR-12 thanh toán | F3 | Mock xác nhận CASH bởi Receptionist hoặc Manager; thẻ/chuyển khoản mới là lựa chọn | Chưa thấy | Payment server, chống ghi nhận trùng, đối soát nếu mở phương thức khác |
| FR-13 hóa đơn | F3 | Có bản pending/paid/canceled, in trình duyệt và có thể lưu PDF từ hộp thoại in | Chưa thấy | Lưu/phát hành server, số hóa đơn duy nhất, quyền xem, API xuất nếu cần |
| FR-14 điểm danh | F4 | Mock check-in/check-out trung tâm tại quầy, một lượt/ngày | Chưa thấy | Điểm danh theo buổi của Coach, lịch sử của Member, lưu server |
| FR-15 kế hoạch, FR-16 kết quả | F4 | Chưa thấy; Coach là DashboardPreview | Chưa thấy | Mục tiêu/trình độ, kế hoạch, bài tập về nhà, kết quả, nhận xét, tiến độ |
| FR-17 thông báo | F1/F2, mở rộng F4 | Chưa thấy module thông báo nghiệp vụ | Chưa thấy | Nhắc lịch/đổi lịch/hạn gói; gửi từ Coach; đánh dấu đã đọc |
| FR-18 hỗ trợ | Nghiệp vụ tại quầy | Mock tạo yêu cầu, cập nhật trạng thái và ghi chú | Chưa thấy | API/DB; trạng thái CLOSED theo bản gốc chưa có |
| FR-19 AI gợi ý | F5 | Chưa thấy | Chưa thấy | Context có phân quyền, provider, Coach duyệt |
| FR-20 AI assistant | F6 | Chưa thấy | Chưa thấy | Hỏi đáp có kiểm tra ownership, tra lịch/dịch vụ thật |
| FR-21 báo cáo | F3 | Chưa thấy báo cáo quản trị; không tính thẻ demo là báo cáo | Chưa thấy | Tổng hợp Member/lớp/doanh thu, lọc khoảng thời gian |
| FR-22 phân quyền | Xuyên suốt | Route guard, role và ownership trong mock service | JWT role claim; chưa có hệ thống quản lý permission | Bảo vệ endpoint, ownership server, gán/thu hồi quyền, giao diện quản lý |
| FR-23 audit | Xuyên suốt | Metadata người tạo/thu/hủy, chưa có màn hình audit | Có entity/DbSet AuditLog; chưa thấy luồng ghi/đọc audit | Ghi sự kiện quan trọng và cho Manager tra cứu |

Bằng chứng FE: [routes](src/App.tsx), [authService](src/services/authService.ts), [membershipService](src/services/membershipService.ts), [receptionService](src/services/receptionService.ts), [membership types](src/types/membership.ts), [Coach preview](src/pages/DashboardPreview.tsx), [invoice](src/components/membership/InvoiceDocument.tsx). Bằng chứng BE và các khác biệt contract nằm trong DESIGN mục 0.

## 0.4. Quy tắc bổ sung từ hành vi FE hiện tại

Các quy tắc dưới đây là cơ sở giữ hành vi khi nối BE; đây là phần chi tiết hơn tài liệu gốc, không chứng minh đã có xử lý server.

1. Gói không phân hạng Basic/Premium; hiện có kỳ hạn **1, 3, 12 tháng**. Gói 6 tháng trong ví dụ gốc là khả năng mở rộng, chưa được form/type hiện tại hỗ trợ. Giá gói hiện phải là số nguyên VND từ 1 đến 1.000.000.000; giá 0 trong ví dụ validation DESIGN không áp dụng cho gói hiện tại.
2. Tạo đơn hoặc tạo Member tại quầy kèm gói chỉ sinh yêu cầu chờ thanh toán; chưa cấp quyền tập. Mỗi Member tối đa một yêu cầu pending theo mock hiện tại.
3. Thu tiền mặt đúng số tiền chuyển invoice thành PAID, subscription thành CONFIRMED. Gói đã trả tiền nhưng bắt đầu trong tương lai vẫn chưa có quyền sử dụng hôm nay. Trạng thái tạm ngưng chặn quyền tập; hiện chưa có chức năng hoàn chỉnh quản lý tạm ngưng.
4. Cùng gói/cùng giá được xử lý như gia hạn. Hạ giá nối sau tất cả kỳ đã trả tiền. Nâng giá khi đang có gói active và chưa có kỳ trả trước tương lai được khấu trừ ngày chưa dùng, bắt đầu đủ kỳ mới từ ngày thanh toán. Khi đã có kỳ trả trước tương lai, gói đắt hơn nối tiếp và thu đủ giá.
5. Khấu trừ = giá gói cũ lúc mua × số ngày còn lại / tổng ngày kỳ cũ, tính cả hai đầu ngày và làm tròn đến đồng. Báo giá nâng gói chỉ dùng trong ngày; quá ngày phải hủy/lập lại. Tên/giá/quyền lợi trong lịch sử không thay đổi theo danh mục.
6. Mock cho cả Receptionist và Manager xác nhận tiền mặt; ma trận FR-22 gốc chỉ ghi Manager xem thanh toán. Đây là khác biệt quyền cần chốt trước tích hợp production; không tự mở quyền server chỉ dựa vào route FE.
7. Mock lễ tân chặn đăng ký/hủy sau khi buổi học bắt đầu, chặn trùng Member/buổi và trùng giờ. Quyền bộ môn theo gói chưa được kiểm tra: chuỗi benefits không đủ làm điều kiện phân quyền.
8. Hóa đơn pending hiện là chứng từ yêu cầu thanh toán, không phải biên nhận đã thu. Phân biệt đơn chờ thanh toán và hóa đơn/biên nhận paid khi chuẩn hóa backend.

## 0.5. Thứ tự triển khai và điều kiện hoàn thành

- **Mốc A — F1:** bảo vệ API tài khoản, thống nhất auth/role/DTO; hoàn thiện hồ sơ và quản lý Member/Coach/nhân viên, gói, subscription; bổ sung phân quyền/audit nền tảng. Nghiệm thu bằng dữ liệu lưu DB, reload/đăng nhập lại vẫn đúng, kiểm tra trái quyền trực tiếp ở API.
- **Mốc B — F2:** xây bộ môn/phòng/lớp/lịch, phân công Coach; Member và lễ tân đặt/hủy; lịch cá nhân và danh sách học viên của Coach. Kiểm thử gói hết hạn/không đủ quyền, đầy lớp, trùng lịch Member/Coach/phòng; hai người tranh chỗ cuối chỉ một người thành công.
- **Mốc C — F3:** có thể làm thanh toán song song với F1; hoàn thiện thu tiền, hóa đơn và **báo cáo bắt buộc**. Thanh toán pending/failed không cấp quyền; gửi lại xác nhận không thu hai lần; kỳ tương lai không active sớm; doanh thu theo paidAt và số tiền thực thu, không cộng đơn pending/canceled.
- **Mốc D — chức năng hỗ trợ actor:** thông báo lịch/hạn gói, yêu cầu hỗ trợ, tra cứu audit và phân quyền còn lại; không coi chúng hoàn thành chỉ vì F1–F3 có màn hình.
- **Mốc E — tùy chọn F4:** kế hoạch, kết quả/tiến độ, điểm danh và bài tập; chỉ Coach phụ trách sửa và Member xem dữ liệu của mình.
- **Mốc F — tùy chọn F5/F6:** triển khai sau khi có dữ liệu/phân quyền phù hợp; AI không tự cập nhật kế hoạch, không đọc chéo dữ liệu người khác.

Một yêu cầu chỉ ghi **hoàn thành** khi có UI nếu cần, API, lưu trữ, kiểm tra quyền và quy tắc nghiệp vụ, cùng kiểm thử tích hợp phù hợp. Khi sửa code, cập nhật hàng FR liên quan, đường dẫn bằng chứng, ngày đối chiếu và các quyết định trong DESIGN. Không đổi trạng thái từ mock sang hoàn thành chỉ vì unit test FE đạt.

## 0.6. Các quyết định còn mở

Cần chốt khi bắt đầu phần liên quan: quyền thu tiền của Manager; quyền gói theo bộ môn/lớp và học phí lớp tách riêng hay đã nằm trong gói; hạn hủy lớp/hoàn tiền; nhiều lần check-in trong ngày; ai được tạm ngưng/mở lại gói và có bù hạn không; thời điểm gửi nhắc hạn; permission chi tiết và việc có cần nhiều role/tài khoản; phạm vi dữ liệu huấn luyện mà lễ tân được xem. Mục 0.4 ghi hành vi hiện có, không tự chốt các chính sách còn mở này.

---

# 1. Product Overview

## 1.1. Introduction

Sports Center Management System là hệ thống hỗ trợ quản lý hoạt động của một trung tâm thể thao.

Hệ thống tập trung quản lý:

- Thành viên.
- Nhân viên.
- Huấn luyện viên.
- Bộ môn.
- Lớp học.
- Phòng tập.
- Lịch học và lịch hoạt động.
- Gói thành viên.
- Đăng ký lớp.
- Điểm danh.
- Thanh toán.
- Kế hoạch tập luyện.
- Kết quả tập luyện.
- Thông báo.
- Hỗ trợ thành viên.
- Báo cáo và thống kê.
- Phân quyền người dùng.
- AI hỗ trợ tập luyện và tra cứu thông tin.

Hệ thống phục vụ 4 nhóm người dùng chính:

1. Center Manager – Quản lý trung tâm.
2. Coach – Huấn luyện viên.
3. Member – Học viên / Thành viên.
4. Receptionist – Nhân viên lễ tân.

---

# 2. Product Goals

Mục tiêu của hệ thống:

- Số hóa hoạt động quản lý trung tâm thể thao.
- Quản lý tập trung dữ liệu thành viên.
- Giảm thao tác thủ công của nhân viên lễ tân.
- Hỗ trợ quản lý lớp học và lịch tập.
- Hỗ trợ huấn luyện viên theo dõi quá trình tập luyện.
- Cho phép thành viên chủ động đăng ký lớp và theo dõi lịch tập.
- Quản lý gói thành viên và thời hạn sử dụng.
- Theo dõi thanh toán và doanh thu.
- Cung cấp báo cáo cho Center Manager.
- Tự động gửi các thông báo cần thiết.
- Ứng dụng AI hỗ trợ huấn luyện viên và thành viên.

---

# 3. Actors

## 3.1. Center Manager

Center Manager chịu trách nhiệm quản lý toàn bộ hoạt động của trung tâm.

### Chức năng

- Quản lý danh sách thành viên.
- Quản lý danh sách huấn luyện viên.
- Quản lý danh sách nhân viên.
- Quản lý bộ môn.
- Quản lý lớp học.
- Quản lý phòng tập.
- Quản lý lịch hoạt động.
- Phân công huấn luyện viên cho lớp.
- Quản lý gói thành viên.
- Quản lý học phí.
- Quản lý thời hạn sử dụng gói.
- Xem báo cáo thành viên.
- Xem báo cáo đăng ký lớp.
- Xem báo cáo doanh thu.
- Phân quyền truy cập.
- Xem lịch sử thao tác quan trọng.

---

## 3.2. Coach

Coach chịu trách nhiệm quản lý hoạt động tập luyện của các lớp và học viên được phân công.

### Chức năng

- Xem lịch dạy.
- Xem các lớp được phân công.
- Xem danh sách học viên trong lớp.
- Xem thông tin cơ bản của học viên.
- Xem mục tiêu tập luyện.
- Tạo kế hoạch tập luyện cá nhân.
- Tạo kế hoạch tập luyện cho lớp.
- Ghi nhận kết quả tập luyện.
- Đánh giá tiến độ học viên.
- Ghi nhận nhận xét.
- Điểm danh học viên.
- Gửi thông báo.
- Gửi bài tập về nhà.
- Sử dụng AI để gợi ý bài tập.

AI có thể dựa trên:

- Mục tiêu tập luyện.
- Trình độ.
- Lịch sử tập luyện.
- Kết quả tập luyện trước đó.

AI chỉ đóng vai trò hỗ trợ đề xuất. Huấn luyện viên quyết định kế hoạch tập luyện cuối cùng.

---

## 3.3. Member

Member là người sử dụng các dịch vụ tập luyện của trung tâm.

### Chức năng

- Đăng ký tài khoản.
- Đăng nhập.
- Cập nhật thông tin cá nhân.
- Xem các gói thành viên.
- Đăng ký gói thành viên.
- Gia hạn gói thành viên.
- Xem trạng thái gói.
- Xem thời hạn gói.
- Xem danh sách lớp.
- Xem lịch học.
- Đăng ký lớp.
- Hủy đăng ký lớp.
- Xem lịch tập cá nhân.
- Xem thông tin huấn luyện viên.
- Xem lịch sử điểm danh.
- Xem kết quả tập luyện.
- Xem kế hoạch tập luyện.
- Xem nhận xét của huấn luyện viên.
- Nhận thông báo.
- Gửi câu hỏi cho AI.

Member có thể hỏi AI về:

- Lịch tập.
- Bài tập.
- Lớp học.
- Các dịch vụ của trung tâm.

---

## 3.4. Receptionist

Receptionist hỗ trợ các hoạt động tại quầy.

### Chức năng

- Tìm kiếm thành viên.
- Xem thông tin thành viên.
- Đăng ký thành viên mới.
- Đăng ký gói thành viên.
- Gia hạn gói thành viên.
- Kiểm tra trạng thái gói.
- Kiểm tra thời hạn sử dụng.
- Điểm danh thành viên.
- Đăng ký lớp cho thành viên.
- Hủy đăng ký lớp cho thành viên.
- Ghi nhận thanh toán.
- In/xuất hóa đơn.
- Tiếp nhận yêu cầu hỗ trợ.
- Ghi nhận yêu cầu hỗ trợ.

---

# 4. Functional Requirements

## FR-01 – Authentication

Hệ thống phải hỗ trợ:

- Đăng ký tài khoản.
- Đăng nhập.
- Đăng xuất.
- Đổi mật khẩu.
- Quên mật khẩu.
- Khôi phục mật khẩu.
- Quản lý phiên đăng nhập.

Sau khi đăng nhập, người dùng chỉ được truy cập chức năng phù hợp với quyền của mình.

---

# 5. Member Management

## FR-02 – Member Management

Center Manager và Receptionist có thể:

- Xem danh sách thành viên.
- Tìm kiếm thành viên.
- Xem chi tiết thành viên.

Thông tin thành viên gồm:

- Member ID.
- Họ tên.
- Ngày sinh.
- Giới tính.
- Số điện thoại.
- Email.
- Địa chỉ.
- Ngày đăng ký.
- Trạng thái.
- Gói thành viên hiện tại.

Center Manager có quyền quản lý đầy đủ dữ liệu thành viên.

Receptionist chỉ thực hiện các thao tác nghiệp vụ được phân quyền.

---

# 6. Staff & Coach Management

## FR-03 – Staff Management

Center Manager có thể:

- Tạo tài khoản nhân viên.
- Cập nhật thông tin.
- Kích hoạt/vô hiệu hóa tài khoản.
- Gán vai trò.

## FR-04 – Coach Management

Center Manager có thể:

- Thêm huấn luyện viên.
- Cập nhật thông tin.
- Xem chuyên môn.
- Xem lịch làm việc.
- Phân công huấn luyện viên vào lớp.

---

# 7. Sport Management

## FR-05 – Sport Management

Center Manager có thể quản lý các bộ môn.

Ví dụ:

- Gym.
- Yoga.
- Boxing.
- Swimming.
- Badminton.
- Basketball.
- Aerobic.

Mỗi bộ môn có:

- Tên.
- Mô tả.
- Trạng thái.

---

# 8. Room Management

## FR-06 – Room Management

Center Manager có thể:

- Tạo phòng tập.
- Cập nhật phòng.
- Thay đổi trạng thái phòng.
- Xem lịch sử dụng phòng.

Thông tin phòng gồm:

- Room ID.
- Tên phòng.
- Vị trí.
- Sức chứa.
- Loại phòng.
- Trạng thái.

---

# 9. Class Management

## FR-07 – Class Management

Center Manager có thể:

- Tạo lớp.
- Chỉnh sửa lớp.
- Hủy lớp.
- Phân công Coach.
- Chọn phòng.
- Thiết lập sức chứa.

Thông tin lớp gồm:

- Class ID.
- Tên lớp.
- Bộ môn.
- Coach.
- Room.
- Capacity.
- Trạng thái.

---

# 10. Class Schedule

## FR-08 – Schedule Management

Center Manager có thể tạo lịch cho lớp.

Một lịch học gồm:

- Lớp.
- Huấn luyện viên.
- Phòng.
- Ngày.
- Giờ bắt đầu.
- Giờ kết thúc.

Hệ thống phải kiểm tra xung đột lịch.

Không cho phép:

- Một Coach dạy hai lớp cùng thời điểm.
- Một phòng được sử dụng bởi hai lớp cùng thời điểm.

---

# 11. Class Registration

## FR-09 – Class Registration

Member có thể:

- Xem lớp.
- Xem lịch.
- Đăng ký.
- Hủy đăng ký.

Receptionist có thể thực hiện đăng ký/hủy đăng ký thay cho Member.

### Business Rules

Member chỉ được đăng ký khi:

- Tài khoản đang hoạt động.
- Gói thành viên còn hiệu lực.
- Gói cho phép tham gia lớp đó.
- Lớp chưa đầy.
- Không bị trùng lịch.

---

# 12. Membership Package

## FR-10 – Membership Package Management

Center Manager có thể quản lý các gói thành viên.

Thông tin gói:

- Package ID.
- Tên gói.
- Giá.
- Thời hạn.
- Mô tả.
- Quyền lợi.
- Trạng thái.

Ví dụ:

- Monthly Package.
- 3-Month Package.
- 6-Month Package.
- Annual Package.

---

# 13. Membership Subscription

## FR-11 – Package Subscription

Member có thể:

- Xem gói.
- Đăng ký.
- Gia hạn.

Receptionist có thể thực hiện nghiệp vụ tại quầy.

Subscription gồm:

- Member.
- Package.
- Start Date.
- End Date.
- Price.
- Status.

Các trạng thái đề xuất:

- Pending.
- Active.
- Expired.
- Cancelled.

---

# 14. Payment

## FR-12 – Payment Management

Hệ thống quản lý thanh toán cho:

- Gói thành viên.
- Gia hạn gói.
- Các dịch vụ có thu phí khác nếu được cấu hình.

Thông tin thanh toán:

- Payment ID.
- Member.
- Amount.
- Payment Method.
- Payment Date.
- Payment Status.
- Reference.

Receptionist có thể ghi nhận thanh toán tại quầy.

---

# 15. Invoice

## FR-13 – Invoice Management

Sau khi thanh toán thành công, hệ thống có thể tạo hóa đơn.

Receptionist có thể:

- Xem hóa đơn.
- In hóa đơn.
- Xuất hóa đơn.

---

# 16. Attendance

## FR-14 – Attendance Management

Receptionist có thể điểm danh Member khi đến trung tâm.

Coach có thể điểm danh học viên trong lớp.

Attendance gồm:

- Member.
- Class/Schedule.
- Check-in Time.
- Attendance Status.
- Recorded By.

Member có thể xem lịch sử điểm danh của mình.

---

# 17. Training Plan

## FR-15 – Training Plan Management

Coach có thể tạo kế hoạch tập luyện.

Có hai loại:

### Individual Plan

Dành cho một Member cụ thể.

### Class Plan

Dành cho toàn bộ lớp.

Training Plan có:

- Mục tiêu.
- Bài tập.
- Số hiệp.
- Số lần.
- Thời lượng.
- Ghi chú.
- Ngày bắt đầu.
- Ngày kết thúc.

---

# 18. Training Result

## FR-16 – Training Result Management

Sau mỗi buổi tập, Coach có thể ghi nhận:

- Bài tập đã hoàn thành.
- Kết quả.
- Mức độ hoàn thành.
- Nhận xét.
- Đánh giá tiến độ.

Member có thể xem kết quả của mình.

---

# 19. Notification

## FR-17 – Notification Management

Hệ thống hỗ trợ thông báo về:

- Lịch học.
- Thay đổi lịch.
- Hủy lớp.
- Đăng ký lớp thành công.
- Gói sắp hết hạn.
- Gói đã hết hạn.
- Kế hoạch tập luyện mới.
- Nhận xét mới.
- Thông báo từ Coach.

---

# 20. Support Request

## FR-18 – Support Request

Receptionist có thể ghi nhận yêu cầu hỗ trợ từ Member.

Thông tin:

- Member.
- Tiêu đề.
- Nội dung.
- Thời gian tạo.
- Người tiếp nhận.
- Trạng thái.
- Nội dung xử lý.

Trạng thái:

- Open.
- In Progress.
- Resolved.
- Closed.

---

# 21. AI Features

## FR-19 – AI Exercise Recommendation

Coach có thể yêu cầu AI gợi ý bài tập dựa trên:

- Mục tiêu.
- Trình độ.
- Lịch sử tập luyện.
- Kết quả trước đó.

Kết quả AI là đề xuất tham khảo và không tự động thay đổi Training Plan.

## FR-20 – Member AI Assistant

Member có thể hỏi AI về:

- Lịch tập.
- Lớp học.
- Bài tập.
- Thông tin dịch vụ của trung tâm.

AI chỉ được truy cập dữ liệu mà Member có quyền xem.

---

# 22. Reports

## FR-21 – Dashboard & Reports

Center Manager có thể xem:

### Member Report

- Tổng số Member.
- Member mới.
- Member đang hoạt động.
- Member hết hạn.

### Class Report

- Số lớp.
- Số lượt đăng ký.
- Tỷ lệ tham gia.
- Số lượng học viên theo lớp.

### Revenue Report

- Doanh thu theo ngày.
- Doanh thu theo tháng.
- Doanh thu theo năm.
- Doanh thu theo gói thành viên.

Có thể lọc theo khoảng thời gian.

---

# 23. Authorization

## FR-22 – Role-Based Access Control

Hệ thống sử dụng Role-Based Access Control.

| Feature | Manager | Coach | Member | Receptionist |
|---|:---:|:---:|:---:|:---:|
| Member Management | ✓ | Limited | Own | ✓ |
| Staff Management | ✓ | ✗ | ✗ | ✗ |
| Coach Management | ✓ | Own | View | View |
| Sport Management | ✓ | View | View | View |
| Room Management | ✓ | View | View | View |
| Class Management | ✓ | Assigned | View | View |
| Class Registration | View | View | Own | ✓ |
| Membership Package | ✓ | View | View/Buy | ✓ |
| Attendance | View | ✓ | Own | ✓ |
| Training Plan | View | ✓ | Own | View |
| Training Result | View | ✓ | Own | View |
| Payment | View | ✗ | Own | ✓ |
| Reports | ✓ | ✗ | ✗ | ✗ |
| Role Management | ✓ | ✗ | ✗ | ✗ |
| Audit Logs | ✓ | ✗ | ✗ | ✗ |

---

# 24. Audit Log

## FR-23 – Audit Logging

Hệ thống ghi nhận các thao tác quan trọng:

- Tạo/sửa/vô hiệu hóa tài khoản.
- Thay đổi quyền.
- Tạo/sửa/hủy lớp.
- Thay đổi lịch.
- Ghi nhận thanh toán.
- Thay đổi gói thành viên.

Audit Log gồm:

- User.
- Action.
- Entity.
- Entity ID.
- Timestamp.
- Description.

---

# 25. Business Rules

### BR-01
Member phải có gói hợp lệ để sử dụng các dịch vụ yêu cầu membership.

### BR-02
Không cho phép đăng ký lớp vượt quá capacity.

### BR-03
Không cho phép Member đăng ký hai lịch học bị trùng thời gian.

### BR-04
Không cho phép Coach được phân công hai lớp trùng thời gian.

### BR-05
Không cho phép một Room có hai lớp trùng thời gian.

### BR-06
Member không thể điểm danh vào lớp mà mình không đăng ký, trừ trường hợp được nghiệp vụ trung tâm cho phép.

### BR-07
Chỉ Coach được phân công mới được cập nhật kết quả tập luyện của lớp đó.

### BR-08
Member chỉ được xem dữ liệu tập luyện của chính mình.

### BR-09
Receptionist không được thay đổi Role/Permission.

### BR-10
AI không tự động thay đổi Training Plan.

### BR-11
Các thao tác quản trị quan trọng phải được ghi Audit Log.

### BR-12
Thanh toán thành công mới kích hoạt/gia hạn membership nếu quy trình yêu cầu thanh toán.

---

# 26. Non-Functional Requirements

## Security

- Authentication.
- Authorization.
- Role-Based Access Control.
- Password hashing.
- Token expiration.
- Input validation.
- Không trả dữ liệu nhạy cảm không cần thiết.
- Bảo vệ API khỏi truy cập trái phép.

## Performance

Các API thông thường nên phản hồi trong thời gian hợp lý dưới tải dự kiến của trung tâm.

Các danh sách lớn phải hỗ trợ:

- Pagination.
- Search.
- Filtering.
- Sorting.

## Reliability

Hệ thống phải đảm bảo tính nhất quán của:

- Đăng ký lớp.
- Capacity.
- Membership.
- Attendance.
- Payment.

## Maintainability

Hệ thống cần phân tách rõ:

- Presentation/API.
- Business Logic.
- Data Access.
- Infrastructure.

## Usability

Giao diện cần:

- Responsive.
- Dễ sử dụng.
- Điều hướng rõ ràng.
- Dashboard riêng theo Role.

---

# 27. Main Modules

Hệ thống được chia thành các module:

1. Authentication & Authorization
2. User Management
3. Member Management
4. Coach Management
5. Staff Management
6. Sport Management
7. Room Management
8. Class Management
9. Schedule Management
10. Class Registration
11. Membership Package
12. Membership Subscription
13. Payment & Invoice
14. Attendance
15. Training Plan
16. Training Result
17. Notification
18. Support Request
19. AI Assistant
20. Reporting
21. Audit Log

---

# 28. Product Scope Summary

Sports Center Management System cung cấp một nền tảng tập trung để quản lý toàn bộ hoạt động cơ bản của trung tâm thể thao.

Luồng nghiệp vụ chính:

Member
→ đăng ký tài khoản
→ chọn gói thành viên
→ thanh toán
→ membership được kích hoạt
→ xem lớp
→ đăng ký lớp
→ tham gia lớp
→ điểm danh
→ thực hiện kế hoạch tập luyện
→ Coach ghi nhận kết quả
→ Member theo dõi tiến độ.

Center Manager quản lý tài nguyên, con người, lớp học và theo dõi báo cáo.

Receptionist hỗ trợ nghiệp vụ trực tiếp tại trung tâm.

Coach chịu trách nhiệm về hoạt động chuyên môn và quá trình tập luyện của Member.

AI đóng vai trò trợ lý hỗ trợ, không thay thế quyết định chuyên môn của Coach.
