"use client"

import { useMemo, useState } from "react"
import { AucChart } from "@/components/auc-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_COUNTERPARTY_SHARE_PERCENT,
  DEFAULT_YIELD_PERCENT,
  cumulativeYieldSplit,
  parseSharePercent,
  parseYieldPercent,
  requiredAucUsd,
  retainedYieldPa,
  yieldMonthsElapsed,
} from "@/lib/auc"
import { custody, otherTech } from "@/lib/colors"
import { formatMoney, type Currency } from "@/lib/money"
import { SNAPSHOT_LABEL, type ScheduleRow } from "@/lib/projection"

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
  const [shareInput, setShareInput] = useState(String(DEFAULT_COUNTERPARTY_SHARE_PERCENT))
  const yieldPa = parseYieldPercent(yieldInput)
  const counterpartyShare = parseSharePercent(shareInput)

  const rows = useMemo(() => {
    return schedule.map((row) => {
      if (nzdPerUsd == null || yieldPa == null || counterpartyShare == null) {
        return {
          ...row,
          aucUsd: null,
          aucNzd: null,
          keptUsd: null,
          keptNzd: null,
          incentiveUsd: null,
          incentiveNzd: null,
          shortfallNzd: null,
          auc: 0,
        }
      }
      const monthsElapsed = yieldMonthsElapsed(row.isoDate, row.phase)
      const aucUsd = requiredAucUsd(row.totalCumulativeUsd, yieldPa, counterpartyShare, monthsElapsed)
      const aucNzd = aucUsd * nzdPerUsd
      const splitUsd = cumulativeYieldSplit(row.totalCumulativeUsd, counterpartyShare)
      const splitNzd = cumulativeYieldSplit(row.totalCumulativeUsd * nzdPerUsd, counterpartyShare)
      return {
        ...row,
        monthsElapsed,
        aucUsd,
        aucNzd,
        keptUsd: splitUsd.retained,
        keptNzd: splitNzd.retained,
        incentiveUsd: splitUsd.incentive,
        incentiveNzd: splitNzd.incentive,
        shortfallNzd: row.totalCumulativeUsd * nzdPerUsd,
        auc: currency === "NZD" ? aucNzd : aucUsd,
      }
    })
  }, [counterpartyShare, currency, nzdPerUsd, schedule, yieldPa])

  const chartPoints = rows.flatMap((row) => {
    if (
      row.aucUsd == null ||
      row.aucNzd == null ||
      row.keptUsd == null ||
      row.keptNzd == null ||
      row.incentiveUsd == null ||
      row.incentiveNzd == null ||
      row.shortfallNzd == null
    ) {
      return []
    }
    return [
      {
        ...row,
        aucUsd: row.aucUsd,
        aucNzd: row.aucNzd,
        keptUsd: row.keptUsd,
        keptNzd: row.keptNzd,
        incentiveUsd: row.incentiveUsd,
        incentiveNzd: row.incentiveNzd,
        shortfallNzd: row.shortfallNzd,
      },
    ]
  })

  const now = rows.find((row) => row.phase === "now")
  const horizon = rows.at(-1)
  const yieldLabel = yieldPa == null ? "the gross yield" : `${(yieldPa * 100).toFixed(2)}%`
  const retainedPa =
    yieldPa != null && counterpartyShare != null ? retainedYieldPa(yieldPa, counterpartyShare) : null
  const nowMonths = now ? yieldMonthsElapsed(now.isoDate, now.phase) : null
  const horizonMonths = horizon ? yieldMonthsElapsed(horizon.isoDate, horizon.phase) : null
  const baselineNowUsd =
    yieldPa != null && now && nowMonths != null
      ? requiredAucUsd(now.totalCumulativeUsd, yieldPa, 0, nowMonths)
      : null
  const baselineNowNzd =
    baselineNowUsd != null && nzdPerUsd != null ? baselineNowUsd * nzdPerUsd : null
  const sharePercent = counterpartyShare == null ? null : counterpartyShare * 100
  const keptPercent = sharePercent == null ? null : 100 - sharePercent

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
            horizon.aucUsd != null &&
            retainedPa != null &&
            sharePercent != null &&
            keptPercent != null ? (
              <>
                On {SNAPSHOT_LABEL} the existing shortfall is {formatMoney(now.totalCumulativeUsd, "USD")} (
                {formatMoney(now.shortfallNzd, "NZD")}). {nowMonths} months of yield have accrued.
                Counterparties take {sharePercent.toFixed(2)}% of the {yieldLabel}, so NewMoney keeps{" "}
                {keptPercent.toFixed(2)}% ({(retainedPa * 100).toFixed(2)}% a year). Cumulative yield
                kept by NewMoney equals that shortfall
                {counterpartyShare != null &&
                counterpartyShare > 0 &&
                baselineNowNzd != null &&
                baselineNowUsd != null ? (
                  <>
                    , and the incentive raises required AUC from {formatMoney(baselineNowNzd, "NZD")} to{" "}
                    {formatMoney(now.aucNzd, "NZD")} ({formatMoney(now.aucUsd, "USD")})
                  </>
                ) : (
                  <>
                    {" "}
                    on {formatMoney(now.aucNzd, "NZD")} of stablecoin
                  </>
                )}
                . By 1 Sep 2027, after {horizonMonths} months, the same rule calls for{" "}
                {formatMoney(horizon.aucNzd, "NZD")} ({formatMoney(horizon.aucUsd, "USD")}).
              </>
            ) : (
              <>Enter a spot rate, a yield above zero, and a counterparty share below 100%.</>
            )}
          </CardDescription>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
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
            </div>
            <div>
              <label
                htmlFor="yield-share"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Shared as incentive
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="yield-share"
                  inputMode="decimal"
                  value={shareInput}
                  aria-invalid={counterpartyShare == null}
                  aria-describedby="yield-rate-hint"
                  onChange={(event) => setShareInput(event.target.value)}
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <p
            id="yield-rate-hint"
            className={`text-xs leading-5 ${yieldPa == null || counterpartyShare == null ? "text-destructive" : "text-muted-foreground"}`}
          >
            {yieldPa == null
              ? "Enter a yield above 0 and up to 100."
              : counterpartyShare == null
                ? "Enter the percent of yield shared with counterparties, from 0 up to but not including 100."
                : "NZD stablecoin earning, accrued monthly. The incentive is a share of that yield. NewMoney keeps the rest."}
          </p>
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
            <p className="mt-3 text-sm text-muted-foreground">
              {nowMonths ?? "—"} months of retained yield cover the existing shortfall
            </p>
          </div>
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">AUC required on 1 Sep 2027</p>
            <div className="mt-2">
              <DualMoney usd={horizon?.aucUsd ?? null} nzd={horizon?.aucNzd ?? null} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {horizonMonths ?? "—"} months of retained yield cover the existing shortfall
            </p>
          </div>
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">Cumulative yield by today</p>
            <div className="mt-2">
              <DualMoney usd={now?.keptUsd ?? null} nzd={now?.keptNzd ?? null} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Retained yield equals the existing shortfall. Counterparties have taken{" "}
              {now?.incentiveNzd == null || now.incentiveUsd == null
                ? "—"
                : `${formatMoney(now.incentiveNzd, "NZD")} (${formatMoney(now.incentiveUsd, "USD")})`}
              .
            </p>
          </div>
        </div>

        {sharePercent != null && keptPercent != null ? (
          <div className="mt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Yield split on required AUC
            </p>
            <div
              className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`NewMoney keeps ${keptPercent.toFixed(2)} percent of the yield. Counterparties receive ${sharePercent.toFixed(2)} percent.`}
            >
              <div style={{ width: `${keptPercent}%`, backgroundColor: custody }} />
              <div style={{ width: `${sharePercent}%`, backgroundColor: otherTech }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
              <p>
                <span className="text-muted-foreground">NewMoney keeps </span>
                <span className="font-mono">{keptPercent.toFixed(2)}%</span>
              </p>
              <p>
                <span className="text-muted-foreground">Counterparties </span>
                <span className="font-mono">{sharePercent.toFixed(2)}%</span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6" aria-labelledby="auc-heading">
          {chartPoints.length > 0 ? (
            <AucChart points={chartPoints} currency={currency} />
          ) : (
            <p className="flex h-40 items-center text-sm text-destructive">
              Enter a USD to NZD rate, a stablecoin yield, and a counterparty share below 100% to plot
              required custody.
            </p>
          )}
        </div>

        <div className="mt-6 overflow-x-auto border-t border-border pt-5">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <caption className="sr-only">
              Monthly NZD stablecoin assets under custody required so the yield NewMoney keeps covers
              the cumulative liability shortfall, after the counterparty incentive share.
            </caption>
            <thead>
              <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-1 py-3 font-medium">Month</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">Existing shortfall</th>
                <th scope="col" className="px-3 py-3 font-medium">AUC required</th>
                <th scope="col" className="px-3 py-3 font-medium">Cumulative yield kept</th>
                <th scope="col" className="px-1 py-3 font-medium">Cumulative yield shared</th>
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
                    <td className="px-3 py-3 font-mono text-xs leading-5">
                      <span className="block">{row.keptNzd == null ? "—" : formatMoney(row.keptNzd, "NZD")}</span>
                      <span className="block text-muted-foreground">
                        {row.keptUsd == null ? "—" : formatMoney(row.keptUsd, "USD")}
                      </span>
                    </td>
                    <td className="px-1 py-3 font-mono text-xs leading-5">
                      <span className="block">
                        {row.incentiveNzd == null ? "—" : formatMoney(row.incentiveNzd, "NZD")}
                      </span>
                      <span className="block text-muted-foreground">
                        {row.incentiveUsd == null ? "—" : formatMoney(row.incentiveUsd, "USD")}
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
