import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface WrapProps {
  label?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function FieldWrap({ label, hint, error, className, children, htmlFor }: WrapProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: ReactNode; error?: string; wrapClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, wrapClassName, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <FieldWrap label={label} hint={hint} error={error} className={wrapClassName} htmlFor={inputId}>
      <input ref={ref} id={inputId} className={cn('field', error && 'border-rouille-500', className)} aria-invalid={!!error} {...rest} />
    </FieldWrap>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: ReactNode; error?: string; wrapClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, wrapClassName, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <FieldWrap label={label} hint={hint} error={error} className={wrapClassName} htmlFor={inputId}>
      <textarea ref={ref} id={inputId} className={cn('field min-h-24 resize-y', className)} aria-invalid={!!error} {...rest} />
    </FieldWrap>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; wrapClassName?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, wrapClassName, className, id, children, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <FieldWrap label={label} error={error} className={wrapClassName} htmlFor={inputId}>
      <select
        ref={ref}
        id={inputId}
        className={cn(
          'field appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%235c4a34%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27M6%209l6%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  );
});
