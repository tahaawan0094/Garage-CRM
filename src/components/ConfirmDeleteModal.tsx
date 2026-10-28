import React from "react";
import { Trash2, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemType?: string;
  itemId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemType = "item",
  itemId,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop confirm-delete-backdrop"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="confirm-delete-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "26px 24px 22px",
          width: "100%",
          maxWidth: "390px",
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          color: "#0f172a",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "transparent",
            border: 0,
            color: "#94a3b8",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            padding: "5px",
            borderRadius: "6px",
            transition: "all 0.15s ease",
          }}
          aria-label="Close"
          onMouseEnter={(e) => (e.currentTarget.style.color = "#475569")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
        >
          <X size={16} />
        </button>

        {/* Danger Icon Badge */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: "#ef4444",
            boxShadow: "0 0 0 6px #fff5f5",
          }}
        >
          <Trash2 size={24} />
        </div>

        {/* Heading */}
        <h3
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 8px",
            letterSpacing: "-0.3px",
          }}
        >
          {title || `Delete ${itemType}`}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            lineHeight: 1.5,
            margin: "0 0 22px",
          }}
        >
          Are you sure you want to delete{" "}
          <strong
            style={{
              color: "#dc2626",
              fontWeight: 700,
              background: "#fef2f2",
              padding: "2px 7px",
              borderRadius: "4px",
              border: "1px solid #fee2e2",
            }}
          >
            {itemId}
          </strong>
          ? This record will be permanently deleted from the database.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              height: "38px",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              height: "38px",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "1px solid #dc2626",
              color: "#ffffff",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) e.currentTarget.style.filter = "brightness(0.95)";
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) e.currentTarget.style.filter = "none";
            }}
          >
            <Trash2 size={14} />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
