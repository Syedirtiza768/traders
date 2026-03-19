/**
 * SearchableSelect
 *
 * A fully-controlled, zero-dependency searchable dropdown that visually
 * matches the existing `.input-field` design token.
 *
 * Supports two modes:
 *  1. **Sync** (default) – pass `options` array, filtering is client-side.
 *  2. **Async** – pass `onSearch` callback, filtering is server-side with
 *     debounce. Options can still be provided as a seed/fallback list.
 *
 * Props
 * ─────
 * options       – { label: string; value: string }[]
 * value         – currently selected value (controlled)
 * onChange      – (value: string) => void
 * placeholder   – text shown when nothing is selected (default "Select…")
 * disabled      – greys out and locks the control
 * className     – extra classes forwarded to the outer wrapper div
 * error         – amber border variant (used when a line item is un-filled)
 * loading       – external loading state (shows spinner in trigger)
 * onSearch      – async search callback; when provided, enables async mode
 * debounceMs    – debounce delay for onSearch in ms (default 300)
 * creatable     – when true, shows a "Create <query>" option at end of list
 * onCreateNew   – callback fired when the creatable option is clicked
 * emptyMessage  – custom text for no-results state (default "No options found")
 * autoResolve   – when true, auto-fires onChange with the resolved ID when a
 *                 label↔ID mismatch is detected (default true)
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';

export type SelectOption = {
  label: string;
  value: string;
};

type SelectValue = string | SelectOption | null | undefined;

function normalizeOptionValue(value: SelectValue) {
  if (value && typeof value === 'object') {
    return value.value ?? '';
  }

  return value == null ? '' : String(value);
}

function normalizeOptionLabel(value: SelectValue) {
  if (value && typeof value === 'object') {
    return value.label || value.value || '';
  }

  return value == null ? '' : String(value);
}

/**
 * Resolves the currently-selected option from a potentially mismatched
 * controlled value.  Attempts four match levels:
 *   1. Exact value match
 *   2. Exact label match
 *   3. Case-insensitive label match
 *   4. Raw fallback (displays the controlled value as-is)
 */
export function resolveSelectedOption(options: SelectOption[], rawValue: SelectValue) {
  const normalizedValue = normalizeOptionValue(rawValue);
  const normalizedLabel = normalizeOptionLabel(rawValue);

  if (!normalizedValue && !normalizedLabel) {
    return {
      selected: undefined as SelectOption | undefined,
      normalizedValue,
      displayValue: '',
    };
  }

  const byValue = options.find((o) => String(o.value) === normalizedValue);
  if (byValue) {
    return {
      selected: byValue,
      normalizedValue: String(byValue.value),
      displayValue: byValue.label,
    };
  }

  // Fallback for id/name mismatches where controlled value may carry a human label
  // (e.g. "City Eastern Mart") while option values carry an ID (e.g. "CUST-0001").
  const byExactLabel = options.find((o) => String(o.label) === normalizedLabel);
  if (byExactLabel) {
    return {
      selected: byExactLabel,
      normalizedValue: String(byExactLabel.value),
      displayValue: byExactLabel.label,
    };
  }

  const loweredLabel = normalizedLabel.toLowerCase();
  const byCaseInsensitiveLabel = loweredLabel
    ? options.find((o) => String(o.label).toLowerCase() === loweredLabel)
    : undefined;
  if (byCaseInsensitiveLabel) {
    return {
      selected: byCaseInsensitiveLabel,
      normalizedValue: String(byCaseInsensitiveLabel.value),
      displayValue: byCaseInsensitiveLabel.label,
    };
  }

  // Last resort while options are delayed or unmatched: still show the controlled value.
  return {
    selected: undefined as SelectOption | undefined,
    normalizedValue,
    displayValue: normalizedLabel,
  };
}

