import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export interface ActionMenuItem {
  type?: "item" | "divider";
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  menuWidth?: number;
  ariaLabel?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  menuWidth = 160,
  ariaLabel = "Mở menu thao tác",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return null;
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (isOpen) setIsOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      // Allow the click if it's inside the trigger (toggleMenu will handle closing it)
      if (triggerRef.current?.contains(e.target as Node)) {
        return;
      }
      // Otherwise, close the menu
      setIsOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    // Delay attaching to prevent the opening click from instantly closing it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = items.length * 42 + 20;

      // Default: position below the trigger
      let top = rect.bottom + window.scrollY + 4;
      let left = rect.right - menuWidth + window.scrollX;

      // If not enough space below, and more space above, flip it up
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        top = rect.top + window.scrollY - menuHeight - 4;
      }

      // Keep within bounds
      if (left < 0) left = 4;

      setCoords({ top, left });
    }
    setIsOpen(!isOpen);
  };

  const menuContent = (
    <div
      style={
        isMobile
          ? {
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--bg-panel)",
              borderTopLeftRadius: "var(--radius-lg)",
              borderTopRightRadius: "var(--radius-lg)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
              zIndex: 99999,
              padding: "1.5rem 1rem 2rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              animation: "slideUp 0.2s ease-out forwards",
            }
          : {
              position: "absolute",
              top: coords.top,
              left: coords.left,
              width: menuWidth,
              background: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem", // slightly more rounded corners
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)", // subtle shadow
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              padding: "0.25rem", // smaller outer padding for a tight menu look
              minWidth: "200px", // min width 180-220px
              animation: "fadeIn 0.15s ease-out",
            }
      }
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {isMobile && (
        <div
          style={{
            width: "40px",
            height: "4px",
            background: "var(--border-color)",
            borderRadius: "2px",
            margin: "0 auto 1rem auto",
            opacity: 0.5,
          }}
        />
      )}
      {items.map((item, idx) => {
        if (item.type === "divider") {
          return (
            <div
              key={idx}
              style={{
                height: "1px",
                background: "var(--border-color)",
                margin: "0.25rem 0",
                width: "100%",
                opacity: 0.5,
              }}
            />
          );
        }
        return (
          <button
            key={idx}
            className={`menu-item-btn ${item.danger ? "danger" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: isMobile ? "1rem" : "0.5rem 0.75rem",
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              fontSize: isMobile ? "1rem" : "0.875rem",
              color: item.danger ? "var(--danger)" : "var(--text-main)",
              borderRadius: "0.25rem",
              transition: "background 0.2s, color 0.2s",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              if (item.onClick) item.onClick();
            }}
          >
            {item.icon && (
              <span style={{ display: "flex", opacity: 0.8 }}>{item.icon}</span>
            )}
            {item.label}
          </button>
        );
      })}
      {isMobile && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }}
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--text-main)",
          }}
        >
          Hủy
        </button>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        ref={triggerRef as any}
        aria-label={ariaLabel}
        className="action-menu-trigger"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleMenu(e);
        }}
      >
        <MoreVertical size={20} />
      </button>
      {isOpen &&
        createPortal(
          <>
            {isMobile && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.5)",
                  zIndex: 99998,
                  animation: "fadeIn 0.2s ease-out",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              />
            )}
            {menuContent}
          </>,
          document.body,
        )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .menu-item-btn:hover {
          background: var(--bg-hover) !important;
        }
        .menu-item-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1) !important;
        }
      `}</style>
    </>
  );
};
