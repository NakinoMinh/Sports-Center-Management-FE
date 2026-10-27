# SPRINT 3 — PAYMENT & REPORTING

**Project:** Sports Center Management System (SCMS)  
**Sprint:** 3 — Flow 3: Payment and report management (**bắt buộc**)  
**Ngày lập:** 25/10/2026  
**Thời gian đề xuất:** 26/10/2026–06/11/2026, 10 ngày làm việc  
**Trạng thái:** Bản kế hoạch đề xuất để nhóm thống nhất; chưa phải cam kết tiến độ, phân công hay ticket đã duyệt.

## 1. Mục tiêu sprint

Hoàn thiện luồng tài chính có thể kiểm chứng: **Member/Receptionist tạo yêu cầu gói → hệ thống lưu hóa đơn chờ thanh toán → nhân viên xác nhận tiền mặt trên dữ liệu backend → hóa đơn và gói cập nhật nguyên tử → Manager xem báo cáo doanh thu và tình hình hội viên từ dữ liệu đã lưu.**

Kết thúc Sprint 3, không được dùng LocalStorage làm nguồn cho thanh toán hoặc doanh thu. Chỉ hóa đơn đã PAID được tính vào doanh thu; hóa đơn chờ, đã hủy hoặc giao dịch lỗi không được cộng. Việc chọn CARD/BANK_TRANSFER chưa phải bằng chứng đã thu tiền.

Kế hoạch bám phạm vi chính thức tại [PRODUCT.md](PRODUCT.md) và [DESIGN.md](DESIGN.md), nối tiếp [Sprint 1](Sprint1.md) và [Sprint 2](Sprint2.md), cùng README/API hiện có ở hai repository FE/BE. Trước planning, nhóm phải xác nhận lại branch và source commit đang dùng; trạng thái source có thể thay đổi sau ngày lập tài liệu.

## 2. Cơ sở lập kế hoạch và giả định

| Quan sát từ source/tài liệu | Tác động đến Sprint 3 |
| --- | --- |
| README FE ghi màn hình xác nhận tiền mặt đang mô phỏng và một số trạng thái thanh toán lưu ở LocalStorage; `CashPaymentsPage` hiện gọi API nhưng phần mô tả UI vẫn nói dữ liệu demo. | Ưu tiên rà lại toàn bộ luồng FE, bỏ adapter demo khỏi luồng thu tiền thật và xác minh read-after-write qua API. |
| BE hiện có MembershipInvoice list/pay/receipt/cancel và tạo đơn thành viên; xác nhận tiền mặt đã được triển khai. | Không tạo API trùng. Kiểm tra contract, quyền, concurrency, cập nhật subscription và tích hợp lại FE. |
| README nêu CARD/BANK_TRANSFER chưa có đối soát; không có căn cứ để coi chúng là thanh toán hoàn tất. | Chỉ nghiệm thu CASH trong P0. Cổng thanh toán và webhook là dự án/ticket riêng sau khi chọn nhà cung cấp. |
| Báo cáo doanh thu Flow 3 chưa có bằng chứng trong controller hiện tại. | Thiết kế endpoint tổng hợp chỉ từ invoice PAID và kiểm tra bằng truy vấn SQL/test, tránh tính từ trạng thái FE. |
| Nhiều file FE/BE hiện có thay đổi cục bộ ở thời điểm lập tài liệu. | Trước khi bắt đầu, từng người xác nhận file owner và nhánh chung; không ghi đè thay đổi đang làm. |

Đây là kế hoạch từ việc đọc source và tài liệu cục bộ, không phải xác nhận nghiệm thu đầy đủ mọi luồng thanh toán hiện tại. Lỗi hoặc thiếu sót ngoài phạm vi được ghi vào backlog, chỉ kéo vào Sprint 3 khi PO/nhóm thống nhất ưu tiên.

## 3. Phạm vi và ưu tiên

- **P0 đề xuất:** UC33–UC38: tích hợp đăng ký thành viên tại quầy, thu tiền mặt qua backend, tra cứu hóa đơn, báo cáo Member, lớp/đăng ký và doanh thu.
- **P1 nếu P0 đã ổn định:** UC39: xuất CSV báo cáo với cùng quyền, filter và tổng số đã được API xác nhận.
- **Ngoài Sprint 3:** thu tiền CARD/BANK_TRANSFER trực tuyến, tích hợp nhà cung cấp và webhook, hoàn tiền, hóa đơn thuế điện tử, đối soát ngân hàng tự động, dự báo AI, điểm danh/kế hoạch tập Flow 4 và AI Flow 5–6.
- Mã UC33–UC39 là mã đề xuất nối tiếp UC32. Kiểm tra sổ issue trước khi tạo, đổi mã nếu đã được dùng.

