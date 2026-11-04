import React from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  iconType?: 'trash' | 'logout' | 'alert';
  onConfirm: () => void;
  onCancel: () => void;
  language?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  onConfirm,
  onCancel,
  language = 'English',
}) => {
  if (!isOpen) return null;

  const isBn = language === 'Bengali (বাংলা)';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-[280px] w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-scale-up text-center">
        <button
          onClick={onCancel}
          className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 px-3">
          {title || (isBn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')}
        </h3>

        {message && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            {message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            {cancelText || (isBn ? 'ক্যানসেল' : 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs text-white transition-colors cursor-pointer shadow-2xs ${
              variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {confirmText || (isBn ? 'কনফার্ম' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
