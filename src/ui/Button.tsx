import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-sticky-yellow text-ink border-2 border-ink shadow-sketch-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sketch-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  secondary:
    'bg-paper text-ink border-2 border-ink shadow-sketch-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sketch-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  danger:
    'bg-accent text-paper border-2 border-ink shadow-sketch-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sketch-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  ghost: 'bg-transparent text-ink hover:bg-paper-100 border-2 border-transparent',
};

export function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1 rounded-sketch-sm px-3 py-1.5 font-hand text-base leading-tight transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-sketch-sm ${variants[variant]} ${className}`}
    />
  );
}
