import { useState } from "react";
import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  /** Renders the confirm button in the destructive style. */
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Replaces window.confirm for destructive actions. The native dialog cannot be
 * styled, blocks the main thread, and reads as a browser warning rather than as
 * part of the product.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);

  const handleConfirm = async () => {
    setIsWorking(true);
    try {
      await onConfirm();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog
      title={title}
      description={description}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="button secondary"
            onClick={onCancel}
            disabled={isWorking}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`button ${destructive ? "danger" : "primary"}`}
            onClick={handleConfirm}
            disabled={isWorking}
          >
            {isWorking ? "Đang xử lý..." : confirmLabel}
          </button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}
