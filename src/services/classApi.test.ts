import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "./apiClient";
import {
  mapCancelImpact,
  mapClass,
  mapCoachOption,
  mapRegistration,
  mapRoom,
  mapSession,
  mapSport,
} from "./classApi";
import { classMockServer, resetClassMockServer } from "./classMockServer";
import { addCalendarDays, centerToday } from "../utils/classSchedule";

describe("mapping reference DTOs", () => {
  it("accepts numeric ids and turns them into strings", () => {
    expect(mapSport({ id: 7, name: "Yoga" })).toEqual({
      id: "7",
      name: "Yoga",
      description: "",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    });
    expect(mapRoom({ id: 3, name: "Studio A", capacity: 20 }).location).toBe("");
  });

  it("reads the active flag from either isActive or status", () => {
    expect(mapRoom({ id: 1, name: "A", capacity: 5, isActive: false }).isActive).toBe(
      false,
    );
    expect(
      mapCoachOption({ accountId: "acc-1", fullName: "Hà", status: "Inactive" })
        .isActive,
    ).toBe(false);
  });

  it("splits a comma-separated specialization string", () => {
    expect(
      mapCoachOption({
        accountId: "acc-1",
        fullName: "Trần Thu Hà",
        specializations: "Yoga, Pilates ,",
      }).specializations,
    ).toEqual(["Yoga", "Pilates"]);
  });

  it("names a coach without a full name instead of rendering empty space", () => {
    expect(mapCoachOption({ accountId: "acc-2", fullName: "  " }).fullName).toBe(
      "Huấn luyện viên chưa đặt tên",
    );
  });
});

describe("mapping class DTOs", () => {
  it("fills counters and timestamps the server may omit", () => {
    const result = mapClass({
      id: 12,
      sportId: 7,
      name: "Yoga cân bằng",
      capacity: 15,
      status: "OPEN",
      createdAt: "2026-10-01T02:00:00.000Z",
    });
    expect(result.id).toBe("12");
    expect(result.sportId).toBe("7");
    expect(result.description).toBe("");
    expect(result.upcomingSessionCount).toBe(0);
    expect(result.updatedAt).toBe("2026-10-01T02:00:00.000Z");
  });

  it("falls back to DRAFT for an unknown status so nothing is bookable by accident", () => {
    expect(
      mapClass({ id: 1, sportId: 1, name: "X", capacity: 1, status: "WAT" })
        .status,
    ).toBe("DRAFT");
  });
});

describe("mapping session DTOs", () => {
  const dto = {
    id: 44,
    classId: 12,
    className: "Yoga cân bằng",
    sportId: 7,
    coachId: "coach-1",
    roomId: 3,
    date: "2026-10-20T00:00:00.000Z",
    startTime: "08:00:00",
    endTime: "09:00:00",
    capacity: 15,
    bookedCount: 4,
    remainingCapacity: 11,
    status: "SCHEDULED",
    startsAt: "2026-10-20T08:00:00+07:00",
    endsAt: "2026-10-20T09:00:00+07:00",
  };

  it("trims a date-time to a calendar day and seconds off the clock", () => {
    const result = mapSession(dto);
    expect(result.date).toBe("2026-10-20");
    expect(result.startTime).toBe("08:00");
    expect(result.endTime).toBe("09:00");
  });

  it("keeps the server seat count rather than recomputing it", () => {
    expect(mapSession({ ...dto, remainingCapacity: 2 }).remainingCapacity).toBe(2);
    const withoutServerCount = mapSession({
      ...dto,
      remainingCapacity: undefined,
    });
    expect(withoutServerCount.remainingCapacity).toBe(11);
  });

  it("accepts both CANCELED and CANCELLED spellings", () => {
    expect(mapSession({ ...dto, status: "CANCELLED" }).status).toBe("CANCELED");
    expect(mapSession({ ...dto, status: "canceled" }).status).toBe("CANCELED");
  });

  it("never reports a negative seat count", () => {
    expect(
      mapSession({ ...dto, remainingCapacity: -3 }).remainingCapacity,
    ).toBe(0);
  });
});

