// apps/web/src/components/ui/Input.tsx
// Controlled Input with label, error, prefix/suffix icon slots.

import React from 'react';
import styles from './Input.module.css';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  prefix,
  suffix,
  wrapperClassName,
  className,
  id,
  ...rest
}) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const hasError = Boolean(error);

  return (
    <div className={[styles.wrapper, wrapperClassName ?? ''].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={[styles.inputWrap, hasError ? styles.error : ''].filter(Boolean).join(' ')}>
        {prefix && <span className={styles.prefix} aria-hidden>{prefix}</span>}
        <input
          id={inputId}
          className={[styles.input, className ?? ''].filter(Boolean).join(' ')}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {suffix && <span className={styles.suffix} aria-hidden>{suffix}</span>}
      </div>
      {error && <p id={`${inputId}-error`} className={styles.errorMsg} role="alert">{error}</p>}
      {hint && !error && <p id={`${inputId}-hint`} className={styles.hint}>{hint}</p>}
    </div>
  );
};
