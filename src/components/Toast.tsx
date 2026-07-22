"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastTipo = "ok" | "erro" | "info";

interface Toast {
  id: number;
  tipo: ToastTipo;
  msg: string;
}

interface ToastContextValue {
  toast: (msg: string, tipo?: ToastTipo) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, tipo: ToastTipo = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, tipo, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const cores: Record<ToastTipo, string> = {
    ok: "border-green-700 bg-green-900/90 text-green-100",
    erro: "border-red-700 bg-red-900/90 text-red-100",
    info: "border-blue-700 bg-blue-900/90 text-blue-100",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg border text-sm shadow-lg ${cores[t.tipo]}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