describe("mapping registration DTOs", () => {
  it("reads the member id from either field name and keeps the session snapshot", () => {
    const result = mapRegistration({
      id: 5,
      sessionId: 44,
      memberAccountId: "member-1",
      memberName: "Nguyễn Hoàng An",
      memberCode: "MEM0001",
      status: "BOOKED",
      registeredVia: "RECEPTIONIST",
      registeredByName: "Lễ tân Mai",
      session: {
        id: 44,
        classId: 12,
        date: "2026-10-20",
        startTime: "08:00",
        endTime: "09:00",
        capacity: 15,
      },
    });
    expect(result.memberId).toBe("member-1");
    expect(result.registeredVia).toBe("RECEPTIONIST");
    expect(result.session.id).toBe("44");
  });

  it("treats an unknown channel as a member self-registration", () => {
    expect(
      mapRegistration({
        id: 6,
        sessionId: 44,
        memberId: "member-2",
        registeredVia: "SYSTEM",
        session: {
          id: 44,
          classId: 12,
          date: "2026-10-20",
          startTime: "08:00",
          endTime: "09:00",
          capacity: 15,
        },
      }).registeredVia,
    ).toBe("MEMBER");
  });
});

describe("mapping cancel impact", () => {
  it("keeps the requested scope when the server omits it", () => {
    expect(mapCancelImpact({}, "CLASS_FUTURE_SESSIONS")).toEqual({
      scope: "CLASS_FUTURE_SESSIONS",
      affectedSessionCount: 0,
      affectedRegistrationCount: 0,
      affectedMemberCount: 0,
      nextSessionStartsAt: undefined,
    });
  });
});

/**
 * Mock server phải từ chối đúng các nhánh nghiệp vụ, vì màn hình dựa vào mã
 * lỗi của nó để hiển thị thông báo khi backend chưa có.
 */
