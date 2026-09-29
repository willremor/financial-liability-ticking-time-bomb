export type Currency = "USD" | "NZD"

export function parseNzdPerUsd(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const rate = Number(trimmed)
  if (!Number.isFinite(rate) || rate <= 0 || rate > 5) return null
  return rate
}

export function formatMoney(amount: number, currency: Currency) {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005
  const digits = currency === "NZD" || !whole ? 2 : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

export function formatNzd(usd: number, nzdPerUsd: number | null) {
  if (nzdPerUsd == null) return "—"
  return formatMoney(usd * nzdPerUsd, "NZD")
}

export function formatAxis(value: number, currency: Currency) {
  const sign = currency === "USD" ? "$" : "NZ$"
  const abs = Math.abs(value)
  if (abs >= 1000) {
    const scaled = value / 1000
    const digits = Math.abs(scaled) >= 10 ? 0 : 1
    return `${sign}${scaled.toFixed(digits)}k`
  }
  return `${sign}${Math.round(value)}`
}
