/**
 * Accepted-option helpers for the Line → Option → Item hierarchy.
 *
 * An option is an alternative within its line. Exactly one option per line is
 * ordered, delivered and invoiced: the one the customer accepted (`is_selected`).
 * Without a flag the lowest option number is billed, matching the server rule in
 * `trader_app.api.hierarchy.resolve_selection`. Keep the two in step.
 */

export type OptionItemLike = {
  unit_qty?: number | string | null;
  unit_price?: number | string | null;
  discount_percent?: number | string | null;
};

export type OptionLike = {
  line_no: number | string;
  option_no: number | string;
  is_selected?: number | boolean | null;
  package_qty?: number | string | null;
  items?: OptionItemLike[] | null;
};

/** Line number -> option number that is billed for that line. */
export type OptionSelection = Record<number, number>;

const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Options grouped by line, each line sorted by option number. */
export function groupByLine<T extends OptionLike>(options: T[]): Map<number, T[]> {
  const lines = new Map<number, T[]>();
  for (const option of options) {
    const line = num(option.line_no, 1);
    const bucket = lines.get(line) ?? [];
    bucket.push(option);
    lines.set(line, bucket);
  }
  for (const bucket of lines.values()) {
    bucket.sort((a, b) => num(a.option_no, 1) - num(b.option_no, 1));
  }
  return new Map([...lines.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * The option billed for each line: the flagged option when one is set, otherwise
 * the lowest option number. Pass `useFlags: false` for a quotation, which is valued
 * on its first options whatever has been flagged.
 */
export function effectiveSelection(options: OptionLike[], useFlags = true): OptionSelection {
  const selection: OptionSelection = {};
  for (const [line, bucket] of groupByLine(options)) {
    const flagged = useFlags ? bucket.find((o) => Boolean(o.is_selected)) : undefined;
    selection[line] = num((flagged ?? bucket[0]).option_no, 1);
  }
  return selection;
}

/** Net value of one package of an option: the sum of its discounted item amounts. */
export function packageAmount(option: OptionLike): number {
  return (option.items ?? []).reduce((sum, item) => {
    const qty = num(item.unit_qty, 1);
    const rate = num(item.unit_price);
    const discount = num(item.discount_percent);
    return sum + qty * rate * (1 - discount / 100);
  }, 0);
}

/** Total value of an option: its package quantity times the package amount. */
export function optionAmount(option: OptionLike): number {
  return num(option.package_qty, 1) * packageAmount(option);
}

/** Value of the billed options only. */
export function billedAmount(options: OptionLike[], selection: OptionSelection): number {
  return options.reduce((sum, option) => {
    const line = num(option.line_no, 1);
    return num(option.option_no, 1) === selection[line] ? sum + optionAmount(option) : sum;
  }, 0);
}

/** True when some line offers more than one option, so a choice has to be made. */
export function hasAlternatives(options: OptionLike[]): boolean {
  for (const bucket of groupByLine(options).values()) {
    if (bucket.length > 1) return true;
  }
  return false;
}

/** The `selected_options` payload the server expects: `{ "<line>": <option> }`. */
export function selectionPayload(selection: OptionSelection): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [line, option] of Object.entries(selection)) {
    out[String(line)] = option;
  }
  return out;
}
