export type FieldRule<V = string, T = any> = (value: V, values: T) => string | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

export function required(message = 'Este campo é obrigatório.'): FieldRule {
  return value => (!value || !value.trim() ? message : undefined);
}

export function emailFormat(message = 'Introduz um email válido.'): FieldRule {
  return value => (value.trim() && !EMAIL_RE.test(value.trim()) ? message : undefined);
}

export function slugFormat(
  message = 'O slug só pode conter letras minúsculas, números e hífens.'
): FieldRule {
  return value => (value.trim() && !SLUG_RE.test(value.trim()) ? message : undefined);
}

/** Mirrors the ASP.NET Identity PasswordOptions configured in Program.cs (min 8, upper, lower, digit). */
export function getPasswordStrengthError(password: string): string | undefined {
  if (!password) return 'A password é obrigatória.';
  const issues: string[] = [];
  if (password.length < 8) issues.push('mínimo 8 caracteres');
  if (!/[a-z]/.test(password)) issues.push('uma letra minúscula');
  if (!/[A-Z]/.test(password)) issues.push('uma letra maiúscula');
  if (!/[0-9]/.test(password)) issues.push('um número');
  if (issues.length === 0) return undefined;
  return `A password deve ter ${issues.join(', ')}.`;
}

export function passwordStrength(): FieldRule {
  return value => getPasswordStrengthError(value);
}

export function combine(...rules: FieldRule[]): FieldRule {
  return (value, values) => {
    for (const rule of rules) {
      const msg = rule(value, values);
      if (msg) return msg;
    }
    return undefined;
  };
}

export function requiredWhen(condition: (values: any) => boolean, message = 'Este campo é obrigatório.'): FieldRule {
  return (value, values) => (condition(values) && (!value || !value.trim()) ? message : undefined);
}
