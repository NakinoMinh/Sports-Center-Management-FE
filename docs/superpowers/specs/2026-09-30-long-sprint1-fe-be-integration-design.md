# Long Sprint 1 FE-BE Integration Design

**Date:** 2026-09-30

**Frontend:** `Sports-Center-Management-System-FE` (`main`, `b8b2a6a`)

**Backend:** `SportsCenterManagement` (`master`, `993f01d`)

**Database source:** `E:\SWP391\SportsCenterManagement_Full.sql`

## 1. Goal

Connect only Long's Sprint 1 features to the real ASP.NET Core API and SQL Server database, without reviewing or redesigning screens and without refactoring unrelated modules.

Long's scope:

- UC5: Role-based Access Control.
- UC6: Manage Member List.
- UC10: View Membership Packages.
- UC13: Register New Member at Counter.
- UC14: Check Membership Status.

## 2. Approved Decisions

- Integrate incrementally and preserve the current React pages and component structure.
- Use the supplied SQL database and its seed data for integration testing.
- Use native `fetch`; do not add Axios or another production dependency.
- Keep `MemberSubscription.Status` for order/payment lifecycle and add `IsSuspended bit NOT NULL DEFAULT 0` plus `SuspensionReason nvarchar(500) NULL`.
- Add `Account.DeletedAt datetime2 NULL` for member soft deletion.
- UC13 persists `Account`, `Member`, `MemberSubscription`, and `MembershipInvoice` in one database transaction.
- Send the welcome email only after the transaction commits. Email failure does not roll back valid data; the API returns an email-delivery result and the one-time initial password for direct handover.
- Commit and push each coherent FE or BE change to its current main branch after verification.

## 3. Current Assessment

| Use case | Current state | Required work |
| --- | --- | --- |
| UC5 | BE issues JWTs and uses four correct roles. FE still uses mock JWT/localStorage data. Revoked tokens are not checked consistently by every protected controller. | Connect FE authentication, map BE role names to FE role names, attach Bearer tokens, and enforce token revocation consistently. |
| UC6 | BE supports list, search, active/inactive filter, 20-item pagination, detail, profile update, and status update. FE uses mock data. | Add generated-password member creation, editable email where required, true soft delete, consistent conflict responses, FE API adapter, and feature tests. |
| UC10 | BE already exposes an anonymous active-package list. FE uses mock packages. | Map the existing endpoint to the public catalog and test that inactive packages are excluded. |
| UC13 | BE can create an account separately and can register a package for an existing member, but has no atomic create-member-at-counter operation. Email service only supports password-change OTP. | Add one transactional endpoint that creates the member, pending subscription, and pending invoice, then attempts the welcome email. |
| UC14 | FE calculates statuses locally. BE has no read endpoint, and the database cannot represent suspension separately. | Extend the schema and add a read endpoint deriving status, remaining days, and the under-seven-day warning. |

Existing baselines on 2026-09-30:

- FE: 79/79 tests pass; production build passes; lint reports three unrelated warnings.
- BE: 16/16 tests pass; restore and build pass.
- No live database test has run yet because no SQL Server engine is currently running and the BE connection string is intentionally not stored in source.

## 4. Architecture

### 4.1 Frontend

Add one small shared HTTP adapter responsible for:

- Reading the API base URL from `VITE_API_BASE_URL`.
- Adding `Authorization: Bearer <token>` for protected calls.
- Sending and parsing JSON.
- Converting expected API errors into user-facing `Error` messages.
- Clearing the local session after a `401` response.

Keep the existing feature service boundaries. Replace only Long's mock-backed methods with asynchronous API calls:

- Authentication/session methods needed to access Long's protected features.
- `memberService` methods used by the manager member page.
- Public package listing used by the package catalog.
- Counter registration used by `CounterRegistrationForm`.
- Membership-status listing used by `MembershipStatusPage`.

Role mapping at the FE boundary:

| BE role | FE role |
| --- | --- |
| `CenterManager` | `CENTER_MANAGER` |
| `Coach` | `COACH` |
| `Member` | `MEMBER` |
| `Receptionist` | `RECEPTIONIST` |

The UI layout and styling remain unchanged. Components receive mapped data in their existing shapes wherever practical.

### 4.2 Backend

Preserve the existing Controller -> Service -> `SportsCenterManagementContext` structure.

Required backend changes:

- Extend the EF entities/mappings to match the approved database columns.
- Add narrowly scoped DTOs for member creation, counter registration, and membership-status responses.
- Extend existing member and subscription services rather than adding repository or mediator layers.
- Keep controllers limited to HTTP validation, authorization, claims, and status-code mapping.
- Apply revoked-token validation to all authenticated endpoints rather than relying on controller-by-controller coverage.
- Enable the configured development FE origin through CORS.

### 4.3 Configuration

Do not commit secrets. Supply these through environment variables or .NET User Secrets:

- `ConnectionStrings__DefaultConnection`.
- `Jwt__SigningKey`.
- SMTP host/from address and credentials when email delivery is tested.

The FE reads only `VITE_API_BASE_URL`; no database, JWT signing, or SMTP secret is exposed to the browser.

## 5. API Contract Used by the Integration

Existing routes remain when already correct. New routes follow the current controller naming style to minimize BE churn.

### 5.1 Authentication and UC5

- `POST /api/Auth/login` — anonymous; returns access token, expiry, account ID, email, and BE role.
- `POST /api/Auth/Logout` — authenticated; revokes the current JWT identifier.
- `POST /api/Auth/check-token` — authenticated; validates a restored browser session.

Authorization remains server-side. FE route guards are only navigation controls and are never the security boundary.

