# Long Sprint 1 FE-BE Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Long's UC5, UC6, UC10, UC13, and UC14 React flows to the ASP.NET Core API and the supplied SQL Server database without changing screen design or unrelated Sprint 1 modules.

**Architecture:** Add the missing database columns and narrowly scoped BE operations while preserving Controller -> Service -> DbContext. Add one FE HTTP/session adapter and one typed API facade, then switch only Long's call sites from mock storage to the API. Keep the existing mock behavior when `VITE_API_BASE_URL` is absent so teammates' unfinished modules are not disrupted.

**Tech Stack:** React 19, TypeScript 6, native `fetch`, Vite 8, Vitest 5, ASP.NET Core/.NET 10, EF Core 10 Database First, SQL Server 2025, xUnit, Docker Desktop for local E2E.

**Spec:** `docs/superpowers/specs/2026-09-30-long-sprint1-fe-be-integration-design.md`

## Global Constraints

- Work only on FE `main` and BE `master`; fetch before every push and never reset or discard another contributor's work.
- Preserve all current page layout, styling, and visible interaction structure.
- Use native `fetch`; add no FE production dependency.
- Add no BE repository, DAO, mediator, or generic result abstraction.
- New and modified C# code must use explicit types; never use `var`.
- Keep SQL connection strings, JWT signing keys, SMTP credentials, and generated passwords out of Git and logs.
- Use the supplied database data locally; never commit the full seed export or its password hashes. Commit only an idempotent schema patch and a redacting import script.
- Write each behavior test first, run it and observe the expected failure, then add the minimum production code.
- Commit each task only after its focused tests pass; push coherent green commits to the corresponding GitHub branch.
- Do not fix the three existing unrelated FE lint warnings or unrelated BE nullable warnings.

---

## File Map

### Backend repository: `SportsCenterManagement`

**Create**

- `Database/2026-09-30-long-sprint1-patch.sql` — idempotent patch for `DeletedAt`, `IsSuspended`, and `SuspensionReason`.
- `APIViewModel/Member/CreateManagedMemberAPIViewModel.cs` — UC6 create request.
- `APIViewModel/Member/CreateManagedMemberResponseAPIViewModel.cs` — UC6 create response with one-time password.
- `APIViewModel/Member/UpdateManagedMemberAPIViewModel.cs` — UC6 manager-only update request including email and status.
- `APIViewModel/Member/MembershipStatusAPIViewModel.cs` — UC14 row returned to receptionist/manager.
- `APIViewModel/MemberSubscription/CounterRegisterMemberAPIViewModel.cs` — UC13 request.
- `APIViewModel/MemberSubscription/CounterRegisterMemberResponseAPIViewModel.cs` — UC13 member, pending order, password, and email outcome.
- `SportsCenterManagement.Tests/DataModelMappingTests.cs` — EF mapping regression tests.
- `SportsCenterManagement.Tests/MemberServiceTests.cs` — UC6 and UC14 service tests.
- `SportsCenterManagement.Tests/MemberSubscriptionServiceTests.cs` — UC13 transaction and email-outcome tests.
- `scripts/import-sportscenter-database.ps1` — converts the external SQL export to a temporary portable script, imports it, then applies the patch.
- `scripts/smoke-long-sprint1.ps1` — redacts credentials while exercising Long's live API flows.

**Modify**

- `DataAccess/Entities/Account.cs`
- `DataAccess/Entities/MemberSubscription.cs`
- `DataAccess/Entities/SportsCenterManagementContext.cs`
- `APIViewModel/Auth/LoginResponseAPIViewModel.cs`
- `APIViewModel/Auth/AuthSessionAPIViewModel.cs`
- `APIViewModel/Auth/CheckTokenResponse.cs`
- `Services/AuthService/IAuthService.cs`
- `Services/AuthService/AuthService.cs`
- `Services/MemberService/IMemberService.cs`
- `Services/MemberService/MemberService.cs`
- `Services/MemberSubscriptionService/IMemberSubscriptionService.cs`
- `Services/MemberSubscriptionService/MemberSubscriptionService.cs`
- `Services/EmailService/IEmailService.cs`
- `Services/EmailService/EmailService.cs`
- `SportsCenterManagement/Filter/AuthFilter.cs`
- `SportsCenterManagement/Controllers/AuthController.cs`
- `SportsCenterManagement/Controllers/AccountController.cs`
- `SportsCenterManagement/Controllers/MembershipInvoiceController.cs`
- `SportsCenterManagement/Controllers/MembershipPackageController.cs`
- `SportsCenterManagement/Controllers/MemberController.cs`
- `SportsCenterManagement/Controllers/MemberSubscriptionController.cs`
- `SportsCenterManagement/Program.cs`
- `SportsCenterManagement/appsettings.Development.json`
- `SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs`
- `SportsCenterManagement.Tests/AuthServiceTests.cs`
- `SportsCenterManagement.Tests/SportsCenterManagement.Tests.csproj`
- `BE_API_HANDOFF.md`

### Frontend repository: `Sports-Center-Management-System-FE`

**Create**

- `.env.example` — documents `VITE_API_BASE_URL=http://localhost:5198` without secrets.
- `src/services/apiClient.ts` — API base URL, session storage, Bearer header, JSON/error handling.
- `src/services/apiClient.test.ts` — HTTP/session behavior tests.
- `src/services/sportsCenterApi.ts` — typed UC6, UC10, UC13, and UC14 calls/mappers.
- `src/services/sportsCenterApi.test.ts` — contract mapping tests.

**Modify**

- `src/types/auth.ts`
- `src/types/membership.ts`
- `src/services/authService.ts`
- `src/services/authService.test.ts`
- `src/context/AuthContext.tsx`
- `src/pages/manager/MembersPage.tsx`
- `src/pages/PackageCatalogPage.tsx`
- `src/components/membership/CounterRegistrationForm.tsx`
- `src/pages/membership/MembershipPage.tsx`
- `src/pages/membership/MembershipStatusPage.tsx`
- `docs/API_SPECIFICATION_FOR_BE.md`

---

### Task 1: Version the Database Patch and EF Model

**Files:**
- Create: `SportsCenterManagement/Database/2026-09-30-long-sprint1-patch.sql`
- Modify: `SportsCenterManagement/DataAccess/Entities/Account.cs:6`
- Modify: `SportsCenterManagement/DataAccess/Entities/MemberSubscription.cs:6`
- Modify: `SportsCenterManagement/DataAccess/Entities/SportsCenterManagementContext.cs:42`
- Test: `SportsCenterManagement/SportsCenterManagement.Tests/DataModelMappingTests.cs`

**Interfaces:**
- Produces: `Account.DeletedAt`, `MemberSubscription.IsSuspended`, and `MemberSubscription.SuspensionReason` in SQL and EF.
- Consumes: supplied `E:\SWP391\SportsCenterManagement_Full.sql` only during local Task 10 import; the export itself stays outside Git.

- [ ] **Step 1: Write the failing EF model test**

