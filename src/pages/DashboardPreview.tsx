import { Dumbbell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function DashboardPreview() {
  const { currentUser } = useAuth();
  return (
    <section className="panel welcome-panel">
      <span className="welcome-icon">
        <Dumbbell size={32} />
      </span>
      <span className="eyebrow">TITAN ARENA</span>
      <h1>Chào {currentUser?.fullName}</h1>
      <p>Bạn đã đăng nhập với vai trò huấn luyện viên.</p>
      <p>
        Lịch dạy, kế hoạch tập luyện và điểm danh sẽ được bổ sung trong các
        sprint tiếp theo.
      </p>
    </section>
  );
}
