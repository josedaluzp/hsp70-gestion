import { type InputHTMLAttributes, useId } from "react";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
}

export default function SearchInput({
  className = "",
  value,
  onClear,
  id: externalId,
  ...rest
}: SearchInputProps) {
  const autoId = useId();
  const id = externalId ?? autoId;
  const hasValue = value !== undefined && value !== "";

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <input
        id={id}
        type="search"
        value={value}
        className={`
          block w-full rounded-lg border border-neutral-300 bg-white
          py-2 pl-10 pr-9 text-sm text-neutral-800
          placeholder-neutral-400
          transition-colors duration-150
          outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0
          ${className}
        `}
        {...rest}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
          aria-label="Limpiar búsqueda"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
