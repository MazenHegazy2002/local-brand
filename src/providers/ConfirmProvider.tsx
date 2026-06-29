'use client';

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/providers/LanguageContext';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning' | 'success';
}

interface AlertOptions {
  title: string;
  message: string;
  okText?: string;
}

interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'confirm' | 'alert' | 'prompt';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    okText?: string;
    type?: 'default' | 'danger' | 'warning' | 'success';
    defaultValue?: string;
    placeholder?: string;
  }>({
    open: false,
    mode: 'confirm',
    title: '',
    message: '',
  });

  const [promptValue, setPromptValue] = useState('');
  const resolverRef = useRef<any>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      setModalState({
        open: true,
        mode: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || (isAr ? 'تأكيد' : 'Confirm'),
        cancelText: options.cancelText || (isAr ? 'إلغاء' : 'Cancel'),
        type: options.type || 'default',
      });
      return new Promise(resolve => {
        resolverRef.current = resolve;
      });
    },
    [isAr]
  );

  const alert = useCallback(
    (options: AlertOptions): Promise<void> => {
      setModalState({
        open: true,
        mode: 'alert',
        title: options.title,
        message: options.message,
        okText: options.okText || (isAr ? 'موافق' : 'OK'),
      });
      return new Promise(resolve => {
        resolverRef.current = resolve;
      });
    },
    [isAr]
  );

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> => {
      setModalState({
        open: true,
        mode: 'prompt',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || (isAr ? 'إرسال' : 'Submit'),
        cancelText: options.cancelText || (isAr ? 'إلغاء' : 'Cancel'),
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
      });
      setPromptValue(options.defaultValue || '');
      return new Promise(resolve => {
        resolverRef.current = resolve;
      });
    },
    [isAr]
  );

  const handleClose = () => {
    if (!modalState.open) return;
    setModalState(prev => ({ ...prev, open: false }));
    if (resolverRef.current) {
      if (modalState.mode === 'confirm') {
        resolverRef.current(false);
      } else if (modalState.mode === 'prompt') {
        resolverRef.current(null);
      } else {
        resolverRef.current();
      }
    }
  };

  const handleConfirm = () => {
    setModalState(prev => ({ ...prev, open: false }));
    if (resolverRef.current) {
      if (modalState.mode === 'confirm') {
        resolverRef.current(true);
      } else if (modalState.mode === 'prompt') {
        resolverRef.current(promptValue);
      } else {
        resolverRef.current();
      }
    }
  };

  const getConfirmButtonVariant = () => {
    if (modalState.type === 'danger') return 'destructive';
    return 'default';
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <Modal open={modalState.open} onClose={handleClose} title={modalState.title} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {modalState.message}
          </p>

          {modalState.mode === 'prompt' && (
            <div className="pt-2">
              <Input
                value={promptValue}
                onChange={e => setPromptValue(e.target.value)}
                placeholder={modalState.placeholder}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
              />
            </div>
          )}

          <div
            className={`flex items-center justify-end gap-3 pt-3 ${isAr ? 'flex-row-reverse' : ''}`}
          >
            {modalState.mode !== 'alert' && (
              <Button variant="outline" onClick={handleClose}>
                {modalState.cancelText}
              </Button>
            )}

            <Button
              variant={modalState.mode === 'alert' ? 'default' : getConfirmButtonVariant()}
              onClick={handleConfirm}
            >
              {modalState.mode === 'alert' ? modalState.okText : modalState.confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