### 5.2 UC6 Member Management

- `GET /api/Member?page=1&pageSize=20&search=&status=` — `CenterManager`.
- `GET /api/Member/{accountId}` — `CenterManager`.
- `POST /api/Member` — `CenterManager`; generates member code and initial password.
- `PATCH /api/Member/{accountId}` — `CenterManager`; updates supported member fields.
- `DELETE /api/Member/{accountId}` — `CenterManager`; sets `DeletedAt` and `Status = Inactive`.

Normal member queries exclude `DeletedAt IS NOT NULL`. Historical foreign-key records remain intact.

### 5.3 UC10 Public Packages

- `GET /api/MembershipPackage/active` — anonymous.

Only active packages are returned. Price and duration come from the database and are never trusted from FE state.

### 5.4 UC13 Counter Registration

- `POST /api/Member/counter-registration` — `Receptionist` or `CenterManager`.

Request fields:

- `fullName`, `email`, `phone`, `dateOfBirth`.
- `packageId`, `expectedPrice`, `paymentMethod`.

Database transaction:

1. Validate staff account, member input, duplicate email/phone, package state, and current package price.
2. Generate the account ID, unique member code, and cryptographically random initial password.
3. Create the active Member account and BCrypt password hash.
4. Create the `PENDING_PAYMENT` registration subscription.
5. Create the matching `PENDING_PAYMENT` invoice.
6. Save once and commit.
7. Attempt the welcome email after commit.

Response includes the created member, invoice/order summary, one-time initial password, and `emailDelivery` (`SENT`, `FAILED`, or `NOT_CONFIGURED`).

### 5.5 UC14 Membership Status

- `GET /api/Member/membership-status?search=&filter=` — `Receptionist` or `CenterManager`.

Derived display status for the current relevant subscription:

1. `SUSPENDED` when a confirmed current subscription has `IsSuspended = true`.
2. `ACTIVE` when confirmed, not suspended, and `EndDate >= today`.
3. `EXPIRED` when the most recent confirmed subscription ended before today.
4. `PENDING_PAYMENT` when no confirmed current subscription exists but a pending order does.
5. `UPCOMING` when a confirmed future subscription exists.
6. `NONE` otherwise.

`remainingDays` includes today and the final usable date. `expiringSoon` is true only for an active subscription with 1-6 remaining days, matching the Sprint 1 requirement of fewer than seven days.

## 6. Validation and Error Handling

- `400`: malformed input, invalid date, payment method, filter, or stale expected price.
- `401`: missing, invalid, expired, or revoked token.
- `403`: authenticated role not allowed or inactive account.
- `404`: member or package not found.
- `409`: duplicate email/phone/member code, pending-order conflict, or concurrent database conflict.
- `423`: locked account where the existing authentication flow uses this status.
- `500`: unexpected failures only; do not return database or SMTP internals.

The generated password is returned only by the successful creation response and is never logged or stored in plaintext.

## 7. Testing

### Backend

- Service tests for member creation, soft delete, duplicate checks, status derivation, remaining-day calculation, and suspension.
- Authorization tests for all four roles across Long's protected endpoints.
- Integration tests against SQL Server for transaction commit and rollback behavior.
- Tests proving revoked tokens cannot call any protected Long endpoint.
- Email outcome tests with a fake `IEmailService`; production SMTP credentials are not required for automated tests.

### Frontend

- HTTP adapter tests for Bearer headers, role mapping, expected errors, and `401` session clearing.
- Service tests for member paging/filter mapping, active-package mapping, counter-registration response, and membership-status mapping.
- Existing component behavior remains covered without visual assertions or redesign work.

### End-to-End Smoke Test

Using the supplied seed database:

1. Login as `manager@sportscenter.com` using the documented demo password.
2. Load, search, filter, create, update, and soft-delete a member.
3. Load the public active package catalog without a token.
4. Login as or create a receptionist test account and register a new member with a package.
5. Verify the new account, subscription, and invoice in SQL Server.
6. Verify active, expiring, expired, suspended, pending, and no-package status cases.
7. Logout and verify the revoked token receives `401` from protected endpoints.

## 8. Additional Required Corrections

These changes are required for the approved integration and are not separate feature expansion:

- Map PascalCase BE roles to the uppercase FE role union.
- Configure development CORS for the Vite origin.
- Make revoked-token checks consistent across protected endpoints.
- Update only the relevant API documentation because its current BE assessment is stale.
- Add Long-feature tests; current BE tests cover authentication but not member/package/subscription behavior.
- Avoid the legacy `AccountService` pattern that catches every exception and converts duplicate or database failures into generic `500` responses in newly touched flows.
- Keep connection strings, signing keys, SMTP credentials, and generated passwords out of Git and logs.

## 9. Out of Scope

- Visual or UX review and screen redesign.
- Replacing every FE mock service in Sprint 1.
- UC7, UC8, UC9, UC11, UC12, UC15, UC16, class scheduling, attendance, reporting, and AI features except where a minimal shared authentication fix is required.
- Production deployment, production SMTP selection, or cloud database provisioning.
- Renaming all existing BE routes or wrapping the entire API in a new common response abstraction.

## 10. Completion Criteria

- The five Long use cases read and write the supplied SQL database through the BE API.
- Role restrictions are enforced by BE and verified by tests.
- FE no longer uses mock/localStorage data for these five connected flows.
- UC13 is atomic for database writes and reports email delivery independently.
- UC14 supports suspension, expiry, remaining days, and the under-seven-day warning.
- FE tests/lint/build and BE tests/build pass, with any unrelated pre-existing warnings reported separately.
- Coherent verified changes are committed and pushed to the corresponding repository main branch.
