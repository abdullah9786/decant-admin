"use client";

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  run: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  config: ConfirmDialogConfig | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmDialog({ config, loading, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!config) return null;
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = config;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center mx-auto',
              destructive ? 'bg-red-100' : 'bg-indigo-100',
            )}
          >
            <AlertTriangle size={24} className={destructive ? 'text-red-600' : 'text-indigo-600'} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={!!loading}
            className="flex-1 px-4 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!!loading}
            className={clsx(
              'flex-1 px-4 py-3.5 text-sm font-bold transition-colors border-l border-slate-100 disabled:opacity-50 inline-flex items-center justify-center gap-2',
              destructive ? 'text-red-600 hover:bg-red-50' : 'text-indigo-600 hover:bg-indigo-50',
            )}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
