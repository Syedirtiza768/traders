const PRINT_RETURN_PATHS = new Set(['/sales/pos']);

/** Only allow return destinations that are part of the print workflow. */
export function getSafePrintReturnPath(candidate: string | null): string {
  return candidate && PRINT_RETURN_PATHS.has(candidate) ? candidate : '';
}
