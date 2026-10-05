import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'light' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ease-out-soft disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-rouille-500 text-creme-50 shadow-[0_8px_24px_-10px_rgba(201,98,46,0.7)] hover:bg-rouille-600',
  dark: 'bg-inverse text-on-inverse hover:opacity-90',
  outline: 'border border-ink/15 bg-transparent text-ink hover:border-ink/40 hover:bg-ink/[0.04]',
  ghost: 'text-ink hover:bg-ink/5',
  light: 'bg-[#fffdf9] text-[#241a11] hover:bg-white',
  danger: 'text-rouille-600 hover:bg-rouille-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