describe("mock server business rules", () => {
  beforeEach(() => {
    resetClassMockServer();
  });

  const today = centerToday();
  const codeOf = async (action: Promise<unknown>): Promise<string> => {
    try {
      await action;
    } catch (error) {
      return error instanceof ApiError ? (error.code ?? "NO_CODE") : "NOT_API";
    }
    return "NO_ERROR";
  };

  it("rejects a duplicate class name after normalization", async () => {
    expect(
      await codeOf(
        classMockServer.saveClass({
          sportId: "sport-yoga",
          name: "  yoga   CÂN bằng cơ bản ",
          description: "",
          capacity: 10,
          status: "DRAFT",
        }),
      ),
    ).toBe("CLASS_NAME_DUPLICATE");
  });

  it("rejects a duplicate sport name after normalization", async () => {
    expect(
      await codeOf(
        classMockServer.saveSport({
          name: "  YÔGA ",
          description: "Tên bị trùng sau chuẩn hóa.",
        }),
      ),
    ).toBe("SPORT_NAME_DUPLICATE");
  });

  it("refuses to open a class that has no future session", async () => {
    expect(
      await codeOf(
        classMockServer.setClassStatus("class-yoga-advanced", "OPEN"),
      ),
    ).toBe("CLASS_HAS_NO_VALID_SESSION");
  });

  it("rejects a session that clashes with the coach and with the room", async () => {
    const base = {
      classId: "class-yoga-basic",
      date: addCalendarDays(today, 2),
      startTime: "08:30",
      endTime: "09:30",
      capacity: 10,
      notes: "",
    };
    expect(
      await codeOf(
        classMockServer.saveSession({
          ...base,
          coachId: "coach-ha",
          roomId: "room-b",
        }),
      ),
    ).toBe("COACH_SCHEDULE_CONFLICT");
    expect(
      await codeOf(
        classMockServer.saveSession({
          ...base,
          coachId: "coach-nam",
          roomId: "room-a",
        }),
      ),
    ).toBe("ROOM_SCHEDULE_CONFLICT");
  });

  it("accepts a session that starts exactly when another ends", async () => {
    const created = await classMockServer.saveSession({
      classId: "class-yoga-basic",
      coachId: "coach-ha",
      roomId: "room-a",
      date: addCalendarDays(today, 2),
      startTime: "09:00",
      endTime: "10:00",
      capacity: 10,
      notes: "",
    });
    expect(created.status).toBe("SCHEDULED");
  });

  it("rejects assigning a coach whose specialization does not match the class sport", async () => {
    expect(
      await codeOf(
        classMockServer.saveSession({
          classId: "class-yoga-basic",
          coachId: "coach-nam",
          roomId: "room-b",
          date: addCalendarDays(today, 2),
          startTime: "09:00",
          endTime: "10:00",
          capacity: 10,
          notes: "",
        }),
      ),
    ).toBe("COACH_DISCIPLINE_MISMATCH");
  });

  it("rejects a session capacity above the room limit", async () => {
    expect(
      await codeOf(
        classMockServer.saveSession({
          classId: "class-swim-kid",
          coachId: "coach-linh",
          roomId: "room-pool",
          date: addCalendarDays(today, 3),
          startTime: "16:00",
          endTime: "17:00",
          // Lớp cho 10, phòng chỉ chứa 12 nhưng sức chứa lớp mới là giới hạn.
          capacity: 11,
          notes: "",
        }),
      ),
    ).toBe("VALIDATION_ERROR");
  });

  it("blocks a reschedule that would strand a registered member", async () => {
    // session-yoga-2 có hai người đăng ký; member-binh chỉ được phép bộ môn
    // Yoga và member-dung không liên quan, nhưng chuyển sang giờ trùng buổi
    // boxing của member-an sẽ làm member-an không tham gia được.
    await classMockServer.register(
      "session-boxing-1",
      "member-an",
      "MEMBER",
      "Nguyễn Hoàng An",
    );
    const boxing = (
      await classMockServer.listSessions({ classId: "class-boxing-inter" })
    ).find((item) => item.id === "session-boxing-1");
    expect(boxing).toBeDefined();
    expect(
      await codeOf(
        classMockServer.saveSession(
          {
            classId: "class-yoga-basic",
            coachId: "coach-ha",
            roomId: "room-a",
            date: boxing?.date ?? "",
            startTime: "18:30",
            endTime: "19:00",
            capacity: 15,
            notes: "",
          },
          "session-yoga-2",
        ),
      ),
    ).toBe("MEMBER_SCHEDULE_CONFLICT");
  });

  it("rejects every ineligible member on registration", async () => {
    const sessionId = "session-yoga-3";
    expect(
      await codeOf(
        classMockServer.register(sessionId, "member-em", "MEMBER", "Vũ Ngọc Em"),
      ),
    ).toBe("ACCOUNT_INACTIVE");
    expect(
      await codeOf(
        classMockServer.register(sessionId, "member-chi", "MEMBER", "Lê Khánh Chi"),
      ),
    ).toBe("MEMBERSHIP_NOT_VALID_FOR_SESSION");
    expect(
      await codeOf(
        classMockServer.register(
          sessionId,
          "member-dung",
          "MEMBER",
          "Phạm Tiến Dũng",
        ),
      ),
    ).toBe("MEMBERSHIP_NOT_VALID_FOR_SESSION");
    expect(
      await codeOf(
        classMockServer.register(
          "session-boxing-1",
          "member-binh",
          "MEMBER",
          "Trần Thanh Bình",
        ),
      ),
    ).toBe("PACKAGE_NOT_ELIGIBLE");
  });

  it("rejects a second registration and a registration on a closed class", async () => {
    expect(
      await codeOf(
        classMockServer.register(
          "session-yoga-2",
          "member-an",
          "MEMBER",
          "Nguyễn Hoàng An",
        ),
      ),
    ).toBe("DUPLICATE_REGISTRATION");
    expect(
      await codeOf(
        classMockServer.register(
          "session-swim-0",
          "member-an",
          "RECEPTIONIST",
          "Lễ tân Mai",
        ),
      ),
    ).toBe("CLASS_NOT_OPEN");
  });

  it("gives the last seat to one registration only", async () => {
    // Hạ sức chứa xuống đúng số người đã đăng ký, rồi cho một thành viên hợp
    // lệ thử đặt: chỉ có thể là CLASS_FULL, không phải lỗi gói.
    await classMockServer.saveSession(
      {
        classId: "class-yoga-basic",
        coachId: "coach-ha",
        roomId: "room-a",
        date: addCalendarDays(today, 2),
        startTime: "08:00",
        endTime: "09:00",
        capacity: 2,
        notes: "",
      },
      "session-yoga-2",
    );
    const eligibleMemberId = classMockServer.ensureMember({
      id: "member-late",
      fullName: "Người đến muộn",
      email: "late@example.com",
    });
    expect(
      await codeOf(
        classMockServer.register(
          "session-yoga-2",
          eligibleMemberId,
          "RECEPTIONIST",
          "Lễ tân Mai",
        ),
      ),
    ).toBe("CLASS_FULL");
  });

  it("returns the seat once and refuses a repeated cancellation", async () => {
    const before = (
      await classMockServer.listSessions({ classId: "class-yoga-basic" })
    ).find((item) => item.id === "session-yoga-2");
    await classMockServer.cancelRegistration(
      "registration-1",
      "",
      "Nguyễn Hoàng An",
      false,
    );
    const after = (
      await classMockServer.listSessions({ classId: "class-yoga-basic" })
    ).find((item) => item.id === "session-yoga-2");
    expect((before?.bookedCount ?? 0) - (after?.bookedCount ?? 0)).toBe(1);
    expect(
      await codeOf(
        classMockServer.cancelRegistration(
          "registration-1",
          "",
          "Nguyễn Hoàng An",
          false,
        ),
      ),
    ).toBe("REGISTRATION_ALREADY_CANCELED");
  });

  it("requires a reason when the counter cancels on behalf of a member", async () => {
    expect(
      await codeOf(
        classMockServer.cancelRegistration(
          "registration-2",
          " ",
          "Lễ tân Mai",
          true,
        ),
      ),
    ).toBe("VALIDATION_ERROR");
  });

  it("previews exactly the registrations a class-wide cancellation will touch", async () => {
    const impact = await classMockServer.previewCancel(
      "CLASS_FUTURE_SESSIONS",
      { classId: "class-yoga-basic" },
    );
    expect(impact.affectedRegistrationCount).toBe(2);
    expect(impact.affectedMemberCount).toBe(2);

    // Số buổi hiển thị trong dialog phải khớp số buổi thực sự bị hủy, dù buổi
    // sáng nay đã bắt đầu hay chưa vào lúc chạy test.
    const canceled = await classMockServer.cancelSessions(
      "CLASS_FUTURE_SESSIONS",
      { classId: "class-yoga-basic" },
      "Huấn luyện viên nghỉ bệnh",
      "Quản lý trung tâm",
    );
    expect(canceled).toBe(impact.affectedSessionCount);
  });

  it("cancels future sessions together with their registrations", async () => {
    await classMockServer.cancelSessions(
      "CLASS_FUTURE_SESSIONS",
      { classId: "class-yoga-basic" },
      "Huấn luyện viên nghỉ bệnh",
      "Quản lý trung tâm",
    );
    const remaining = await classMockServer.listRegistrations({
      memberId: "member-an",
    });
    expect(
      remaining.every((item) => item.session.classId !== "class-yoga-basic"),
    ).toBe(true);
    const sessions = await classMockServer.listSessions({
      classId: "class-yoga-basic",
    });
    // Buổi đã diễn ra giữ nguyên trạng thái, chỉ buổi tương lai bị hủy.
    expect(sessions.filter((item) => item.status === "COMPLETED")).toHaveLength(
      1,
    );
    expect(
      sessions.filter((item) => item.status === "SCHEDULED" && item.date > today),
    ).toHaveLength(0);
  });

  it("refuses to cancel a session that has already started", async () => {
    expect(
      await codeOf(
        classMockServer.cancelSessions(
          "SESSION",
          { sessionId: "session-yoga-0" },
          "Thử hủy buổi đã qua",
          "Quản lý trung tâm",
        ),
      ),
    ).toBe("SESSION_ALREADY_STARTED");
  });
});
