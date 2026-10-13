-- ====================================================================
-- SCMS — SPRINT 2 / FLOW 2: LỚP HỌC, LỊCH HỌC, ĐĂNG KÝ BUỔI HỌC
-- Đề xuất schema + dữ liệu demo cho UC17–UC21, UC24, UC25, UC29, UC30.
--
-- Nguồn: docs/API_SPECIFICATION_SPRINT2_MINH.md và
--        docs/BE_HANDOFF_SPRINT2_MINH.md (phía FE đã dựng xong màn hình).
--
-- Tương thích: SQL Server 2019 / 2022 / Express / Developer.
-- Chạy sau SportsCenterManagement_Official.sql (cần sẵn Account, Member,
-- Coach, MembershipPackage, MemberSubscription, AuditLog).
--
-- Script idempotent: chạy lại nhiều lần không lỗi, không nhân đôi dữ liệu.
-- Quy ước đặt tên theo đúng script gốc: PK_/FK_/UQ_/IX_/DF_/CK_.
-- ====================================================================

USE [SportsCenterManagement];
GO

SET NOCOUNT ON;
GO

-- ====================================================================
-- 1. BẢNG DANH MỤC
-- ====================================================================

-- 1.1 Sport — bộ môn (UC17)
-- Name dùng collation Vietnamese_CI_AI để "tên không trùng sau chuẩn hóa"
-- được chính database bảo đảm: "YOGA", "Yoga" và "Yôga" bị coi là một.
-- Phần chuẩn hóa khoảng trắng thừa vẫn do application làm trước khi lưu.
IF OBJECT_ID(N'dbo.Sport', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Sport] (
        [Id]        [int] IDENTITY(1,1) NOT NULL,
        [Name]      [nvarchar](80) COLLATE Vietnamese_CI_AI NOT NULL,
        [IsActive]  [bit] NOT NULL CONSTRAINT [DF_Sport_IsActive] DEFAULT (1),
        [CreatedAt] [datetime2](7) NOT NULL CONSTRAINT [DF_Sport_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] [datetime2](7) NULL,
        CONSTRAINT [PK_Sport] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [UQ_Sport_Name] UNIQUE NONCLUSTERED ([Name] ASC)
    );
END
GO

-- 1.2 Room — phòng tập (UC18)
IF OBJECT_ID(N'dbo.Room', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Room] (
        [Id]        [int] IDENTITY(1,1) NOT NULL,
        [Name]      [nvarchar](80) COLLATE Vietnamese_CI_AI NOT NULL,
        [Location]  [nvarchar](120) NULL,
        [Capacity]  [int] NOT NULL,
        [IsActive]  [bit] NOT NULL CONSTRAINT [DF_Room_IsActive] DEFAULT (1),
        [CreatedAt] [datetime2](7) NOT NULL CONSTRAINT [DF_Room_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] [datetime2](7) NULL,
        CONSTRAINT [PK_Room] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [UQ_Room_Name] UNIQUE NONCLUSTERED ([Name] ASC),
        CONSTRAINT [CK_Room_Capacity] CHECK ([Capacity] > 0)
    );
END
GO

-- ====================================================================
-- 2. LỚP HỌC (UC19)
-- ====================================================================

IF OBJECT_ID(N'dbo.Class', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Class] (
        [Id]          [int] IDENTITY(1,1) NOT NULL,
        [SportId]     [int] NOT NULL,
        [Name]        [nvarchar](120) COLLATE Vietnamese_CI_AI NOT NULL,
        [Description] [nvarchar](1000) NULL,
        [Capacity]    [int] NOT NULL,
        [Status]      [varchar](20) NOT NULL CONSTRAINT [DF_Class_Status] DEFAULT ('DRAFT'),
        [CreatedAt]   [datetime2](7) NOT NULL CONSTRAINT [DF_Class_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt]   [datetime2](7) NULL,
        CONSTRAINT [PK_Class] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Class_Sport] FOREIGN KEY ([SportId]) REFERENCES [dbo].[Sport] ([Id]),
        CONSTRAINT [CK_Class_Capacity] CHECK ([Capacity] > 0 AND [Capacity] <= 200),
        CONSTRAINT [CK_Class_Status] CHECK ([Status] IN ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'))
    );
