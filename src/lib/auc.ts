export const DEFAULT_YIELD_PERCENT = 2.5
export const DEFAULT_COUNTERPARTY_SHARE_PERCENT = 0

export function parseYieldPercent(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const percent = Number(trimmed)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null
  return percent / 100
}

/** Share of gross yield paid to counterparties. 100% would leave NewMoney with nothing. */
export function parseSharePercent(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const percent = Number(trimmed)
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null
  return percent / 100
}

export function retainedYieldPa(grossYieldPa: number, counterpartyShare: number) {
  return grossYieldPa * (1 - counterpartyShare)
}

/**
 * Posting months of yield accrued by this row. August 2026 is month 1.
 * The 29 Sep snapshot does not add a further accrual beyond 1 Sep.
 */
export function yieldMonthsElapsed(isoDate: string, phase: "overdue" | "now" | "projected") {
  if (phase === "now") return 2
  const [year, month] = isoDate.split("-").map(Number)
  return (year - 2026) * 12 + (month - 8) + 1
}

/**
 * Custody whose cumulative retained yield, over the months already elapsed,
 * equals the shortfall outstanding in that month.
 */
export function requiredAucUsd(
  shortfallUsd: number,
  grossYieldPa: number,
  counterpartyShare: number,
  monthsElapsed: number,
) {
  return shortfallUsd / (retainedYieldPa(grossYieldPa, counterpartyShare) * (monthsElapsed / 12))
}

/** Cumulative yield that covers this month's existing shortfall. NewMoney's portion equals the shortfall. */
export function cumulativeYieldSplit(shortfallUsd: number, counterpartyShare: number) {
  const retained = shortfallUsd
  const gross = counterpartyShare === 0 ? retained : retained / (1 - counterpartyShare)
  return {
    gross,
    incentive: gross - retained,
    retained,
  }
}

/** One twelfth of the annual yield. Simple accrual, not compounded. */
export function monthlyYield(principal: number, yieldPa: number) {
  return (principal * yieldPa) / 12
}

export function monthlyYieldSplit(
  principal: number,
  grossYieldPa: number,
  counterpartyShare: number,
) {
  const gross = monthlyYield(principal, grossYieldPa)
  const incentive = gross * counterpartyShare
  return {
    gross,
    incentive,
    retained: gross - incentive,
  }
}

