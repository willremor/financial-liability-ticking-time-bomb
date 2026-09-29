import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  cumulativeYieldSplit,
  monthlyYield,
  parseIssuerTaxPercent,
  parseSharePercent,
  parseYieldPercent,
  requiredAucUsd,
  retainedYieldPa,
  yieldMonthsElapsed,
} from "./auc"
import { DEFAULT_NZD_PER_USD, buildSchedule, summarize } from "./projection"

describe("stablecoin AUC", () => {
  const schedule = buildSchedule()
  const summary = summarize(schedule)
  const yieldPa = 0.025

  it("counts yield months from August, with today still on September's accrual", () => {
    assert.deepEqual(
      schedule.map((row) => yieldMonthsElapsed(row.isoDate, row.phase)),
      [1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    )
  })

  it("sizes custody so cumulative yield covers the shortfall outstanding that month", () => {
    const cover = (shortfall: number, months: number) =>
      requiredAucUsd(shortfall, yieldPa, 0, months)

    assert.equal(cover(2_500, 1), 1_200_000)
    assert.equal(cover(summary.overdueUsd, 2), 1_200_000)
    assert.equal(cover(summary.overdueUsd, 2) * DEFAULT_NZD_PER_USD, 2_116_800)
    assert.equal(cover(7_800, 3), 1_248_000)
    assert.equal(cover(7_800, 3) * DEFAULT_NZD_PER_USD, 2_201_472)
    const horizon = cover(summary.horizonUsd, 14)
    assert.ok(Math.abs(horizon - (38_600 * 12) / (0.025 * 14)) < 1e-6)
    assert.equal(Math.round(horizon * DEFAULT_NZD_PER_USD), 2_334_528)

    for (const row of schedule) {
      const months = yieldMonthsElapsed(row.isoDate, row.phase)
      const auc = cover(row.totalCumulativeUsd, months)
      const cumulative = monthlyYield(auc, yieldPa) * months
      assert.ok(Math.abs(cumulative - row.totalCumulativeUsd) < 1e-6)
      const split = cumulativeYieldSplit(row.totalCumulativeUsd, 0)
      assert.equal(split.retained, row.totalCumulativeUsd)
      assert.equal(split.incentive, 0)
    }
  })

  it("holds custody flat from the second overdue month through today", () => {
    const september = schedule.find((row) => row.isoDate === "2026-09-01")
    const now = schedule.find((row) => row.phase === "now")
    assert.ok(september && now)
    assert.equal(
      requiredAucUsd(now.totalCumulativeUsd, yieldPa, 0, yieldMonthsElapsed(now.isoDate, now.phase)),
      requiredAucUsd(
        september.totalCumulativeUsd,
        yieldPa,
        0,
        yieldMonthsElapsed(september.isoDate, september.phase),
      ),
    )
  })
})

describe("counterparty yield share", () => {
  const yieldPa = 0.025
  const summary = summarize(buildSchedule())

  it("leaves cumulative yield with NewMoney when nothing is shared", () => {
    assert.equal(retainedYieldPa(yieldPa, 0), yieldPa)
    const split = cumulativeYieldSplit(summary.overdueUsd, 0)
    assert.equal(split.retained, summary.overdueUsd)
    assert.equal(split.incentive, 0)
  })

  it("increases AUC so cumulative retained yield still covers that month's shortfall", () => {
    const share = 0.2
    const monthsToday = 2
    const today = requiredAucUsd(summary.overdueUsd, yieldPa, share, monthsToday)
    const fullYield = requiredAucUsd(summary.overdueUsd, yieldPa, 0, monthsToday)
    assert.equal(Math.round(today), 1_500_000)
    assert.equal(Math.round(today * DEFAULT_NZD_PER_USD), 2_646_000)
    assert.ok(today > fullYield)

    const split = cumulativeYieldSplit(summary.overdueUsd, share)
    assert.equal(split.retained, summary.overdueUsd)
    assert.ok(Math.abs(split.incentive - summary.overdueUsd * (share / (1 - share))) < 1e-6)
    assert.ok(Math.abs(monthlyYield(today, retainedYieldPa(yieldPa, share)) * monthsToday - split.retained) < 1e-4)

    const horizon = requiredAucUsd(summary.horizonUsd, yieldPa, share, 14)
    assert.ok(horizon > requiredAucUsd(summary.horizonUsd, yieldPa, 0, 14))
  })
})

describe("parseSharePercent", () => {
  it("accepts zero and rejects a share that would leave NewMoney no yield", () => {
    assert.equal(parseSharePercent("0"), 0)
    assert.equal(parseSharePercent("20"), 0.2)
    assert.ok(Math.abs((parseSharePercent("99.9") ?? 0) - 0.999) < 1e-12)
    assert.equal(parseSharePercent(""), null)
    assert.equal(parseSharePercent("100"), null)
    assert.equal(parseSharePercent("-5"), null)
  })
})

describe("issuer tax on yield received", () => {
  const yieldPa = 0.025
  const summary = summarize(buildSchedule())
  const tax = 0.28

  it("treats 28 percent as a valid issuer tax and rejects a rate that leaves no net yield", () => {
    assert.equal(parseIssuerTaxPercent("28"), 0.28)
    assert.equal(parseIssuerTaxPercent("0"), 0)
    assert.equal(parseIssuerTaxPercent("100"), null)
    assert.equal(parseIssuerTaxPercent(""), null)
    assert.equal(parseIssuerTaxPercent("-5"), null)
  })

  it("sizes AUC on the yield left after tax on what the issuer receives", () => {
    const monthsToday = 2
    const today = requiredAucUsd(summary.overdueUsd, yieldPa, 0, monthsToday, tax)
    const untaxed = requiredAucUsd(summary.overdueUsd, yieldPa, 0, monthsToday, 0)
    assert.equal(Math.round(today), 1_666_667)
    assert.equal(Math.round(today * DEFAULT_NZD_PER_USD), 2_940_000)
    assert.ok(today > untaxed)

    const split = cumulativeYieldSplit(summary.overdueUsd, 0, tax)
    assert.equal(split.retained, summary.overdueUsd)
    assert.equal(split.incentive, 0)
    assert.ok(Math.abs(split.tax - summary.overdueUsd * (tax / (1 - tax))) < 1e-6)
    assert.ok(
      Math.abs(monthlyYield(today, retainedYieldPa(yieldPa, 0, tax)) * monthsToday - split.retained) < 1e-4,
    )

    const horizon = requiredAucUsd(summary.horizonUsd, yieldPa, 0, 14, tax)
    assert.equal(Math.round(horizon * DEFAULT_NZD_PER_USD), 3_242_400)
  })

  it("takes the counterparty share before tax and still covers that month's shortfall", () => {
    const share = 0.2
    const today = requiredAucUsd(summary.overdueUsd, yieldPa, share, 2, tax)
    const taxOnly = requiredAucUsd(summary.overdueUsd, yieldPa, 0, 2, tax)
    assert.equal(Math.round(today), 2_083_333)
    assert.equal(Math.round(today * DEFAULT_NZD_PER_USD), 3_675_000)
    assert.ok(today > taxOnly)

    const split = cumulativeYieldSplit(summary.overdueUsd, share, tax)
    const gross = summary.overdueUsd / ((1 - share) * (1 - tax))
    assert.equal(split.retained, summary.overdueUsd)
    assert.ok(Math.abs(split.gross - gross) < 1e-6)
    assert.ok(Math.abs(split.incentive - gross * share) < 1e-6)
    assert.ok(Math.abs(split.tax - gross * (1 - share) * tax) < 1e-6)
  })
})

describe("parseYieldPercent", () => {
  it("reads 2.5 percent and rejects empty or non-positive rates", () => {
    assert.equal(parseYieldPercent("2.5"), 0.025)
    assert.equal(parseYieldPercent("2.50"), 0.025)
    assert.equal(parseYieldPercent("100"), 1)
    assert.equal(parseYieldPercent(""), null)
    assert.equal(parseYieldPercent("0"), null)
    assert.equal(parseYieldPercent("101"), null)
    assert.equal(parseYieldPercent("2.5%"), null)
  })
})
