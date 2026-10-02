# Quy ước phát triển Frontend — Sports Center Management System

> **Đọc hết file này trước khi viết dòng code đầu tiên.**
> Áp dụng cho cả người và AI agent (Claude Code, Copilot, Cursor, Antigravity…).
> Mục tiêu: nhiều người làm song song mà không giẫm chân nhau và không tạo conflict.

---

## 0. Trước khi code — bắt buộc

1. `git pull` nhánh gốc mới nhất, rồi tạo nhánh mới (xem §7).
2. Đọc file đang định sửa **trọn vẹn** trước khi sửa. Không đoán nội dung.
3. Tìm xem thứ mình định viết **đã có sẵn chưa**:
   ```bash
   # ví dụ trước khi viết hàm validate email
   grep -rn "email" src/utils/
   ```
4. Chạy `npm run build && npm test` **trước** khi sửa, để biết trạng thái gốc có sạch không.
5. Chỉ sửa đúng phạm vi được giao. Thấy chỗ khác cần sửa thì **ghi lại báo cho team**, không tự sửa kèm — đó là nguyên nhân conflict số một.

---

## 1. Kiến trúc & ranh giới thư mục

Dự án theo hướng **Component-based + Hooks**, **không dùng MVVM**.

```
main.tsx → App.tsx → AuthProvider → ToastProvider
         → Page (theo role) → Service → API backend
```

| Thư mục | Chứa gì | **Không** chứa gì |
| --- | --- | --- |
| `src/components/common/` | UI tái sử dụng, không gắn nghiệp vụ (Dialog, Toast, InputField) | Gọi API, logic nghiệp vụ |
| `src/components/layout/` | Khung trang (AuthLayout, WorkspaceLayout) | Nội dung trang cụ thể |
| `src/components/<domain>/` | UI gắn với một nghiệp vụ (membership, …) | Điều hướng route |
| `src/pages/` | Một màn hình hoàn chỉnh | Hàm dùng chung (phải đưa xuống `utils/`) |
| `src/services/` | Gọi API, map DTO ↔ model | JSX, hook của React |
| `src/hooks/` | Custom hook | JSX |
| `src/context/` | State toàn cục | Gọi API trực tiếp |
| `src/utils/` | Hàm thuần, không phụ thuộc React | `fetch`, `window` (trừ khi có guard) |
| `src/types/` | Kiểu TypeScript dùng chung | Logic |
| `src/styles/` | CSS | — |

**Luật phụ thuộc — một chiều, không được vi phạm:**

```
pages → components → hooks → services → utils → types
```

Không bao giờ ngược lại. `utils/` không được import `services/`. `services/` không được import `components/`.

---

## 2. Quy ước code

### 2.1 TypeScript

- **Không dùng `any`.** Không rõ kiểu thì dùng `unknown` rồi thu hẹp.
- Dùng `type`, không dùng `interface`, trừ khi cần `extends` hoặc declaration merging.
- Export **có tên** (named export). **Không dùng `export default`** — trừ `App.tsx` (Vite yêu cầu).
- Props phải khai báo kiểu tường minh, không dùng `React.FC`.

```ts
// ✅ Đúng
type Props = { label: string; onSelect: (id: string) => void };
export function PackageCard({ label, onSelect }: Props) {}

// ❌ Sai
export default function PackageCard(props: any) {}
```

### 2.2 Đặt tên

| Loại | Quy ước | Ví dụ |
| --- | --- | --- |
| Component, file component | `PascalCase` | `PersonnelPage.tsx` |
| Hàm, biến | `camelCase` | `visibleItems`, `handleToggleActive` |
| File util/service | `camelCase` | `apiErrors.ts` |
| Hằng số module | `UPPER_SNAKE_CASE` | `API_TIMEOUT_MS` |
| Hàm xử lý sự kiện | tiền tố `handle` | `handleSubmit` |
| Prop callback | tiền tố `on` | `onClose` |
| Biến boolean | tiền tố `is/has/can` | `isLoading`, `hasFilters` |
| Kiểu/type | `PascalCase` | `StatusFilter` |

Tên phải nói **ý nghĩa**, không nói kiểu dữ liệu: `members` chứ không phải `memberArray`.

### 2.3 React

- Chỉ dùng function component + hooks.
- **Không khai báo component bên trong component khác** — mỗi lần render sẽ tạo lại và mất state.
- Dùng `useMemo` cho tính toán nặng (lọc, sắp xếp danh sách), không lạm dụng.
- `useEffect` chỉ dùng để đồng bộ với hệ thống bên ngoài (API, DOM, timer). Giá trị dẫn xuất được thì tính thẳng khi render.
- Mọi list render phải có `key` ổn định (dùng `id`, **không** dùng index).

