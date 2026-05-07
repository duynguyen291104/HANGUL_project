'use client';

interface ActionDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  hideCancel?: boolean;
  loading?: boolean;
}

export default function ActionDialog({
  open,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onClose,
  danger = false,
  hideCancel = false,
  loading = false,
}: ActionDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e8dcd4] bg-[#fafaf5] p-6 shadow-2xl">
        <h3 className="text-xl font-extrabold text-[#1a1c19]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#504441]">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#d6c8c2] px-4 py-2 text-sm font-semibold text-[#504441] hover:bg-[#f4ede9] transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#72564c] hover:bg-[#504441]'
            }`}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
