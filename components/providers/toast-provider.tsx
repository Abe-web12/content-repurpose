
"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1f2937",
          color: "#f9fafb",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          padding: "12px 16px",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#f9fafb",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#f9fafb",
          },
        },
      }}
    />
  );
}