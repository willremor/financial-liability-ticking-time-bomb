export const SNAPSHOT_ISO = "2026-09-29"
export const SNAPSHOT_LABEL = "29 September 2026"
export const DEFAULT_NZD_PER_USD = 1.764

export const BRALE_CYCLE_USD = 2_500
export const OTHER_TECH_CYCLE_USD = 300
export const PROJECTION_MONTHS = 12

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export type Phase = "overdue" | "now" | "projected"

export type ScheduleRow = {
  id: string
  isoDate: string
  axisLabel: string
  heading: string
  phase: Phase
  note: string
  braleAddedUsd: number
  otherAddedUsd: number
  braleCumulativeUsd: number
  otherCumulativeUsd: number
  totalCumulativeUsd: number
}

type Draft = Omit<
  ScheduleRow,
  "braleCumulativeUsd" | "otherCumulativeUsd" | "totalCumulativeUsd"
>

function isoDate(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0")
  const date = String(day).padStart(2, "0")
  return `${year}-${month}-${date}`
}

function monthLabel(year: number, monthIndex: number, withYear: boolean) {
  const name = MONTHS[monthIndex]
  return withYear ? `${name} '${String(year).slice(2)}` : name
}

function longDate(year: number, monthIndex: number, day: number) {
  return `${day} ${MONTHS[monthIndex]} ${year}`
}

function accumulate(drafts: Draft[]): ScheduleRow[] {
  let brale = 0
  let other = 0

  return drafts.map((draft) => {
    brale += draft.braleAddedUsd
    other += draft.otherAddedUsd
    return {
      ...draft,
      braleCumulativeUsd: brale,
      otherCumulativeUsd: other,
      totalCumulativeUsd: brale + other,
    }
  })
}

/**
 * Past-due Brale cycles sit on 1 Aug and 1 Sep 2026, the two monthly
 * postings already behind the 29 Sep 2026 snapshot. The forward window
 * is the next 12 month-starts, 1 Oct 2026 through 1 Sep 2027.
 */
export function buildSchedule(): ScheduleRow[] {
  const overdue: Array<[number, number]> = [
    [2026, 7],
    [2026, 8],
  ]

  const drafts: Draft[] = overdue.map(([year, monthIndex]) => ({
    id: isoDate(year, monthIndex, 1),
    isoDate: isoDate(year, monthIndex, 1),
    axisLabel: monthLabel(year, monthIndex, true),
    heading: longDate(year, monthIndex, 1),
    phase: "overdue",
    note: "Unpaid Brale tokenisation cycle.",
    braleAddedUsd: BRALE_CYCLE_USD,
    otherAddedUsd: 0,
  }))

  drafts.push({
    id: "now",
    isoDate: SNAPSHOT_ISO,
    axisLabel: "Now",
    heading: SNAPSHOT_LABEL,
    phase: "now",
    note: "Snapshot. No new posting today. Both Brale cycles are already past due.",
    braleAddedUsd: 0,
    otherAddedUsd: 0,
  })

  for (let index = 0; index < PROJECTION_MONTHS; index += 1) {
    const monthIndex = (9 + index) % 12
    const year = 2026 + Math.floor((9 + index) / 12)
    const last = index === PROJECTION_MONTHS - 1
    drafts.push({
      id: isoDate(year, monthIndex, 1),
      isoDate: isoDate(year, monthIndex, 1),
      axisLabel: monthLabel(year, monthIndex, monthIndex === 0 || last),
      heading: longDate(year, monthIndex, 1),
      phase: "projected",
      note: "Brale tokenisation plus other tech spend.",
      braleAddedUsd: BRALE_CYCLE_USD,
      otherAddedUsd: OTHER_TECH_CYCLE_USD,
    })
  }

  return accumulate(drafts)
}

export function summarize(schedule: ScheduleRow[]) {
  const now = schedule.find((row) => row.phase === "now")
  const horizon = schedule.at(-1)
  if (!now || !horizon) {
    throw new Error("Schedule is missing the snapshot or the horizon.")
  }

  const projected = schedule.filter((row) => row.phase === "projected")
  const addedBraleUsd = projected.reduce((sum, row) => sum + row.braleAddedUsd, 0)
  const addedOtherUsd = projected.reduce((sum, row) => sum + row.otherAddedUsd, 0)

  return {
    now,
    horizon,
    overdueUsd: now.totalCumulativeUsd,
    monthlyBraleUsd: BRALE_CYCLE_USD,
    monthlyOtherUsd: OTHER_TECH_CYCLE_USD,
    monthlyTotalUsd: BRALE_CYCLE_USD + OTHER_TECH_CYCLE_USD,
    addedNext12Usd: addedBraleUsd + addedOtherUsd,
    addedBraleUsd,
    addedOtherUsd,
    horizonUsd: horizon.totalCumulativeUsd,
    horizonBraleUsd: horizon.braleCumulativeUsd,
    horizonOtherUsd: horizon.otherCumulativeUsd,
    projectedMonths: projected.length,
  }
}

export function usdToNzd(usd: number, nzdPerUsd: number) {
  return usd * nzdPerUsd
}