END
GO

-- Tên lớp chỉ cần duy nhất trong số lớp CHƯA lưu trữ: lớp cũ đã archive vẫn
-- giữ tên của nó mà không chặn việc mở lại một lớp cùng tên ở mùa sau.
-- Unique index có WHERE (filtered index) làm đúng việc đó, UNIQUE CONSTRAINT
-- thì không.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Class_Name_Active' AND object_id = OBJECT_ID(N'dbo.Class'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_Class_Name_Active]
        ON [dbo].[Class] ([Name] ASC)
        WHERE [Status] <> 'ARCHIVED';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Class_SportId_Status' AND object_id = OBJECT_ID(N'dbo.Class'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Class_SportId_Status]
        ON [dbo].[Class] ([SportId] ASC, [Status] ASC);
END
GO

-- ====================================================================
-- 3. BUỔI HỌC (UC20, UC21, UC30)
-- ====================================================================

-- SessionDate + StartTime/EndTime là GIỜ TRUNG TÂM (Asia/Ho_Chi_Minh).
-- Không lưu kèm cột UTC: Việt Nam không có DST nên quy đổi luôn là -07:00,
-- application tạo DateTimeOffset khi trả JSON (xem BE_HANDOFF §4.2). Thêm cột
-- UTC trùng lặp chỉ tạo thêm một nguồn sự thật nữa phải giữ đồng bộ.
--
-- BookedCount là cột đếm phi chuẩn hóa, CÓ CHỦ Ý: nó cho phép giành chỗ cuối
-- bằng một câu UPDATE có điều kiện thay vì khóa bảng đăng ký (xem §7).
IF OBJECT_ID(N'dbo.ClassSession', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ClassSession] (
        [Id]           [int] IDENTITY(1,1) NOT NULL,
        [ClassId]      [int] NOT NULL,
        [CoachId]      [varchar](400) NOT NULL,
        [RoomId]       [int] NOT NULL,
        [SessionDate]  [date] NOT NULL,
        [StartTime]    [time](0) NOT NULL,
        [EndTime]      [time](0) NOT NULL,
        [Capacity]     [int] NOT NULL,
        [BookedCount]  [int] NOT NULL CONSTRAINT [DF_ClassSession_BookedCount] DEFAULT (0),
        [Status]       [varchar](20) NOT NULL CONSTRAINT [DF_ClassSession_Status] DEFAULT ('SCHEDULED'),
        [Notes]        [nvarchar](500) NULL,
        [CancelReason] [nvarchar](500) NULL,
        [CanceledAt]   [datetime2](7) NULL,
        [CanceledBy]   [varchar](400) NULL,
        [CreatedAt]    [datetime2](7) NOT NULL CONSTRAINT [DF_ClassSession_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        [CreatedBy]    [varchar](400) NULL,
        [UpdatedAt]    [datetime2](7) NULL,
        [RowVersion]   [rowversion] NOT NULL,
        CONSTRAINT [PK_ClassSession] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_ClassSession_Class] FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class] ([Id]),
        CONSTRAINT [FK_ClassSession_Coach] FOREIGN KEY ([CoachId]) REFERENCES [dbo].[Coach] ([AccountId]),
        CONSTRAINT [FK_ClassSession_Room] FOREIGN KEY ([RoomId]) REFERENCES [dbo].[Room] ([Id]),
        CONSTRAINT [FK_ClassSession_CanceledBy] FOREIGN KEY ([CanceledBy]) REFERENCES [dbo].[Account] ([Id]),
        CONSTRAINT [FK_ClassSession_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Account] ([Id]),
        -- Khoảng giờ nửa mở [start, end): buổi rỗng hoặc ngược giờ bị chặn ở
        -- tầng dữ liệu, không chỉ ở tầng service.
        CONSTRAINT [CK_ClassSession_TimeRange] CHECK ([StartTime] < [EndTime]),
        CONSTRAINT [CK_ClassSession_Capacity] CHECK ([Capacity] > 0 AND [Capacity] <= 200),
        -- Chốt chặn cuối cho chuyện vượt sức chứa: dù service có lỗi logic thì
        -- database vẫn không cho BookedCount vượt Capacity.
        CONSTRAINT [CK_ClassSession_BookedCount] CHECK ([BookedCount] >= 0 AND [BookedCount] <= [Capacity]),
        CONSTRAINT [CK_ClassSession_Status] CHECK ([Status] IN ('SCHEDULED', 'CANCELED', 'COMPLETED'))
    );
