import React from "react";
import { DatabaseZap } from "lucide-react";

interface NoDatabaseNoticeProps {
  featureName: string;
  description?: string;
}

export const NoDatabaseNotice: React.FC<NoDatabaseNoticeProps> = ({
  featureName,
  description,
}) => {
  return (
    <div
      className="panel empty-state no-db-state"
      style={{
        padding: "3.5rem 1.5rem",
        textAlign: "center",
        border: "1px dashed rgba(239, 68, 68, 0.3)",
        background: "rgba(239, 68, 68, 0.03)",
        borderRadius: "12px",
        margin: "1rem 0",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          padding: "1rem",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          color: "#ef4444",
          marginBottom: "1rem",
        }}
      >
        <DatabaseZap size={40} />
      </div>
      <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Chưa có cơ sở dữ liệu cho chức năng này
      </h3>
      <p
        style={{
          color: "var(--color-muted, #94a3b8)",
          maxWidth: "580px",
          margin: "0 auto 1.25rem auto",
          lineHeight: 1.6,
        }}
      >
        {description ||
          `Chức năng "${featureName}" hiện chưa có dữ liệu trong cơ sở dữ liệu Backend. Vui lòng quay lại sau khi Backend bổ sung API.`}
      </p>
      <div
        style={{
          display: "inline-block",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "8px",
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          color: "#94a3b8",
        }}
      >
        Trạng thái: <strong>Chưa có DB</strong> (Chờ kết nối API Backend)
      </div>
    </div>
  );
};