type Props = {
  options: SelectOption[];
  value: SelectValue;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When true, renders an amber border instead of the default gray/brand border */
  error?: boolean;
  /** External loading flag – shows spinner in the trigger area */
  loading?: boolean;
  /** Async search callback – when provided, dropdown searches server-side */
  onSearch?: (query: string) => Promise<SelectOption[]>;
  /** Debounce delay for onSearch in ms (default 300) */
  debounceMs?: number;
  /** Show a "Create <query>" option at the bottom of the list */
  creatable?: boolean;
  /** Callback when the user clicks the creatable option */
  onCreateNew?: (query: string) => void;
  /** Custom empty-state message (default "No options found") */
  emptyMessage?: string;
  /**
   * When true (default), if the controlled value holds a display-name
   * (label) instead of the canonical ID, the component will auto-fire
   * onChange(resolvedId) once options load.  This eliminates the need
   * for external resolver helpers like resolveSupplierValue().
   */
  autoResolve?: boolean;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  error = false,
  loading: externalLoading = false,
  onSearch,
  debounceMs = 300,
  creatable = false,
  onCreateNew,
  emptyMessage = 'No options found',
  autoResolve = true,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asyncResults, setAsyncResults] = useState<SelectOption[] | null>(null);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const isAsync = typeof onSearch === 'function';
  const isLoading = externalLoading || asyncLoading;

  const resolved = resolveSelectedOption(options, value);
  const { normalizedValue, displayValue } = resolved;

  // ── Auto-resolve: normalise label→ID on the controlled value ──────────
  // When the component detects the controlled value is a display name that
  // matched an option by label (not by value), it fires onChange with the
  // canonical option value.  This replaces all external resolve helpers.
  const lastAutoResolved = useRef<string>('');
  useEffect(() => {
    if (!autoResolve) return;
    const raw = normalizeOptionValue(value);
    if (!raw || !resolved.selected) return;
    // If the resolved canonical value differs from what was passed in,
    // the consumer is holding a label — correct it.
    if (String(resolved.selected.value) !== raw && lastAutoResolved.current !== raw) {
      lastAutoResolved.current = raw;
      onChange(String(resolved.selected.value));
    }
  }, [autoResolve, value, resolved.selected, onChange]);

  // ── Effective options (async results take priority when searching) ─────
  const effectiveOptions = isAsync && asyncResults !== null ? asyncResults : options;

  // ── Filtered list (client-side filtering in sync mode) ────────────────
  const filtered =
    isAsync
      ? effectiveOptions
      : query.trim() === ''
        ? options
        : options.filter((o) =>
            o.label.toLowerCase().includes(query.trim().toLowerCase()),
          );

  // ── Async search with debounce ────────────────────────────────────────
  const fireAsyncSearch = useCallback(
    (q: string) => {
      if (!onSearch) return;
      clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setAsyncResults(null);
        setAsyncLoading(false);
        return;
      }
      setAsyncLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await onSearch(q.trim());
          setAsyncResults(results);
        } catch {
          setAsyncResults([]);
        } finally {
          setAsyncLoading(false);
        }
      }, debounceMs);
    },
    [onSearch, debounceMs],
  );

  // ── Handle query changes ──────────────────────────────────────────────
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (isAsync) {
      fireAsyncSearch(q);
    }
  };

  // ── Close on outside click ────────────────────────────────────────────
  // The dropdown is portaled to document.body so it's NOT a DOM child of
  // wrapperRef.  We must check both refs to avoid closing when the user
  // interacts with the dropdown (search input, option clicks, scrollbar).
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return; // click is inside our component — do nothing
      }
      setOpen(false);
      setQuery('');
      setAsyncResults(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // ── Compute dropdown position for portal rendering ────────────────────
  useEffect(() => {
    if (!open || !wrapperRef.current) {
      setDropdownPos(null);
      return;
    }
    const updatePos = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    updatePos();
    // Reposition on scroll/resize so the dropdown follows the trigger
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  // ── Focus the search box when the dropdown opens ──────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setAsyncResults(null);
    }
  }, [open]);

  // ── Cleanup debounce on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

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
    setAsyncResults(null);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
    setAsyncResults(null);
  };

  const handleCreate = () => {
    if (onCreateNew && query.trim()) {
      onCreateNew(query.trim());
    }
    setOpen(false);
    setQuery('');
    setAsyncResults(null);
  };

  // ── Compute border class ──────────────────────────────────────────────────
  const borderClass = error
    ? 'border-amber-300 focus-within:border-amber-500 focus-within:ring-amber-500'
    : open
      ? 'border-brand-500 ring-2 ring-brand-500'
      : 'border-gray-300 hover:border-gray-400';

  // ── Dropdown panel content ────────────────────────────────────────────────
  const dropdownContent = open ? (
    <div
      ref={dropdownRef}
      className="rounded-lg border border-gray-200 bg-white shadow-lg"
      style={
        dropdownPos
          ? {
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }
          : undefined
      }
    >
      {/* Search box */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        {asyncLoading ? (
          <Loader2 size={13} className="shrink-0 text-brand-500 animate-spin" />
        ) : (
          <Search size={13} className="shrink-0 text-gray-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
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
        {isLoading && filtered.length === 0 ? (
          <li className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Searching…
          </li>
        ) : filtered.length === 0 && !creatable ? (
          <li className="px-4 py-2 text-sm text-gray-400 italic">{emptyMessage}</li>
        ) : (
          <>
            {filtered.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={String(opt.value) === normalizedValue}
                tabIndex={0}
                onClick={() => pick(opt.value)}
                onKeyDown={(e) => handleOptionKey(e, opt.value)}
                className={[
                  'px-4 py-2 text-sm cursor-pointer outline-none truncate',
                  String(opt.value) === normalizedValue
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-800 hover:bg-gray-50 focus:bg-gray-100',
                ].join(' ')}
              >
                {opt.label}
              </li>
            ))}
            {creatable && query.trim() && !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) && (
              <li
                role="option"
                aria-selected={false}
                tabIndex={0}
                onClick={handleCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer outline-none text-brand-600 hover:bg-brand-50 focus:bg-brand-50 border-t border-gray-100"
              >
                <Plus size={13} /> Create "{query.trim()}"
              </li>
            )}
          </>
        )}
      </ul>
    </div>
  ) : null;

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
        onMouseDown={(e) => {
          if (disabled) return;
          // preventDefault stops the parent <label> (used in Field components)
          // from re-dispatching a synthetic click onto this element, which would
          // cause open→close in the same event cycle and make the dropdown appear
          // to never open.
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onClick={(e) => {
          // Also stop the synthetic click that a wrapping <label> element fires
          // after mousedown — without this the toggle fires twice (open→close).
          e.preventDefault();
          e.stopPropagation();
        }}
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
        <span className={`flex-1 truncate ${displayValue ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        <span className="flex items-center gap-1 ml-2 shrink-0">
          {isLoading && (
            <Loader2 size={13} className="text-brand-500 animate-spin" />
          )}
          {normalizedValue && !disabled && !isLoading && (
            <button
              type="button"
              aria-label="Clear"
              onMouseDown={(e) => e.stopPropagation()}
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

      {/* ── Dropdown rendered via portal to escape z-index / overflow traps ── */}
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
