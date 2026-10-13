# SPRINT 2 — CLASS BOOKING & SCHEDULE MANAGEMENT

**Project:** Sports Center Management System (SCMS)  
**Sprint:** 2 — Flow 2: Class booking and schedule management (**bắt buộc**)  
**Ngày lập:** 09/10/2026  
**Thời gian đề xuất:** 12/10/2026–25/10/2026, gồm 10 ngày làm việc  
**Trạng thái:** Kế hoạch đề xuất để nhóm thống nhất, chưa phải cam kết tiến độ hoặc phân công đã được duyệt.

## 1. Mục tiêu sprint

Hoàn thiện luồng: **Manager tạo bộ môn/phòng/lớp → lập lịch và phân công Coach → Member hoặc Receptionist đăng ký/hủy buổi học → Member xem lịch cá nhân → Coach xem lịch dạy và danh sách học viên.**

Cuối sprint, luồng này phải sử dụng API và dữ liệu lưu tại backend, kiểm tra quyền và quy tắc nghiệp vụ phía server. Giao diện mock hoặc chạy được riêng FE chưa đủ để nghiệm thu.

Kế hoạch kế thừa cách trình bày của [Sprint1.md](Sprint1.md), yêu cầu FR-04–FR-09, FR-17, FR-22 và FR-23 trong [PRODUCT.md](PRODUCT.md), cùng mô hình lớp/lịch/đăng ký trong [DESIGN.md](DESIGN.md). Quy ước triển khai theo [AGENTS.md](AGENTS.md).

## 2. Cơ sở lập kế hoạch và phần kế thừa

Đối chiếu source ngày 09/10/2026:

| Thành phần | Hiện trạng quan sát | Cách dùng trong Sprint 2 |
| --- | --- | --- |
| FE, commit `4380016` trên nhánh Minh tại thời điểm đọc | Đã có apiClient và các service gọi API cho auth, Member, nhân sự, membership, audit | Tái sử dụng client, xác thực, xử lý lỗi, Toast và validation; không làm lại Sprint 1 |
| FE `src/services/receptionService.ts` | Buổi học mẫu và booking vẫn lưu LocalStorage; `hasAccess` hiện chỉ kiểm tra memberId có giá trị, chưa xác minh membership | Thay đường đi đặt/hủy lớp bằng API; không coi kiểm tra gói hiện tại là đã hoàn thành |
| FE `src/pages/DashboardPreview.tsx` | Coach mới có trang chào | Bổ sung lịch dạy/lớp phụ trách và danh sách học viên |
| BE checkout MinhBE, commit `101e2a6` | Có controller auth/account/member/coach/receptionist/package/subscription/invoice/audit; chưa thấy controller hoặc entity bộ môn/phòng/lớp/lịch/booking | Bổ sung domain Flow 2, dùng lại tài khoản, Coach và membership hiện có |
| PRODUCT/DESIGN | Một số phần hiện trạng vẫn ghi ngày 27–28/09 | Dùng làm nguồn yêu cầu; không dùng snapshot cũ để kết luận API hiện tại chưa có |

Đây là kiểm tra source cục bộ, chưa nghiệm thu API với DB đang chạy. FE đã pull upstream của nhánh Minh trước khi lập tài liệu; BE được đọc từ checkout cục bộ, không khẳng định là mọi nhánh remote mới nhất.

**Điều kiện bắt đầu:** xác nhận auth/role, danh sách Coach, Member và dữ liệu membership có thể dùng trong môi trường tích hợp. Lỗi tồn đọng Sprint 1 được lập issue riêng và báo người phụ trách; không ngầm coi Sprint 1 đã nghiệm thu toàn bộ.

## 3. Phạm vi và ưu tiên

- **P0 — cam kết đề xuất:** UC17–UC30, tạo thành luồng Flow 2 hoàn chỉnh, bao gồm kiểm thử tích hợp trong từng UC.
- **P1 — chỉ nhận thêm khi P0 bảo đảm:** UC31–UC32, thông báo trong ứng dụng và tra cứu audit cho thay đổi lớp/lịch. Việc ghi audit các thao tác quan trọng vẫn là điều kiện P0; UC32 bổ sung bộ lọc/giao diện tra cứu chuyên biệt.
- **Ngoài sprint:** điểm danh, kế hoạch/kết quả tập luyện (Flow 4), AI (Flow 5–6), cổng thanh toán, hoàn tiền tự động, waitlist, lịch lặp tự động, kéo-thả lịch và báo cáo doanh thu mới.
- **Flow 3 vẫn bắt buộc của dự án:** báo cáo và các phần thanh toán còn thiếu phải có kế hoạch sprint tiếp theo; việc chưa đưa vào Sprint 2 không chuyển chúng thành tùy chọn.

