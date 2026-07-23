
"use client";

import toast from "react-hot-toast";

export { toast };

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(message: string) {
  toast.error(message);
}

export function showLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}