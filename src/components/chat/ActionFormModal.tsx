import React, { useState, useEffect } from "react";
import { LumenActionItem } from "../../lib/types";
import { CheckIcon, CloseIcon } from "../common/Icons";

interface ActionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: LumenActionItem | null;
  onSubmit: (finalText: string) => void;
}

export const ActionFormModal: React.FC<ActionFormModalProps> = ({
  isOpen,
  onClose,
  action,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (action?.parameters) {
      const initial: Record<string, any> = {};
      Object.entries(action.parameters).forEach(([key, val]) => {
        initial[key] = typeof val === "object" ? val.value || "" : val || "";
      });
      setFormData(initial);
    } else {
      setFormData({});
    }
  }, [action]);

  if (!isOpen || !action) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (action.action === "booking.create" || action.action === "create.booking") {
      const pId = formData.propertyId || "";
      const cIn = formData.checkIn || "";
      const cOut = formData.checkOut || "";
      const guests = formData.guests || 2;
      onSubmit(`Confirm and book property ${pId} from ${cIn} to ${cOut} for ${guests} guests.`);
      onClose();
      return;
    }

    if (action.action === "property.availability" || action.action === "availability.check") {
      const pId = formData.propertyId || "";
      const cIn = formData.checkIn || formData.from || "";
      const cOut = formData.checkOut || formData.to || "";
      if (cIn && cOut) {
        onSubmit(`Check availability for property ${pId} from ${cIn} to ${cOut}`);
      } else {
        onSubmit(`Check availability calendar for property ${pId}`);
      }
      onClose();
      return;
    }

    // Construct a natural language message for the AI including the parameters
    let paramStrings = [];
    for (const [k, v] of Object.entries(formData)) {
      if (v !== undefined && v !== "") paramStrings.push(`${k}: ${v}`);
    }
    
    const intentMsg = action.action || action.label;
    const finalMsg = paramStrings.length > 0 
      ? `${action.label || intentMsg} (${paramStrings.join(", ")})`
      : (action.label || intentMsg);
      
    onSubmit(finalMsg);
    onClose();
  };

  const hasParams = action.parameters && Object.keys(action.parameters).length > 0;

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(255,255,255,0.8)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div className="modal-content" style={{
        background: "#FFFFFF",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "24px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", color: "var(--text-primary)" }}>
            {action.label}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <CloseIcon size={20} color="var(--text-tertiary)" />
          </button>
        </div>

        {hasParams ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(action.parameters!).map(([key, val]) => {
              const isHidden = typeof val === "object" && val.hidden === true;
              if (isHidden) return null;
              
              const label = typeof val === "object" && val.label ? val.label : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              
              return (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {label}
                  </label>
                  <input
                    type={typeof val === "object" && val.type === "number" ? "number" : "text"}
                    value={formData[key] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      fontSize: "14px",
                      outline: "none"
                    }}
                    required={typeof val === "object" ? val.required : false}
                  />
                </div>
              );
            })}
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "var(--accent-coral)", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckIcon size={14} color="#FFF" />
                <span>Submit</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Are you sure you want to proceed with this action?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={onClose} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "var(--accent-coral)", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckIcon size={14} color="#FFF" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
