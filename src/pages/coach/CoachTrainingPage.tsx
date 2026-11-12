import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Plus,
  RefreshCw,
  Send,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { describeError } from "../../services/apiErrors";
import {
  homeworkApi,
  type HomeworkAssignmentDto,
  type HomeworkTargetType,
} from "../../services/homeworkApi";
import { todayDate, addDateDays } from "../../services/membershipService";
import {
  trainingOperationsApi,
  type CoachStudentProfileDto,
  type CoachWorkspaceDto,
  type FitnessLevel,
  type ProgressRating,
  type TrainingExerciseItem,
  type TrainingPlanType,
} from "../../services/trainingOperationsApi";
import { formatDate } from "../../utils/format";

type TabId = "students" | "plans" | "results";

const LEVEL_LABELS: Record<FitnessLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

const RATING_LABELS: Record<ProgressRating, string> = {
  EXCEEDED: "Vượt mục tiêu",
  ON_TRACK: "Đạt tiến độ",
  NEEDS_IMPROVEMENT: "Cần cố gắng thêm",
};

const formatAssignedAt = (value: string): string =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function CoachTrainingPage() {
  const [tab, setTab] = useState<TabId>("students");
  const [workspace, setWorkspace] = useState<CoachWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [homeworkHistory, setHomeworkHistory] = useState<HomeworkAssignmentDto[]>([]);

  // Dialog states
  const [editingStudent, setEditingStudent] = useState<CoachStudentProfileDto | null>(null);
  const [goalForm, setGoalForm] = useState({
    fitnessGoal: "",
    fitnessLevel: "BEGINNER" as FitnessLevel,
    currentWeightKg: "",
    targetWeightKg: "",
    notes: "",
  });

  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState({
    targetType: "MEMBER" as HomeworkTargetType,
    memberId: "",
    classId: "",
    sessionId: "",
    title: "",
    instructions: "",
  });

  // Plan form state
  const [planForm, setPlanForm] = useState({
    planType: "INDIVIDUAL" as TrainingPlanType,
    memberId: "",
    classId: "",
    title: "",
    goal: "",
    startDate: todayDate(),
    endDate: addDateDays(todayDate(), 28),
  });
  const [exercises, setExercises] = useState<TrainingExerciseItem[]>([
    {
      name: "Khởi động khớp & Cardio nhẹ",
      sets: 1,
      reps: "10 phút",
      durationMinutes: 10,
      note: "Giữ nhịp thở đều",
    },
    {
      name: "Goblet Squat / Tư thế Chiến binh",
      sets: 3,
      reps: "12 lần",
      durationMinutes: 15,
      note: "Giữ thẳng cột sống",
    },
  ]);

  // Result form state
  const [resultForm, setResultForm] = useState({
    memberId: "",
    sessionId: "",
    planId: "",
    recordedDate: todayDate(),
    completedExercises: "",
    completionRate: "90",
    progressRating: "ON_TRACK" as ProgressRating,
    resultSummary: "",
    coachFeedback: "",
  });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, assignedHomework] = await Promise.all([
        trainingOperationsApi.getCoachWorkspace(),
        homeworkApi.getCoachHistory(),
      ]);
      setWorkspace(data);
      setHomeworkHistory(assignedHomework);
      if (data.students.length > 0) {
        setPlanForm((prev) => ({
          ...prev,
          memberId: prev.memberId || data.students[0].memberId,
        }));
        setResultForm((prev) => ({
          ...prev,
          memberId: prev.memberId || data.students[0].memberId,
        }));
        setHomeworkForm((prev) => ({
          ...prev,
          memberId: prev.memberId || data.students[0].memberId,
        }));
      }
      if (data.classes.length > 0) {
        setPlanForm((prev) => ({
          ...prev,
          classId: prev.classId || String(data.classes[0].id),
        }));
        setHomeworkForm((prev) => ({
          ...prev,
          classId: prev.classId || String(data.classes[0].id),
        }));
      }
      if (data.sessions.length > 0) {
        setHomeworkForm((prev) => ({
          ...prev,
          sessionId: prev.sessionId || String(data.sessions[0].id),
        }));
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  function openStudentGoalModal(student: CoachStudentProfileDto) {
    setEditingStudent(student);
    setGoalForm({
      fitnessGoal: student.fitnessGoal,
      fitnessLevel: student.fitnessLevel,
      currentWeightKg:
        student.currentWeightKg != null ? String(student.currentWeightKg) : "",
      targetWeightKg:
        student.targetWeightKg != null ? String(student.targetWeightKg) : "",
      notes: student.notes ?? "",
    });
  }

  async function submitStudentGoal(event: FormEvent) {
    event.preventDefault();
    if (!editingStudent || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await trainingOperationsApi.upsertStudentProfile(editingStudent.memberId, {
        fitnessGoal: goalForm.fitnessGoal,
        fitnessLevel: goalForm.fitnessLevel,
        currentWeightKg: goalForm.currentWeightKg
          ? Number(goalForm.currentWeightKg)
          : null,
        targetWeightKg: goalForm.targetWeightKg
          ? Number(goalForm.targetWeightKg)
          : null,
        notes: goalForm.notes || null,
      });
      setEditingStudent(null);
      setNotice(
        `Đã cập nhật mục tiêu tập luyện cho học viên ${editingStudent.fullName}.`,
      );
      await loadWorkspace();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitHomeworkAssignment(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await homeworkApi.assign({
        targetType: homeworkForm.targetType,
        memberId:
          homeworkForm.targetType === "MEMBER"
            ? homeworkForm.memberId
            : undefined,
        classId:
          homeworkForm.targetType === "CLASS"
            ? Number(homeworkForm.classId)
            : undefined,
        sessionId:
          homeworkForm.targetType === "SESSION"
            ? Number(homeworkForm.sessionId)
            : undefined,
        title: homeworkForm.title,
        instructions: homeworkForm.instructions,
      });
      setHomeworkHistory((current) => [...created, ...current]);
      setHomeworkModalOpen(false);
      setHomeworkForm((prev) => ({ ...prev, title: "", instructions: "" }));
      setNotice(`Đã giao bài tập về nhà cho ${created.length} học viên.`);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitTrainingPlan(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const validExercises = exercises.filter((ex) => ex.name.trim().length > 0);
    if (validExercises.length === 0) {
      setError("Vui lòng nhập ít nhất 1 bài tập trong kế hoạch.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await trainingOperationsApi.createTrainingPlan({
        planType: planForm.planType,
        memberId:
          planForm.planType === "INDIVIDUAL" ? planForm.memberId : undefined,
        classId:
          planForm.planType === "CLASS" ? Number(planForm.classId) : undefined,
        title: planForm.title,
        goal: planForm.goal,
        exercises: validExercises,
        startDate: planForm.startDate,
        endDate: planForm.endDate,
      });
      setPlanForm((prev) => ({ ...prev, title: "", goal: "" }));
      setNotice("Đã tạo kế hoạch tập luyện và gửi thông báo cho học viên.");
      await loadWorkspace();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitTrainingResult(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await trainingOperationsApi.createTrainingResult({
        memberId: resultForm.memberId,
        sessionId: resultForm.sessionId
          ? Number(resultForm.sessionId)
          : undefined,
        planId: resultForm.planId ? Number(resultForm.planId) : undefined,
        recordedDate: resultForm.recordedDate,
        completedExercises: resultForm.completedExercises,
        completionRate: Number(resultForm.completionRate),
        progressRating: resultForm.progressRating,
        resultSummary: resultForm.resultSummary,
        coachFeedback: resultForm.coachFeedback,
      });
      setResultForm((prev) => ({
        ...prev,
        completedExercises: "",
        resultSummary: "",
        coachFeedback: "",
      }));
      setNotice(
        "Đã ghi nhận kết quả buổi tập, đánh giá tiến độ và gửi nhận xét cho học viên.",
      );
      await loadWorkspace();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">KHÔNG GIAN HUẤN LUYỆN VIÊN</span>
          <h1>Giáo án, Mục tiêu & Kết quả Tập luyện</h1>
          <p>
            Theo dõi mục tiêu học viên, lập kế hoạch tập luyện cho cá nhân hoặc cả lớp, ghi nhận kết quả và đánh giá tiến độ sau mỗi buổi tập.
          </p>
        </div>
        <div className="header-actions-group">
          <button
            type="button"
            className="button primary"
            onClick={() => setHomeworkModalOpen(true)}
          >
            <Bell size={16} /> Giao bài tập về nhà
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => void loadWorkspace()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="error-notice" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {workspace && (
        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon">
              <Users size={22} />
            </span>
            <div>
              <p>Học viên phụ trách</p>
              <strong>{workspace.students.length}</strong>
              <small>Theo dõi mục tiêu & chỉ số</small>
            </div>
          </article>
          <article className="stat-card">
            <span className="stat-icon">
              <ClipboardList size={22} />
            </span>
            <div>
              <p>Giáo án đang áp dụng</p>
              <strong>{workspace.plans.length}</strong>
              <small>Cá nhân & toàn lớp học</small>
            </div>
          </article>
          <article className="stat-card">
            <span className="stat-icon">
              <Award size={22} />
            </span>
            <div>
              <p>Đánh giá tiến độ</p>
              <strong>{workspace.results.length}</strong>
              <small>Bản ghi kết quả sau buổi tập</small>
            </div>
          </article>
          <article className="stat-card">
            <span className="stat-icon">
              <CalendarDays size={22} />
            </span>
            <div>
              <p>Lớp đang phụ trách</p>
              <strong>{workspace.classes.length}</strong>
              <small>{workspace.sessions.length} buổi học gần đây</small>
            </div>
          </article>
        </div>
      )}

      <div className="workspace-tabs" role="tablist" aria-label="Chức năng huấn luyện">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "students"}
          className={`workspace-tab-btn ${tab === "students" ? "is-active" : ""}`}
          onClick={() => setTab("students")}
        >
          <Target size={16} />
          <span>Học viên & Mục tiêu</span>
          <span className="workspace-tab-badge">{workspace?.students.length ?? 0}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "plans"}
          className={`workspace-tab-btn ${tab === "plans" ? "is-active" : ""}`}
          onClick={() => setTab("plans")}
        >
          <ClipboardList size={16} />
          <span>Kế hoạch tập luyện</span>
          <span className="workspace-tab-badge">{workspace?.plans.length ?? 0}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "results"}
          className={`workspace-tab-btn ${tab === "results" ? "is-active" : ""}`}
          onClick={() => setTab("results")}
        >
          <Award size={16} />
          <span>Kết quả & Đánh giá tiến độ</span>
          <span className="workspace-tab-badge">{workspace?.results.length ?? 0}</span>
        </button>
      </div>

      {loading && !workspace ? (
        <div className="panel empty-state">Đang tải dữ liệu huấn luyện...</div>
      ) : (
        <>
          {tab === "students" && workspace && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Hồ sơ & Mục tiêu tập luyện của Học viên</h2>
                  <p>
                    Xem thông tin cơ bản, lớp đang theo học, tỷ lệ chuyên cần và điều chỉnh lộ trình cho từng học viên.
                  </p>
                </div>
                <span className="count-badge">{workspace.students.length} học viên</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Lớp đang học & Chuyên cần</th>
                      <th>Trình độ & Cân nặng</th>
                      <th>Mục tiêu tập luyện & Lưu ý</th>
                      <th>Thao tác nhanh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.students.map((st) => (
                      <tr key={st.memberId}>
                        <td>
                          <strong>{st.fullName}</strong>
                          <small>
                            {st.memberCode} · {st.phone || st.email}
                          </small>
                        </td>
                        <td>
                          <div>
                            {st.enrolledClassNames && st.enrolledClassNames.length > 0
                              ? st.enrolledClassNames.join(", ")
                              : "Tập tự do / Cá nhân"}
                          </div>
                          <small className="muted">
                            Chuyên cần: {st.attendedCount ?? 0}/{st.totalRegisteredSessions ?? 0} buổi đã điểm danh
                          </small>
                        </td>
                        <td>
                          <span className="status-chip active">
                            {LEVEL_LABELS[st.fitnessLevel] ?? st.fitnessLevel}
                          </span>
                          <small style={{ display: "block", marginTop: "0.35rem" }}>
                            {st.currentWeightKg != null || st.targetWeightKg != null
                              ? `${st.currentWeightKg ?? "—"} kg → ${st.targetWeightKg ?? "—"} kg`
                              : "Chưa cập nhật cân nặng"}
                          </small>
                        </td>
                        <td>
                          <strong>{st.fitnessGoal}</strong>
                          {st.notes && <small>{st.notes}</small>}
                        </td>
                        <td>
                          <div className="student-action-group">
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => openStudentGoalModal(st)}
                            >
                              Mục tiêu
                            </button>
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => {
                                setPlanForm((prev) => ({
                                  ...prev,
                                  planType: "INDIVIDUAL",
                                  memberId: st.memberId,
                                  goal: st.fitnessGoal,
                                }));
                                setTab("plans");
                              }}
                            >
                              Lập giáo án
                            </button>
                            <button
                              type="button"
                              className="button primary"
                              onClick={() => {
                                setResultForm((prev) => ({
                                  ...prev,
                                  memberId: st.memberId,
                                  sessionId: "",
                                  planId: "",
                                }));
                                setTab("results");
                              }}
                            >
                              Ghi kết quả
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "plans" && workspace && (
            <div className="training-split-layout">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Tạo Kế hoạch Tập luyện Mới</h2>
                    <p>Áp dụng cho cá nhân học viên hoặc toàn bộ lớp học phụ trách.</p>
                  </div>
                </div>
                <form onSubmit={(e) => void submitTrainingPlan(e)} className="reception-form">
                  <div className="field-grid">
                    <label className="field">
                      <span>Phạm vi kế hoạch</span>
                      <select
                        value={planForm.planType}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            planType: e.target.value as TrainingPlanType,
                          })
                        }
                      >
                        <option value="INDIVIDUAL">Cá nhân học viên</option>
                        <option value="CLASS">Toàn bộ lớp học</option>
                      </select>
                    </label>
                    {planForm.planType === "INDIVIDUAL" ? (
                      <label className="field">
                        <span>Chọn học viên</span>
                        <select
                          value={planForm.memberId}
                          onChange={(e) =>
                            setPlanForm({ ...planForm, memberId: e.target.value })
                          }
                        >
                          {workspace.students.map((st) => (
                            <option key={st.memberId} value={st.memberId}>
                              {st.fullName} ({st.memberCode})
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="field">
                        <span>Chọn lớp học</span>
                        <select
                          value={planForm.classId}
                          onChange={(e) =>
                            setPlanForm({ ...planForm, classId: e.target.value })
                          }
                        >
                          {workspace.classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} · {cls.sportName}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span>Tên kế hoạch tập luyện *</span>
                      <input
                        required
                        placeholder="VD: Giáo án 4 tuần Tăng cơ lõi & Sức bền"
                        value={planForm.title}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, title: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Mục tiêu trọng tâm *</span>
                      <input
                        required
                        placeholder="VD: Giảm 2kg mỡ, hoàn thiện kỹ thuật Squat"
                        value={planForm.goal}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, goal: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span>Ngày bắt đầu</span>
                      <input
                        type="date"
                        value={planForm.startDate}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, startDate: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Ngày kết thúc</span>
                      <input
                        type="date"
                        value={planForm.endDate}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, endDate: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="exercise-list-builder">
                    <div className="exercise-builder-header">
                      <h3>Danh sách bài tập ({exercises.length})</h3>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          setExercises([
                            ...exercises,
                            {
                              name: "",
                              sets: 3,
                              reps: "12 lần",
                              durationMinutes: 10,
                              note: "",
                            },
                          ])
                        }
                      >
                        <Plus size={15} /> Thêm bài tập
                      </button>
                    </div>

                    {exercises.map((ex, idx) => (
                      <div key={idx} className="exercise-item-card">
                        <div className="exercise-item-header">
                          <span>Bài tập #{idx + 1}</span>
                          {exercises.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-session"
                              onClick={() =>
                                setExercises(exercises.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 size={14} /> Xóa
                            </button>
                          )}
                        </div>
                        <div className="exercise-metrics-grid">
                          <label className="field">
                            <span>Tên bài tập *</span>
                            <input
                              required
                              placeholder="VD: Plank / Goblet Squat"
                              value={ex.name}
                              onChange={(e) => {
                                const next = [...exercises];
                                next[idx] = { ...ex, name: e.target.value };
                                setExercises(next);
                              }}
                            />
                          </label>
                          <label className="field">
                            <span>Số hiệp</span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={ex.sets}
                              onChange={(e) => {
                                const next = [...exercises];
                                next[idx] = {
                                  ...ex,
                                  sets: Number(e.target.value) || 1,
                                };
                                setExercises(next);
                              }}
                            />
                          </label>
                          <label className="field">
                            <span>Số lần / Giữ</span>
                            <input
                              value={ex.reps}
                              onChange={(e) => {
                                const next = [...exercises];
                                next[idx] = { ...ex, reps: e.target.value };
                                setExercises(next);
                              }}
                            />
                          </label>
                          <label className="field">
                            <span>Phút</span>
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={ex.durationMinutes}
                              onChange={(e) => {
                                const next = [...exercises];
                                next[idx] = {
                                  ...ex,
                                  durationMinutes: Number(e.target.value) || 5,
                                };
                                setExercises(next);
                              }}
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Lưu ý kỹ thuật</span>
                          <input
                            placeholder="VD: Giữ thẳng lưng, hít sâu bằng mũi..."
                            value={ex.note ?? ""}
                            onChange={(e) => {
                              const next = [...exercises];
                              next[idx] = { ...ex, note: e.target.value };
                              setExercises(next);
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="counter-actions">
                    <button type="submit" className="button primary" disabled={busy}>
                      <Dumbbell size={16} /> Lưu kế hoạch & Gửi cho học viên
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Các Kế hoạch Tập luyện Đang Áp dụng</h2>
                    <p>Danh sách giáo án cá nhân và giáo án lớp bạn đã thiết kế.</p>
                  </div>
                  <span className="count-badge">{workspace.plans.length} giáo án</span>
                </div>
                {workspace.plans.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={32} />
                    <h3>Chưa có kế hoạch tập luyện nào</h3>
                    <p>Sử dụng biểu mẫu bên trái để lập giáo án đầu tiên cho học viên hoặc lớp học.</p>
                  </div>
                ) : (
                  <div className="training-card-list">
                    {workspace.plans.map((plan) => (
                      <article key={plan.id} className="training-card">
                        <div className="training-card-header">
                          <div>
                            <h3 className="training-card-title">{plan.title}</h3>
                            <div className="training-card-meta">
                              <span>
                                <strong>Kỳ áp dụng:</strong> {formatDate(plan.startDate)} &rarr;{" "}
                                {formatDate(plan.endDate)}
                              </span>
                            </div>
                          </div>
                          <span className="status-chip active">
                            {plan.planType === "INDIVIDUAL"
                              ? `Cá nhân: ${plan.memberName}`
                              : `Lớp: ${plan.className}`}
                          </span>
                        </div>

                        <div className="training-card-goal">
                          <strong>Mục tiêu trọng tâm:</strong> {plan.goal}
                        </div>

                        <div className="table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Bài tập</th>
                                <th>Số hiệp</th>
                                <th>Số lần</th>
                                <th>Thời lượng</th>
                                <th>Lưu ý kỹ thuật</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plan.exercises.map((ex, i) => (
                                <tr key={i}>
                                  <td>
                                    <strong>{ex.name}</strong>
                                  </td>
                                  <td>{ex.sets} hiệp</td>
                                  <td>{ex.reps}</td>
                                  <td>{ex.durationMinutes} phút</td>
                                  <td>{ex.note || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "results" && workspace && (
            <div className="training-split-layout">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Ghi nhận Kết quả & Đánh giá Tiến độ</h2>
                    <p>
                      Lưu bài tập học viên đã hoàn thành, đánh giá tiến độ và gửi nhận xét trực tiếp cho học viên.
                    </p>
                  </div>
                </div>
                <form onSubmit={(e) => void submitTrainingResult(e)} className="reception-form">
                  <div className="field-grid">
                    <label className="field">
                      <span>Học viên *</span>
                      <select
                        value={resultForm.memberId}
                        onChange={(e) =>
                          setResultForm({
                            ...resultForm,
                            memberId: e.target.value,
                            sessionId: "",
                            planId: "",
                          })
                        }
                      >
                        {workspace.students.map((st) => (
                          <option key={st.memberId} value={st.memberId}>
                            {st.fullName} ({st.memberCode})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Ngày tập (đã hoặc đang diễn ra) *</span>
                      <input
                        type="date"
                        max={todayDate()}
                        value={resultForm.recordedDate}
                        onChange={(e) =>
                          setResultForm({ ...resultForm, recordedDate: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span>Buổi học đã tham gia (tùy chọn)</span>
                      <select
                        value={resultForm.sessionId}
                        onChange={(e) => {
                          const sid = e.target.value;
                          const matchedSession = workspace.sessions.find(
                            (s) => String(s.id) === sid,
                          );
                          setResultForm((prev) => ({
                            ...prev,
                            sessionId: sid,
                            recordedDate: matchedSession
                              ? matchedSession.sessionDate
                              : prev.recordedDate,
                          }));
                        }}
                      >
                        <option value="">— Tập cá nhân hoặc chọn buổi học đã diễn ra —</option>
                        {workspace.sessions
                          .filter(
                            (s) =>
                              s.isPastOrToday !== false &&
                              (!s.bookedMemberIds ||
                                s.bookedMemberIds.length === 0 ||
                                s.bookedMemberIds.includes(resultForm.memberId)),
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.className} · {formatDate(s.sessionDate)} ({s.startTime}-{s.endTime})
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Kế hoạch tập luyện áp dụng (tùy chọn)</span>
                      <select
                        value={resultForm.planId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const selectedPlan = workspace.plans.find(
                            (p) => String(p.id) === pid,
                          );
                          setResultForm((prev) => ({
                            ...prev,
                            planId: pid,
                            completedExercises:
                              selectedPlan && !prev.completedExercises
                                ? selectedPlan.exercises
                                    .map((ex) => `${ex.name} (${ex.sets}x${ex.reps})`)
                                    .join(", ")
                                : prev.completedExercises,
                          }));
                        }}
                      >
                        <option value="">— Không gắn kế hoạch cụ thể —</option>
                        {workspace.plans
                          .filter((p) => {
                            const selectedStudent = workspace.students.find(
                              (st) => st.memberId === resultForm.memberId,
                            );
                            if (p.planType === "INDIVIDUAL") {
                              return p.memberId === resultForm.memberId;
                            }
                            return (
                              p.classId != null &&
                              (selectedStudent?.enrolledClassIds?.includes(p.classId) ?? true)
                            );
                          })
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Bài tập đã hoàn thành trong buổi *</span>
                    <input
                      required
                      placeholder="VD: Goblet Squat 4x12 (16kg), Plank 3x60s, Chuỗi Sun Salutation 5 vòng"
                      value={resultForm.completedExercises}
                      onChange={(e) =>
                        setResultForm({
                          ...resultForm,
                          completedExercises: e.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="field-grid">
                    <label className="field">
                      <span>Mức độ hoàn thành (%) *</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={resultForm.completionRate}
                        onChange={(e) =>
                          setResultForm({
                            ...resultForm,
                            completionRate: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Đánh giá tiến độ *</span>
                      <select
                        value={resultForm.progressRating}
                        onChange={(e) =>
                          setResultForm({
                            ...resultForm,
                            progressRating: e.target.value as ProgressRating,
                          })
                        }
                      >
                        <option value="EXCEEDED">Vượt mục tiêu (Exceeded)</option>
                        <option value="ON_TRACK">Đạt tiến độ (On Track)</option>
                        <option value="NEEDS_IMPROVEMENT">
                          Cần cố gắng thêm (Needs Improvement)
                        </option>
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Kết quả đạt được trong buổi tập *</span>
                    <input
                      required
                      placeholder="VD: Hoàn thành 95% giáo án, giữ Plank tăng từ 45s lên 65s"
                      value={resultForm.resultSummary}
                      onChange={(e) =>
                        setResultForm({
                          ...resultForm,
                          resultSummary: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Nhận xét của Huấn luyện viên *</span>
                    <textarea
                      rows={3}
                      required
                      placeholder="VD: Tư thế lưng khi Squat rất chuẩn, nhịp thở ổn định hơn tuần trước."
                      value={resultForm.coachFeedback}
                      onChange={(e) =>
                        setResultForm({
                          ...resultForm,
                          coachFeedback: e.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="counter-actions">
                    <button type="submit" className="button primary" disabled={busy}>
                      <Award size={16} /> Lưu kết quả & Gửi nhận xét
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Lịch sử Đánh giá & Kết quả Tập luyện</h2>
                    <p>Các bản ghi tiến độ và nhận xét đã gửi cho học viên.</p>
                  </div>
                  <span className="count-badge">{workspace.results.length} bản ghi</span>
                </div>
                {workspace.results.length === 0 ? (
                  <div className="empty-state">
                    <Award size={32} />
                    <h3>Chưa có bản ghi đánh giá nào</h3>
                    <p>Hãy chọn học viên và ghi nhận kết quả sau buổi tập ở biểu mẫu bên trái.</p>
                  </div>
                ) : (
                  <div className="training-card-list">
                    {workspace.results.map((res) => (
                      <article key={res.id} className="training-card">
                        <div className="training-card-header">
                          <div>
                            <h3 className="training-card-title">{res.memberName}</h3>
                            <div className="training-card-meta">
                              <span>Ngày tập: {formatDate(res.recordedDate)}</span>
                              <span>· HLV {res.coachName}</span>
                            </div>
                          </div>
                          <span
                            className={`status-chip ${
                              res.progressRating === "NEEDS_IMPROVEMENT"
                                ? "pending_payment"
                                : "active"
                            }`}
                          >
                            {RATING_LABELS[res.progressRating]} · {res.completionRate}%
                          </span>
                        </div>

                        <div className="progress-bar-row">
                          <div className="progress-bar-track">
                            <div
                              className={`progress-bar-fill ${
                                res.progressRating === "NEEDS_IMPROVEMENT"
                                  ? "is-warning"
                                  : ""
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(0, res.completionRate))}%`,
                              }}
                            />
                          </div>
                          <small className="muted">Hoàn thành {res.completionRate}%</small>
                        </div>

                        <div className="training-feedback-grid">
                          <div className="training-feedback-item">
                            <strong>Bài tập đã hoàn thành</strong>
                            <span>{res.completedExercises}</span>
                          </div>
                          <div className="training-feedback-item">
                            <strong>Kết quả đạt được</strong>
                            <span>{res.resultSummary}</span>
                          </div>
                        </div>

                        <div className="training-card-goal">
                          <strong>Nhận xét của HLV:</strong> {res.coachFeedback}
                        </div>

                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      <section className="panel coach-homework-history">
        <div className="panel-heading">
          <div>
            <h2>Lịch sử bài tập đã giao</h2>
            <p>Bản ghi riêng của bài tập về nhà; không trộn với kế hoạch hoặc kết quả tập luyện.</p>
          </div>
          <span className="count-badge">{homeworkHistory.length} lượt giao</span>
        </div>
        {homeworkHistory.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={32} />
            <h3>Chưa giao bài tập về nhà</h3>
            <p>Dùng nút “Giao bài tập về nhà” để giao cho học viên, lớp hoặc một buổi học.</p>
          </div>
        ) : (
          <div className="homework-history-list">
            {homeworkHistory.map((assignment) => (
              <article className="homework-history-card" key={assignment.id}>
                <div className="homework-history-heading">
                  <div>
                    <time dateTime={assignment.assignedAtUtc}>
                      {formatAssignedAt(assignment.assignedAtUtc)}
                    </time>
                    <h3>{assignment.title}</h3>
                  </div>
                  <span className="status-chip active">{assignment.memberName}</span>
                </div>
                <p>{assignment.instructions}</p>
                <div className="homework-history-context">
                  <span>Học viên: {assignment.memberName}</span>
                  {assignment.className && <span>Lớp: {assignment.className}</span>}
                  {assignment.sessionLabel && <span>Buổi học: {assignment.sessionLabel}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editingStudent && (
        <Dialog
          title={`Mục tiêu tập luyện: ${editingStudent.fullName}`}
          onClose={() => setEditingStudent(null)}
        >
          <form onSubmit={(e) => void submitStudentGoal(e)} className="reception-form">
            <label className="field">
              <span>Mục tiêu tập luyện *</span>
              <input
                required
                value={goalForm.fitnessGoal}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, fitnessGoal: e.target.value })
                }
              />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Trình độ hiện tại</span>
                <select
                  value={goalForm.fitnessLevel}
                  onChange={(e) =>
                    setGoalForm({
                      ...goalForm,
                      fitnessLevel: e.target.value as FitnessLevel,
                    })
                  }
                >
                  <option value="BEGINNER">Cơ bản (Beginner)</option>
                  <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                  <option value="ADVANCED">Nâng cao (Advanced)</option>
                </select>
              </label>
              <label className="field">
                <span>Cân nặng hiện tại (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  value={goalForm.currentWeightKg}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, currentWeightKg: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Cân nặng mục tiêu (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  value={goalForm.targetWeightKg}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, targetWeightKg: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>Ghi chú thể trạng & Lưu ý cho HLV</span>
              <textarea
                rows={3}
                value={goalForm.notes}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, notes: e.target.value })
                }
              />
            </label>
            <div className="counter-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditingStudent(null)}
              >
                Đóng
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                Lưu mục tiêu
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {homeworkModalOpen && workspace && (
        <Dialog
          title="Giao bài tập về nhà"
          onClose={() => setHomeworkModalOpen(false)}
        >
          <form onSubmit={(e) => void submitHomeworkAssignment(e)} className="reception-form">
            <div className="field-grid">
              <label className="field">
                <span>Giao cho</span>
                <select
                  value={homeworkForm.targetType}
                  onChange={(e) =>
                    setHomeworkForm({
                      ...homeworkForm,
                      targetType: e.target.value as HomeworkTargetType,
                    })
                  }
                >
                  <option value="MEMBER">Học viên cụ thể</option>
                  <option value="CLASS">Tất cả học viên trong lớp</option>
                  <option value="SESSION">Học viên trong một buổi học</option>
                </select>
              </label>
              {homeworkForm.targetType === "MEMBER" ? (
                <label className="field">
                  <span>Chọn học viên</span>
                  <select
                    value={homeworkForm.memberId}
                    onChange={(e) =>
                      setHomeworkForm({ ...homeworkForm, memberId: e.target.value })
                    }
                  >
                    {workspace.students.map((st) => (
                      <option key={st.memberId} value={st.memberId}>
                        {st.fullName} ({st.memberCode})
                      </option>
                    ))}
                  </select>
                </label>
              ) : homeworkForm.targetType === "CLASS" ? (
                <label className="field">
                  <span>Chọn lớp học</span>
                  <select
                    value={homeworkForm.classId}
                    onChange={(e) =>
                      setHomeworkForm({ ...homeworkForm, classId: e.target.value })
                    }
                  >
                    {workspace.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} · {cls.sportName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="field">
                  <span>Chọn buổi học</span>
                  <select
                    value={homeworkForm.sessionId}
                    onChange={(e) =>
                      setHomeworkForm({ ...homeworkForm, sessionId: e.target.value })
                    }
                  >
                    {workspace.sessions
                      .filter((session) => session.status !== "CANCELED")
                      .map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.className} · {formatDate(session.sessionDate)} ({session.startTime}-{session.endTime})
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
            <label className="field">
              <span>Tiêu đề bài tập *</span>
              <input
                required
                placeholder="VD: Bài tập về nhà tuần này: Chuỗi giãn cơ & Plank 3 hiệp"
                value={homeworkForm.title}
                onChange={(e) =>
                  setHomeworkForm({ ...homeworkForm, title: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Nội dung chi tiết *</span>
              <textarea
                rows={4}
                required
                placeholder="Nhập hướng dẫn chi tiết bài tập về nhà hoặc dặn dò chuẩn bị cho buổi học tới..."
                value={homeworkForm.instructions}
                onChange={(e) =>
                  setHomeworkForm({ ...homeworkForm, instructions: e.target.value })
                }
              />
            </label>
            <div className="counter-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setHomeworkModalOpen(false)}
              >
                Hủy
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                <Send size={15} /> Giao bài
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
