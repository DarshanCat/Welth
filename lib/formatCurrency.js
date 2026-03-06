import { getCurrencyByCode } from "@/data/currencies";

/**
 * Format an amount in any supported currency.
 * Falls back to INR if the currency code is unknown.
 *
 * @param {number|string} amount
 * @param {string} currencyCode  e.g. "INR", "USD", "EUR"
 * @returns {string}  e.g. "₹1,23,456.78" or "$1,234.56"
 */
export function formatCurrency(amount, currencyCode = "INR") {
  if (amount == null) return formatCurrency(0, currencyCode);

  const { code, locale } = getCurrencyByCode(currencyCode);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

// ─── Backward-compatible alias (existing code uses formatINR) ───────────────
export function formatINR(amount) {
  return formatCurrency(amount, "INR");
}