```csharp
[Fact]
public void Model_ContainsLongSprint1StateColumns()
{
    DbContextOptions<SportsCenterManagementContext> options =
        new DbContextOptionsBuilder<SportsCenterManagementContext>()
            .UseSqlServer("Server=localhost;Database=ModelOnly;Integrated Security=True;TrustServerCertificate=True")
            .Options;
    using SportsCenterManagementContext context = new SportsCenterManagementContext(options);

    Assert.NotNull(context.Model.FindEntityType(typeof(Account))?.FindProperty(nameof(Account.DeletedAt)));
    Assert.NotNull(context.Model.FindEntityType(typeof(MemberSubscription))?.FindProperty(nameof(MemberSubscription.IsSuspended)));
    Assert.NotNull(context.Model.FindEntityType(typeof(MemberSubscription))?.FindProperty(nameof(MemberSubscription.SuspensionReason)));
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~DataModelMappingTests.Model_ContainsLongSprint1StateColumns`

Expected: compile failure because the three properties do not exist.

- [ ] **Step 3: Add the minimum entity and mapping changes**

```csharp
// Account.cs
public DateTime? DeletedAt { get; set; }

// MemberSubscription.cs
public bool IsSuspended { get; set; }
public string? SuspensionReason { get; set; }
```

Map `DeletedAt` as `datetime2`; map `IsSuspended` with default `false`; map `SuspensionReason` with `nvarchar(500)`.

- [ ] **Step 4: Create the idempotent SQL patch**

Do not copy the supplied full SQL export into either repository. Create only this repeatable patch:

```sql
USE [SportsCenterManagement];
GO
IF COL_LENGTH('dbo.Account', 'DeletedAt') IS NULL
    ALTER TABLE [dbo].[Account] ADD [DeletedAt] datetime2(7) NULL;
GO
IF COL_LENGTH('dbo.MemberSubscription', 'IsSuspended') IS NULL
    ALTER TABLE [dbo].[MemberSubscription]
        ADD [IsSuspended] bit NOT NULL
            CONSTRAINT [DF_MemberSubscription_IsSuspended] DEFAULT (0);
GO
IF COL_LENGTH('dbo.MemberSubscription', 'SuspensionReason') IS NULL
    ALTER TABLE [dbo].[MemberSubscription] ADD [SuspensionReason] nvarchar(500) NULL;
GO
```

- [ ] **Step 5: Run the focused test and database-patch checks**

Run:

```powershell
dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~DataModelMappingTests
rg -n "DeletedAt|IsSuspended|SuspensionReason" Database/2026-09-30-long-sprint1-patch.sql
```

Expected: tests pass and the patch contains guarded additions for all three fields.

- [ ] **Step 6: Commit and push the database model**

```powershell
git add Database DataAccess SportsCenterManagement.Tests/DataModelMappingTests.cs
git commit -m "feat: add Long Sprint 1 membership state columns"
git push origin master
```

### Task 2: Complete UC5 Session Data, Revocation, and CORS

**Files:**
- Modify: `SportsCenterManagement/APIViewModel/Auth/LoginResponseAPIViewModel.cs`
- Modify: `SportsCenterManagement/APIViewModel/Auth/AuthSessionAPIViewModel.cs`
- Modify: `SportsCenterManagement/APIViewModel/Auth/CheckTokenResponse.cs`
- Modify: `SportsCenterManagement/Services/AuthService/IAuthService.cs`
- Modify: `SportsCenterManagement/Services/AuthService/AuthService.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Filter/AuthFilter.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/AuthController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/AccountController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MembershipInvoiceController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MembershipPackageController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MemberController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MemberSubscriptionController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Program.cs:37`
- Modify: `SportsCenterManagement/SportsCenterManagement/appsettings.Development.json`
- Test: `SportsCenterManagement/SportsCenterManagement.Tests/AuthServiceTests.cs`
- Test: `SportsCenterManagement/SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs`

**Interfaces:**
- Produces: login/check-token session fields `accountId`, `email`, `role`, `fullName`, `createdAt`, `accessToken`, `expiresAtUtc`.
- Produces: one global session action filter that skips anonymous endpoints, rejects revoked tokens with `401`, and rejects inactive/soft-deleted accounts with `403`.

- [ ] **Step 1: Add failing auth tests**

Add service coverage proving a soft-deleted account cannot login and a successful response carries profile data:

```csharp
[Fact]
public async Task LoginAsync_WithDeletedAccount_ReturnsAccountInactive()
{
    await using SportsCenterManagementContext context = CreateContext();
    Account account = AuthTestData.CreateAccount();
    account.DeletedAt = DateTime.UtcNow;
    context.Add(account);
    await context.SaveChangesAsync();
    AuthService service = CreateAuthService(context);

    (LoginResult result, LoginResponseAPIViewModel? response) =
        await service.LoginAsync(new LoginRequestAPIViewModel
        {
            Email = account.Email,
            Password = "CorrectPassword123!"
        });

    Assert.Equal(LoginResult.AccountInactive, result);
    Assert.Null(response);
}

[Fact]
public async Task LoginAsync_WithMemberProfile_ReturnsFullNameAndCreatedAt()
{
    await using SportsCenterManagementContext context = CreateContext();
    Account account = AuthTestData.CreateAccount();
    account.Member = new Member
    {
        AccountId = account.Id,
        MemberCode = "MEM001",
        FullName = "Long Member",
        CreatedAt = account.CreatedAt
    };
    context.Add(account);
    await context.SaveChangesAsync();
    AuthService service = CreateAuthService(context);

    (LoginResult result, LoginResponseAPIViewModel? response) =
        await service.LoginAsync(new LoginRequestAPIViewModel
        {
            Email = account.Email,
            Password = "CorrectPassword123!"
        });

    Assert.Equal(LoginResult.Success, result);
    Assert.Equal("Long Member", response?.FullName);
    Assert.Equal(account.CreatedAt, response?.CreatedAt);
}
```

Extend integration coverage so revocation is checked on a real Long endpoint, not only `check-token`:

```csharp
HttpResponseMessage logout = await client.PostAsync("/api/auth/logout", null);
HttpResponseMessage memberList = await client.GetAsync("/api/member");
Assert.Equal(HttpStatusCode.OK, logout.StatusCode);
Assert.Equal(HttpStatusCode.Unauthorized, memberList.StatusCode);
```

Add a second protected-request test that logs in, changes the account to `Inactive` or sets `DeletedAt`, and expects `403 Forbidden` without issuing a new token. Add a CORS preflight test for origin `http://localhost:5173`.

Update `AuthenticationWebApplicationFactory` to replace the production `SportsCenterManagementContext` registration with a uniquely named EF InMemory database. Seed `Role`, `Account`, and matching profile rows for all four roles before creating clients; parameterize `CreateToken(accountId, email, role, expiresAtUtc)` so later tasks can reuse the same factory for the complete RBAC matrix without a local SQL Server.

- [ ] **Step 2: Run the focused auth tests and verify RED**

Run: `dotnet test SportsCenterManagement.Tests --filter "FullyQualifiedName~AuthServiceTests|FullyQualifiedName~AuthenticationIntegrationTests"`

Expected: deleted-account/profile assertions fail and revoked member-list access reaches the database or returns a non-401 result.

- [ ] **Step 3: Return complete session data**

Add `FullName` and `CreatedAt` to the auth DTOs. Extend auth queries with the four role profiles and map the matching name. Add:

```csharp
Task<LoginResponseAPIViewModel?> GetSessionAccountAsync(string accountId);
```

