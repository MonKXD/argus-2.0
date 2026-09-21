/**
 * Money, percent, date and number formatting, via `Intl` only (R-COD-05).
 * Nothing outside this file should call `Intl.*` or `toLocaleString`
 * directly for display.
 */

const DEFAULT_LOCALE = "en-US";

/**
 * `amountBaseUnits` is the integer amount in the currency's smallest unit
 * (e.g. cents for USD), matching how Money facts are stored (R-DAT-07,
 * SCHEMA section 8). `Intl`'s currency-default fraction digits (2 for USD,
 * 0 for JPY, 3 for KWD, ...) give the base-unit exponent, so no per-currency
 * table is needed here.
 */
export function formatMoney(
  amountBaseUnits: number,
  currencyCode: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  });
  // Always present for style: "currency"; the DOM lib types it optional
  // because it's shared with other NumberFormat styles.
  const { maximumFractionDigits = 2 } = formatter.resolvedOptions();
  const majorUnits = amountBaseUnits / 10 ** maximumFractionDigits;
  return formatter.format(majorUnits);
}

/** `value` is 0 to 100 (R-DAT-07), not a 0-to-1 fraction. */
export function formatPercent(
  value: number,
  options: Pick<Intl.NumberFormatOptions, "maximumFractionDigits" | "minimumFractionDigits"> = {},
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    minimumFractionDigits: options.minimumFractionDigits,
  }).format(value / 100);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  date: Date | number | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale: string = DEFAULT_LOCALE,
): string {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function formatDuration(milliseconds: number, locale: string = DEFAULT_LOCALE): string {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) {
    return new Intl.NumberFormat(locale, { style: "unit", unit: "second" }).format(seconds);
  }
  const minutes = Math.round(seconds / 60);
  return new Intl.NumberFormat(locale, { style: "unit", unit: "minute" }).format(minutes);
}