END
GO

-- Index phục vụ đúng ba truy vấn nặng nhất: kiểm tra trùng Coach, kiểm tra
-- trùng phòng, và xem lịch theo khoảng ngày.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClassSession_Date_Coach' AND object_id = OBJECT_ID(N'dbo.ClassSession'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ClassSession_Date_Coach]
        ON [dbo].[ClassSession] ([SessionDate] ASC, [CoachId] ASC, [Status] ASC)
        INCLUDE ([StartTime], [EndTime]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClassSession_Date_Room' AND object_id = OBJECT_ID(N'dbo.ClassSession'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ClassSession_Date_Room]
        ON [dbo].[ClassSession] ([SessionDate] ASC, [RoomId] ASC, [Status] ASC)
        INCLUDE ([StartTime], [EndTime]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClassSession_Class_Date' AND object_id = OBJECT_ID(N'dbo.ClassSession'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ClassSession_Class_Date]
        ON [dbo].[ClassSession] ([ClassId] ASC, [SessionDate] ASC, [Status] ASC);
END
GO

-- ====================================================================
-- 4. ĐĂNG KÝ BUỔI HỌC (UC24, UC25, UC29)
-- ====================================================================

IF OBJECT_ID(N'dbo.ClassRegistration', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ClassRegistration] (
        [Id]            [int] IDENTITY(1,1) NOT NULL,
        [SessionId]     [int] NOT NULL,
        [MemberId]      [varchar](400) NOT NULL,
        [Status]        [varchar](20) NOT NULL CONSTRAINT [DF_ClassRegistration_Status] DEFAULT ('BOOKED'),
        [RegisteredAt]  [datetime2](7) NOT NULL CONSTRAINT [DF_ClassRegistration_RegisteredAt] DEFAULT (SYSUTCDATETIME()),
        -- RegisteredVia nói KÊNH, RegisteredBy nói NGƯỜI BẤM NÚT. Lễ tân đăng
        -- ký thay thì MemberId là học viên, RegisteredBy là tài khoản lễ tân.
        [RegisteredVia] [varchar](20) NOT NULL CONSTRAINT [DF_ClassRegistration_RegisteredVia] DEFAULT ('MEMBER'),
        [RegisteredBy]  [varchar](400) NOT NULL,
        [CanceledAt]    [datetime2](7) NULL,
        [CanceledBy]    [varchar](400) NULL,
        [CancelReason]  [nvarchar](500) NULL,
        CONSTRAINT [PK_ClassRegistration] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_ClassRegistration_Session] FOREIGN KEY ([SessionId]) REFERENCES [dbo].[ClassSession] ([Id]),
        CONSTRAINT [FK_ClassRegistration_Member] FOREIGN KEY ([MemberId]) REFERENCES [dbo].[Member] ([AccountId]),
        CONSTRAINT [FK_ClassRegistration_RegisteredBy] FOREIGN KEY ([RegisteredBy]) REFERENCES [dbo].[Account] ([Id]),
        CONSTRAINT [FK_ClassRegistration_CanceledBy] FOREIGN KEY ([CanceledBy]) REFERENCES [dbo].[Account] ([Id]),
        CONSTRAINT [CK_ClassRegistration_Status] CHECK ([Status] IN ('BOOKED', 'CANCELED')),
        CONSTRAINT [CK_ClassRegistration_Via] CHECK ([RegisteredVia] IN ('MEMBER', 'RECEPTIONIST')),
        -- Đã hủy thì phải có mốc thời gian hủy, để báo cáo không gặp bản ghi
        -- nửa vời.
        CONSTRAINT [CK_ClassRegistration_CanceledAt] CHECK (
            ([Status] = 'CANCELED' AND [CanceledAt] IS NOT NULL)
            OR ([Status] = 'BOOKED' AND [CanceledAt] IS NULL)
        )
    );
END
GO

-- ĐÂY LÀ RÀNG BUỘC QUAN TRỌNG NHẤT CỦA FLOW 2.
-- Filtered unique index: một thành viên chỉ có TỐI ĐA MỘT đăng ký còn hiệu
-- lực trên một buổi, nhưng vẫn được đăng ký lại sau khi đã hủy (bản ghi cũ
-- mang Status='CANCELED' nên nằm ngoài index). Unique constraint thường sẽ
-- chặn luôn việc đăng ký lại — sai nghiệp vụ.
-- Service bắt lỗi 2601/2627 từ index này và trả DUPLICATE_REGISTRATION.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_ClassRegistration_ActiveBooking' AND object_id = OBJECT_ID(N'dbo.ClassRegistration'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_ClassRegistration_ActiveBooking]
        ON [dbo].[ClassRegistration] ([SessionId] ASC, [MemberId] ASC)
        WHERE [Status] = 'BOOKED';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClassRegistration_Member_Status' AND object_id = OBJECT_ID(N'dbo.ClassRegistration'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ClassRegistration_Member_Status]
        ON [dbo].[ClassRegistration] ([MemberId] ASC, [Status] ASC)
        INCLUDE ([SessionId], [RegisteredAt]);
END
GO

-- ====================================================================
-- 5. TÙY CHỌN — QUYỀN BỘ MÔN THEO GÓI
-- Chỉ tạo khi nhóm chốt "gói có giới hạn bộ môn" (Sprint2.md §6).
-- Quy ước: gói KHÔNG có dòng nào trong bảng này = được vào MỌI bộ môn.
-- Nếu nhóm chốt bỏ luật này, xóa bảng và bỏ luôn mã lỗi PACKAGE_NOT_ELIGIBLE.
-- ====================================================================

IF OBJECT_ID(N'dbo.MembershipPackageSport', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MembershipPackageSport] (
        [PackageId] [int] NOT NULL,
        [SportId]   [int] NOT NULL,
        CONSTRAINT [PK_MembershipPackageSport] PRIMARY KEY CLUSTERED ([PackageId] ASC, [SportId] ASC),
        CONSTRAINT [FK_MembershipPackageSport_Package] FOREIGN KEY ([PackageId]) REFERENCES [dbo].[MembershipPackage] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MembershipPackageSport_Sport] FOREIGN KEY ([SportId]) REFERENCES [dbo].[Sport] ([Id])
    );
