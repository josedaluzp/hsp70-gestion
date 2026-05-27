import { type InputHTMLAttributes, type ReactNode, useId } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  icon,
  className = "",
  id: externalId,
  ...rest
}: InputProps) {
  const autoId = useId();
  const id = externalId ?? autoId;
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-neutral-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            {icon}
          </div>
        )}
        <input
          id={id}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          className={`
            block w-full rounded-lg border bg-neutral-900/60 px-3 py-2 text-sm
            text-neutral-100 placeholder-neutral-500
            transition-colors duration-150
            outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed
            ${icon ? "pl-10" : ""}
            ${
              hasError
                ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30"
                : "border-neutral-600 focus:border-primary-500 focus:ring-primary-500/30"
            }
            ${className}
          `}
          {...rest}
        />
      </div>
      {hasError && (
        <p id={`${id}-error`} className="text-xs text-danger-500" role="alert">
          {error}
        </p>
      )}
      {!hasError && helperText && (
        <p id={`${id}-helper`} className="text-xs text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
