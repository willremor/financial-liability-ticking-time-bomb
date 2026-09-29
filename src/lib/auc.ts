export const DEFAULT_YIELD_PERCENT = 2.5
export const DEFAULT_COUNTERPARTY_SHARE_PERCENT = 0
/** New Zealand company tax rate. The issuer pays this on yield it receives. */
export const DEFAULT_ISSUER_TAX_PERCENT = 28

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

/** Tax on yield the issuer receives. 100% would leave NewMoney with nothing. */
export function parseIssuerTaxPercent(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const percent = Number(trimmed)
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null
  return percent / 100
}

/**
 * Yield NewMoney keeps. Counterparties take their share of the gross yield first.
 * The issuer then pays tax on the yield it receives.
 */
export function retainedYieldPa(
  grossYieldPa: number,
  counterpartyShare: number,
  issuerTax = 0,
) {
  return grossYieldPa * (1 - counterpartyShare) * (1 - issuerTax)
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
 * Custody whose cumulative net yield, over the months already elapsed,
 * equals the shortfall outstanding in that month. Net yield is what remains
 * after the counterparty share and tax on the yield the issuer receives.
 */
export function requiredAucUsd(
  shortfallUsd: number,
  grossYieldPa: number,
  counterpartyShare: number,
  monthsElapsed: number,
  issuerTax = 0,
) {
  return (
    shortfallUsd / (retainedYieldPa(grossYieldPa, counterpartyShare, issuerTax) * (monthsElapsed / 12))
  )
}

/**
 * Cumulative yield that covers this month's existing shortfall.
 * NewMoney's net portion equals the shortfall. Tax is charged on the yield
 * the issuer receives after the counterparty incentive.
 */
export function cumulativeYieldSplit(
  shortfallUsd: number,
  counterpartyShare: number,
  issuerTax = 0,
) {
  const retained = shortfallUsd
  const received = issuerTax === 0 ? retained : retained / (1 - issuerTax)
  const gross = counterpartyShare === 0 ? received : received / (1 - counterpartyShare)
  return {
    gross,
    incentive: gross - received,
    tax: received - retained,
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
  issuerTax = 0,
) {
  const gross = monthlyYield(principal, grossYieldPa)
  const incentive = gross * counterpartyShare
  const received = gross - incentive
  const tax = received * issuerTax
  return {
    gross,
    incentive,
    tax,
    retained: received - tax,
  }
}

