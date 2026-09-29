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
 * Custody whose full-year yield, after the counterparty share, equals the shortfall.
 * A larger share leaves NewMoney less yield per dollar of AUC, so the balance rises.
 */
export function requiredAucUsd(
  shortfallUsd: number,
  grossYieldPa: number,
  counterpartyShare = 0,
) {
  return shortfallUsd / retainedYieldPa(grossYieldPa, counterpartyShare)
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

/** Custody whose monthly yield, after the counterparty share, equals one month of new liability. */
export function runRateAucUsd(
  monthlyLiabilityUsd: number,
  grossYieldPa: number,
  counterpartyShare = 0,
) {
  return monthlyLiabilityUsd / (retainedYieldPa(grossYieldPa, counterpartyShare) / 12)
}
