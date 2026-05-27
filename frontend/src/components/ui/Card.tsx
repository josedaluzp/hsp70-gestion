import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl border border-neutral-700/60 bg-neutral-800
        shadow-md
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-bold text-neutral-100">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-neutral-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