## 4. Sprint 3 — Swimlane đề xuất

Ước lượng mức độ là tương đối; mỗi UC bao gồm implementation, test và tích hợp. Phân công là gợi ý theo nhóm ở Sprint 1–2, cần xác nhận năng lực thực tế trong planning.

| UC | Fun/Screen | Level | BE đề xuất | FE đề xuất | From–To | Business Rule / Tiêu chí nghiệm thu |
| ---: | --- | --- | --- | --- | --- | --- |
| 33 | Counter Member Registration & Order | Medium | Phuc | Long | 26–28/10 | Receptionist tạo member và yêu cầu gói bằng API; kiểm tra trùng email/phone, gói active, giá được đọc từ server; tạo member + subscription pending + invoice trong cùng transaction; lỗi không để lại dữ liệu dở dang; không hiển thị/lưu mật khẩu nhạy cảm trong FE. Manager chỉ có quyền nếu chính sách hiện tại cho phép. |
| 34 | Cash Payment Confirmation | Complex | Huy | Minh | 26–30/10 | Danh sách hóa đơn CASH lấy từ API; nhân viên xác nhận đúng số tiền và invoice pending; BE xác thực actor/quyền, giá trị server và trạng thái; hai request thu đồng thời chỉ thành công một lần; retry không ghi nhận thu lần hai; PAID và CONFIRMED cập nhật nguyên tử; ghi người thu và thời gian; hóa đơn upgrade hết hạn không thể thu. |
| 35 | Invoice Search, History & Receipt | Medium | Phuc | Long | 29–30/10 | Member chỉ xem hóa đơn của mình; Receptionist/CenterManager xem theo quyền; tìm theo mã/tên/trạng thái/phương thức, phân trang; hóa đơn pending/paid/canceled hiển thị đúng lịch sử và dữ liệu receipt; không sửa lịch sử tài chính từ UI. |
| 36 | Revenue Report — Center Manager | Complex | Huy | Tam | 02–04/11 | Lọc khoảng ngày, nhóm theo ngày/tháng và phương thức được hỗ trợ; chỉ cộng invoice PAID theo thời điểm thu (`paidAt`), loại invoice hủy/pending; thống nhất múi giờ trung tâm; tổng và từng nhóm khớp truy vấn đối chiếu DB; dữ liệu chỉ dành cho CenterManager. |
| 37 | Member Report — Center Manager | Medium | Phuc | Tam | 03–04/11 | Tổng số Member, Member mới, đang hoạt động và hết hạn theo định nghĩa trạng thái server; lọc thời gian theo ngày trung tâm; Manager only. Không tự suy trạng thái hội viên từ FE. |
| 38 | Class & Registration Report — Center Manager | Medium | Huy | Tam | 04–05/11 | Số lớp, lượt đăng ký lớp và số học viên theo lớp trong khoảng đã lọc; chỉ tính trạng thái registration theo contract; Manager only. Tỷ lệ tham gia/điểm danh để sau vì attendance thuộc Flow 4 tùy chọn. |
| 39 | Export Report CSV — P1 | Simple | Huy | Long | 06/11 | Xuất đúng tập dữ liệu sau filter và quyền; xử lý tiếng Việt, ngày/tiền; không xuất PII thừa; kiểm tra CSV injection. Chỉ nhận nếu UC33–38 đạt DoD. |

**06/11:** regression Flow 1–3, demo, rà quyền và chốt các việc chuyển tiếp. Nếu UC34 hoặc chất lượng nguồn doanh thu chưa bảo đảm, hoãn UC39 và phần tùy chọn, không nới tiêu chí correctness tài chính.

## 5. Phân phối nhóm — đề xuất

### Backend

| Thành viên | Phạm vi đề xuất |
| --- | --- |
| Huy | UC34 thu tiền, UC36 doanh thu, UC38 báo cáo lớp, UC39 export; phối hợp khóa đồng thời và truy vấn tổng hợp. |
| Phuc | UC33 tạo Member tại quầy, UC35 hóa đơn/lịch sử, UC37 báo cáo Member; giữ tương thích API đang dùng. |

### Frontend

| Thành viên | Phạm vi đề xuất |
| --- | --- |
| Minh | UC34 màn hình thu tiền mặt, trạng thái xử lý/lỗi và tích hợp API. |
| Long | UC33 quy trình đăng ký tại quầy, UC35 lịch sử và receipt. |
| Tam | UC36 dashboard doanh thu, UC37 Member report, UC38 class report; UC39 nếu P1 được nhận. |

