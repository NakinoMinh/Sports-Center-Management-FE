import type { CoachPublicProfile } from "../../types/classes";
import { Dialog } from "../common/Dialog";

type Props = {
  coachName: string;
  profile: CoachPublicProfile | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
};

export function CoachProfileDialog({
  coachName,
  profile,
  loading,
  error,
  onRetry,
  onClose,
}: Props) {
  return (
    <Dialog
      title={profile?.fullName || coachName || "Thông tin huấn luyện viên"}
      description="Hồ sơ chuyên môn công khai"
      onClose={onClose}
      footer={
        <button type="button" className="button secondary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      {loading ? (
        <p className="coach-profile-state" role="status">
          Đang tải thông tin huấn luyện viên...
        </p>
      ) : error ? (
        <div className="coach-profile-state feedback error" role="alert">
          <span>{error}</span>
          <button type="button" className="button secondary" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      ) : profile ? (
        <div className="coach-profile-details">
          <section>
            <h3>Chuyên môn đang phụ trách</h3>
            {profile.disciplines.length ? (
              <ul className="coach-discipline-list">
                {profile.disciplines.map((discipline) => (
                  <li key={discipline.disciplineId}>
                    {discipline.disciplineName}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Chưa cập nhật chuyên môn.</p>
            )}
          </section>
          <section>
            <h3>Lịch làm việc</h3>
            <p>{profile.workSchedule || "Chưa cập nhật lịch làm việc"}</p>
          </section>
        </div>
      ) : null}
    </Dialog>
  );
}
