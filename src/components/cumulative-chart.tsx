"use client"

import { useSyncExternalStore } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { brale, fuse, grid, ink, otherTech, paper } from "@/lib/colors"
import { formatAxis, formatMoney, formatNzd, type Currency } from "@/lib/money"
import type { ScheduleRow } from "@/lib/projection"

type ChartPoint = ScheduleRow & {
  brale: number
  other: number
  total: number
}

function AxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: string | number
  y?: string | number
  payload?: { value?: string }
}) {
  const label = payload?.value ?? ""
  const isNow = label === "Now"
  const xPos = typeof x === "number" ? x : Number(x)
  const yPos = typeof y === "number" ? y : Number(y)
  return (
    <text
      x={xPos}
      y={yPos}
      dy={14}
      textAnchor="end"
      fill={isNow ? fuse : "#6b645b"}
      fontSize={isNow ? 12 : 11}
      fontWeight={isNow ? 700 : 500}
      transform={`rotate(-40, ${xPos}, ${yPos})`}
    >
      {label}
    </text>
  )
}

function TotalDot({
  cx,
  cy,
  payload,
}: {
  cx?: number
  cy?: number
  payload?: ChartPoint
}) {
  if (cx == null || cy == null || !payload) return null
  if (payload.phase === "now") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={9} fill={paper} stroke={fuse} strokeWidth={2} />
        <circle className="fuse-pulse" cx={cx} cy={cy} r={3.5} fill={fuse} />
      </g>
    )
  }
  if (payload.phase === "overdue") {
    return <circle cx={cx} cy={cy} r={3} fill={fuse} />
  }
  return <circle cx={cx} cy={cy} r={2.5} fill={ink} />
}

function ChartTooltip({
  active,
  payload,
  nzdPerUsd,
}: {
  active?: boolean
  payload?: Array<{ payload?: ChartPoint }>
  nzdPerUsd: number | null
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  const added = point.braleAddedUsd + point.otherAddedUsd

  return (
    <div className="min-w-52 rounded-lg border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-md">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {point.phase === "now" ? "Now" : point.heading}
      </p>
      <p className="mt-1 font-mono text-lg leading-none">{formatMoney(point.totalCumulativeUsd, "USD")}</p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">
        {formatNzd(point.totalCumulativeUsd, nzdPerUsd)}
      </p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-6">
          <dt>Cumulative Brale</dt>
          <dd className="font-mono">{formatMoney(point.braleCumulativeUsd, "USD")}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Cumulative other tech</dt>
          <dd className="font-mono">{formatMoney(point.otherCumulativeUsd, "USD")}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-border pt-1.5">
          <dt>Added this month</dt>
          <dd className="font-mono">{added === 0 ? "—" : formatMoney(added, "USD")}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{point.note}</p>
    </div>
  )
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function Swatch({ kind }: { kind: "brale" | "other" | "total" | "now" }) {
  if (kind === "total") {
    return <span className="inline-block h-0.5 w-4 bg-[#1a1714]" />
  }
  if (kind === "now") {
    return <span className="inline-block h-4 w-0.5 bg-[#b4331a]" />
  }
  if (kind === "other") {
    return (
      <span
        className="inline-block size-3 rounded-[3px]"
        style={{
          backgroundColor: otherTech,
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(246,241,231,0.75) 2px, rgba(246,241,231,0.75) 3.5px)",
        }}
      />
    )
  }
  return <span className="inline-block size-3 rounded-[3px]" style={{ backgroundColor: brale }} />
}

export function CumulativeChart({
  schedule,
  currency,
  nzdPerUsd,
}: {
  schedule: ScheduleRow[]
  currency: Currency
  nzdPerUsd: number | null
}) {
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false)

  const factor = currency === "NZD" ? nzdPerUsd : 1
  const data: ChartPoint[] =
    factor == null
      ? []
      : schedule.map((row) => ({
          ...row,
          brale: row.braleCumulativeUsd * factor,
          other: row.otherCumulativeUsd * factor,
          total: row.totalCumulativeUsd * factor,
        }))

  const firstLabel = schedule[0]?.axisLabel ?? ""

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="h-[420px] min-w-[680px]">
          {factor != null ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 28, right: 12, left: 4, bottom: 8 }}>
                <defs>
                  <pattern id="other-tech-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill={otherTech} />
                    <path d="M-2 8 L8 -2 M-2 2 L2 -2" stroke={paper} strokeWidth="1.6" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke={grid} />
                <ReferenceArea x1={firstLabel} x2="Now" fill={fuse} fillOpacity={0.07} strokeOpacity={0} />
                <XAxis
                  dataKey="axisLabel"
                  tick={AxisTick}
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: grid }}
                  height={64}
                />
                <YAxis
                  tickFormatter={(value: number) => formatAxis(value, currency)}
                  width={currency === "NZD" ? 72 : 56}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b645b", fontSize: 11 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(26,23,20,0.04)" }}
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      payload={
                        props.payload as unknown as Array<{ payload?: ChartPoint }> | undefined
                      }
                      nzdPerUsd={nzdPerUsd}
                    />
                  )}
                />
                <Bar
                  dataKey="brale"
                  name="Cumulative Brale"
                  stackId="liability"
                  fill={brale}
                  maxBarSize={46}
                  isAnimationActive={!reduceMotion}
                />
                <Bar
                  dataKey="other"
                  name="Cumulative other tech"
                  stackId="liability"
                  fill="url(#other-tech-hatch)"
                  maxBarSize={46}
                  isAnimationActive={!reduceMotion}
                />
                <Line
                  dataKey="total"
                  name="Cumulative total"
                  stroke={ink}
                  strokeWidth={2.25}
                  dot={TotalDot}
                  activeDot={{ r: 5, fill: ink }}
                  isAnimationActive={!reduceMotion}
                />
                <ReferenceLine
                  x="Now"
                  stroke={fuse}
                  strokeWidth={2}
                  label={{
                    value: "Now",
                    position: "top",
                    fill: fuse,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center text-sm text-destructive">
              Enter a USD to NZD rate above zero to plot the stack in New Zealand dollars.
            </p>
          )}
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-2">
          <Swatch kind="brale" /> Cumulative Brale
        </li>
        <li className="inline-flex items-center gap-2">
          <Swatch kind="other" /> Cumulative other tech
        </li>
        <li className="inline-flex items-center gap-2">
          <Swatch kind="total" /> Cumulative total
        </li>
        <li className="inline-flex items-center gap-2">
          <Swatch kind="now" /> Now · 29 Sep 2026
        </li>
      </ul>
    </div>
  )
}