Mã UC17–UC32 và SCMS-17–SCMS-32 dưới đây là **mã dự kiến nối tiếp 16 UC Sprint 1**, chưa tạo issue trên hệ thống quản lý công việc. Nếu mã đã được dùng, nhóm đổi mã trước khi tạo ticket.

## 4. Sprint 2 — Swimlane

Mỗi hàng gồm cả phát triển và kiểm thử. Level là ước lượng tương đối, không phải số ngày. Phân công BE/FE là đề xuất dựa theo danh sách thành viên Sprint 1.

| UC | Fun/Screen | Level | BE | FE | Sprint | From–To | Business Rule / Tiêu chí nghiệm thu |
| ---: | --- | --- | --- | --- | ---: | --- | --- |
| 17 | Manage Sports — Manager | Medium | Huy | Long | 2 | 12–14/10 | Thêm/sửa/ẩn bộ môn; tên không trùng sau chuẩn hóa; không xóa dữ liệu đã được lớp tham chiếu. Bộ môn ngừng hoạt động không dùng tạo lớp mới. |
| 18 | Manage Rooms — Manager | Medium | Phuc | Tam | 2 | 12–14/10 | Tên, vị trí, sức chứa, trạng thái; sức chứa nguyên dương; phòng không hoạt động không dùng cho lịch mới. Không hạ sức chứa làm lịch hiện có không hợp lệ. |
| 19 | Manage Classes — Manager | Medium | Huy | Minh | 2 | 13–16/10 | Tạo/sửa/xem lớp với bộ môn, tên, mô tả, sức chứa, trạng thái; không xóa lịch sử đăng ký. Lớp chỉ mở đặt chỗ khi có buổi học hợp lệ. |
| 20 | Assign Coach — Manager | Medium | Phuc | Tam | 2 | 14–16/10 | Chọn Coach đang hoạt động cho từng buổi; lưu bằng ID. Đổi Coach phải kiểm tra trùng giờ; thất bại không ghi một phần. |
| 21 | Create/Update Class Schedule — Manager | Complex | Huy | Minh | 2 | 14–19/10 | Chọn lớp, Coach, phòng, ngày/giờ; bắt đầu < kết thúc; chống trùng Coach/phòng; sức chứa không vượt giới hạn lớp/phòng. Đổi lịch đã có đăng ký phải kiểm tra xung đột và quyền gói của học viên. |
| 22 | View Center Schedule — Manager/Receptionist | Medium | Phuc | Long | 2 | 15–19/10 | Xem lịch theo ngày/tuần; lọc bộ môn, Coach, phòng, trạng thái; có trạng thái rỗng/lỗi và số chỗ còn lại từ server. |
| 23 | View Classes & Sessions — Member | Medium | Phuc | Long | 2 | 15–19/10 | Xem/lọc lớp mở đăng ký và buổi sắp tới; chi tiết Coach, phòng, thời gian, số chỗ; không cho đăng ký buổi đã bắt đầu hoặc bị hủy. |
| 24 | Register Class Session — Member | Complex | Huy | Minh | 2 | 16–21/10 | Kiểm tra Member active, gói hợp lệ vào ngày học, quyền tham gia, còn chỗ, không trùng buổi/giờ. Server chống vượt sức chứa khi hai người đặt chỗ cuối đồng thời. |
| 25 | Cancel Class Registration — Member | Medium | Huy | Minh | 2 | 19–21/10 | Chỉ hủy đăng ký của mình trước giờ bắt đầu theo chính sách đề xuất; giữ lịch sử, trả lại chỗ; gửi lặp không hoàn chỗ hai lần. |
| 26 | My Class Schedule — Member | Medium | Phuc | Long | 2 | 19–21/10 | Hiển thị buổi đã đăng ký theo tuần/danh sách, trạng thái hủy và thông tin Coach; không xem được lịch riêng của Member khác qua thay ID. |
| 27 | My Teaching Schedule — Coach | Medium | Phuc | Tam | 2 | 19–21/10 | Coach xem đúng buổi được phân công, lịch ngày/tuần và thay đổi mới nhất; không sửa lịch do Manager quản lý. |
| 28 | View Assigned Class Members — Coach | Medium | Phuc | Tam | 2 | 20–22/10 | Chỉ xem roster của buổi phụ trách; phân trang, tìm học viên; trả thông tin cơ bản cần thiết, không lộ thanh toán/password hoặc hồ sơ ngoài phạm vi. |
| 29 | Register/Cancel Class at Counter — Receptionist | Complex | Huy | Minh | 2 | 20–22/10 | Tìm Member rồi đăng ký/hủy thay bằng API, áp dụng cùng quy tắc UC24/25; lưu người thao tác, lý do hủy; bỏ nguồn booking LocalStorage khỏi luồng thật. |
| 30 | Cancel Session/Class — Manager | Medium | Huy | Minh | 2 | 20–22/10 | Hủy buổi tương lai hoặc mọi buổi tương lai của lớp bằng thao tác rõ phạm vi; hủy đăng ký liên quan nguyên tử, giữ lịch sử, chặn đặt mới. Không tự hoàn tiền gói tập. |
| 31 | Class Change Notifications — Member/Coach | Medium | Phuc | Long | 2 | 22–23/10, P1 | Thông báo trong ứng dụng khi lịch/Coach/phòng thay đổi hoặc hủy; chỉ người liên quan nhận; tránh trùng do retry; có trạng thái đã đọc. Không bao gồm email/push. |
| 32 | Class & Schedule Audit Filters — Manager | Medium | Huy | Tam | 2 | 22–23/10, P1 | Mở rộng tra cứu audit theo lớp/buổi/người/thời gian; ghi rõ hành động và thay đổi quan trọng; không cho sửa/xóa log từ UI. |