Use it from `check-token` rather than reconstructing a partial user only from claims. Treat `DeletedAt != null` exactly like an inactive account.

- [ ] **Step 4: Make revoked-token checking global but authentication-aware**

Keep the existing `IAllowAnonymous` bypass first. Then immediately continue when `User.Identity?.IsAuthenticated != true`; otherwise reject a cached `jti`, load the current account through `GetSessionAccountAsync`, and return `403` when the account is inactive or soft-deleted. Register the filter once:

```csharp
builder.Services.AddControllers(options =>
{
    options.Filters.AddService<AuthFilter>();
});
```

Remove every explicit `TypeFilter(typeof(AuthFilter))` to prevent duplicate execution. Keep every existing `[Authorize]`, role list, and `[AllowAnonymous]` unchanged.

- [ ] **Step 5: Configure development CORS**

Set only non-secret local origins:

```json
{
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173"]
  }
}
```

- [ ] **Step 6: Run auth tests, then full BE tests**

Run:

```powershell
dotnet test SportsCenterManagement.Tests --filter "FullyQualifiedName~AuthServiceTests|FullyQualifiedName~AuthenticationIntegrationTests"
dotnet test
```

Expected: focused tests and all BE tests pass.

- [ ] **Step 7: Commit and push UC5**

```powershell
git add APIViewModel Services SportsCenterManagement SportsCenterManagement.Tests
git commit -m "feat: enforce Sprint 1 API sessions and RBAC"
git push origin master
```

### Task 3: Complete UC6 Member Management API

**Files:**
- Create: `SportsCenterManagement/APIViewModel/Member/CreateManagedMemberAPIViewModel.cs`
- Create: `SportsCenterManagement/APIViewModel/Member/CreateManagedMemberResponseAPIViewModel.cs`
- Create: `SportsCenterManagement/APIViewModel/Member/UpdateManagedMemberAPIViewModel.cs`
- Modify: `SportsCenterManagement/Services/MemberService/IMemberService.cs`
- Modify: `SportsCenterManagement/Services/MemberService/MemberService.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MemberController.cs`
- Create: `SportsCenterManagement/SportsCenterManagement.Tests/MemberServiceTests.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs`

**Interfaces:**
- Produces: `CreateManagedMemberAsync`, `UpdateManagedMemberAsync`, and `SoftDeleteMemberAsync`.
- Produces new routes `POST /api/Member` and `DELETE /api/Member/{accountId}`, and upgrades the existing manager `PATCH /api/Member/{accountId}` route to the managed-member DTO.
- Consumes: `Account.DeletedAt` from Task 1 and `IPasswordHashService` already registered by the application.

- [ ] **Step 1: Define the target service contract in failing tests**

Add tests that seed the four roles and call real `MemberService` methods:

```csharp
[Fact]
public async Task CreateManagedMemberAsync_GeneratesCodeAndHashedPassword()
{
    await using SportsCenterManagementContext context = CreateContext();
    Role memberRole = new Role { Id = 3, Name = "Member" };
    context.Roles.Add(memberRole);
    await context.SaveChangesAsync();
    PasswordHashService passwordHashService = new PasswordHashService();
    MemberService service = new MemberService(context, passwordHashService);

    (CreateManagedMemberResult result, CreateManagedMemberResponseAPIViewModel? data) =
        await service.CreateManagedMemberAsync(new CreateManagedMemberAPIViewModel
        {
            FullName = "Long Test Member",
            Email = "long.member@example.com",
            Phone = "0912345678",
            DateOfBirth = new DateOnly(2000, 1, 2),
            IsActive = true
        });

    Assert.Equal(CreateManagedMemberResult.Success, result);
    Assert.NotNull(data);
    Assert.StartsWith("MB", data.Member.MemberCode);
    Account savedAccount = await context.Accounts.SingleAsync();
    Assert.True(passwordHashService.VerifyPassword(data.InitialPassword, savedAccount.PasswordHash));
}
```

Add separate tests proving:

- Duplicate email returns `DuplicateEmail` and writes nothing.
- Duplicate phone returns `DuplicatePhone` and writes nothing.
- Update changes normalized email/profile/status and rejects another account's email.
- Soft delete sets `DeletedAt` and `Inactive` while retaining the `Member` row.
- List, detail, and quick-search exclude soft-deleted accounts.
- List search includes member code in addition to name/email/phone and remains capped at 20 rows.
- HTTP authorization: `CenterManager` can call every UC6 route; `Coach`, `Member`, and `Receptionist` receive `403` for list/create/update/delete.
- UC10 remains anonymous: `GET /api/MembershipPackage/active` returns `200` without a token after the global auth filter from Task 2.

- [ ] **Step 2: Run UC6 tests and verify RED**

Run: `dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~MemberServiceTests`

Expected: compile failure because the managed-member DTOs, enums, and methods do not exist.

- [ ] **Step 3: Add exact DTO validation**

Create request models with these boundaries:

```csharp
[Required, MinLength(2), MaxLength(100)] public string FullName { get; set; } = null!;
[Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = null!;
[Required, RegularExpression("^0[0-9]{9}$")] public string Phone { get; set; } = null!;
[Required] public DateOnly? DateOfBirth { get; set; }
[Required] public bool? IsActive { get; set; }
```

`UpdateManagedMemberAPIViewModel` uses the same complete shape so the manager form remains a single deterministic update.

- [ ] **Step 4: Implement the minimum UC6 service behavior**

Add these results and signatures to `IMemberService`:

```csharp
public enum CreateManagedMemberResult { Success, DuplicateEmail, DuplicatePhone, InvalidData, MemberRoleMissing }
public enum UpdateManagedMemberResult { Success, NotFound, DuplicateEmail, DuplicatePhone, InvalidData }
public enum DeleteMemberResult { Success, NotFound, AlreadyDeleted }

Task<(CreateManagedMemberResult Result, CreateManagedMemberResponseAPIViewModel? Data)>
    CreateManagedMemberAsync(CreateManagedMemberAPIViewModel request);
Task<(UpdateManagedMemberResult Result, MemberDetailAPIViewModel? Data)>
    UpdateManagedMemberAsync(string accountId, UpdateManagedMemberAPIViewModel request);
Task<DeleteMemberResult> SoftDeleteMemberAsync(string accountId);
```

Generate the initial password using only the BCL:

```csharp
private static string GenerateInitialPassword()
{
    byte[] randomBytes = RandomNumberGenerator.GetBytes(12);
    return "Tt9!" + Convert.ToHexString(randomBytes);
}
```

Generate member codes with the existing `MB` convention, query for collisions, hash with `IPasswordHashService`, and use one `SaveChangesAsync` per operation. Do not catch unexpected database exceptions and convert them to `false`.

- [ ] **Step 5: Add create/delete and upgrade the existing manager update action**

Add `POST` and `DELETE`, then replace the existing manager `PATCH /api/Member/{accountId}` parameter/service call with `UpdateManagedMemberAPIViewModel` and `UpdateManagedMemberAsync`; do not add a duplicate PATCH route. Map known results to `201`, `200`, `204`, `400`, `404`, and `409`. Return `CreateManagedMemberResponseAPIViewModel` only from the successful create action. Keep the member self-profile endpoint on the existing `UpdateMemberAPIViewModel`/`UpdateMemberAsync` path so members cannot change account email/status through profile editing.

