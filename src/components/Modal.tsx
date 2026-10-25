import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[#20352C]/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sheet panel (slides up on mobile, centered on desktop) */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-[#E5EAE3] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile drag handle hint */}
        <div className="w-12 h-1.5 bg-[#E5EAE3] rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5EAE3] bg-white">
          <h2 className="text-base font-bold text-[#20352C]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7C72] hover:text-[#20352C] hover:bg-[#F9F7EF] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-white">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-[#E5EAE3] bg-[#F9F7EF] rounded-b-[28px] sm:rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} fullWidth>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} fullWidth>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[#6B7C72] text-sm leading-relaxed">{message}</p>
    </Modal>
  );
}
