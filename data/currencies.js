export const SUPPORTED_CURRENCIES = [
  { code: "INR", name: "Indian Rupee",      symbol: "₹",  locale: "en-IN" },
  { code: "USD", name: "US Dollar",          symbol: "$",  locale: "en-US" },
  { code: "EUR", name: "Euro",               symbol: "€",  locale: "de-DE" },
  { code: "GBP", name: "British Pound",      symbol: "£",  locale: "en-GB" },
  { code: "JPY", name: "Japanese Yen",       symbol: "¥",  locale: "ja-JP" },
  { code: "AUD", name: "Australian Dollar",  symbol: "A$", locale: "en-AU" },
  { code: "CAD", name: "Canadian Dollar",    symbol: "C$", locale: "en-CA" },
  { code: "SGD", name: "Singapore Dollar",   symbol: "S$", locale: "en-SG" },
  { code: "AED", name: "UAE Dirham",         symbol: "د.إ",locale: "ar-AE" },
  { code: "CHF", name: "Swiss Franc",        symbol: "Fr", locale: "de-CH" },
];

export const DEFAULT_CURRENCY = "INR";

export function getCurrencyByCode(code) {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ||
    SUPPORTED_CURRENCIES[0]
  );
}
