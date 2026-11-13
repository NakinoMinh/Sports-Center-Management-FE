import { useState } from "react";
import type { CoachPublicProfile } from "../../types/classes";
import { describeError } from "../../services/apiErrors";
import { CoachProfileDialog } from "./CoachProfileDialog";

type Props = {
  coachId: string;
  coachName: string;
  loadProfile: (accountId: string) => Promise<CoachPublicProfile>;
  className?: string;
};

export function CoachProfileTrigger({
  coachId,
  coachName,
  loadProfile,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<CoachPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!coachId) return <span className={className}>{coachName}</span>;

  const requestProfile = async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      setProfile(await loadProfile(coachId));
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  };

  const showProfile = (): void => {
    setOpen(true);
    if (!profile && !loading) void requestProfile();
  };

  return (
    <>
      <button
        type="button"
        className={`coach-profile-trigger${className ? ` ${className}` : ""}`}
        onClick={showProfile}
        aria-label={`Xem thông tin huấn luyện viên ${coachName}`}
      >
        {coachName}
      </button>
      {open && (
        <CoachProfileDialog
          coachName={coachName}
          profile={profile}
          loading={loading}
          error={error}
          onRetry={() => void requestProfile()}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
