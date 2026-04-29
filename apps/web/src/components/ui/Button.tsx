// apps/web/src/components/ui/Button.tsx
// Base Button component with variants, sizes, and loading state.

import React from 'react';
import styles from './Button.module.css';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'dangerGhost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  disabled,
  children,
  className,
  ...rest
}) => {
  const cls = [
    styles.btn,
    styles[size],
    styles[variant],
    loading ? styles.loading : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <button {...rest} disabled={disabled || loading} className={cls}>
      {loading && (
        <span className={styles.loadingSpinner} aria-hidden>
          <Spinner size="sm" />
        </span>
      )}
      {icon && <span aria-hidden>{icon}</span>}
      {children}
      {iconRight && <span aria-hidden>{iconRight}</span>}
    </button>
  );
};
