export const DEFAULT_YIELD_PERCENT = 2.5

export function parseYieldPercent(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const percent = Number(trimmed)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null
  return percent / 100
}

/** Custody whose full-year yield equals the outstanding shortfall. */
export function requiredAucUsd(shortfallUsd: number, yieldPa: number) {
  return shortfallUsd / yieldPa
}

/** One twelfth of the annual yield. Simple accrual, not compounded. */
export function monthlyYield(principal: number, yieldPa: number) {
  return (principal * yieldPa) / 12
}

/** Custody whose monthly yield equals one month of new liability. */
export function runRateAucUsd(monthlyLiabilityUsd: number, yieldPa: number) {
  return monthlyLiabilityUsd / (yieldPa / 12)
}
