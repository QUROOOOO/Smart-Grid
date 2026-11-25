import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-semibold text-inkSecondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full appearance-none rounded-2xl bg-surfaceTonal px-4 py-2.5 pr-10 text-sm font-medium text-ink",
              "ring-1 ring-borderSubtle/60 transition-shadow",
              "focus:outline-none focus:ring-2 focus:ring-brandVivid",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "ring-2 ring-ink/50"
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkMuted" />
        </div>
        {error && <p className="mt-1 text-xs font-medium text-inkSecondary">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
