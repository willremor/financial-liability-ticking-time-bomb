import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  monthlyYield,
  parseYieldPercent,
  requiredAucUsd,
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