**23/10:** nghiệm thu tích hợp, regression, sửa lỗi và demo P0. **24–25/10:** khoảng kết thúc sprint, không giả định nhóm làm thêm cuối tuần để bù quá tải. Nếu đến 21/10 đường đi P0 chưa chạy được, bỏ P1 khỏi cam kết và cập nhật tiến độ ngay.

## 5. Team Distribution — đề xuất

### BE Team

| Name | P0 | P1 | Tổng UC nếu nhận đủ |
| --- | --- | --- | ---: |
| Huy | SCMS-17, 19, 21, 24, 25, 29, 30 | SCMS-32 | 8 |
| Phuc | SCMS-18, 20, 22, 23, 26, 27, 28 | SCMS-31 | 8 |

### FE Team

| Name | P0 | P1 | Tổng UC nếu nhận đủ |
| --- | --- | --- | ---: |
| Minh | SCMS-19, 21, 24, 25, 29, 30 | — | 6 |
| Long | SCMS-17, 22, 23, 26 | SCMS-31 | 5 |
| Tam | SCMS-18, 20, 27, 28 | SCMS-32 | 5 |

Số UC không phản ánh ngang nhau về khối lượng: Huy/Minh giữ các phần khó về lịch và booking. Ngày đầu cần ước lượng lại theo giờ khả dụng; giảm P1 hoặc chuyển nguyên module cho người khác nếu quá tải, không chia cùng file cho nhiều người. Không tự điều chỉnh phân công Sprint 1: tài liệu Sprint 1 hiện có lệch UC3/UC5 giữa Swimlane và Team Distribution.

### Phần việc của Minh trong Sprint 2

1. Trang quản lý lớp và form tạo/sửa lớp (UC19).
2. Form lập/sửa buổi học; hiển thị lỗi trùng Coach/phòng và lỗi lịch đã có học viên (UC21).
3. Component đăng ký/hủy dùng trên chi tiết buổi học của Member (UC24/25); Long sở hữu trang danh sách/chi tiết, Minh bàn giao component để ghép.
4. Thay luồng đặt/hủy lớp tại quầy bằng API, tái sử dụng tìm Member (UC29).
5. Dialog xác nhận hủy buổi/lớp và hiển thị số đăng ký bị ảnh hưởng (UC30).
6. Test mapping DTO, trạng thái loading/error và phối hợp test tích hợp cho các UC trên.

