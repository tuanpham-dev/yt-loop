import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={`w-full rounded-sketch-sm border-2 border-ink bg-paper-50 px-3 py-2 text-sm text-ink placeholder-ink-muted shadow-sketch-press outline-none transition-shadow focus:shadow-sketch-sm disabled:opacity-50 ${className}`}
      />
    );
  },
);
