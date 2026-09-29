import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  monthlyYield,
  monthlyYieldSplit,
  parseSharePercent,
  parseYieldPercent,
  requiredAucUsd,
  retainedYieldPa,
  runRateAucUsd,
} from "./auc"
import { DEFAULT_NZD_PER_USD, buildSchedule, summarize } from "./projection"

describe("stablecoin AUC", () => {
  const schedule = buildSchedule()
  const summary = summarize(schedule)
  const yieldPa = 0.025

  it("sizes custody so a year of 2.5% yield equals the shortfall", () => {
    assert.equal(requiredAucUsd(summary.overdueUsd, yieldPa), 200_000)
    assert.equal(requiredAucUsd(summary.overdueUsd, yieldPa) * DEFAULT_NZD_PER_USD, 352_800)
    assert.equal(requiredAucUsd(summary.horizonUsd, yieldPa), 1_544_000)
    assert.equal(
      requiredAucUsd(summary.horizonUsd, yieldPa) * DEFAULT_NZD_PER_USD,
      2_723_616,
    )
    assert.equal(requiredAucUsd(7_800, yieldPa), 312_000)
  })

  it("accrues the annual yield in twelve simple monthly parts", () => {
    const aucUsd = requiredAucUsd(summary.overdueUsd, yieldPa)
    assert.equal(monthlyYield(aucUsd, yieldPa), summary.overdueUsd / 12)
    assert.equal(
      monthlyYield(aucUsd * DEFAULT_NZD_PER_USD, yieldPa),
      (summary.overdueUsd * DEFAULT_NZD_PER_USD) / 12,
    )
  })

  it("sizes a flat balance whose monthly yield pays the $2,800 stack", () => {
    assert.equal(runRateAucUsd(summary.monthlyTotalUsd, yieldPa), 1_344_000)
    assert.equal(runRateAucUsd(summary.monthlyTotalUsd, yieldPa) * DEFAULT_NZD_PER_USD, 2_370_816)
  })

  it("raises required custody every time the cumulative shortfall rises", () => {
    let previous = 0
    for (const row of schedule) {
      const auc = requiredAucUsd(row.totalCumulativeUsd, yieldPa)
      assert.equal(auc * yieldPa, row.totalCumulativeUsd)
      if (row.phase !== "now") assert.ok(auc > previous)
      previous = auc
    }
    const now = schedule.find((row) => row.phase === "now")
    const september = schedule.find((row) => row.isoDate === "2026-09-01")
    assert.equal(
      requiredAucUsd(now?.totalCumulativeUsd ?? 0, yieldPa),
      requiredAucUsd(september?.totalCumulativeUsd ?? 0, yieldPa),
    )
  })
})

describe("counterparty yield share", () => {
  const yieldPa = 0.025
  const summary = summarize(buildSchedule())

  it("leaves the full yield with NewMoney when nothing is shared", () => {
    assert.equal(retainedYieldPa(yieldPa, 0), yieldPa)
    assert.equal(requiredAucUsd(summary.overdueUsd, yieldPa, 0), 200_000)
    const split = monthlyYieldSplit(200_000, yieldPa, 0)
    assert.equal(split.incentive, 0)
    assert.equal(split.retained, summary.overdueUsd / 12)
  })

  it("increases AUC so the yield NewMoney keeps still covers the shortfall", () => {
    const share = 0.2
    assert.ok(Math.abs(retainedYieldPa(yieldPa, share) - 0.02) < 1e-12)
    const today = requiredAucUsd(summary.overdueUsd, yieldPa, share)
    assert.equal(Math.round(today), 250_000)
    assert.equal(Math.round(today * DEFAULT_NZD_PER_USD), 441_000)
    assert.equal(Math.round(requiredAucUsd(summary.horizonUsd, yieldPa, share)), 1_930_000)

    const split = monthlyYieldSplit(today, yieldPa, share)
    assert.ok(Math.abs(split.retained - summary.overdueUsd / 12) < 1e-6)
    assert.ok(Math.abs(split.incentive - split.gross * share) < 1e-6)
    assert.ok(split.incentive > 0)
    assert.ok(today > requiredAucUsd(summary.overdueUsd, yieldPa, 0))

    assert.equal(Math.round(runRateAucUsd(summary.monthlyTotalUsd, yieldPa, share)), 1_680_000)
    assert.equal(requiredAucUsd(summary.overdueUsd, yieldPa, 0.5), 400_000)
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