- [ ] **Step 6: Run focused and full BE tests**

Run:

```powershell
dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~MemberServiceTests
dotnet test
```

Expected: all UC6 tests and the complete BE suite pass.

- [ ] **Step 7: Commit and push UC6**

```powershell
git add APIViewModel/Member Services/MemberService SportsCenterManagement/Controllers/MemberController.cs SportsCenterManagement.Tests/MemberServiceTests.cs SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs
git commit -m "feat: complete Sprint 1 member management API"
git push origin master
```

### Task 4: Implement UC13 Atomic Counter Registration

**Files:**
- Create: `SportsCenterManagement/APIViewModel/MemberSubscription/CounterRegisterMemberAPIViewModel.cs`
- Create: `SportsCenterManagement/APIViewModel/MemberSubscription/CounterRegisterMemberResponseAPIViewModel.cs`
- Modify: `SportsCenterManagement/Services/EmailService/IEmailService.cs`
- Modify: `SportsCenterManagement/Services/EmailService/EmailService.cs`
- Modify: `SportsCenterManagement/Services/MemberSubscriptionService/IMemberSubscriptionService.cs`
- Modify: `SportsCenterManagement/Services/MemberSubscriptionService/MemberSubscriptionService.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MemberController.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement.Tests/SportsCenterManagement.Tests.csproj`
- Modify: `SportsCenterManagement/SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs`
- Create: `SportsCenterManagement/SportsCenterManagement.Tests/MemberSubscriptionServiceTests.cs`

**Interfaces:**
- Produces: `RegisterMemberAtCounterAsync(string staffAccountId, CounterRegisterMemberAPIViewModel request)`.
- Produces: `POST /api/Member/counter-registration` for `Receptionist,CenterManager`.
- Produces email outcome values `SENT`, `FAILED`, and `NOT_CONFIGURED`.
- Produces `CounterRegisterMemberResponseAPIViewModel` with `MemberDetailAPIViewModel Member`, `MembershipReceiptAPIViewModel Receipt`, `InitialPassword`, and `EmailDelivery` so FE can preserve its existing success dialog and invoice handoff.
- Consumes: password hashing, existing invoice-number conventions, business timezone configuration, and the approved SQL transaction boundary.

- [ ] **Step 1: Add the SQLite test-only provider**

Run: `dotnet add SportsCenterManagement.Tests package Microsoft.EntityFrameworkCore.Sqlite --version 10.0.12`

This is test-only; do not add or change a production package.

- [ ] **Step 2: Write failing UC13 transaction tests**

Use one open in-memory SQLite connection per test, call `EnsureCreatedAsync`, and seed roles, a manager/receptionist, and an active package. Add a fake email service that can succeed, report unconfigured, or throw.

Create a private `MemberSubscriptionServiceTestFixture` implementing `IAsyncDisposable` with `Context`, `Service`, `Manager`, `Email`, and `ValidRequest()` members; `CreateAsync()` opens SQLite, creates the schema, and inserts all required rows.

```csharp
[Fact]
public async Task RegisterMemberAtCounterAsync_EmailFailureKeepsCommittedPendingOrder()
{
    await using MemberSubscriptionServiceTestFixture fixture =
        await MemberSubscriptionServiceTestFixture.CreateAsync();
    fixture.Email.ThrowOnWelcome = true;

    (CounterRegisterMemberResult result, CounterRegisterMemberResponseAPIViewModel? data) =
        await fixture.Service.RegisterMemberAtCounterAsync(
            fixture.Manager.Id,
            fixture.ValidRequest());

    Assert.Equal(CounterRegisterMemberResult.Success, result);
    Assert.Equal("FAILED", data?.EmailDelivery);
    Assert.Single(await fixture.Context.Members.ToListAsync());
    Assert.Equal("PENDING_PAYMENT", data?.Receipt.SubscriptionStatus);
    Assert.Equal("PENDING_PAYMENT", data?.Receipt.InvoiceStatus);
    Assert.Equal("PENDING_PAYMENT", (await fixture.Context.MemberSubscriptions.SingleAsync()).Status);
    Assert.Equal("PENDING_PAYMENT", (await fixture.Context.MembershipInvoices.SingleAsync()).Status);
}
```

Add separate tests proving:

- Stale `ExpectedPrice` returns `PriceChanged` and writes no account/member/order.
- Duplicate email or phone writes nothing.
- Inactive package writes nothing.
- Coach/member staff IDs return `StaffRoleNotAllowed`.
- SMTP unconfigured returns `NOT_CONFIGURED` after a successful commit.
- The response never exposes `PasswordHash`.
- HTTP authorization: with an intentionally incomplete body, `CenterManager` and `Receptionist` reach the action and receive `400`, while `Coach` and `Member` receive `403` before service execution. Transaction success remains covered by the SQLite service tests.

- [ ] **Step 3: Run UC13 tests and verify RED**

Run: `dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~MemberSubscriptionServiceTests`

Expected: compile failure because the DTOs, service method, and email members do not exist.

- [ ] **Step 4: Extend the email interface minimally**

```csharp
bool IsConfigured { get; }
Task SendMemberWelcomeAsync(
    string recipientEmail,
    string fullName,
    string initialPassword,
    string packageName,
    decimal amount);
```

Reuse the existing SMTP options/client pattern. Never log the generated password or include it in an exception message.

- [ ] **Step 5: Implement the transactional service method**

Use these request boundaries:

```csharp
[Required, MinLength(2), MaxLength(100)] public string FullName { get; set; } = null!;
[Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = null!;
[Required, RegularExpression("^0[0-9]{9}$")] public string Phone { get; set; } = null!;
[Required] public DateOnly? DateOfBirth { get; set; }
[Required, Range(1, int.MaxValue)] public int? PackageId { get; set; }
[Required, Range(typeof(decimal), "1", "1000000000")] public decimal? ExpectedPrice { get; set; }
[Required, MaxLength(30)] public string PaymentMethod { get; set; } = null!;
```

Add result values for validation, duplicate data, staff/package state, pending conflict, stale price, invoice collision, and concurrency conflict. In one relational transaction:

1. Re-read and validate the staff account and role.
2. Normalize/validate personal fields and package/payment input.
3. Compare `ExpectedPrice` to the current database price.
4. Generate and hash the one-time password plus unique member/invoice identifiers.
5. Add `Account`, `Member`, `MemberSubscription(PENDING_PAYMENT)`, and `MembershipInvoice(PENDING_PAYMENT)`.
6. Call `SaveChangesAsync`, then commit.

After commit, return `NOT_CONFIGURED` when `IsConfigured` is false; otherwise attempt the welcome email and translate any delivery exception into `FAILED` without changing the committed result. Return the one-time password exactly once.

- [ ] **Step 6: Add the protected controller action**

Read `ClaimTypes.NameIdentifier`, call the service, and map expected results to `201`, `400`, `403`, `404`, `409`, and `423`. Do not create a second controller or duplicate transaction logic.

- [ ] **Step 7: Run UC13 and full BE tests**

Run:

```powershell
dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~MemberSubscriptionServiceTests
dotnet test
```