Chốt một owner cho mỗi file service dùng chung, route và bảng DTO trước khi code. Một người sở hữu việc ghép `App.tsx`/`navigation.ts` nếu cần thêm màn hình. Thay đổi schema, migration và endpoint báo cáo phải có reviewer BE; không chia cùng file cho nhiều người.

## 6. Quyết định nghiệp vụ phải chốt ngày đầu

| Chủ đề | Đề xuất mặc định | Câu hỏi cần nhóm xác nhận |
| --- | --- | --- |
| Nguồn doanh thu | Hóa đơn CASH ở trạng thái PAID; ngày ghi nhận theo `paidAt` UTC và hiển thị Asia/Ho_Chi_Minh. | Có tính phương thức khác khi chưa có đối soát không? Mặc định không. |
| Hủy/hoàn tiền | Canceled invoice không tính doanh thu; giữ audit và receipt đã thu. | Nếu có hoàn tiền thủ công, cần nghiệp vụ, trạng thái, quyền và audit riêng; không giả lập bằng sửa PAID thành CANCELED. |
| Kỳ báo cáo | Khoảng ngày bao gồm từ ngày bắt đầu đến hết ngày kết thúc theo giờ trung tâm. | Chốt quy tắc đầu/cuối khoảng và nhóm ngày/tháng. |
| Gói bị thay thế khi upgrade | Doanh thu ghi theo số tiền invoice thực thu; không cộng lại giá niêm yết gói cũ. | Chốt cách trình bày discount/credit riêng nếu cần báo cáo kế toán. |
| Tạo đơn tại quầy | Giá và điều kiện gói do BE xác định; expectedPrice chỉ dùng phát hiện giá thay đổi. | Xác nhận role được phép tạo member mới và đặt gói. |
| Dữ liệu cá nhân | Báo cáo tổng hợp, không trả email/phone trừ trường hợp nghiệp vụ rõ ràng. | Chốt quyền xem chi tiết và thời hạn lưu/xuất dữ liệu nếu áp dụng. |
| Đồng tiền | VND nguyên đồng, không số thập phân. | Xác nhận không có đa tiền tệ. |

Nếu chưa thống nhất cách xác định doanh thu, UC36 chưa được triển khai bằng công thức suy đoán. Viết quyết định vào API contract và tài liệu này trước khi tạo endpoint.

## 7. API và dữ liệu cần bàn giao

Dùng lại endpoint đang có; chỉ bổ sung contract khi source thiếu năng lực báo cáo hoặc thiếu bảo đảm cần thiết.

| Nhóm | Năng lực cần có | Điều kiện bàn giao |
| --- | --- | --- |
| Counter order | API đăng ký member mới/tại quầy và API tạo subscription/order đang có | OpenAPI đúng, server định giá, transaction, chống trùng và quyền được test. |
| Invoice | List/search, receipt, cancel pending, pay CASH | Filter/phân trang, ownership, status transition và idempotency/concurrency được kiểm chứng. |
| Revenue report | Endpoint tổng hợp báo cáo theo khoảng ngày/phương thức | Chỉ PAID; mốc `paidAt`; aggregation server-side; role Manager; paging/limit nếu xuất lượng lớn. |
| Membership summary | Endpoint tổng hợp member/subscription/order | Định nghĩa rõ từng chỉ số, không đếm pending hoặc kỳ upgrade bị thay thế sai. |
| Export, P1 | File CSV từ cùng bộ lọc/response đã xác định | Không mở rộng quyền hoặc trường dữ liệu so với màn hình tương ứng. |

Mọi lỗi theo cấu trúc `{ success, error: { code, message, details }, traceId }`; chốt status/error code và map tiếng Việt ở FE. Không trả stack trace, secrets, password hash hoặc thông tin thẻ. Nếu cần schema mới, tạo migration theo quy trình DB First, có script kiểm tra áp dụng lặp an toàn và hướng rollback.

## 8. Kịch bản nghiệm thu tối thiểu