### 2.4 CSS

- **Chỉ dùng token trong `src/styles/tokens.css`.** Không viết hex, px rời rạc.

```css
/* ✅ */  padding: var(--space-4);  color: var(--fg-muted);
/* ❌ */  padding: 17px;            color: #6d7d85;
```

- Font-size: dùng thang `--text-*`. **Không có chữ nào dưới 12px.**
- Khoảng cách: dùng thang `--space-*` (lưới 4px).
- Bo góc: dùng `--radius-*` (6 bậc).
- Màu chữ của heading **phải kế thừa** (`color: inherit`). Đặt màu cứng cho `h1–h6` sẽ làm chữ đen trên nền tối.
- Viết CSS mới vào đúng file: `workspace.css` (khu đăng nhập), `homepage.css` (trang chủ), `App.css` (auth).

### 2.5 Validate form

Dùng `src/utils/validation.ts`, **không tự viết lại regex**.

```ts
import * as v from "../utils/validation";

const errors = v.validateForm(form, {
  fullName: v.fullName,
  email: v.email,
  phone: v.phone,
});
if (v.hasErrors(errors)) { setFieldErrors(errors); return; }
```

- Validate ở FE để người dùng biết sớm, **nhưng server mới là nơi quyết định**.
- Lỗi phải hiện **ngay dưới ô nhập** kèm `aria-invalid`, không chỉ hiện một banner chung.
- Cần luật mới → thêm vào `validation.ts`, không viết inline trong page.

### 2.6 Xử lý lỗi API

Dùng `src/services/apiErrors.ts`, **không hiển thị `error.message` thô**.

```ts
import { describeError, fieldErrorsOf } from "../services/apiErrors";

catch (err) {
  setFieldErrors(fieldErrorsOf(err));  // lỗi theo từng ô
  toast.error(describeError(err));     // thông báo tiếng Việt rõ nghĩa
}
```

- Backend trả `{ success, error: { code, message, details }, traceId }`. `message` là **tiếng Anh**, không được đưa thẳng cho người dùng.
- Thêm mã lỗi mới ở backend → thêm vào bảng `MESSAGES` trong `apiErrors.ts`.
- Thông báo lỗi phải nói **chuyện gì xảy ra + làm gì tiếp theo**.

### 2.7 Thông báo cho người dùng

- Dùng `useToast()` — **không chèn banner vào luồng layout**, vì nó đẩy nội dung xuống và làm mất vị trí cuộn.
- `toast.success()` tự tắt; `toast.error()` giữ đến khi người dùng đóng.
- **Không dùng `window.confirm` / `window.alert`.** Dùng `ConfirmDialog` / `Dialog`.

### 2.8 Tải lại dữ liệu

Khi refresh sau một thao tác, **không được thay cả trang bằng màn hình loading** — trang sẽ co lại, trình duyệt kẹp vị trí cuộn về 0 và người dùng bị "nhảy lên đầu trang".

```tsx
// ✅ chỉ lần tải đầu mới thay cả trang
if (isLoading && !hasLoaded) return <LoadingState />;

// ❌ mọi lần refresh đều thay cả trang
if (isLoading) return <LoadingState />;
```

### 2.9 Comment

- Giải thích **tại sao**, không giải thích **cái gì**.
- Không comment lặp lại code. Không để code chết dạng comment.

```ts
// ✅  BCrypt cắt âm thầm mọi chuỗi dài hơn 72 byte nên phải chặn từ FE.
// ❌  Kiểm tra độ dài mật khẩu.
```

### 2.10 Bảo mật

- **Không hard-code** secret, token, chuỗi kết nối, mật khẩu — kể cả trong comment hay file test.
- Cấu hình qua biến môi trường `VITE_*`. `.env.local` **không được commit**.
- Mọi kiểm tra quyền ở FE chỉ là UX. API mới là ranh giới bảo mật thật.

---

## 3. Tránh conflict khi làm song song

| Tình huống | Cách làm |
| --- | --- |
| Hai người cùng sửa một page | Chia theo **file**, không chia theo dòng. Nếu buộc phải chung file, tách component con ra file riêng trước. |
| Thêm CSS | Thêm vào **cuối** file CSS liên quan, không chèn giữa. |
| Thêm route | Chỉ một người sửa `App.tsx` trong mỗi sprint. Người khác báo route cần thêm. |
| Thêm nav item | Sửa `src/utils/navigation.ts` (bảng `navSections`), không sửa `WorkspaceLayout.tsx`. |
| Thêm màu/khoảng cách | Thêm token vào `tokens.css`, không viết giá trị rời rạc tại chỗ dùng. |
| Thêm mã lỗi API | Thêm vào `MESSAGES` trong `apiErrors.ts`. |
| Sửa file có người khác đang làm | Hỏi trước. Không tự refactor. |

