// src/components/Modal.jsx
import React, { useEffect } from "react";

export default function Modal({ open, title, children, onClose, maxWidth = "max-w-2xl" }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative w-[92%] ${maxWidth} bg-neutral-900 text-white rounded-2xl shadow-2xl border border-white/10 p-6 transform transition-all duration-150 ease-out scale-95 opacity-0
                    data-[show=true]:opacity-100 data-[show=true]:scale-100`}
        data-show="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold font-lexend">{title}</h3>
          <button
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
