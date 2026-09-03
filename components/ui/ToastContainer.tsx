"use client";

import { useWorkTime } from "@/lib/scheduling/context";

export function ToastContainer() {
  const store = useWorkTime();
  return (
    <div className="toast-container">
      {store.toasts.map((t) => (
        <div key={t.id} className={`toast${t.warn ? " warn" : ""}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