1. Receptionist tạo member tại quầy; account/profile, subscription pending và invoice xuất hiện sau khi tải lại. Lỗi giữa transaction không để lại một phần dữ liệu.
2. Member tạo yêu cầu gia hạn/nâng/hạ gói; báo giá cũ hoặc giá đổi ở backend không thể bị thu nhầm.
3. Thu đúng một invoice CASH pending thành công; receipt ghi đúng amount, người thu, thời gian, subscription và trạng thái sau thu.
4. Thu sai tiền, invoice không phải CASH, invoice đã canceled, pending quá hạn hoặc subscription không hợp lệ bị từ chối và giữ nguyên dữ liệu.
5. Hai nhân viên cùng xác nhận một invoice: chỉ một lần chuyển PAID và chỉ một lần kích hoạt subscription. Retry sau timeout trả kết quả có thể đối chiếu, không thu trùng.
6. Member A không xem invoice của Member B; Member không gọi được API thu; Coach không xem báo cáo tài chính; Manager truy cập báo cáo theo quyền.
7. Hóa đơn pending/canceled không tính doanh thu; invoice PAID tính một lần theo `paidAt`; filter qua nửa đêm/tháng/năm mới và timezone có kết quả nhất quán.
8. Tổng báo cáo khớp query đối soát độc lập trên dữ liệu test; test bao gồm register, renewal, upgrade có credit, cancel pending và thanh toán trễ.
9. FE hiển thị loading/empty/error, lỗi tiếng Việt có thể hành động, không show thông báo thành công trước API; refresh không làm mất vị trí cuộn.
10. Xác nhận các màn hình thu tiền/hóa đơn dùng backend làm nguồn sự thật, không đọc/ghi trạng thái hóa đơn hoặc doanh thu trong LocalStorage.
11. Kiểm tra FE thực tế ở 1280px và 375px; bảng/bộ lọc/dialog/print receipt không tràn hoặc làm nhảy layout.
12. Regression đăng nhập/role, membership, class booking/hủy, audit và notification; không thay đổi hành vi Flow 2 ngoài lỗi đã ghi ticket.

## 9. Definition of Done

- [ ] API thật là nguồn sự thật cho tạo đơn, thu tiền, receipt, lịch sử và báo cáo.
- [ ] Quyền được kiểm tra ở server; amount, trạng thái và thời gian thu không nhận làm chân lý từ FE.
- [ ] Transaction/concurrency bảo đảm invoice và subscription không lệch trạng thái; retry không tạo giao dịch trùng.
- [ ] Báo cáo có định nghĩa chỉ số và đối chiếu được với dữ liệu PAID trong DB.
- [ ] API có OpenAPI, ví dụ request/response, filter, lỗi và quyền; FE dịch lỗi và validate phù hợp.
- [ ] Test BE cho quyền, trạng thái biên, rollback, concurrency và phép tổng hợp; test FE cho service mapping và luồng tương tác thiết yếu.
- [ ] Build, lint, test theo hai repository đạt; cảnh báo tồn tại được ghi rõ và không thêm warning mới.
- [ ] Đã xem thật ở 1280px và 375px; không thêm dependency production, secret, dữ liệu thẻ hoặc PII thừa.
- [ ] Việc chưa đạt có owner và lý do; không tính mock, fixture hoặc LocalStorage demo là hoàn tất.

## 10. Rủi ro và việc chuyển sprint

| Rủi ro | Cách xử lý đề xuất |
| --- | --- |
| FE nói dữ liệu demo trong khi một số API thật đã có | Đầu Sprint chạy tích hợp trên DB test, rà từng service/UI trước khi kết luận cần viết lại; giữ test regression cho luồng thật. |
| Báo cáo cần truy vấn lớn hoặc DB thiếu index | Bắt đầu từ schema và query plans; phân trang/giới hạn ngày, cân nhắc index sau khi đo; không tải toàn bộ invoices lên FE để cộng. |
| Thu tiền tiền mặt là thao tác nghiệp vụ thực | Demo/test dùng DB riêng; production chỉ xác nhận sau khi nhân viên đã nhận tiền. Idempotency phải rõ trước triển khai thật. |
| Đặc tả Sprint 2 còn endpoint HTTP chưa được xác minh hết | Ghi test gap vào backlog; chỉ kéo lỗi ảnh hưởng Flow 3 hoặc quyền tài chính vào Sprint 3 sau khi phân loại. |
| Thay đổi ở hai repository/branch lệch nhau | Chốt commit nền của FE/BE và contract; PR/commit riêng theo repo, không push trực tiếp nhánh gốc. |

**Demo đề xuất:** Receptionist tạo yêu cầu thành viên → Manager/Receptionist tra invoice → xác nhận thu CASH → in receipt → Manager lọc doanh thu theo kỳ → đối chiếu một hóa đơn pending và một invoice paid có credit nâng gói.

## 11. Kiểm tra khi lập tài liệu

Đây là tài liệu kế hoạch, không sửa code, tạo ticket hay thay đổi nghiệp vụ đang chạy. Nguồn xem xét gồm `Sprint1.md`, `Sprint2.md`, README FE, FE handoff Sprint 2, API test report Sprint 2 và source checkout hiện có. Các nhãn UC, ngày và phân công trong tài liệu đều là đề xuất để nhóm xác nhận tại planning.

