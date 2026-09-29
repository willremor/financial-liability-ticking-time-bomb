"use client"

import { useMemo, useState } from "react"
import { AucChart } from "@/components/auc-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_YIELD_PERCENT,
  monthlyYield,
  parseYieldPercent,
  requiredAucUsd,
  runRateAucUsd,
} from "@/lib/auc"
import { formatMoney, type Currency } from "@/lib/money"
import { BRALE_CYCLE_USD, OTHER_TECH_CYCLE_USD, SNAPSHOT_LABEL, type ScheduleRow } from "@/lib/projection"

function DualMoney({ usd, nzd }: { usd: number | null; nzd: number | null }) {
  return (
    <div>
      <p className="font-mono text-3xl tracking-tight text-[#1d4e89]">
        {nzd == null ? "—" : formatMoney(nzd, "NZD")}
      </p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">
        {usd == null ? "—" : formatMoney(usd, "USD")}
      </p>
    </div>
  )
}

function statusLabel(phase: ScheduleRow["phase"]) {
  if (phase === "overdue") return "Past due"
  if (phase === "now") return "Now"
  return "Projected"
}

export function AucSection({
  schedule,
  currency,
  nzdPerUsd,
  onCurrencyChange,
}: {
  schedule: ScheduleRow[]
  currency: Currency
  nzdPerUsd: number | null
  onCurrencyChange: (currency: Currency) => void
}) {
  const [yieldInput, setYieldInput] = useState(DEFAULT_YIELD_PERCENT.toFixed(1))
  const yieldPa = parseYieldPercent(yieldInput)
  const ready = nzdPerUsd != null && yieldPa != null

  const rows = useMemo(() => {
    return schedule.map((row) => {
      if (nzdPerUsd == null || yieldPa == null) {
        return {
          ...row,
          aucUsd: null,
          aucNzd: null,
          yieldUsd: null,
          yieldNzd: null,
          shortfallNzd: null,
          auc: 0,
        }
      }
      const aucUsd = requiredAucUsd(row.totalCumulativeUsd, yieldPa)
      const aucNzd = aucUsd * nzdPerUsd
      return {
        ...row,
        aucUsd,
        aucNzd,
        yieldUsd: monthlyYield(aucUsd, yieldPa),
        yieldNzd: monthlyYield(aucNzd, yieldPa),
        shortfallNzd: row.totalCumulativeUsd * nzdPerUsd,
        auc: currency === "NZD" ? aucNzd : aucUsd,
      }
    })
  }, [currency, nzdPerUsd, schedule, yieldPa])

  const chartPoints = rows.flatMap((row) => {
    if (
      row.aucUsd == null ||
      row.aucNzd == null ||
      row.yieldUsd == null ||
      row.yieldNzd == null ||
      row.shortfallNzd == null
    ) {
      return []
    }
    return [
      {
        ...row,
        aucUsd: row.aucUsd,
        aucNzd: row.aucNzd,
        yieldUsd: row.yieldUsd,
        yieldNzd: row.yieldNzd,
        shortfallNzd: row.shortfallNzd,
      },
    ]
  })

  const now = rows.find((row) => row.phase === "now")
  const horizon = rows.at(-1)
  const runRateUsd =
    ready && yieldPa != null ? runRateAucUsd(BRALE_CYCLE_USD + OTHER_TECH_CYCLE_USD, yieldPa) : null
  const runRateNzd = runRateUsd != null && nzdPerUsd != null ? runRateUsd * nzdPerUsd : null
  const yieldLabel = yieldPa == null ? "the annual yield" : `${(yieldPa * 100).toFixed(2)}%`

  return (
    <Card>
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <CardTitle id="auc-heading" className="font-heading text-2xl tracking-tight">
            Stablecoin AUC to cover the shortfall
          </CardTitle>
          <CardDescription className="mt-2 text-sm leading-6">
            {now &&
            horizon &&
            now.shortfallNzd != null &&
            now.aucNzd != null &&
            horizon.aucNzd != null &&
            horizon.aucUsd != null ? (
              <>
                On {SNAPSHOT_LABEL} the shortfall is {formatMoney(now.totalCumulativeUsd, "USD")} (
                {formatMoney(now.shortfallNzd, "NZD")}). A year of {yieldLabel} yield on{" "}
                {formatMoney(now.aucNzd, "NZD")} of NZD stablecoin matches that balance. By 1 Sep 2027
                the same rule calls for {formatMoney(horizon.aucNzd, "NZD")} (
                {formatMoney(horizon.aucUsd, "USD")}).
              </>
            ) : (
              <>Enter a spot rate and a yield above zero to size assets under custody.</>
            )}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <div className="w-full sm:w-44">
            <label
              htmlFor="yield-rate"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Stablecoin yield
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="yield-rate"
                inputMode="decimal"
                value={yieldInput}
                aria-invalid={yieldPa == null}
                aria-describedby="yield-rate-hint"
                onChange={(event) => setYieldInput(event.target.value)}
                className="font-mono"
              />
              <span className="text-sm text-muted-foreground">% p.a.</span>
            </div>
            <p
              id="yield-rate-hint"
              className={`mt-2 text-xs leading-5 ${yieldPa == null ? "text-destructive" : "text-muted-foreground"}`}
            >
              {yieldPa == null
                ? "Enter a yield above 0 and up to 100."
                : "NZD stablecoin earning. Simple monthly accrual, not compounded."}
            </p>
          </div>
          <div className="inline-flex h-fit rounded-lg bg-muted p-1" role="group" aria-label="AUC chart currency">
            <Button
              type="button"
              size="sm"
              variant={currency === "USD" ? "default" : "ghost"}
              aria-pressed={currency === "USD"}
              onClick={() => onCurrencyChange("USD")}
            >
              USD
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currency === "NZD" ? "default" : "ghost"}
              aria-pressed={currency === "NZD"}
              disabled={nzdPerUsd == null}
              onClick={() => onCurrencyChange("NZD")}
            >
              NZD
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">AUC required today</p>
            <div className="mt-2">
              <DualMoney usd={now?.aucUsd ?? null} nzd={now?.aucNzd ?? null} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Annual yield equals the $5,000 shortfall</p>
          </div>
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">AUC required on 1 Sep 2027</p>
            <div className="mt-2">
              <DualMoney usd={horizon?.aucUsd ?? null} nzd={horizon?.aucNzd ?? null} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Annual yield equals the full stacked liability</p>
          </div>
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">AUC to pay the monthly stack</p>
            <div className="mt-2">
              <DualMoney usd={runRateUsd} nzd={runRateNzd} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Monthly yield equals $2,500 Brale + $300 other tech
            </p>
          </div>
        </div>

        <div className="mt-6" aria-labelledby="auc-heading">
          {chartPoints.length > 0 ? (
            <AucChart points={chartPoints} currency={currency} />
          ) : (
            <p className="flex h-40 items-center text-sm text-destructive">
              Enter a USD to NZD rate and a stablecoin yield to plot required custody.
            </p>
          )}
        </div>

        <div className="mt-6 overflow-x-auto border-t border-border pt-5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Monthly NZD stablecoin assets under custody required to cover the cumulative liability
              shortfall at the stated annual yield, with the monthly yield on that balance.
            </caption>
            <thead>
              <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-1 py-3 font-medium">Month</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">Shortfall</th>
                <th scope="col" className="px-3 py-3 font-medium">AUC required</th>
                <th scope="col" className="px-1 py-3 font-medium">Monthly yield</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                return (
                  <tr
                    key={row.id}
                    className={
                      row.phase === "now"
                        ? "bg-[#b4331a]/10"
                        : row.phase === "overdue"
                          ? "bg-[#b4331a]/5"
                          : undefined
                    }
                  >
                    <th
                      scope="row"
                      className={`px-1 py-3 text-left font-medium ${row.phase === "now" ? "border-l-2 border-[#b4331a]" : "border-l-2 border-transparent"}`}
                    >
                      <span className="block">{row.heading}</span>
                      <span className="block font-mono text-xs font-normal text-muted-foreground">
                        {row.axisLabel}
                      </span>
                    </th>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          row.phase === "overdue" ? "destructive" : row.phase === "now" ? "default" : "outline"
                        }
                      >
                        {statusLabel(row.phase)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs leading-5">
                      <span className="block">{formatMoney(row.totalCumulativeUsd, "USD")}</span>
                      <span className="block text-muted-foreground">
                        {row.shortfallNzd == null ? "—" : formatMoney(row.shortfallNzd, "NZD")}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs leading-5 font-medium">
                      <span className="block">{row.aucNzd == null ? "—" : formatMoney(row.aucNzd, "NZD")}</span>
                      <span className="block font-normal text-muted-foreground">
                        {row.aucUsd == null ? "—" : formatMoney(row.aucUsd, "USD")}
                      </span>
                    </td>
                    <td className="px-1 py-3 font-mono text-xs leading-5">
                      <span className="block">{row.yieldNzd == null ? "—" : formatMoney(row.yieldNzd, "NZD")}</span>
                      <span className="block text-muted-foreground">
                        {row.yieldUsd == null ? "—" : formatMoney(row.yieldUsd, "USD")}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