END
GO

-- ====================================================================
-- 6. BỔ SUNG CHO BẢNG CŨ
-- ====================================================================

-- Luật "gói đang tạm ngưng thì không đặt lớp" (Sprint2.md §6) hiện KHÔNG có
-- dữ liệu để kiểm tra: MemberSubscription chưa có cột tạm ngưng nào.
-- Thêm ở đây để UC24 kiểm tra được; nếu nhóm bỏ luật tạm ngưng thì bỏ qua.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID(N'dbo.MemberSubscription') AND name = N'IsSuspended')
BEGIN
    ALTER TABLE [dbo].[MemberSubscription]
        ADD [IsSuspended] [bit] NOT NULL CONSTRAINT [DF_MemberSubscription_IsSuspended] DEFAULT (0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID(N'dbo.MemberSubscription') AND name = N'SuspensionReason')
BEGIN
    ALTER TABLE [dbo].[MemberSubscription]
        ADD [SuspensionReason] [nvarchar](500) NULL;
END
GO

-- ====================================================================
-- 7. DỮ LIỆU DEMO
-- Khớp đúng bộ dữ liệu mẫu FE đang chạy (src/services/classMockServer.ts),
-- để demo hai bên nhìn thấy cùng một thứ.
--
-- Ngày giờ tính tương đối theo GETDATE() nên script luôn có buổi quá khứ và
-- buổi tương lai, chạy lúc nào cũng demo được.
-- ====================================================================

DECLARE @today date = CAST(GETDATE() AS date);
DECLARE @pwdHash varchar(255) = '$2a$11$Pg2II6mLLJckDVq3MotNgei88QWFHN2hXmeDkv4jwSajh.4npLnYG'; -- Admin@123

