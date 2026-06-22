import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  type?: "item" | "divider";
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  trigger: React.ReactNode;
  items: ActionMenuItem[];
  menuWidth?: number;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  trigger,
  items,
  menuWidth = 150,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

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
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (isOpen && !triggerRef.current?.contains(e.target as Node)) {
        // We handle clicking inside the menu via the menu click handler itself
        // or by wrapping the portal contents and checking it there.
        // For simplicity, we can close it if we click outside the trigger.
        // Wait, if they click the menu itself, it will close unless we check for the menu ref.
        // We will handle it by adding a stopPropagation on the menu itself.
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleScroll = () => {
      if (isOpen && !isMobile) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, isMobile]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = items.length * 40 + 20;

      let top = rect.bottom + window.scrollY;
      let left = rect.right - menuWidth + window.scrollX;

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        // Place above
        top = rect.top + window.scrollY - menuHeight;
      }

      // Keep within bounds
      if (left < 0) left = 0;

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
              zIndex: 9999,
              padding: "1rem 1rem 2rem 1rem",
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
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-lg)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
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
              padding: isMobile ? "1rem" : "0.5rem 1rem",
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              fontSize: isMobile ? "1rem" : "0.875rem",
              color: item.danger ? "var(--danger)" : "var(--text-main)",
              borderRadius: "var(--radius-sm)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              if (item.onClick) item.onClick();
            }}
          >
            {item.icon && <span style={{ display: "flex" }}>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
      {isMobile && (
        <button
          onClick={() => setIsOpen(false)}
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "var(--bg-surface)",
            border: "none",
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
      <div
        ref={triggerRef}
        onClick={toggleMenu}
        style={{ display: "inline-block" }}
      >
        {trigger}
      </div>
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
                  zIndex: 9998,
                }}
                onClick={() => setIsOpen(false)}
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
        .menu-item-btn:hover {
          background: var(--bg-surface);
        }
        .menu-item-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </>
  );
};