Không tính check-in, hỗ trợ tại quầy, thu tiền hoặc AI thành phần việc mới của Minh trong sprint này.

## 6. Quy tắc nghiệp vụ cần thống nhất trước triển khai

Các mục sau là cơ sở đề xuất; nhóm cần chốt tại buổi planning, không ngầm biến thành chính sách đã được người dùng duyệt.

| Quyết định | Đề xuất Sprint 2 | Tác động |
| --- | --- | --- |
| Đơn vị đăng ký | Một registration cho một Member + một buổi (schedule), không đăng ký tự động cả khóa | Rõ điều kiện gói, sức chứa và hủy theo buổi |
| Gán Coach/phòng | Lưu tại buổi; lớp có thể có nhiều buổi và Coach khác nhau | Không nhân bản account hoặc dùng tên làm khóa |
| Trùng giờ | Khoảng [start, end); buổi kết thúc 09:00 không trùng buổi bắt đầu 09:00 | Dùng chung quy tắc cho Coach, phòng và Member |
| Thời gian | Hiển thị ngày/giờ trung tâm Asia/Ho_Chi_Minh; timestamp API có offset/UTC rõ ràng | Server quyết định mốc bắt đầu/hạn hủy, không tin giờ máy khách |
| Gói hợp lệ | Gói đã thanh toán, không tạm ngưng, bao phủ ngày diễn ra buổi; tài khoản còn hoạt động | Pending hoặc gói hết trước ngày học phải bị từ chối |
| Quyền bộ môn | Chốt ALL hoặc danh sách sportId được gói cho phép; không suy từ benefits dạng chữ | Nếu có giới hạn, bổ sung quan hệ package–sport và cách cấu hình trước UC24 |
| Học phí lớp | Sprint 2 đề xuất chỉ đặt chỗ trong quyền lợi gói, chưa thu riêng theo lớp | Nếu thu riêng cần phối hợp Flow 3 và ước lượng lại |
| Hạn hủy | Member/lễ tân được hủy trước giờ bắt đầu; không áp dụng phạt/hoàn tiền tự động | Nếu trung tâm cần mốc 2h/24h thì chốt trước khi viết API |
| Đổi lịch có người đăng ký | Kiểm tra lại xung đột Member, Coach, phòng và membership; từ chối khi có người không còn hợp lệ | Không âm thầm chuyển học viên vào lịch không thể tham gia |
| Giảm sức chứa | Không nhỏ hơn số đăng ký còn hiệu lực; không vượt giới hạn lớp/phòng | Chặn cả khi sửa lớp/phòng làm ảnh hưởng lịch có sẵn |
| Quyền đăng ký thay | Receptionist; Manager quản lý/hủy lớp, không mặc định được đặt thay | Nếu muốn giữ Manager dùng màn hình tại quầy, phải thống nhất quyền server |

Nếu chưa thể chốt quyền gói hoặc học phí riêng, ghi blocker cho UC24/29. Không thay bằng điều kiện “có memberId là hợp lệ”. Không nhận tiền thật cho booking chưa có quy tắc thu phí.

## 7. Đầu việc backend và contract bàn giao

**Đây là danh sách năng lực API cần xây, chưa phải endpoint đã tồn tại.** Ngày đầu hai nhóm chốt URL/DTO trong OpenAPI theo quy ước backend hiện hành; không tự dùng `/api/v1` chỉ vì DESIGN có ví dụ.

| Nhóm | API cần cung cấp | Điều kiện bàn giao |
| --- | --- | --- |
| Bộ môn/phòng | Danh sách, chi tiết, tạo, sửa, trạng thái | Pagination/filter, validation, kiểm tra tham chiếu và quyền Manager |
| Lớp | Danh sách/chi tiết cho từng role; tạo/sửa/trạng thái/hủy | sportId, capacity, trạng thái; không lộ dữ liệu quản trị cho Member |
| Buổi học | Tạo/sửa/hủy; lọc khoảng ngày, Coach, phòng, lớp | ID quan hệ, giờ có timezone, bookedCount/remainingCapacity do server tính |
| Booking | Đăng ký/hủy của tôi; đăng ký/hủy tại quầy | Ownership, quyền gói, capacity, duplicate, giao dịch đồng thời và retry |
| Lịch/roster | Lịch của tôi cho Member/Coach; roster theo buổi | Lấy danh tính từ token; kiểm tra phân công Coach phía server |
| Audit | Ghi thao tác tạo/sửa/hủy/phân công/booking | Actor từ token, entityId, thời gian, lý do; không chứa dữ liệu bí mật |
| Notification, P1 | Danh sách của tôi, đánh dấu đã đọc | Chỉ người nhận; sự kiện đổi lịch/hủy không gửi trùng |