-- 7.1 Bộ môn
IF NOT EXISTS (SELECT 1 FROM [dbo].[Sport])
BEGIN
    INSERT INTO [dbo].[Sport] ([Name], [IsActive]) VALUES
        (N'Yoga', 1),
        (N'Boxing', 1),
        (N'Bơi lội', 1),
        (N'Dance fitness', 0);   -- bộ môn ngừng hoạt động, để test SPORT_INACTIVE
END

-- 7.2 Phòng tập
IF NOT EXISTS (SELECT 1 FROM [dbo].[Room])
BEGIN
    INSERT INTO [dbo].[Room] ([Name], [Location], [Capacity], [IsActive]) VALUES
        (N'Studio A',          N'Tầng 2',  20, 1),
        (N'Studio B',          N'Tầng 2',  25, 1),
        (N'Hồ bơi trong nhà',  N'Tầng 1',  12, 1),
        (N'Sân ngoài trời',    N'Sân sau', 30, 0);  -- phòng ngừng hoạt động, test ROOM_INACTIVE
END

-- 7.3 Huấn luyện viên bổ sung
-- Script gốc chỉ có một Coach; cần ít nhất hai Coach đang hoạt động để test
-- COACH_SCHEDULE_CONFLICT, và một Coach ngừng hoạt động để test COACH_INACTIVE.
IF NOT EXISTS (SELECT 1 FROM [dbo].[Account] WHERE [Id] = 'acc-coa-002')
BEGIN
    INSERT INTO [dbo].[Account] ([Id], [RoleId], [Email], [PasswordHash], [Phone], [Status]) VALUES
        ('acc-coa-002', 2, 'coach02@sportscenter.com', @pwdHash, '0922000002', 'Active'),
        ('acc-coa-003', 2, 'coach03@sportscenter.com', @pwdHash, '0922000003', 'Active'),
        ('acc-coa-004', 2, 'coach04@sportscenter.com', @pwdHash, '0922000004', 'Inactive');

    INSERT INTO [dbo].[Coach] ([AccountId], [FullName], [Specialization], [WorkSchedule]) VALUES
        ('acc-coa-002', N'Lê Hoàng Nam',   N'Boxing, Thể lực', N'Ca chiều: Thứ 2 - Thứ 7'),
        ('acc-coa-003', N'Phạm Mỹ Linh',   N'Bơi lội',         N'Ca sáng: Thứ 3 - Chủ nhật'),
        ('acc-coa-004', N'Đỗ Trường Sơn',  N'Dance fitness',   N'Đã ngừng phân công');
END

