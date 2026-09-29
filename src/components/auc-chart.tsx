"use client"

import { useSyncExternalStore } from "react"
import {
  Area,
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
import { custody, fuse, grid, ink, paper } from "@/lib/colors"
import { formatAxis, formatMoney, type Currency } from "@/lib/money"
import type { ScheduleRow } from "@/lib/projection"

type ChartPoint = ScheduleRow & {
  auc: number
  aucUsd: number
  aucNzd: number
  keptUsd: number
  keptNzd: number
  taxUsd: number
  taxNzd: number
  incentiveUsd: number
  incentiveNzd: number
  shortfallNzd: number
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
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

function AucDot({
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
  return <circle cx={cx} cy={cy} r={2.5} fill={custody} />
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: ChartPoint }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="min-w-56 rounded-lg border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-md">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {point.phase === "now" ? "Now" : point.heading}
      </p>
      <p className="mt-1 font-mono text-lg leading-none">{formatMoney(point.aucNzd, "NZD")}</p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">{formatMoney(point.aucUsd, "USD")}</p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-6">
          <dt>Shortfall</dt>
          <dd className="text-right font-mono">
            {formatMoney(point.totalCumulativeUsd, "USD")}
            <span className="block text-muted-foreground">{formatMoney(point.shortfallNzd, "NZD")}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-border pt-1.5">
          <dt>Cumulative net yield</dt>
          <dd className="text-right font-mono">
            {formatMoney(point.keptNzd, "NZD")}
            <span className="block text-muted-foreground">{formatMoney(point.keptUsd, "USD")}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Tax on yield received</dt>
          <dd className="text-right font-mono">
            {formatMoney(point.taxNzd, "NZD")}
            <span className="block text-muted-foreground">{formatMoney(point.taxUsd, "USD")}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Cumulative yield shared</dt>
          <dd className="text-right font-mono">
            {formatMoney(point.incentiveNzd, "NZD")}
            <span className="block text-muted-foreground">{formatMoney(point.incentiveUsd, "USD")}</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function AucChart({
  points,
  currency,
}: {
  points: ChartPoint[]
  currency: Currency
}) {
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false)
  const firstLabel = points[0]?.axisLabel ?? ""

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="h-[420px] min-w-[680px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 28, right: 12, left: 4, bottom: 8 }}>
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
                width={currency === "NZD" ? 76 : 64}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b645b", fontSize: 11 }}
                domain={[0, "auto"]}
              />
              <Tooltip
                cursor={{ fill: "rgba(29,78,137,0.06)" }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload as unknown as Array<{ payload?: ChartPoint }> | undefined}
                  />
                )}
              />
              <Area
                dataKey="auc"
                name="Required AUC"
                fill={custody}
                fillOpacity={0.22}
                stroke="none"
                isAnimationActive={!reduceMotion}
              />
              <Line
                dataKey="auc"
                name="Required AUC"
                stroke={ink}
                strokeWidth={2.25}
                dot={AucDot}
                activeDot={{ r: 5, fill: custody }}
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
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-4 rounded-[3px]" style={{ backgroundColor: custody, opacity: 0.35 }} />
          Required stablecoin AUC
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-0.5 bg-[#b4331a]" /> Now · 29 Sep 2026
        </li>
      </ul>
    </div>
  )
}
