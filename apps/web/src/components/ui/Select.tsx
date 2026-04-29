// apps/web/src/components/ui/Select.tsx
// Native select with custom styling.

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  id,
}) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-muted)' }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
          style={{
            width: '100%',
            padding: '7px 32px 7px 10px',
            appearance: 'none',
            background: 'var(--color-bg)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-muted)',
            pointerEvents: 'none',
          }}
        >
          <ChevronDown size={14} />
        </span>
      </div>
      {error && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