**Nguyên tắc vàng:** đổi **ít file nhất có thể**. Một PR chạm 20 file là một PR sẽ conflict.

---

## 4. Trước khi tạo Pull Request

Chạy đủ và phải sạch:

```bash
npm run build    # TypeScript + Vite, không được lỗi
npm run lint     # oxlint, không thêm warning mới
npm test         # vitest
```

Tự kiểm tra:

- [ ] Không có `any`, không có `console.log` sót lại
- [ ] Không có giá trị màu/px hard-code trong CSS mới
- [ ] Form mới đã validate và hiện lỗi dưới từng ô
- [ ] Lỗi API đi qua `describeError()`
- [ ] Đã xem thật trên trình duyệt ở **1280px** và **375px**
- [ ] Không làm nhảy layout khi thao tác

---

## 5. Kiểm thử

- Test đặt cạnh file nguồn: `format.ts` → `format.test.ts`.
- Bắt buộc có test cho: hàm trong `utils/` và logic map DTO trong `services/`.
- Chạy: `npm test`.

---

## 6. Môi trường

```bash
npm install
cp .env.example .env.local    # chỉnh VITE_API_BASE_URL nếu cần
npm run dev                   # http://localhost:5173
```

Backend chạy ở `http://localhost:5198` (xem `.env.example`).

---

## 7. Quy ước Git

### 7.1 Đặt tên nhánh

```bash
git checkout -b <type>/<job>
```

| `<type>` | Dùng khi |
| --- | --- |
| `feat` | Thêm tính năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Sửa cấu trúc code, không đổi hành vi |
| `chore` | Việc lặt vặt: config, tài liệu, gitignore |

Ví dụ:

```
feat/user-login
fix/login-user-bug
refactor/frontend-structure
chore/append-gitignore
chore/append-readme
```

Quy tắc: `<job>` viết thường, nối bằng dấu `-`, không dấu tiếng Việt, ngắn gọn và mô tả đúng việc.

### 7.2 Đặt tên commit

```bash
git commit -m "[FE]/[BE] <type>: <action>"
```

Ví dụ:

```
"feat: done user login usecase"
"fix: fix password format validator"
"refactor: done refactor "
"wip: implement user login usecase"
"chore: add document image"
```

| `<type>` | Dùng khi |
| --- | --- |
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `refactor` | Tái cấu trúc, giữ nguyên hành vi |
| `wip` | Đang làm dở, chưa xong |
| `chore` | Config, tài liệu, tài nguyên |

Quy tắc:

- Mỗi commit **một việc**. Không gộp nhiều việc không liên quan.
- Mô tả bằng tiếng Anh, chữ thường, động từ trước.
- Không commit file build (`dist/`), `node_modules/`, `.env.local`.

### 7.3 Luồng làm việc

```bash
git checkout main && git pull           # lấy code mới nhất
git checkout -b feat/member-pagination  # tạo nhánh
# ... code ...
npm run build && npm run lint && npm test
git add <đúng những file đã sửa>        # không dùng `git add .`
git commit -m "feat: add pagination to member list"
git push -u origin feat/member-pagination
# mở Pull Request vào main, gắn người review
```

- **Không push thẳng vào `main`.**
- Merge xong thì xóa nhánh.
- Nhánh sống quá 3 ngày thì `git pull origin main` vào nhánh của mình để giảm conflict.

---

## 8. Dành riêng cho AI agent

1. **Đọc file này trước.** Không bắt đầu code khi chưa đọc.
2. Đọc file cần sửa **trước khi sửa**. Không ghi đè file chưa đọc.
3. Giữ đúng phạm vi yêu cầu. Không tự ý refactor phần không được yêu cầu.
4. Thêm thư viện production phải **hỏi trước**.
5. Không tự chạy `git commit`, `git push`, `git reset` khi chưa được yêu cầu rõ ràng.
6. Sửa xong phải chạy `npm run build` và `npm test`, **báo đúng kết quả**, kể cả khi thất bại.
7. Thay đổi về giao diện phải **xem thật trên trình duyệt** rồi mới báo là xong.
8. Không khẳng định đã sửa xong khi chưa kiểm chứng.
