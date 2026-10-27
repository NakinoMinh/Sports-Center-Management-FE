import { beforeEach, describe, expect, it, vi } from "vitest";
import { classRosterApi } from "./classRosterApi";
import { myTeachingScheduleApi } from "./myTeachingScheduleApi";
import { classApi } from "./classApi";
import { roomApi } from "./roomApi";
import { assignCoachApi } from "./assignCoachApi";
import { sprint2Api } from "./sprint2Api";
import { auditApi } from "./auditApi";
import { apiRequest } from "./apiClient";
vi.mock("./apiClient", () => ({ apiRequest: vi.fn(), isApiConfigured: () => true }));
const request = vi.mocked(apiRequest);
const paged = <T,>(items: T[], totalPages = 1) => ({items, page:1, pageSize:20, totalItems:items.length,totalPages});
const session = {id:7,classId:2,sportId:1,coachId:"coach",roomId:3,date:"2026-10-20",startTime:"09:00:00",endTime:"10:00:00",startsAt:"2026-10-20T09:00:00+07:00",endsAt:"2026-10-20T10:00:00+07:00",capacity:10,bookedCount:2,remainingCapacity:8,status:"SCHEDULED"};
const registration = {id:9,sessionId:7,memberAccountId:"member",status:"BOOKED",registeredVia:"MEMBER",session};
beforeEach(() => request.mockReset());
describe("Sprint 2 backend master contracts", () => {
  it("reads direct Room payloads for every operation",async () => {
    const room={id:3,name:"Phòng A",location:null,capacity:10,isActive:true};
    request.mockResolvedValueOnce(paged([room])).mockResolvedValue(room);
    expect(await roomApi.getAll()).toEqual([expect.objectContaining({id:"3",location:""})]);
    const input={name:"Phòng A",location:"",capacity:10,isActive:true};
    expect((await roomApi.create(input)).id).toBe("3");
    expect((await roomApi.update("3",input)).id).toBe("3");
    expect((await roomApi.setActive("3",false)).id).toBe("3");
  });
  it("loads all canonical session pages for coach assignment",async () => {
    request.mockResolvedValueOnce(paged([session],2)).mockResolvedValueOnce(paged([{...session,id:8}],2));
    expect(await assignCoachApi.getSessions()).toHaveLength(2);
    expect(request.mock.calls.map(c=>c[0])).toEqual(["/ClassSession?page=1&pageSize=100","/ClassSession?page=2&pageSize=100"]);
    request.mockResolvedValue(session);
    await assignCoachApi.assignCoach(7,"coach-new");
    expect(request).toHaveBeenLastCalledWith("/ClassSession/7/coach",{method:"PUT",body:JSON.stringify({coachId:"coach-new"})});
  });
  it("maps the privacy-limited roster without a nested session",async () => {
    request.mockResolvedValue(paged([{id:9,sessionId:7,memberAccountId:"member",memberName:"Học viên",memberCode:"M1",status:"BOOKED",registeredVia:"MEMBER",registeredAt:"2026-10-15T00:00:00Z"}]));
    const result=await classApi.listSessionRegistrations("7");
    expect(result[0]).toEqual(expect.objectContaining({id:"9",sessionId:"7",memberId:"member",memberName:"Học viên"}));
    expect(result[0]).not.toHaveProperty("session");
    expect(request.mock.calls[0][0]).toContain("includeCanceled=true");
  });
  it("maps class create/update/status direct responses",async () => {
    const dto={id:2,sportId:1,sportName:"Yoga",name:"Lớp A",capacity:10,status:"DRAFT"};
    request.mockResolvedValue(dto);
    const input={sportId:"1",name:"Lớp A",description:"",capacity:10,status:"DRAFT" as const};
    // Tạo lớp luôn kèm lịch học: giáo viên đứng lớp, phòng, khoảng ngày, các
    // thứ trong tuần và ca học đi cùng một payload.
    const schedule={coachId:"coach",roomId:"3",startDate:"2026-11-02",endDate:"2026-11-30",daysOfWeek:[1,3] as (1|3)[],startTime:"18:00",endTime:"19:30"};
    expect((await classApi.createClass({...input,schedule})).sportId).toBe("1");
    expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toMatchObject({sportId:1,schedule:{coachId:"coach",roomId:3,daysOfWeek:[1,3],startTime:"18:00",endTime:"19:30"}});
    await classApi.updateClass(input,"2");await classApi.setClassStatus("2","OPEN");
    expect(request.mock.calls.map(c=>[c[0],c[1]?.method])).toEqual([["/Class","POST"],["/Class/2","PUT"],["/Class/2/status","PATCH"]]);
  });
  it("assigns a whole schedule block to an existing class",async () => {
    request.mockResolvedValue({classId:2,createdSessionCount:9});
    const result=await classApi.addSchedule("2",{coachId:"coach",roomId:"3",startDate:"2026-11-02",endDate:"2026-11-30",daysOfWeek:[1,3],startTime:"18:00",endTime:"19:30"});
    expect(result.createdSessionCount).toBe(9);
    expect(request.mock.calls[0][0]).toBe("/Class/2/schedule");
  });
  it("registers and cancels at class level, not per session",async () => {
    const enrollment={classId:2,className:"Lớp A",sportId:1,sportName:"Yoga",memberAccountId:"member",status:"BOOKED",bookedSessionCount:9,upcomingSessionCount:9,sessions:[]};
    request.mockResolvedValue(enrollment);
    expect((await classApi.registerClass("2")).bookedSessionCount).toBe(9);
    await classApi.registerClassAtCounter("2","member");
    await classApi.cancelMyClass("2","");
    await classApi.cancelClassAtCounter("2","member","Xin hủy");
    expect(request.mock.calls.map(c=>c[0])).toEqual(["/ClassRegistration/register-class","/ClassRegistration/counter-register-class","/ClassRegistration/classes/2/cancel","/ClassRegistration/classes/2/counter-cancel?memberAccountId=member"]);
    expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toEqual({classId:2});
  });
  it("sends numeric class/room IDs and keeps server timestamps and seats",async () => {
    request.mockResolvedValue(session);
    const result=await classApi.saveSession({classId:"2",coachId:"coach",roomId:"3",date:"2026-10-20",startTime:"09:00",endTime:"10:00",capacity:10,notes:""},"7");
    expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toMatchObject({classId:2,roomId:3});
    expect(result.startsAt).toBe(session.startsAt);expect(result.remainingCapacity).toBe(8);
  });
  it("uses token identity for Member and numeric session IDs for booking",async () => {
    request.mockResolvedValue(registration);
    await classApi.registerMyself("7");
    expect(request).toHaveBeenLastCalledWith("/ClassRegistration/register",{method:"POST",body:JSON.stringify({sessionId:7})});
    await classApi.registerAtCounter("7","member");
    expect(request).toHaveBeenLastCalledWith("/ClassRegistration/counter-register",{method:"POST",body:JSON.stringify({sessionId:7,memberAccountId:"member"})});
  });
  it("uses distinct Member and counter cancellation endpoints",async () => {
    request.mockResolvedValue({...registration,status:"CANCELED"});
    await classApi.cancelMyRegistration("9","");
    await classApi.cancelAtCounter("9","Xin hủy");
    expect(request.mock.calls.map(c=>c[0])).toEqual(["/ClassRegistration/9/cancel","/ClassRegistration/9/counter-cancel"]);
    expect(JSON.parse(request.mock.calls[1][1]?.body as string)).toEqual({reason:"Xin hủy"});
  });
  it("loads canceled personal history and all pages",async () => {
    request.mockResolvedValueOnce(paged([registration],2)).mockResolvedValueOnce(paged([{...registration,id:10,status:"CANCELED"}],2));
    expect(await classApi.listMyRegistrations(true)).toHaveLength(2);
    expect(request.mock.calls[1][0]).toContain("/ClassRegistration/me?includeCanceled=true&page=2");
  });
  it("narrows the personal schedule to the range the screen shows",async () => {
    request.mockResolvedValue(paged([registration]));
    await classApi.listMyRegistrations(true,{from:"2026-10-19",to:"2026-10-25"});
    const url=new URL(request.mock.calls[0][0],"http://test");
    expect(url.searchParams.get("from")).toBe("2026-10-19");
    expect(url.searchParams.get("to")).toBe("2026-10-25");
  });
  it("reads coach expertise from the disciplines the Coach API sends",async () => {
    request.mockResolvedValue(paged([{accountId:"coach-1",fullName:"Trần Thu Hà",status:"Active",disciplines:[{disciplineId:1,disciplineName:"Yoga",isActive:true},{disciplineId:2,disciplineName:"Bỏ dạy",isActive:false}]}]));
    const coaches=await classApi.listCoaches();
    expect(coaches[0].specializations).toEqual(["Yoga"]);
  });
  it("loads teaching schedule from /me",async () => {
    request.mockResolvedValue(paged([session]));
    expect((await classApi.listTeachingSessions({from:"2026-10-20",to:"2026-10-26"}))[0].id).toBe("7");
    expect(request.mock.calls[0][0]).toContain("/ClassSession/me?from=2026-10-20&to=2026-10-26");
  });
  it("uses impact and cancellation contracts for both scopes",async () => {
    request.mockResolvedValue({affectedSessionCount:2,affectedRegistrationCount:3,affectedMemberCount:2});
    expect((await classApi.previewCancel("CLASS_FUTURE_SESSIONS",{classId:"2"})).affectedSessionCount).toBe(2);
    await classApi.previewCancel("SESSION",{sessionId:"7"});
    request.mockResolvedValue({canceledSessionCount:2});
    expect(await classApi.cancelSessions("CLASS_FUTURE_SESSIONS",{classId:"2"},"Bảo trì")).toBe(2);
    expect(await classApi.cancelSessions("SESSION",{sessionId:"7"},"Bảo trì")).toBe(1);
    expect(request.mock.calls.map(c=>c[0])).toEqual(["/Class/2/cancel-impact","/ClassSession/7/cancel-impact","/Class/2/cancel-future-sessions","/ClassSession/7/cancel"]);
  });
  it("sends Sport filters and mutation bodies",async () => {
    request.mockResolvedValue(paged([]));
    await sprint2Api.sports("Yoga",2,false);
    expect(request.mock.calls[0][0]).toBe("/Sport?search=Yoga&page=2&pageSize=20&isActive=false");
    await sprint2Api.saveSport({name:" Yoga ",description:" Test "},1);
    expect(request).toHaveBeenLastCalledWith("/Sport/1",{method:"PUT",body:JSON.stringify({name:"Yoga",description:"Test"})});
    await sprint2Api.setSportActive(1,false);
    expect(request).toHaveBeenLastCalledWith("/Sport/1/status",{method:"PATCH",body:JSON.stringify({isActive:false})});
  });
  it("counts unread notifications using totalItems rather than items",async () => {
    request.mockResolvedValue({items:[],totalItems:42});
    expect(await sprint2Api.unreadCount()).toBe(42);
    await sprint2Api.notifications(2,false);
    expect(request.mock.calls[1][0]).toContain("page=2&pageSize=20&isRead=false");
    await sprint2Api.markRead(1,true);
    expect(request).toHaveBeenLastCalledWith("/Notification/1/read",{method:"PATCH",body:JSON.stringify({isRead:true})});
  });
  it("passes audit class/session/actor filters and maps direct items",async () => {
    request.mockResolvedValue(paged([{id:"a",accountId:"manager",actorFullName:"Quản lý",actorEmail:"manager@sportscenter.com",action:"UPDATE",entityType:"ClassSession",entityId:"7",description:"Đổi lịch",createdAt:"2026-10-15"}]));
    const result=await auditApi.list({classId:"2",sessionId:"7",actorId:"manager",from:"2026-10-01",to:"2026-10-31"});
    expect(result[0].actorName).toBe("Quản lý");
    // Backend chỉ gửi actorFullName/actorEmail; khi cả hai trống thì mới là
    // thao tác của hệ thống.
    request.mockResolvedValue(paged([{id:"b",accountId:null,actorFullName:null,actorEmail:null,action:"UPDATE",entityType:"Class",entityId:"2",description:"",createdAt:"2026-10-15"}]));
    expect((await auditApi.list())[0].actorName).toBe("Hệ thống");
    const url=new URL(request.mock.calls[0][0],"http://test");
    expect(url.searchParams.get("classId")).toBe("2");expect(url.searchParams.get("sessionId")).toBe("7");expect(url.searchParams.get("actorId")).toBe("manager");
  });
});