Expected: all tests pass, including email-failure persistence.

- [ ] **Step 8: Commit and push UC13**

```powershell
git add APIViewModel/MemberSubscription Services/EmailService Services/MemberSubscriptionService SportsCenterManagement/Controllers/MemberController.cs SportsCenterManagement.Tests
git commit -m "feat: add atomic counter member registration"
git push origin master
```

### Task 5: Implement UC14 Membership Status Query

**Files:**
- Create: `SportsCenterManagement/APIViewModel/Member/MembershipStatusAPIViewModel.cs`
- Modify: `SportsCenterManagement/Services/MemberService/IMemberService.cs`
- Modify: `SportsCenterManagement/Services/MemberService/MemberService.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement/Controllers/MemberController.cs`
- Test: `SportsCenterManagement/SportsCenterManagement.Tests/MemberServiceTests.cs`
- Modify: `SportsCenterManagement/SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs`

**Interfaces:**
- Produces: `GetMembershipStatusesAsync(string? search, string? filter)`.
- Produces: `GET /api/Member/membership-status?search=&filter=` for `Receptionist,CenterManager`.
- Consumes: confirmed/pending subscription snapshots and suspension fields from Task 1.
- Produces each `MembershipStatusAPIViewModel` with member identity plus the selected and upcoming subscription snapshots required by the existing detail dialog.

- [ ] **Step 1: Write failing status tests using dates relative to today**

Add cases for:

Reuse a private `MemberServiceTestFixture` with `Context`, `Service`, and `Today` members. Its `CreateAsync()` seeds the Member role, supplies `BusinessSettings:TimeZoneId = SE Asia Standard Time`, calculates `Today` from that timezone, and constructs `MemberService` with a real `PasswordHashService`.

```csharp
[Fact]
public async Task GetMembershipStatusesAsync_CountsInclusiveDaysAndWarnsBelowSeven()
{
    await using MemberServiceTestFixture fixture = await MemberServiceTestFixture.CreateAsync();
    DateOnly today = fixture.Today;
    Member member = fixture.AddMember("account-1", "MEM001");
    fixture.Context.MemberSubscriptions.Add(new MemberSubscription
    {
        MemberId = member.AccountId,
        PackageId = 1,
        PackageName = "Monthly",
        PackagePrice = 500000m,
        DurationMonths = 1,
        Benefits = "[]",
        StartDate = today,
        EndDate = today.AddDays(5),
        Kind = "REGISTER",
        Status = "CONFIRMED",
        CreatedAt = DateTime.UtcNow
    });
    await fixture.Context.SaveChangesAsync();

    List<MembershipStatusAPIViewModel> rows =
        await fixture.Service.GetMembershipStatusesAsync(null, "ALL");
    Assert.Equal("ACTIVE", rows[0].Status);
    Assert.Equal(6, rows[0].RemainingDays);
    Assert.True(rows[0].ExpiringSoon);
}
```

Add separate tests for suspended current access, expired latest history, future confirmed access, pending-only order, no subscription, search by member code/name/email/phone, every filter value, and exclusion of soft-deleted members.

Add HTTP authorization coverage proving `Receptionist` and `CenterManager` receive `200`, while `Coach` and `Member` receive `403` from `GET /api/Member/membership-status`.

- [ ] **Step 2: Run UC14 tests and verify RED**

Run: `dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~MemberServiceTests`

Expected: compile failure because the response model and query method do not exist.

- [ ] **Step 3: Implement the exact display-state priority**

Extend `MemberService` with `IConfiguration`, derive `today` from `BusinessSettings:TimeZoneId`, and never use the host machine's local date. Define the response fields explicitly:

```csharp
public string AccountId { get; set; } = null!;
public string MemberCode { get; set; } = null!;
public string? FullName { get; set; }
public string Email { get; set; } = null!;
public string? Phone { get; set; }
public string Status { get; set; } = null!;
public int RemainingDays { get; set; }
public bool ExpiringSoon { get; set; }
public int? SubscriptionId { get; set; }
public int? PackageId { get; set; }
public string? PackageName { get; set; }
public DateOnly? StartDate { get; set; }
public DateOnly? EndDate { get; set; }
public string? SuspensionReason { get; set; }
public int? UpcomingSubscriptionId { get; set; }
public string? UpcomingPackageName { get; set; }
public DateOnly? UpcomingStartDate { get; set; }
public DateOnly? UpcomingEndDate { get; set; }
```

For each member, load only subscriptions needed for display and calculate:

```text
current CONFIRMED + IsSuspended -> SUSPENDED
current CONFIRMED               -> ACTIVE
future CONFIRMED                -> UPCOMING
latest past CONFIRMED           -> EXPIRED
PENDING_PAYMENT                 -> PENDING_PAYMENT
otherwise                       -> NONE
```

Select `current ?? upcoming ?? expired ?? pending`, matching the existing FE behavior. Calculate inclusive remaining days only for current confirmed access; set `ExpiringSoon` only when `RemainingDays` is 1 through 6.

- [ ] **Step 4: Add query validation and controller authorization**

Accept filters `ALL`, `ACTIVE`, `EXPIRING`, `EXPIRED`, `SUSPENDED`, `UPCOMING`, `PENDING_PAYMENT`, and `NONE`. Return `400` for another value. The controller action must allow only `Receptionist,CenterManager`.

- [ ] **Step 5: Run focused and full BE tests**

Run:

```powershell
dotnet test SportsCenterManagement.Tests --filter FullyQualifiedName~MemberServiceTests
dotnet test
dotnet build --no-restore
```

Expected: focused tests, full tests, and build pass.

- [ ] **Step 6: Commit and push UC14**

```powershell
git add APIViewModel/Member/MembershipStatusAPIViewModel.cs Services/MemberService SportsCenterManagement/Controllers/MemberController.cs SportsCenterManagement.Tests/MemberServiceTests.cs SportsCenterManagement.Tests/AuthenticationIntegrationTests.cs
git commit -m "feat: add receptionist membership status API"
git push origin master
```

### Task 6: Add the FE HTTP and API Session Boundary

**Files:**
- Create: `Sports-Center-Management-System-FE/.env.example`
- Create: `Sports-Center-Management-System-FE/src/services/apiClient.ts`
- Create: `Sports-Center-Management-System-FE/src/services/apiClient.test.ts`
- Modify: `Sports-Center-Management-System-FE/src/types/auth.ts`
- Modify: `Sports-Center-Management-System-FE/src/services/authService.ts`
- Modify: `Sports-Center-Management-System-FE/src/services/authService.test.ts`
- Modify: `Sports-Center-Management-System-FE/src/context/AuthContext.tsx`

**Interfaces:**
- Produces: `apiConfigured()`, `apiRequest<T>()`, `getApiSession()`, `saveApiSession()`, `clearApiSession()`, and `mapApiRole()`.
- Produces: `mapApiRole("CenterManager") === "CENTER_MANAGER"`; Task 7 reuses this mapper instead of defining another role map.
- Keeps: existing mock auth/register behavior only when `VITE_API_BASE_URL` is absent.

- [ ] **Step 1: Write failing HTTP/session tests**