-- 7.4 Thành viên demo — mỗi người phụ trách đúng một nhánh từ chối của UC24
IF NOT EXISTS (SELECT 1 FROM [dbo].[Account] WHERE [Id] = 'acc-mem-101')
BEGIN
    INSERT INTO [dbo].[Account] ([Id], [RoleId], [Email], [PasswordHash], [Phone], [Status]) VALUES
        ('acc-mem-101', 4, 'an.nguyen@example.com',  @pwdHash, '0901000001', 'Active'),
        ('acc-mem-102', 4, 'binh.tran@example.com',  @pwdHash, '0901000002', 'Active'),
        ('acc-mem-103', 4, 'chi.le@example.com',     @pwdHash, '0901000003', 'Active'),
        ('acc-mem-104', 4, 'dung.pham@example.com',  @pwdHash, '0901000004', 'Active'),
        ('acc-mem-105', 4, 'em.vu@example.com',      @pwdHash, '0901000005', 'Inactive');

    INSERT INTO [dbo].[Member] ([AccountId], [MemberCode], [FullName], [DateOfBirth]) VALUES
        ('acc-mem-101', 'MB0101', N'Nguyễn Hoàng An', '1996-01-10'),
        ('acc-mem-102', 'MB0102', N'Trần Thanh Bình', '1994-02-11'),
        ('acc-mem-103', 'MB0103', N'Lê Khánh Chi',    '2000-03-12'),
        ('acc-mem-104', 'MB0104', N'Phạm Tiến Dũng',  '1998-04-13'),
        ('acc-mem-105', 'MB0105', N'Vũ Ngọc Em',      '1997-05-14');

    -- Giá trị Status dùng đúng chuỗi mà MemberSubscriptionService đang ghi:
    -- 'CONFIRMED' / 'PENDING_PAYMENT'. Vài dòng seed trong script gốc ghi
    -- 'Confirmed' — vẫn khớp nhờ collation không phân biệt hoa thường, nhưng
    -- dữ liệu mới nên theo đúng chuỗi của code.
    -- 101: gói hợp lệ dài hạn, toàn quyền          -> đặt chỗ thành công
    -- 102: gói Yoga, còn hạn                       -> PACKAGE_NOT_ELIGIBLE với lớp Boxing
    -- 103: gói chờ thanh toán                      -> MEMBERSHIP_NOT_VALID_FOR_SESSION
    -- 104: gói hết hạn ngày mai                    -> MEMBERSHIP_NOT_VALID_FOR_SESSION với buổi xa
    -- 105: tài khoản ngừng hoạt động               -> ACCOUNT_INACTIVE
    INSERT INTO [dbo].[MemberSubscription]
        ([MemberId], [PackageId], [PackageName], [PackagePrice], [DurationMonths], [Benefits], [StartDate], [EndDate], [Kind], [Status])
    SELECT 'acc-mem-101', 4, p.[Name], p.[Price], p.[DurationMonths], p.[Benefits], DATEADD(day, -30, @today), DATEADD(day, 120, @today), 'NEW', 'CONFIRMED' FROM [dbo].[MembershipPackage] p WHERE p.[Id] = 4
    UNION ALL
    SELECT 'acc-mem-102', 5, p.[Name], p.[Price], p.[DurationMonths], p.[Benefits], DATEADD(day, -10, @today), DATEADD(day,  45, @today), 'NEW', 'CONFIRMED' FROM [dbo].[MembershipPackage] p WHERE p.[Id] = 5
    UNION ALL
    SELECT 'acc-mem-103', 1, p.[Name], p.[Price], p.[DurationMonths], p.[Benefits], @today,                    DATEADD(day,  30, @today), 'NEW', 'PENDING_PAYMENT' FROM [dbo].[MembershipPackage] p WHERE p.[Id] = 1
    UNION ALL
    SELECT 'acc-mem-104', 1, p.[Name], p.[Price], p.[DurationMonths], p.[Benefits], DATEADD(day, -29, @today), DATEADD(day,   1, @today), 'NEW', 'CONFIRMED' FROM [dbo].[MembershipPackage] p WHERE p.[Id] = 1
    UNION ALL
    SELECT 'acc-mem-105', 4, p.[Name], p.[Price], p.[DurationMonths], p.[Benefits], DATEADD(day, -10, @today), DATEADD(day,  60, @today), 'NEW', 'CONFIRMED' FROM [dbo].[MembershipPackage] p WHERE p.[Id] = 4;
END

-- 7.5 Quyền bộ môn theo gói — chỉ seed khi nhóm dùng luật entitlement.
-- Gói 5 "Học Viên Yoga" chỉ vào được Yoga; các gói khác không có dòng nào nên
-- vào được mọi bộ môn.
IF NOT EXISTS (SELECT 1 FROM [dbo].[MembershipPackageSport])
BEGIN
    INSERT INTO [dbo].[MembershipPackageSport] ([PackageId], [SportId])
    SELECT 5, s.[Id] FROM [dbo].[Sport] s WHERE s.[Name] = N'Yoga';
END

