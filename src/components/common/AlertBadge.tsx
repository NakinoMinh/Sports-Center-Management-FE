import React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Info } from "lucide-react";

interface AlertBadgeProps {
  type: "error" | "warning" | "success" | "locked" | "info";
  message: string;
  failedAttemptsRemaining?: number;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  type,
  message,
  failedAttemptsRemaining,
}) => {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case "locked":
        return <ShieldAlert className="scms-alert-icon locked" size={22} />;
      case "warning":
        return <AlertTriangle className="scms-alert-icon warning" size={20} />;
      case "success":
        return <CheckCircle2 className="scms-alert-icon success" size={20} />;
      case "info":
        return <Info className="scms-alert-icon info" size={20} />;
      case "error":
      default:
        return <AlertTriangle className="scms-alert-icon error" size={20} />;
    }
  };

  // Calculate failed attempts out of 5
  const failedCount =
    failedAttemptsRemaining !== undefined ? 5 - failedAttemptsRemaining : 0;

  return (
    <div
      className={`scms-alert scms-alert-${type}`}
      role={type === "error" || type === "locked" ? "alert" : "status"}
    >
      <div className="scms-alert-top">
        {getIcon()}
        <div className="scms-alert-content">
          <p className="scms-alert-msg">{message}</p>

          {/* 5-Strike Meter when typing wrong password */}
          {failedAttemptsRemaining !== undefined &&
            failedAttemptsRemaining < 5 && (
              <div className="scms-strike-meter">
                <span className="scms-strike-label">
                  Số lần nhập sai: <strong>{failedCount}/5</strong> (Khóa tài
                  khoản nếu đạt 5 lần)
                </span>
                <div className="scms-strike-dots">
                  {[1, 2, 3, 4, 5].map((index) => {
                    const isFailed = index <= failedCount;
                    const isCritical = failedCount >= 4;
                    return (
                      <span
                        key={index}
                        className={`scms-strike-dot ${isFailed ? (isCritical ? "dot-danger" : "dot-warn") : "dot-empty"}`}
                        title={`Lần ${index}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