Contract phải mô tả kiểu ID, enum trạng thái, bộ lọc, thứ tự sắp xếp, phân trang mặc định 20, HTTP status và lỗi có cấu trúc. Lỗi theo quy ước dự án `{ success, error: { code, message, details }, traceId }`; FE dịch code bằng `apiErrors.ts`.

Mã lỗi đề xuất: `CLASS_FULL`, `DUPLICATE_REGISTRATION`, `MEMBER_SCHEDULE_CONFLICT`, `COACH_SCHEDULE_CONFLICT`, `ROOM_SCHEDULE_CONFLICT`, `MEMBERSHIP_NOT_VALID_FOR_SESSION`, `PACKAGE_NOT_ELIGIBLE`, `SESSION_ALREADY_STARTED`, `SESSION_CANCELLED`. Chốt danh sách trong contract trước khi thêm mapping FE.

Booking phải có constraint chống trùng đang hiệu lực và cơ chế xử lý slot cuối phù hợp SQL Server (locking/isolation hoặc optimistic concurrency có retry). Bọc transaction đơn thuần không đủ chứng minh chống vượt sức chứa. Không giảm/tăng bộ đếm chỗ lần nữa khi retry hủy/đặt lại cùng request.

## 8. Chia file để tránh conflict

- **Minh:** nhóm trang/form quản lý lớp/lập lịch, component hành động booking, service mutation booking/class; chỉ thay nhánh chức năng lớp trong ReceptionOperationsPage, không sửa kèm attendance/support.
- **Long:** nhóm danh mục bộ môn, trang xem lịch trung tâm, danh sách/chi tiết lớp cho Member, lịch cá nhân và thông báo P1.
- **Tam:** nhóm phòng, component phân công Coach, lịch/roster Coach và tra cứu audit P1.
- **File dùng chung:** chỉ định một người ghép `App.tsx` (đề xuất Minh); Long tổng hợp `navSections` trong `navigation.ts`. Không thêm nav trực tiếp vào WorkspaceLayout.
- Ngày đầu chốt một người sở hữu mỗi file types/service dùng chung. Component do Minh bàn giao được Long import vào page, không đồng thời sửa page của Long.
- CSS mới thêm cuối file đúng khu vực và dùng tokens; thay đổi `tokens.css`, `validation.ts`, `apiErrors.ts` cần phối hợp người đang giữ file. Không refactor toàn bộ CSS/client trong sprint này.

Tái sử dụng `apiClient`, `describeError`, `fieldErrorsOf`, `validation.ts`, `useToast`, Dialog/ConfirmDialog và chính sách quyền hiện có. Khi chưa có API, có thể dùng fixture test theo contract; không đánh dấu UC Done nếu màn hình vẫn dựa trên fixture/LocalStorage.

## 9. Mốc bàn giao

| Ngày | Đầu ra |
| --- | --- |
| 12/10 | Chốt chính sách mục 6, năng lực nhóm, file owner, schema/DTO/error, dữ liệu test và API Sprint 1 phụ thuộc |
| 13–14/10 | Danh mục bộ môn/phòng; schema lớp/buổi/booking; FE dựng theo contract đã thống nhất |
| 15–16/10 | Tạo lớp/lịch, phân công Coach và danh sách buổi nối API; test trùng Coach/phòng |
| 19–20/10 | Member đăng ký/hủy, lịch cá nhân và lịch Coach; chạy test slot cuối/ownership |
| 21–22/10 | Tích hợp tại quầy, roster, hủy/đổi lịch, audit; quyết định có nhận P1 không |
| 23/10 | Regression Sprint 1 + Flow 2, kiểm tra responsive, demo và ghi biên bản nghiệm thu |