-- 7.6 Lớp học
IF NOT EXISTS (SELECT 1 FROM [dbo].[Class])
BEGIN
    INSERT INTO [dbo].[Class] ([SportId], [Name], [Description], [Capacity], [Status])
    SELECT s.[Id], N'Yoga cân bằng cơ bản', N'Lớp nhập môn cho người mới, tập trung vào hơi thở và tư thế nền.', 15, 'OPEN'   FROM [dbo].[Sport] s WHERE s.[Name] = N'Yoga'
    UNION ALL
    SELECT s.[Id], N'Boxing trung cấp',     N'Kỹ thuật di chuyển và tổ hợp đòn, yêu cầu đã tập ít nhất 3 tháng.', 12, 'OPEN'  FROM [dbo].[Sport] s WHERE s.[Name] = N'Boxing'
    UNION ALL
    SELECT s.[Id], N'Bơi lội thiếu nhi',    N'Nhóm nhỏ tối đa 10 bạn, luôn có cứu hộ tại bể.',                    10, 'CLOSED' FROM [dbo].[Sport] s WHERE s.[Name] = N'Bơi lội'
    UNION ALL
    SELECT s.[Id], N'Yoga nâng cao buổi tối', N'Chuỗi tư thế liên tục, dành cho thành viên đã tập trên 6 tháng.', 12, 'DRAFT'  FROM [dbo].[Sport] s WHERE s.[Name] = N'Yoga';
END

-- 7.7 Buổi học
IF NOT EXISTS (SELECT 1 FROM [dbo].[ClassSession])
BEGIN
    DECLARE @yoga int        = (SELECT [Id] FROM [dbo].[Class] WHERE [Name] = N'Yoga cân bằng cơ bản');
    DECLARE @boxing int      = (SELECT [Id] FROM [dbo].[Class] WHERE [Name] = N'Boxing trung cấp');
    DECLARE @swim int        = (SELECT [Id] FROM [dbo].[Class] WHERE [Name] = N'Bơi lội thiếu nhi');
    DECLARE @studioA int     = (SELECT [Id] FROM [dbo].[Room]  WHERE [Name] = N'Studio A');
    DECLARE @studioB int     = (SELECT [Id] FROM [dbo].[Room]  WHERE [Name] = N'Studio B');
    DECLARE @pool int        = (SELECT [Id] FROM [dbo].[Room]  WHERE [Name] = N'Hồ bơi trong nhà');

    INSERT INTO [dbo].[ClassSession]
        ([ClassId], [CoachId], [RoomId], [SessionDate], [StartTime], [EndTime], [Capacity], [BookedCount], [Status], [Notes], [CancelReason], [CanceledAt], [CreatedBy])
    VALUES
        -- Yoga: một buổi đã diễn ra + bốn buổi tương lai
        (@yoga,   'acc-coa-001', @studioA, DATEADD(day, -1, @today), '08:00', '09:00', 15, 0, 'COMPLETED', NULL, NULL, NULL, 'acc-mgr-001'),
        (@yoga,   'acc-coa-001', @studioA, @today,                   '08:00', '09:00', 15, 0, 'SCHEDULED', NULL, NULL, NULL, 'acc-mgr-001'),
        (@yoga,   'acc-coa-001', @studioA, DATEADD(day,  2, @today), '08:00', '09:00', 15, 2, 'SCHEDULED', NULL, NULL, NULL, 'acc-mgr-001'),
        (@yoga,   'acc-coa-001', @studioA, DATEADD(day,  4, @today), '08:00', '09:00', 15, 0, 'SCHEDULED', NULL, NULL, NULL, 'acc-mgr-001'),
        (@yoga,   'acc-coa-001', @studioA, DATEADD(day,  7, @today), '08:00', '09:00', 15, 0, 'SCHEDULED', NULL, NULL, NULL, 'acc-mgr-001'),
        -- Boxing
        (@boxing, 'acc-coa-002', @studioB, DATEADD(day,  1, @today), '18:00', '19:30', 12, 1, 'SCHEDULED', N'Mang găng cá nhân.', NULL, NULL, 'acc-mgr-001'),
        (@boxing, 'acc-coa-002', @studioB, DATEADD(day,  3, @today), '18:00', '19:30', 12, 0, 'SCHEDULED', N'Mang găng cá nhân.', NULL, NULL, 'acc-mgr-001'),
        (@boxing, 'acc-coa-002', @studioB, DATEADD(day,  6, @today), '18:00', '19:30', 12, 0, 'SCHEDULED', N'Mang găng cá nhân.', NULL, NULL, 'acc-mgr-001'),
        -- Bơi lội: một buổi bình thường + một buổi đã hủy sẵn
        (@swim,   'acc-coa-003', @pool,    DATEADD(day,  2, @today), '16:00', '17:00', 10, 0, 'SCHEDULED', NULL, NULL, NULL, 'acc-mgr-001'),
        (@swim,   'acc-coa-003', @pool,    DATEADD(day,  5, @today), '16:00', '17:00', 10, 0, 'CANCELED',  NULL, N'Bảo trì hệ thống lọc nước.', SYSUTCDATETIME(), 'acc-mgr-001');
