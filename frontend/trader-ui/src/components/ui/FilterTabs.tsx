interface FilterTabsProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

/** Horizontal filter tab strip used on list pages. */
export default function FilterTabs({
  options,
  value,
  onChange,
  ariaLabel = 'Filter',
  className = '',
}: FilterTabsProps) {
  return (
    <div
      className={`filter-tabs flex gap-1 overflow-x-auto scrollbar-hide rounded-lg bg-gray-100 p-1 dark:bg-slate-800 w-full sm:w-auto ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={`min-h-[36px] whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'bg-white text-brand-700 shadow dark:bg-slate-700 dark:text-brand-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-gray-100'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
