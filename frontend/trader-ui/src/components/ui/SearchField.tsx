import { Search } from 'lucide-react';

interface SearchFieldProps {
  placeholder?: string;
  onChange: (value: string) => void;
  defaultValue?: string;
  value?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export default function SearchField({
  placeholder = 'Search…',
  onChange,
  defaultValue,
  value,
  className = '',
  id,
  'aria-label': ariaLabel = 'Search',
}: SearchFieldProps) {
  return (
    <div className={`relative w-full sm:w-72 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="input-field pl-9"
      />
    </div>
  );
}
