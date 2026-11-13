import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Edit3,
  RefreshCw,
  Target,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { useAuth } from "../../hooks/useAuth";
import { describeError } from "../../services/apiErrors";
import {
  homeworkApi,
  type HomeworkAssignmentDto,
} from "../../services/homeworkApi";
import {
  trainingOperationsApi,
  type AttendanceStatus,
  type FitnessLevel,
  type MemberWorkspaceDto,
  type ProgressRating,
} from "../../services/trainingOperationsApi";
import { formatDate } from "../../utils/format";
import { groupHomeworkByAssignedDate } from "../../utils/homeworkHistory";

type MemberTabId = "plans" | "homework" | "results" | "attendance" | "goal";

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

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Có mặt",
  LATE: "Đi muộn",
  ABSENT: "Vắng mặt",
};

export function MemberTrainingPage() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<MemberTabId>("plans");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [workspace, setWorkspace] = useState<MemberWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [homeworkHistory, setHomeworkHistory] = useState<HomeworkAssignmentDto[]>([]);
  const [homeworkLoading, setHomeworkLoading] = useState(true);
  const [homeworkError, setHomeworkError] = useState("");

  const [goalForm, setGoalForm] = useState({
    fitnessGoal: "",
    fitnessLevel: "BEGINNER" as FitnessLevel,
    currentWeightKg: "",
    targetWeightKg: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await trainingOperationsApi.getMemberWorkspace();
      setWorkspace(data);
      setGoalForm({
        fitnessGoal: data.profile.fitnessGoal,
        fitnessLevel: data.profile.fitnessLevel,
        currentWeightKg:
          data.profile.currentWeightKg != null
            ? String(data.profile.currentWeightKg)
            : "",
        targetWeightKg:
          data.profile.targetWeightKg != null
            ? String(data.profile.targetWeightKg)
            : "",
        notes: data.profile.notes ?? "",
      });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHomework = useCallback(async () => {
    setHomeworkLoading(true);
    setHomeworkError("");
    try {
      setHomeworkHistory(await homeworkApi.getMemberHistory());
    } catch (err) {
      setHomeworkError(describeError(err));
    } finally {
      setHomeworkLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadHomework();
  }, [loadData, loadHomework]);

  async function handleSaveGoal(event: FormEvent) {
    event.preventDefault();
    if (!currentUser || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await trainingOperationsApi.upsertStudentProfile(currentUser.id, {
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
      setGoalModalOpen(false);
      setNotice("Đã lưu mục tiêu tập luyện của bạn.");
      await loadData();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const attendedClassCount =
    workspace?.classAttendanceHistory.filter((a) => a.status !== "ABSENT")
      .length ?? 0;
  const homeworkGroups = useMemo(
    () => groupHomeworkByAssignedDate(homeworkHistory),
    [homeworkHistory],
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HÀNH TRÌNH TẬP LUYỆN CỦA TÔI</span>
          <h1>Kế hoạch, Bài tập về nhà & Kết quả Tập luyện</h1>
          <p>
            Theo dõi riêng kế hoạch tập luyện, lịch sử bài tập HLV đã giao, kết quả từng buổi và lịch sử điểm danh.
          </p>
        </div>
        <div className="header-actions-group">
          <button
            type="button"
            className="button primary"
            onClick={() => setGoalModalOpen(true)}
          >
            <Edit3 size={16} /> Cập nhật mục tiêu
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              void loadData();
              void loadHomework();
            }}
            disabled={loading || homeworkLoading}
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
      {homeworkError && (
        <div className="error-notice" role="alert">
          <span>Không tải được lịch sử bài tập: {homeworkError}</span>
          <button type="button" className="button secondary" onClick={() => void loadHomework()}>
            Thử lại
          </button>
        </div>
      )}
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {loading && !workspace ? (
        <div className="panel empty-state">Đang tải dữ liệu tập luyện...</div>
      ) : (
        workspace && (
          <>
            <div className="member-goal-banner">
              <div className="member-goal-banner-info">
                <span className="eyebrow">MỤC TIÊU TẬP LUYỆN HIỆN TẠI</span>
                <h2>{workspace.profile.fitnessGoal}</h2>
                {workspace.profile.notes && (
                  <p>Lưu ý sức khỏe & thể trạng: {workspace.profile.notes}</p>
                )}
                <div className="member-goal-metrics">
                  <span className="member-goal-metric-chip">
                    Trình độ:{" "}
                    <strong>
                      {LEVEL_LABELS[workspace.profile.fitnessLevel] ??
                        workspace.profile.fitnessLevel}
                    </strong>
                  </span>
                  <span className="member-goal-metric-chip">
                    Cân nặng hiện tại:{" "}
                    <strong>
                      {workspace.profile.currentWeightKg != null
                        ? `${workspace.profile.currentWeightKg} kg`
                        : "Chưa cập nhật"}
                    </strong>
                  </span>
                  <span className="member-goal-metric-chip">
                    Mục tiêu cân nặng:{" "}
                    <strong>
                      {workspace.profile.targetWeightKg != null
                        ? `${workspace.profile.targetWeightKg} kg`
                        : "Chưa cập nhật"}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() => setGoalModalOpen(true)}
              >
                <Target size={16} /> Điều chỉnh mục tiêu
              </button>
            </div>

            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-icon">
                  <ClipboardList size={22} />
                </span>
                <div>
                  <p>Giáo án đang áp dụng</p>
                  <strong>{workspace.plans.length}</strong>
                  <small>Kế hoạch cá nhân & lớp học</small>
                </div>
              </article>
              <article className="stat-card">
                <span className="stat-icon">
                  <Award size={22} />
                </span>
                <div>
                  <p>Đánh giá từ HLV</p>
                  <strong>{workspace.results.length}</strong>
                  <small>Bản ghi kết quả sau buổi tập</small>
                </div>
              </article>
              <article className="stat-card">
                <span className="stat-icon">
                  <ClipboardCheck size={22} />
                </span>
                <div>
                  <p>Điểm danh lớp học</p>
                  <strong>
                    {attendedClassCount}/{workspace.classAttendanceHistory.length}
                  </strong>
                  <small>Buổi có mặt trên tổng buổi đã chấm</small>
                </div>
              </article>
              <article className="stat-card">
                <span className="stat-icon">
                  <CalendarCheck size={22} />
                </span>
                <div>
                  <p>Check-in trung tâm</p>
                  <strong>{workspace.centerVisitHistory.length}</strong>
                  <small>Lượt đến tập tại quầy lễ tân</small>
                </div>
              </article>
            </div>

            <div
              className="workspace-tabs"
              role="tablist"
              aria-label="Danh mục theo dõi tập luyện"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "plans"}
                className={`workspace-tab-btn ${tab === "plans" ? "is-active" : ""}`}
                onClick={() => setTab("plans")}
              >
                <ClipboardList size={16} />
                <span>Kế hoạch tập luyện</span>
                <span className="workspace-tab-badge">{workspace.plans.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "homework"}
                className={`workspace-tab-btn ${tab === "homework" ? "is-active" : ""}`}
                onClick={() => setTab("homework")}
              >
                <BookOpen size={16} />
                <span>Lịch sử bài tập về nhà</span>
                <span className="workspace-tab-badge">{homeworkHistory.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "results"}
                className={`workspace-tab-btn ${tab === "results" ? "is-active" : ""}`}
                onClick={() => setTab("results")}
              >
                <Award size={16} />
                <span>Kết quả & Nhận xét HLV</span>
                <span className="workspace-tab-badge">{workspace.results.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "attendance"}
                className={`workspace-tab-btn ${tab === "attendance" ? "is-active" : ""}`}
                onClick={() => setTab("attendance")}
              >
                <ClipboardCheck size={16} />
                <span>Lịch sử Điểm danh & Check-in</span>
                <span className="workspace-tab-badge">
                  {workspace.classAttendanceHistory.length +
                    workspace.centerVisitHistory.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "goal"}
                className={`workspace-tab-btn ${tab === "goal" ? "is-active" : ""}`}
                onClick={() => setTab("goal")}
              >
                <Target size={16} />
                <span>Mục tiêu & Chỉ số cá nhân</span>
              </button>
            </div>

            {tab === "plans" && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Kế hoạch Tập luyện</h2>
                    <p>
                      Giáo án cá nhân và giáo án chung của các lớp bạn đang tham gia.
                    </p>
                  </div>
                  <span className="count-badge">{workspace.plans.length} kế hoạch</span>
                </div>
                {workspace.plans.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={32} />
                    <h3>Chưa có kế hoạch tập luyện nào được giao</h3>
                    <p>
                      Hãy cập nhật mục tiêu cá nhân hoặc đăng ký lớp học để Huấn luyện viên thiết kế giáo án phù hợp với bạn.
                    </p>
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
                                <strong>HLV phụ trách:</strong> {plan.coachName}
                              </span>
                              <span>
                                <strong>Kỳ áp dụng:</strong> {formatDate(plan.startDate)}{" "}
                                &rarr; {formatDate(plan.endDate)}
                              </span>
                            </div>
                          </div>
                          <span className="status-chip active">
                            {plan.planType === "INDIVIDUAL"
                              ? "Kế hoạch cá nhân"
                              : `Giáo án lớp: ${plan.className}`}
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
                              {plan.exercises.map((ex, idx) => (
                                <tr key={idx}>
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
            )}

            {tab === "homework" && (
              <section className="panel member-homework-history">
                <div className="panel-heading">
                  <div>
                    <h2>Lịch sử bài tập về nhà</h2>
                    <p>Chỉ hiển thị các bài HLV đã giao cho tài khoản của bạn.</p>
                  </div>
                  <span className="count-badge">{homeworkHistory.length} bài</span>
                </div>
                {homeworkLoading ? (
                  <div className="empty-state" role="status">Đang tải lịch sử bài tập...</div>
                ) : homeworkHistory.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen size={32} />
                    <h3>Chưa có bài tập về nhà nào được giao</h3>
                    <p>Khi HLV giao bài, nội dung sẽ xuất hiện tại đây theo thứ tự mới nhất.</p>
                  </div>
                ) : (
                  <div className="member-homework-groups">
                    {homeworkGroups.map((group) => (
                      <section key={group.date} className="member-homework-group">
                        <h3>{formatDate(group.date)}</h3>
                        <div className="homework-history-list">
                          {group.items.map((assignment) => (
                            <article key={assignment.id} className="homework-history-card">
                              <div className="homework-history-heading">
                                <div>
                                  <time dateTime={assignment.assignedAtUtc}>
                                    {new Intl.DateTimeFormat("vi-VN", {
                                      timeZone: "Asia/Ho_Chi_Minh",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }).format(new Date(assignment.assignedAtUtc))}
                                  </time>
                                  <h3>{assignment.title}</h3>
                                </div>
                                <span className="status-chip active">HLV {assignment.coachName}</span>
                              </div>
                              <p>{assignment.instructions}</p>
                              {(assignment.className || assignment.sessionLabel) && (
                                <div className="homework-history-context">
                                  {assignment.className && <span>Lớp: {assignment.className}</span>}
                                  {assignment.sessionLabel && <span>Buổi học: {assignment.sessionLabel}</span>}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "results" && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Kết quả Tập luyện & Nhận xét từ Huấn luyện viên</h2>
                    <p>Đánh giá tiến độ và nhận xét chi tiết sau từng buổi tập.</p>
                  </div>
                  <span className="count-badge">{workspace.results.length} bản ghi</span>
                </div>
                {workspace.results.length === 0 ? (
                  <div className="empty-state">
                    <Award size={32} />
                    <h3>Chưa có bản ghi kết quả tập luyện nào</h3>
                    <p>
                      Sau mỗi buổi tập, Huấn luyện viên sẽ ghi nhận mức độ hoàn thành và gửi nhận xét chi tiết tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="training-card-list">
                    {workspace.results.map((res) => (
                      <article key={res.id} className="training-card">
                        <div className="training-card-header">
                          <div>
                            <h3 className="training-card-title">
                              Buổi tập ngày {formatDate(res.recordedDate)}
                            </h3>
                            <div className="training-card-meta">
                              <span>
                                <strong>Huấn luyện viên đánh giá:</strong> {res.coachName}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`status-chip ${
                              res.progressRating === "NEEDS_IMPROVEMENT"
                                ? "pending_payment"
                                : "active"
                            }`}
                          >
                            {RATING_LABELS[res.progressRating]} ({res.completionRate}%)
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
                            <strong>Kết quả buổi tập</strong>
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
            )}

            {tab === "attendance" && (
              <div className="workspace-split">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Điểm danh các buổi học lớp</h2>
                      <p>Các buổi học đã được Huấn luyện viên ghi nhận chuyên cần.</p>
                    </div>
                    <span className="count-badge">
                      {workspace.classAttendanceHistory.length} buổi
                    </span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Lớp học</th>
                          <th>Ngày học</th>
                          <th>Khung giờ / Phòng</th>
                          <th>Trạng thái</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.classAttendanceHistory.map((att) => (
                          <tr key={att.id}>
                            <td>
                              <strong>{att.className}</strong>
                            </td>
                            <td>{formatDate(att.sessionDate)}</td>
                            <td>
                              {att.timeRange} · {att.roomName}
                            </td>
                            <td>
                              <span
                                className={`status-chip ${
                                  att.status === "ABSENT"
                                    ? "canceled"
                                    : att.status === "LATE"
                                      ? "pending_payment"
                                      : "active"
                                }`}
                              >
                                {ATTENDANCE_LABELS[att.status] ?? att.status}
                              </span>
                            </td>
                            <td>{att.note || "—"}</td>
                          </tr>
                        ))}
                        {workspace.classAttendanceHistory.length === 0 && (
                          <tr>
                            <td colSpan={5}>Chưa có lịch sử điểm danh lớp học.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Lịch sử Check-in tại Trung tâm</h2>
                      <p>Các lượt đến tập được ghi nhận tại quầy lễ tân.</p>
                    </div>
                    <span className="count-badge">
                      {workspace.centerVisitHistory.length} lượt
                    </span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Ngày đến</th>
                          <th>Giờ vào</th>
                          <th>Giờ ra</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.centerVisitHistory.map((vItem) => (
                          <tr key={vItem.id}>
                            <td>{formatDate(vItem.visitDate)}</td>
                            <td>
                              {new Date(vItem.checkedInAt).toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </td>
                            <td>
                              {vItem.checkedOutAt
                                ? new Date(vItem.checkedOutAt).toLocaleTimeString(
                                    "vi-VN",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "Đang tập tại trung tâm"}
                            </td>
                            <td>{vItem.note || "—"}</td>
                          </tr>
                        ))}
                        {workspace.centerVisitHistory.length === 0 && (
                          <tr>
                            <td colSpan={4}>Chưa có lượt check-in tại quầy.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {tab === "goal" && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Mục tiêu & Chỉ số Tập luyện Cá nhân</h2>
                    <p>
                      Cập nhật mục tiêu để Huấn luyện viên xây dựng kế hoạch tập luyện phù hợp nhất với bạn.
                    </p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => void handleSaveGoal(e)}
                  className="reception-form"
                >
                  <div className="field-grid">
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
                    <label className="field">
                      <span>Trình độ tập luyện</span>
                      <select
                        value={goalForm.fitnessLevel}
                        onChange={(e) =>
                          setGoalForm({
                            ...goalForm,
                            fitnessLevel: e.target.value as FitnessLevel,
                          })
                        }
                      >
                        <option value="BEGINNER">{LEVEL_LABELS.BEGINNER}</option>
                        <option value="INTERMEDIATE">
                          {LEVEL_LABELS.INTERMEDIATE}
                        </option>
                        <option value="ADVANCED">{LEVEL_LABELS.ADVANCED}</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Cân nặng hiện tại (kg)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={goalForm.currentWeightKg}
                        onChange={(e) =>
                          setGoalForm({
                            ...goalForm,
                            currentWeightKg: e.target.value,
                          })
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
                          setGoalForm({
                            ...goalForm,
                            targetWeightKg: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Ghi chú sức khỏe / Lưu ý gửi Huấn luyện viên</span>
                    <input
                      value={goalForm.notes}
                      onChange={(e) =>
                        setGoalForm({ ...goalForm, notes: e.target.value })
                      }
                    />
                  </label>
                  <div className="counter-actions">
                    <button type="submit" className="button primary" disabled={busy}>
                      Cập nhật mục tiêu
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )
      )}

      {goalModalOpen && (
        <Dialog
          title="Cập nhật Mục tiêu & Chỉ số Tập luyện"
          onClose={() => setGoalModalOpen(false)}
        >
          <form onSubmit={(e) => void handleSaveGoal(e)} className="reception-form">
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
                <span>Trình độ tập luyện</span>
                <select
                  value={goalForm.fitnessLevel}
                  onChange={(e) =>
                    setGoalForm({
                      ...goalForm,
                      fitnessLevel: e.target.value as FitnessLevel,
                    })
                  }
                >
                  <option value="BEGINNER">{LEVEL_LABELS.BEGINNER}</option>
                  <option value="INTERMEDIATE">{LEVEL_LABELS.INTERMEDIATE}</option>
                  <option value="ADVANCED">{LEVEL_LABELS.ADVANCED}</option>
                </select>
              </label>
              <label className="field">
                <span>Cân nặng hiện tại (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  value={goalForm.currentWeightKg}
                  onChange={(e) =>
                    setGoalForm({
                      ...goalForm,
                      currentWeightKg: e.target.value,
                    })
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
                    setGoalForm({
                      ...goalForm,
                      targetWeightKg: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>Ghi chú sức khỏe / Lưu ý gửi Huấn luyện viên</span>
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
                onClick={() => setGoalModalOpen(false)}
              >
                Hủy
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                Lưu mục tiêu
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