Nếu API trễ: FE hoàn thiện component/test theo contract nhưng báo trạng thái “chờ tích hợp”. Nếu auth/membership còn blocker, ưu tiên xử lý phụ thuộc qua ticket riêng trước booking; không mở rộng sang AI để thay mục tiêu.

## 10. Kịch bản nghiệm thu tối thiểu

1. Manager tạo bộ môn, phòng, lớp và một buổi; Member thấy đúng thông tin sau tải lại.
2. Tạo/sửa buổi trùng phòng hoặc Coach bị từ chối; không ghi một phần. Hai buổi liền kề không bị báo trùng.
3. Member đủ quyền đặt thành công, số chỗ giảm đúng một; xuất hiện trên lịch cá nhân và roster Coach.
4. Member inactive, gói pending/expired/suspended hoặc hết hạn trước ngày học không đặt được; gói không có quyền bộ môn bị từ chối nếu dùng entitlement.
5. Đăng ký trùng buổi hoặc trùng giờ bị chặn; hai request đồng thời tranh chỗ cuối chỉ một người đặt thành công.
6. Member hủy trước giờ học thì chỗ được trả lại một lần; retry không tạo tác dụng phụ; hủy sau mốc bị từ chối.
7. Lễ tân đặt/hủy thay Member được ghi đúng actor; lỗi gói/đầy lớp giống luồng tự đăng ký.
8. Coach chỉ xem lịch/roster được phân công; thay ID trong HTTP không lấy được dữ liệu ngoài quyền. Member không xem/hủy booking người khác.
9. Đổi lịch kiểm tra học viên đang đăng ký; hủy lớp/buổi giữ lịch sử, không để booking còn hiệu lực trên buổi đã hủy. Thao tác quan trọng có audit.
10. FE hiển thị lỗi dưới ô phù hợp, Toast tiếng Việt, xử lý 401/403/lỗi mạng; refresh sau thao tác không làm nhảy về đầu trang.
11. Kiểm tra thực tế ở 1280px và 375px; danh sách rỗng, đầy lớp, nhiều trang và tên dài vẫn dùng được.
12. Regression login/logout, hồ sơ, membership, xác nhận thu tiền và audit Sprint 1; không làm thay đổi dữ liệu tiền/gói do sửa booking.

P1 nếu nhận: thay đổi/hủy lịch tạo thông báo đúng người, retry không trùng; Manager lọc được audit lớp/buổi và không xóa log.

## 11. Definition of Done và nội dung demo

- [ ] Business rule được kiểm tra ở server, có lưu DB và route UI đúng role.
- [ ] FE dùng API thật cho UC nghiệm thu; reload và đăng nhập lại vẫn thấy dữ liệu.
- [ ] Có test hàm utils và mapping DTO; BE test quyền, biên thời gian, concurrency và rollback theo nghiệp vụ.
- [ ] `npm run build`, `npm run lint`, `npm test` đạt, không thêm warning mới; BE chạy build/test phù hợp và báo rõ lỗi còn tồn tại.
- [ ] Đã xem giao diện thật ở 1280px/375px, không nhảy layout; không hard-code secret hoặc thêm thư viện production chưa được đồng ý.
- [ ] Review đúng phạm vi, phân chia file rõ, cập nhật OpenAPI và phần tài liệu liên quan; không tự commit/push khi chưa có yêu cầu.
- [ ] UC chưa đạt ghi rõ lý do, người phụ trách, kế hoạch chuyển tiếp; không tính mock là hoàn thành.

**Demo:** Manager tạo lớp/lịch → Member đặt buổi → Coach xem roster → Receptionist hỗ trợ hủy/đặt lại → Manager đổi/hủy lịch → kiểm tra lịch Member và audit. Demo thêm một trường hợp gói không hợp lệ và một trường hợp lớp đầy. Tài khoản/dữ liệu demo lấy từ môi trường test, không ghi mật khẩu trong tài liệu.

## 12. Kiểm tra khi lập tài liệu

Trước khi thêm kế hoạch: FE build đạt; 5 file test, 54 test đạt. Đây là trạng thái nền của FE, không phải bằng chứng đã triển khai Sprint 2 hoặc đã nghiệm thu backend. Lần cập nhật này chỉ thêm tài liệu kế hoạch, không thay đổi code ứng dụng và không tạo ticket/phân công trên dịch vụ bên ngoài.