Create tests using `vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198")`, `vi.stubGlobal("fetch", vi.fn())`, and isolated local/session storage. Restore the environment with `vi.unstubAllEnvs()` after each test. Cover:

```typescript
it("adds a bearer token and returns camelCase JSON", async () => {
  const session: ApiSession = {
    token: "test-token",
    expiresAt: "2026-10-01T12:00:00Z",
    user: {
      id: "manager-1",
      username: "manager@example.com",
      email: "manager@example.com",
      role: "CENTER_MANAGER",
      fullName: "Center Manager",
      createdAt: "2026-09-30T00:00:00Z",
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
    },
  };
  saveApiSession(session, true);
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ value: 7 }), { status: 200 }));

  await expect(apiRequest<{ value: number }>("/api/test")).resolves.toEqual({ value: 7 });
  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5198/api/test",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${session.token}` }) }),
  );
});
```

Add separate tests proving:

- Remember-me stores the API session in local storage; otherwise session storage.
- A `204` response returns `undefined` without JSON parsing.
- A structured BE error uses `error.message` and an unstructured error uses response text/status.
- A `401` response clears both API session stores.
- PascalCase BE roles map to the existing FE union and an unknown role is rejected.
- Missing `VITE_API_BASE_URL` makes `apiConfigured()` false and does not issue a request.

Extend `authService.test.ts` with configured-API cases proving login saves the returned JWT session, logout clears local state even when the logout request fails, and the existing mock login path still runs when the API URL is absent.

- [ ] **Step 2: Run the focused FE test and verify RED**

Run: `npm test -- src/services/apiClient.test.ts`

Expected: module-not-found failure for `apiClient`.

- [ ] **Step 3: Implement the minimal client and session store**

Use one non-secret key such as `scms_api_session_v1`. Define:

```typescript
export interface ApiSession {
  token: string;
  expiresAt: string;
  user: Omit<User, "passwordHash">;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T>;

export function mapApiRole(role: string): UserRole;
```

Normalize the base URL by removing a trailing slash. Set `Content-Type: application/json` only when a body exists. Never place the JWT in logs or thrown errors.

- [ ] **Step 4: Add API auth mode without deleting mock fallback**

When configured, `authService.login` posts `{ email, password }` to `/api/Auth/login`, maps the response into `AuthResponse` with `mapApiRole`, and saves `ApiSession` using `rememberMe`. Map `accountId -> id`, `email -> username` (email is the API login identifier), `fullName`, `createdAt`, `failedAttempts = 0`, `isLocked = false`, and `isActive = true`; derive `JWTPayload.iat` from the current time and `exp` from `expiresAtUtc`. `getCurrentUser` and `verifyJWT` first recognize the saved API session; the existing mock path remains unchanged when no API URL is configured.

Change `AuthContextType.logout` and `authService.logout` to `() => Promise<void>`. `logout` must capture the token, clear local state immediately, then best-effort `POST /api/Auth/Logout` with that captured token. `AuthContext` awaits it, validates restored API sessions with `/api/Auth/check-token` during initialization, keeps `isInitializing` true until that request settles, and clears an invalid session.

- [ ] **Step 5: Document only the public FE setting**

Create `.env.example`:

```dotenv
VITE_API_BASE_URL=http://localhost:5198
```

- [ ] **Step 6: Run focused and full FE checks**

Run:

```powershell
npm test -- src/services/apiClient.test.ts src/services/authService.test.ts
npm test
npm run lint
npm run build
```

Expected: all tests/build pass; only the three previously recorded unrelated lint warnings remain.

- [ ] **Step 7: Commit and push the FE API boundary**

```powershell
git add .env.example src/services/apiClient.ts src/services/apiClient.test.ts src/services/authService.ts src/context/AuthContext.tsx src/types/auth.ts
git commit -m "feat: add backend API session support"
git push origin main
```

### Task 7: Add the Typed Sports Center API Facade

**Files:**
- Create: `Sports-Center-Management-System-FE/src/services/sportsCenterApi.ts`
- Create: `Sports-Center-Management-System-FE/src/services/sportsCenterApi.test.ts`
- Modify: `Sports-Center-Management-System-FE/src/types/membership.ts`

**Interfaces:**
- Produces typed UC6, UC10, UC13, and UC14 DTO mappers used by page tasks.
- Consumes `apiRequest`, `apiConfigured`, and API session from Task 6.
- Keeps `memberService` and the large local `membershipService` intact; when no API URL is configured, the facade delegates to those existing adapters instead of copying their business rules.

- [ ] **Step 1: Write failing contract-mapping tests**

Stub `VITE_API_BASE_URL=http://localhost:5198`, mock `fetch` at the HTTP boundary, and restore the environment after each test. Define this local helper, then cover member paging/create/update/delete, public package listing, counter registration, membership-status rows, and numeric package IDs:

```typescript
const mockJson = (body: unknown, status = 200) => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

it("maps the BE member page to the existing manager-page shape", async () => {
  mockJson({ items: [{ accountId: "a1", memberCode: "MEM001", fullName: "An", email: "an@example.com", phone: "0912345678", status: "Active", dateOfBirth: "2000-01-02", createdAt: "2026-09-30T00:00:00Z" }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });

  await expect(sportsCenterApi.listMembers("an", "ACTIVE", 1)).resolves.toMatchObject({
    total: 1,
    pages: 1,
    items: [{ id: "a1", username: "MEM001", role: "MEMBER", isActive: true }],
  });
});

it("maps counter registration without exposing a password hash", async () => {
  const input: CounterMemberRegistrationInput = {
    fullName: "Binh",
    email: "binh@example.com",
    phone: "0987654321",
    dateOfBirth: "2001-03-04",
    packageId: "11",
    paymentMethod: "CASH",
    expectedPrice: 500000,
  };
  mockJson({
    member: { accountId: "a2", memberCode: "MEM002", fullName: "Binh", email: "binh@example.com", phone: "0987654321", dateOfBirth: "2001-03-04", status: "Active", createdAt: "2026-09-30T00:00:00Z" },
    initialPassword: "Tt9!one-time",
    emailDelivery: "NOT_CONFIGURED",
    receipt: { invoiceId: 4, invoiceNumber: "INV-1", amount: 500000, paymentMethod: "CASH", invoiceStatus: "PENDING_PAYMENT", createdAt: "2026-09-30T00:00:00Z", subscriptionId: 3, subscriptionStatus: "PENDING_PAYMENT", kind: "REGISTER", startDate: "2026-10-01", endDate: "2026-10-31", packageId: 11, packageName: "Monthly", packagePrice: 500000, durationMonths: 1, benefits: ["Gym"], memberAccountId: "a2", memberCode: "MEM002", memberFullName: "Binh", memberEmail: "binh@example.com", memberPhone: "0987654321" },
  });

  const result = await sportsCenterApi.registerMemberAtCounter(input);
  expect(result.initialPassword).toBe("Tt9!one-time");
  expect(result.member).not.toHaveProperty("passwordHash");
  expect(result.order.invoice.number).toBe("INV-1");
});
```

- [ ] **Step 2: Run the facade test and verify RED**

Run: `npm test -- src/services/sportsCenterApi.test.ts`

Expected: module-not-found failure for `sportsCenterApi`.

- [ ] **Step 3: Implement the complete facade**

Add these API-only types without changing the existing mock `CounterRegistrationInput` contract:

```typescript
export type CounterMemberRegistrationInput = Omit<
  CounterRegistrationInput,
  "username" | "password"
> & { dateOfBirth: string };

export interface MemberPage {
  items: MembershipActor[];
  total: number;
  page: number;
  pages: number;
}

export type PublicMembershipPackage = Pick<
  MembershipPackage,
  "id" | "name" | "price" | "durationMonths" | "benefits"
>;

export type MembershipStatusFilter =
  | "ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED"
  | "SUSPENDED" | "UPCOMING" | "PENDING_PAYMENT" | "NONE";

export interface MembershipStatusSubscription {
  id: string;
  packageName: string;
  startDate: string;
  endDate: string;
  suspensionReason?: string;
}

export interface MembershipStatusRow {
  member: Pick<MembershipActor, "id" | "username" | "fullName" | "email" | "phone">;
  status: Exclude<MembershipStatusFilter, "ALL" | "EXPIRING">;
  remainingDays: number;
  expiringSoon: boolean;
  subscription?: MembershipStatusSubscription;
  upcoming?: MembershipStatusSubscription;
}

export interface CounterRegistrationResult {
  member: MembershipActor;
  order: MembershipOrder;
  initialPassword: string;
  emailDelivery: "SENT" | "FAILED" | "NOT_CONFIGURED";
}
```

Expose:

```typescript
listMembers(query: string, status: "ALL" | "ACTIVE" | "INACTIVE", page: number): Promise<MemberPage>;
createMember(input: MemberInput): Promise<{ member: MembershipActor; initialPassword: string }>;
updateMember(id: string, input: MemberInput): Promise<MembershipActor>;
deleteMember(id: string): Promise<void>;
listActivePackages(): Promise<PublicMembershipPackage[]>;
registerMemberAtCounter(input: CounterMemberRegistrationInput): Promise<CounterRegistrationResult>;
listMembershipStatuses(search?: string, filter?: MembershipStatusFilter): Promise<MembershipStatusRow[]>;
```

Map `memberCode` to the existing `username` field and null `fullName` values to an empty string. Clamp `totalPages = 0` from an empty BE page to the existing FE minimum of one page. Convert package IDs to strings for the UI and back to integers only at request boundaries. Reject a non-integer package ID before issuing UC13. Map the receipt into the existing `MembershipOrder` shape, using the saved session account as `createdBy`, so `MembershipPage` can keep its invoice flow. Map BE status rows directly; do not recalculate dates in FE. For an `UPCOMING` row, reuse the same mapped object for `subscription` and `upcoming`; for an active row with a later period, keep them as two different objects.

When `apiConfigured()` is false, obtain the current demo user through `authService.getCurrentUser()` and delegate to `memberService` or `membershipService`. Map mock `NOT_CONNECTED` to `NOT_CONFIGURED`. Add one test proving the fallback path does not call `fetch`.

- [ ] **Step 4: Run facade and full FE tests**

Run:

```powershell
npm test -- src/services/sportsCenterApi.test.ts
npm test
```

Expected: all mapping and existing tests pass.

- [ ] **Step 5: Commit and push the facade**

```powershell
git add src/services/sportsCenterApi.ts src/services/sportsCenterApi.test.ts src/types/membership.ts
git commit -m "feat: add typed Sports Center API facade"
git push origin main
```

### Task 8: Connect FE UC6 and UC10 Call Sites

**Files:**
- Modify: `Sports-Center-Management-System-FE/src/pages/manager/MembersPage.tsx`
- Modify: `Sports-Center-Management-System-FE/src/pages/PackageCatalogPage.tsx`

**Interfaces:**
- Consumes UC6, UC10, and status-detail methods from Task 7.
- Produces no new business function; this task only replaces mock calls with already-tested API calls.

- [ ] **Step 1: Switch the manager member page**

Await list/create/update/delete before mutating notices or dialogs. Ignore stale refresh responses with a canceled flag. When opening detail, call `listMembershipStatuses(member.username, "ALL")` and use the matching member row instead of reading local subscriptions. Remove all `memberService` and `membershipService` calls from this page while preserving its markup and copy.

- [ ] **Step 2: Switch the public catalog source**

Await `sportsCenterApi.listActivePackages()` in `PackageCatalogPage`. Keep sorting, duration filters, comparison behavior, links, and all markup unchanged.

- [ ] **Step 3: Run FE verification**

Run:

```powershell
npm test -- src/services/sportsCenterApi.test.ts
npm test
npm run lint
npm run build
```

Expected: tests/build pass; only the three pre-existing unrelated lint warnings remain.

- [ ] **Step 4: Commit and push UC6/UC10 wiring**

```powershell
git add src/pages/manager/MembersPage.tsx src/pages/PackageCatalogPage.tsx
git commit -m "feat: connect member management and package catalog"
git push origin main
```

### Task 9: Connect FE UC13 and UC14 Call Sites

**Files:**
- Modify: `Sports-Center-Management-System-FE/src/components/membership/CounterRegistrationForm.tsx`
- Modify: `Sports-Center-Management-System-FE/src/pages/membership/MembershipPage.tsx`
- Modify: `Sports-Center-Management-System-FE/src/pages/membership/MembershipStatusPage.tsx`

**Interfaces:**
- Consumes `registerMemberAtCounter` and `listMembershipStatuses` from Task 7.
- Produces no new business function; status and registration rules remain server-owned.

- [ ] **Step 1: Switch the counter registration form**

Replace `membershipService.registerMemberWithGeneratedCredentials` with `sportsCenterApi.registerMemberAtCounter`. Remove the `packages` prop from `CounterRegistrationForm` and its single call site in `MembershipPage`. On mount, load `sportsCenterApi.listActivePackages()` into local form state, keep the fieldset disabled until loading finishes, and use that result for the selector and `expectedPrice`; the facade returns the existing mock packages when the API is not configured. This prevents mock package IDs or prices from being submitted to BE. Preserve the form and success dialog. Show the existing handover warning only for `FAILED` or `NOT_CONFIGURED`; show email-sent confirmation for `SENT`.

- [ ] **Step 2: Switch the membership-status page**

Load the full `ALL` status list once per refresh so summary counts remain correct. Apply the existing text and status filters in memory, matching the current page behavior. Replace local member/subscription composition with the API-provided `MembershipStatusRow`; keep the table, dialog, warning, suspension copy, and links unchanged.

- [ ] **Step 3: Run FE verification**

Run:

```powershell
npm test -- src/services/sportsCenterApi.test.ts
npm test
npm run lint
npm run build
```

Expected: tests/build pass and no new lint warning is introduced.

- [ ] **Step 4: Commit and push UC13/UC14 wiring**

```powershell
git add src/components/membership/CounterRegistrationForm.tsx src/pages/membership/MembershipPage.tsx src/pages/membership/MembershipStatusPage.tsx
git commit -m "feat: connect counter registration and membership status"
git push origin main
```

### Task 10: Add a Repeatable Local Database Import and API Smoke Test

**Files:**
- Create: `SportsCenterManagement/scripts/import-sportscenter-database.ps1`
- Create: `SportsCenterManagement/scripts/smoke-long-sprint1.ps1`

**Interfaces:**
- Consumes: external `E:\SWP391\SportsCenterManagement_Full.sql`, Docker container `scms-sql`, and environment-supplied credentials.
- Produces: a repeatable import of the supplied schema/seed data plus the committed patch.
- Produces: one command that verifies login, UC6, UC10, UC13, UC14, soft delete, logout, and revoked-token rejection.

- [ ] **Step 1: Start SQL Server 2025 without embedding a password**

Open Docker Desktop, then set a process-local password and start the official image:

```powershell
$env:SCMS_SA_PASSWORD = Read-Host -MaskInput "SQL Server sa password"
docker run --name scms-sql `
  -e ACCEPT_EULA=Y `
  -e MSSQL_SA_PASSWORD=$env:SCMS_SA_PASSWORD `
  -p 1433:1433 `
  -v scms-sql-data:/var/opt/mssql `
  -d mcr.microsoft.com/mssql/server:2025-latest
```

Wait until `docker logs scms-sql` reports that SQL Server is ready for client connections.

- [ ] **Step 2: Write the import script before using it**

The script accepts `-SourceSql`, `-ContainerName`, and a masked password. It must:

1. Read the supplied external UTF-16 export from `E:\SWP391\SportsCenterManagement_Full.sql`; never copy it into either repository.
2. Find the first `USE [SportsCenterManagement]` after the machine-specific `CREATE DATABASE` block.
3. Write only a temporary portable UTF-8 script beginning with a `CREATE DATABASE` guard.
4. Copy that temporary script and the committed `Database/2026-09-30-long-sprint1-patch.sql` into the container.
5. Execute both through `/opt/mssql-tools18/bin/sqlcmd` with certificate trust enabled.
6. Delete the temporary host file and both copied container scripts in `finally`; do not leave a converted seed file under the repository or commit seed rows/password hashes.

The script must never print or persist the supplied password.

- [ ] **Step 3: Run the import and verify database rows**

Run:

```powershell
.\scripts\import-sportscenter-database.ps1 `
  -SourceSql 'E:\SWP391\SportsCenterManagement_Full.sql' `
  -ContainerName 'scms-sql' `
  -SaPassword $env:SCMS_SA_PASSWORD
```

Then verify counts without printing hashes:

```powershell
docker exec scms-sql /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sa -P $env:SCMS_SA_PASSWORD -C `
  -d SportsCenterManagement `
  -Q "SELECT COUNT(*) AS Accounts FROM dbo.Account; SELECT COUNT(*) AS Packages FROM dbo.MembershipPackage;"
```

Expected: non-zero account and package counts.

- [ ] **Step 4: Start BE and FE with local-only settings**

In the BE terminal:

```powershell
$env:ConnectionStrings__DefaultConnection = "Server=localhost,1433;Database=SportsCenterManagement;User Id=sa;Password=$env:SCMS_SA_PASSWORD;Encrypt=True;TrustServerCertificate=True"
$env:Jwt__SigningKey = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
dotnet run --project SportsCenterManagement --launch-profile http
```

In the FE terminal create ignored `.env.local` containing only:

```dotenv
VITE_API_BASE_URL=http://localhost:5198
```

Then run `npm run dev`.

- [ ] **Step 5: Write the smoke script against the implemented API contract**

The script must accept `-ApiBaseUrl`, `-ManagerEmail`, and a masked manager password, generate unique test email/phone values, and assert status codes/body invariants for:

1. `POST /api/Auth/login`.
2. Anonymous `GET /api/MembershipPackage/active`.
3. Authenticated member list/search/filter.
4. Manager member creation, update, detail, and soft delete.
5. Counter member registration with the first active package.
6. Membership-status search for the newly registered member.
7. Logout followed by a protected request returning `401`.

Use a helper that throws on an unexpected status and never writes the token, password, or initial member password to output. Print only step names and PASS/FAIL.

- [ ] **Step 6: Run the smoke test and verify GREEN**

Run:

```powershell
.\scripts\smoke-long-sprint1.ps1 `
  -ApiBaseUrl 'http://localhost:5198' `
  -ManagerEmail (Read-Host 'Seed manager email') `
  -ManagerPassword (Read-Host -AsSecureString 'Seed manager password')
```

Expected: every UC step reports PASS; the final revoked-token request is `401`.

- [ ] **Step 7: Commit and push the repeatable checks**

```powershell
git add scripts/import-sportscenter-database.ps1 scripts/smoke-long-sprint1.ps1
git commit -m "test: add Long Sprint 1 integration smoke checks"
git push origin master
```

### Task 11: Update Contracts and Run Final Verification

**Files:**
- Modify: `Sports-Center-Management-System-FE/docs/API_SPECIFICATION_FOR_BE.md`
- Modify: `SportsCenterManagement/BE_API_HANDOFF.md`
- Modify if required by self-review: `Sports-Center-Management-System-FE/docs/superpowers/specs/2026-09-30-long-sprint1-fe-be-integration-design.md`

**Interfaces:**
- Consumes: final implemented routes and DTOs from Tasks 1-10.
- Produces: accurate handoff documentation and two clean, synchronized Git branches.

- [ ] **Step 1: Update only Long's API contract sections**

Record the implemented routes and exact request/response fields for UC5, UC6, UC10, UC13, and UC14. Remove stale statements claiming these endpoints, CRUD operations, or CORS are absent. Keep unrelated use-case sections unchanged.

- [ ] **Step 2: Run complete BE verification**

Run from `SportsCenterManagement`:

```powershell
dotnet restore
dotnet test --no-restore
dotnet build --no-restore
git diff --check
```

Search all added/modified C# lines for forbidden implicit locals and secrets:

```powershell
git diff 993f01d..HEAD -- '*.cs' | rg '^\+' | rg '\bvar\b|Password=|SigningKey.*='
```

Expected: tests/build succeed; the search prints no new `var` declaration or embedded secret.

- [ ] **Step 3: Run complete FE verification**

Run from `Sports-Center-Management-System-FE`:

```powershell
npm test
npm run lint
npm run build
git diff --check
```

Expected: 79 existing tests plus new API tests pass; build passes; only the three pre-existing unrelated lint warnings remain.

- [ ] **Step 4: Re-run live smoke verification**

Run the Task 10 smoke script once against freshly started BE/FE processes and the imported supplied database. Query SQL Server for the smoke-created member, pending subscription, pending invoice, `DeletedAt`, and suspension columns without selecting password hashes.

- [ ] **Step 5: Commit and push documentation separately**

BE:

```powershell
git add BE_API_HANDOFF.md
git commit -m "docs: update Long Sprint 1 API handoff"
git pull --rebase origin master
git push origin master
```

FE:

```powershell
git add docs/API_SPECIFICATION_FOR_BE.md docs/superpowers/specs/2026-09-30-long-sprint1-fe-be-integration-design.md
git commit -m "docs: align Long Sprint 1 API contract"
git pull --rebase origin main
git push origin main
```

- [ ] **Step 6: Confirm final repository state**

Run:

```powershell
git -C E:\SWP391\SportsCenterManagement status --short --branch
git -C E:\SWP391\Sports-Center-Management-System-FE status --short --branch
```

Expected: both working trees are clean and each local branch matches its origin branch.
