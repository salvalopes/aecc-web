import { useCallback, useState } from 'react';
import { ApiError, NetworkError } from '@/api/client';
import type { FieldRule } from '@/utils/validators';

type Rules<T> = Partial<{ [K in keyof T]: FieldRule<T[K], T> }>;
type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Friendly PT messages for ASP.NET Identity error codes (UserManager.CreateAsync/ResetPasswordAsync failures), which come back in English by default. */
const IDENTITY_ERROR_MESSAGES: Record<string, string> = {
  DuplicateUserName: 'Este email já está a ser utilizado.',
  DuplicateEmail: 'Este email já está a ser utilizado.',
  InvalidEmail: 'Introduz um email válido.',
  PasswordTooShort: 'A password deve ter no mínimo 8 caracteres.',
  PasswordRequiresDigit: 'A password deve conter pelo menos um número.',
  PasswordRequiresLower: 'A password deve conter pelo menos uma letra minúscula.',
  PasswordRequiresUpper: 'A password deve conter pelo menos uma letra maiúscula.',
  PasswordRequiresNonAlphanumeric: 'A password deve conter pelo menos um caráter especial.',
  PasswordRequiresUniqueChars: 'A password contém demasiados caracteres repetidos.',
};

/**
 * Reusable form-state helper: runs local field validation before submit, and after
 * submit maps ApiError/NetworkError into either per-field errors (fieldMap) or a
 * general banner message — so no screen has to hand-roll this twice.
 */
export function useFormValidation<T extends Record<string, any>>() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<T>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const validate = useCallback((values: T, rules: Rules<T>): boolean => {
    const errors: FieldErrors<T> = {};
    (Object.keys(rules) as (keyof T)[]).forEach(key => {
      const rule = rules[key];
      if (!rule) return;
      const msg = rule(values[key], values);
      if (msg) errors[key] = msg;
    });
    setFieldErrors(errors);
    setFormError(null);
    return Object.keys(errors).length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setFieldErrors(prev => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** Call from a catch block. `fieldMap` maps backend keys (FluentValidation property names or Identity error codes) to local form field names. */
  const applyApiError = useCallback((e: unknown, fieldMap: Partial<Record<string, keyof T>> = {}) => {
    if (e instanceof NetworkError) {
      setFieldErrors({});
      setFormError(e.message);
      return;
    }
    if (e instanceof ApiError) {
      if (e.fieldErrors) {
        const mapped: FieldErrors<T> = {};
        const unmapped: string[] = [];
        for (const [code, msgs] of Object.entries(e.fieldErrors)) {
          const message = IDENTITY_ERROR_MESSAGES[code] ?? msgs.join(' ');
          const localField = fieldMap[code];
          if (localField) mapped[localField] = message;
          else unmapped.push(message);
        }
        setFieldErrors(mapped);
        setFormError(unmapped.length > 0 ? unmapped.join(' ') : null);
        return;
      }
      setFieldErrors({});
      setFormError(e.message);
      return;
    }
    setFieldErrors({});
    setFormError('Ocorreu um erro inesperado. Tenta novamente.');
  }, []);

  return { fieldErrors, formError, setFormError, validate, clearErrors, clearFieldError, applyApiError };
}
