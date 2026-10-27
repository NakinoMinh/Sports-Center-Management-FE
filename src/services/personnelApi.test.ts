import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { personnelApi, type PersonnelInput } from "./personnelApi";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));
const request = vi.mocked(apiRequest);
const form: PersonnelInput = { fullName: "Huấn luyện viên", phone: "0901234567", specialization: "", disciplineIds: [3, 8], workSchedule: "", isActive: true };
const coach = { accountId: "server-id", email: "coach@example.test", fullName: form.fullName, phone: form.phone, status: "Active", createdAt: "2026-10-22", disciplines: [{ disciplineId: 3, disciplineName: "Gym", isActive: true }, { disciplineId: 8, disciplineName: "Yoga", isActive: true }, { disciplineId: 9, disciplineName: "Cũ", isActive: false }] };
beforeEach(() => request.mockReset());

it("sends discipline IDs on create and uses the server identity and expertise", async () => {
  request.mockResolvedValue(coach);
  const result = await personnelApi.create("COACH", coach.email, form);
  const body = JSON.parse(String(request.mock.calls[0][1]?.body));
  expect(body.disciplineIds).toEqual([3, 8]);
  expect(body).not.toHaveProperty("specialization");
  expect(result.user).toMatchObject({ id: "server-id", specialization: "Gym, Yoga" });
});

it("preserves discipline IDs when loading a coach for editing", async () => {
  request.mockResolvedValue({ items: [coach] });
  expect((await personnelApi.list("COACH"))[0]).toMatchObject({ disciplineIds: [3, 8], specialization: "Gym, Yoga" });
});

it("sends changed discipline IDs when saving an existing coach", async () => {
  request.mockResolvedValue(coach);
  await personnelApi.update("COACH", coach.accountId, { ...form, disciplineIds: [8] });
  expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({ disciplineIds: [8] });
});

it("does not add coach disciplines to receptionist requests", async () => {
  request.mockResolvedValue("ok");
  await personnelApi.create("RECEPTIONIST", "staff@example.test", form);
  expect(JSON.parse(String(request.mock.calls[0][1]?.body))).not.toHaveProperty("disciplineIds");
});