describe("merged Sprint 2 contracts", () => {
  it("preserves room type through reads and writes", async () => {
    const room = { id: 3, name: "Studio", location: null, capacity: 10, roomType: "STUDIO", isActive: true };
    request.mockResolvedValue(room);
    const result = await roomApi.update("3", {name: " Studio ", location: "", capacity: 10, roomType: "STUDIO", isActive: true});
    expect(result.roomType).toBe("STUDIO");
    expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toMatchObject({name: "Studio", location: null, roomType: "STUDIO"});
  });
  it("combines audit entity filters with class filters and pagination", async () => {
    request.mockResolvedValue(paged([]));
    await auditApi.list({classId:"2",sessionId:"7",actorId:"manager",entityType:"ClassSession",entityId:"7",page:2,pageSize:50});
    const params = new URL(request.mock.calls[0][0], "http://test").searchParams;
    expect(Object.fromEntries(params)).toEqual({classId:"2",sessionId:"7",actorId:"manager",entityType:"ClassSession",entityId:"7",page:"2",pageSize:"50"});
  });
  it("searches roster across server pages and retains cancellation filter", async () => {
    request.mockResolvedValue(paged([]));
    await classRosterApi.getRegistrations(7, {search:" An ", page:2, includeCanceled:true});
    const params = new URL(request.mock.calls[0][0], "http://test").searchParams;
    expect(Object.fromEntries(params)).toEqual({search:"An",page:"2",pageSize:"20",includeCanceled:"true"});
  });
  it("rejects invalid roster IDs without requesting an endpoint", async () => {
    await expect(classRosterApi.getRegistrations(0)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("loads the new teaching screen using token identity and server filters", async () => {
    request.mockResolvedValue(paged([session]));
    const result = await myTeachingScheduleApi.getMySchedule({from:"2026-10-20",to:"2026-10-26",status:"CANCELED",page:2});
    expect(result.items).toEqual([session]);
    expect(request.mock.calls[0][0]).toBe("/ClassSession/me?from=2026-10-20&to=2026-10-26&status=CANCELED&page=2&pageSize=20");
  });
});
