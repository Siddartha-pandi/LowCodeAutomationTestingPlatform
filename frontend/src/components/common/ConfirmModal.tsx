"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, AlertCircle, HelpCircle, X } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void | Promise<void>;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    setModalState(options);
  }, []);

  const handleClose = () => {
    if (loading) return;
    setModalState(null);
  };

  const handleProceed = async () => {
    if (!modalState) return;
    setLoading(true);
    try {
      await modalState.onConfirm();
      setModalState(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-black rounded-2xl max-w-md w-full border border-neutral-300 dark:border-neutral-800 shadow-2xl p-6 space-y-4 text-black dark:text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-black dark:text-white">
                  {modalState.variant === "danger" && <AlertTriangle className="w-5 h-5" />}
                  {modalState.variant === "warning" && <AlertCircle className="w-5 h-5" />}
                  {(!modalState.variant || modalState.variant === "primary") && <HelpCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white">{modalState.title}</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{modalState.message}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition"
              >
                {modalState.cancelText || "Cancel"}
              </button>
              <button
                onClick={handleProceed}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold transition shadow-xs disabled:opacity-50"
              >
                {loading ? "Processing..." : modalState.confirmText || "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
