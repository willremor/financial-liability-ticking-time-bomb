import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseNzdPerUsd } from "./money"
import {
  DEFAULT_NZD_PER_USD,
  buildSchedule,
  summarize,
  usdToNzd,
} from "./projection"

describe("buildSchedule", () => {
  const schedule = buildSchedule()
  const summary = summarize(schedule)

  it("places two overdue Brale cycles before today and twelve months after", () => {
    assert.deepEqual(
      schedule.filter((row) => row.phase === "overdue").map((row) => row.isoDate),
      ["2026-08-01", "2026-09-01"],
    )
    assert.equal(schedule.find((row) => row.phase === "now")?.isoDate, "2026-09-29")
    assert.deepEqual(
      schedule.filter((row) => row.phase === "projected").map((row) => row.isoDate),
      [
        "2026-10-01",
        "2026-11-01",
        "2026-12-01",
        "2027-01-01",
        "2027-02-01",
        "2027-03-01",
        "2027-04-01",
        "2027-05-01",
        "2027-06-01",
        "2027-07-01",
        "2027-08-01",
        "2027-09-01",
      ],
    )
    assert.equal(summary.projectedMonths, 12)
  })

  it("keeps a single Now label for the timeline marker", () => {
    assert.deepEqual(
      schedule.map((row) => row.axisLabel),
      [
        "Aug '26",
        "Sep '26",
        "Now",
        "Oct",
        "Nov",
        "Dec",
        "Jan '27",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep '27",
      ],
    )
  })

  it("stacks Brale and other tech into a cumulative total", () => {
    let brale = 0
    let other = 0
    for (const row of schedule) {
      brale += row.braleAddedUsd
      other += row.otherAddedUsd
      assert.equal(row.braleCumulativeUsd, brale)
      assert.equal(row.otherCumulativeUsd, other)
      assert.equal(row.totalCumulativeUsd, brale + other)
    }
  })

  it("holds the overdue balance flat on the snapshot, then adds both layers monthly", () => {
    const now = summary.now
    assert.equal(now.braleCumulativeUsd, 5_000)
    assert.equal(now.otherCumulativeUsd, 0)
    assert.equal(now.totalCumulativeUsd, 5_000)
    assert.equal(now.braleAddedUsd + now.otherAddedUsd, 0)

    const october = schedule.find((row) => row.isoDate === "2026-10-01")
    assert.ok(october)
    assert.equal(october.braleAddedUsd, 2_500)
    assert.equal(october.otherAddedUsd, 300)
    assert.equal(october.braleCumulativeUsd, 7_500)
    assert.equal(october.otherCumulativeUsd, 300)
    assert.equal(october.totalCumulativeUsd, 7_800)

    assert.equal(summary.overdueUsd, 5_000)
    assert.equal(summary.monthlyTotalUsd, 2_800)
    assert.equal(summary.addedNext12Usd, 33_600)
    assert.equal(summary.horizonBraleUsd, 35_000)
    assert.equal(summary.horizonOtherUsd, 3_600)
    assert.equal(summary.horizonUsd, 38_600)
    assert.equal(summary.horizon.isoDate, "2027-09-01")
  })

  it("converts the horizon and the opening balance at the 29 Sep 2026 spot", () => {
    assert.equal(usdToNzd(5_000, DEFAULT_NZD_PER_USD), 8_820)
    assert.equal(usdToNzd(2_800, DEFAULT_NZD_PER_USD), 4_939.2)
    assert.equal(usdToNzd(33_600, DEFAULT_NZD_PER_USD), 59_270.4)
    assert.equal(usdToNzd(38_600, DEFAULT_NZD_PER_USD), 68_090.4)
  })
})

describe("parseNzdPerUsd", () => {
  it("accepts the spot rate and rejects empty or out-of-range input", () => {
    assert.equal(parseNzdPerUsd("1.7640"), 1.764)
    assert.equal(parseNzdPerUsd("1"), 1)
    assert.equal(parseNzdPerUsd(""), null)
    assert.equal(parseNzdPerUsd("0"), null)
    assert.equal(parseNzdPerUsd("-1"), null)
    assert.equal(parseNzdPerUsd("5.1"), null)
    assert.equal(parseNzdPerUsd("abc"), null)
  })
})
