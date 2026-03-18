/**
 * SearchableSelect
 *
 * A fully-controlled, zero-dependency searchable dropdown that visually
 * matches the existing `.input-field` design token.
 *
 * Props
 * ─────
 * options    – { label: string; value: string }[]
 * value      – currently selected value (controlled)
 * onChange   – (value: string) => void
 * placeholder – text shown when nothing is selected (default "Select…")
 * disabled   – greys out and locks the control
 * className  – extra classes forwarded to the outer wrapper div
 * error      – amber border variant (used when a line item is un-filled)
 */

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export type SelectOption = {
  label: string;
  value: string;
};

type Props = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When true, renders an amber border instead of the default gray/brand border */
  error?: boolean;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  error = false,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered =
    query.trim() === ''
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.trim().toLowerCase()),
        );

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // ── Focus the search box when the dropdown opens ──────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      const first = listRef.current?.querySelector<HTMLLIElement>('li[role="option"]');
      first?.focus();
    }
  };

  const handleOptionKey = (e: React.KeyboardEvent<HTMLLIElement>, optValue: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(optValue);
    }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLLIElement | null)?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = e.currentTarget.previousElementSibling as HTMLLIElement | null;
      if (prev) {
        prev.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  const pick = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setQuery('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // ── Compute border class ──────────────────────────────────────────────────
  const borderClass = error
    ? 'border-amber-300 focus-within:border-amber-500 focus-within:ring-amber-500'
    : open
      ? 'border-brand-500 ring-2 ring-brand-500'
      : 'border-gray-300 hover:border-gray-400';

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      id={`ss-wrapper-${id}`}
    >
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`ss-list-${id}`}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={[
          'flex items-center w-full px-3 py-2 rounded-lg border bg-white text-sm cursor-pointer select-none transition-colors',
          borderClass,
          disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : '',
          open ? 'ring-2' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={`flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 ml-2 shrink-0">
          {selected && !disabled && (
            <button
              type="button"
              aria-label="Clear"
              onClick={clear}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </div>

      {/* ── Dropdown panel ─────────────────────────────────────────────── */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Search box */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search size={13} className="shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const first = listRef.current?.querySelector<HTMLLIElement>('li[role="option"]');
                  first?.focus();
                }
              }}
            />
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            id={`ss-list-${id}`}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-400 italic">No options found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  tabIndex={0}
                  onClick={() => pick(opt.value)}
                  onKeyDown={(e) => handleOptionKey(e, opt.value)}
                  className={[
                    'px-4 py-2 text-sm cursor-pointer outline-none truncate',
                    opt.value === value
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-800 hover:bg-gray-50 focus:bg-gray-100',
                  ].join(' ')}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