END

-- 7.8 Đăng ký mẫu
-- BookedCount ở 7.7 đã được seed khớp với số dòng dưới đây. Sau khi chạy
-- script, đối chiếu lại bằng câu truy vấn ở §8.
IF NOT EXISTS (SELECT 1 FROM [dbo].[ClassRegistration])
BEGIN
    DECLARE @yogaSession int = (
        SELECT TOP 1 cs.[Id] FROM [dbo].[ClassSession] cs
        INNER JOIN [dbo].[Class] c ON c.[Id] = cs.[ClassId]
        WHERE c.[Name] = N'Yoga cân bằng cơ bản' AND cs.[SessionDate] = DATEADD(day, 2, @today));
    DECLARE @boxingSession int = (
        SELECT TOP 1 cs.[Id] FROM [dbo].[ClassSession] cs
        INNER JOIN [dbo].[Class] c ON c.[Id] = cs.[ClassId]
        WHERE c.[Name] = N'Boxing trung cấp' AND cs.[SessionDate] = DATEADD(day, 1, @today));

    INSERT INTO [dbo].[ClassRegistration]
        ([SessionId], [MemberId], [Status], [RegisteredVia], [RegisteredBy]) VALUES
        (@yogaSession,   'acc-mem-101', 'BOOKED', 'MEMBER',       'acc-mem-101'),
        (@yogaSession,   'acc-mem-102', 'BOOKED', 'RECEPTIONIST', 'acc-rec-001'),
        (@boxingSession, 'acc-mem-101', 'BOOKED', 'MEMBER',       'acc-mem-101');
END
GO

-- ====================================================================
-- 8. KIỂM TRA SAU KHI CHẠY
-- Cả ba truy vấn phải trả về 0 dòng. Có dòng nào tức là dữ liệu đã lệch.
-- ====================================================================

PRINT '--- 8.1 BookedCount lệch số đăng ký còn hiệu lực (phải rỗng) ---';
SELECT cs.[Id] AS SessionId, cs.[BookedCount], COUNT(r.[Id]) AS ActualBooked
FROM [dbo].[ClassSession] cs
LEFT JOIN [dbo].[ClassRegistration] r ON r.[SessionId] = cs.[Id] AND r.[Status] = 'BOOKED'
GROUP BY cs.[Id], cs.[BookedCount]
HAVING cs.[BookedCount] <> COUNT(r.[Id]);

PRINT '--- 8.2 Đăng ký còn hiệu lực trên buổi đã hủy (phải rỗng) ---';
SELECT r.[Id], r.[SessionId], r.[MemberId]
FROM [dbo].[ClassRegistration] r
INNER JOIN [dbo].[ClassSession] cs ON cs.[Id] = r.[SessionId]
WHERE r.[Status] = 'BOOKED' AND cs.[Status] = 'CANCELED';

PRINT '--- 8.3 Buổi trùng Coach hoặc trùng phòng (phải rỗng) ---';
SELECT a.[Id] AS SessionA, b.[Id] AS SessionB, a.[SessionDate],
       CASE WHEN a.[CoachId] = b.[CoachId] THEN 'COACH' ELSE 'ROOM' END AS ConflictKind
FROM [dbo].[ClassSession] a
INNER JOIN [dbo].[ClassSession] b
        ON b.[Id] > a.[Id]
       AND b.[SessionDate] = a.[SessionDate]
       AND (b.[CoachId] = a.[CoachId] OR b.[RoomId] = a.[RoomId])
       -- Khoảng nửa mở [start, end): liền kề không tính là trùng.
       AND a.[StartTime] < b.[EndTime]
       AND b.[StartTime] < a.[EndTime]
WHERE a.[Status] = 'SCHEDULED' AND b.[Status] = 'SCHEDULED';
GO

PRINT '>>> Flow 2 schema + seed data completed. <<<';
GO
