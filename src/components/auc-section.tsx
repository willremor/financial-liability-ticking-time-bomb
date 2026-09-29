"use client"

import { useMemo, useState } from "react"
import { AucChart } from "@/components/auc-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_COUNTERPARTY_SHARE_PERCENT,
  DEFAULT_ISSUER_TAX_PERCENT,
  DEFAULT_YIELD_PERCENT,
  cumulativeYieldSplit,
  parseIssuerTaxPercent,
  parseSharePercent,
  parseYieldPercent,
  requiredAucUsd,
  retainedYieldPa,
  yieldMonthsElapsed,
} from "@/lib/auc"
import { custody, issuerTax as issuerTaxColor, otherTech } from "@/lib/colors"
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
  const [taxInput, setTaxInput] = useState(String(DEFAULT_ISSUER_TAX_PERCENT))
  const yieldPa = parseYieldPercent(yieldInput)
  const counterpartyShare = parseSharePercent(shareInput)
  const issuerTax = parseIssuerTaxPercent(taxInput)

  const rows = useMemo(() => {
    return schedule.map((row) => {
      if (nzdPerUsd == null || yieldPa == null || counterpartyShare == null || issuerTax == null) {
        return {
          ...row,
          aucUsd: null,
          aucNzd: null,
          keptUsd: null,
          keptNzd: null,
          taxUsd: null,
          taxNzd: null,
          incentiveUsd: null,
          incentiveNzd: null,
          shortfallNzd: null,
          auc: 0,
          netRevenue: null,
          sharedRevenue: null,
        }
      }
      const monthsElapsed = yieldMonthsElapsed(row.isoDate, row.phase)
      const aucUsd = requiredAucUsd(
        row.totalCumulativeUsd,
        yieldPa,
        counterpartyShare,
        monthsElapsed,
        issuerTax,
      )
      const aucNzd = aucUsd * nzdPerUsd
      const splitUsd = cumulativeYieldSplit(row.totalCumulativeUsd, counterpartyShare, issuerTax)
      const splitNzd = cumulativeYieldSplit(row.totalCumulativeUsd * nzdPerUsd, counterpartyShare, issuerTax)
      return {
        ...row,
        monthsElapsed,
        aucUsd,
        aucNzd,
        keptUsd: splitUsd.retained,
        keptNzd: splitNzd.retained,
        taxUsd: splitUsd.tax,
        taxNzd: splitNzd.tax,
        incentiveUsd: splitUsd.incentive,
        incentiveNzd: splitNzd.incentive,
        shortfallNzd: row.totalCumulativeUsd * nzdPerUsd,
        auc: currency === "NZD" ? aucNzd : aucUsd,
        netRevenue: currency === "NZD" ? splitNzd.retained : splitUsd.retained,
        sharedRevenue: currency === "NZD" ? splitNzd.incentive : splitUsd.incentive,
      }
    })
  }, [counterpartyShare, currency, issuerTax, nzdPerUsd, schedule, yieldPa])

  const chartPoints = rows.flatMap((row) => {
    if (
      row.aucUsd == null ||
      row.aucNzd == null ||
      row.keptUsd == null ||
      row.keptNzd == null ||
      row.taxUsd == null ||
      row.taxNzd == null ||
      row.incentiveUsd == null ||
      row.incentiveNzd == null ||
      row.shortfallNzd == null ||
      row.netRevenue == null ||
      row.sharedRevenue == null
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
        taxUsd: row.taxUsd,
        taxNzd: row.taxNzd,
        incentiveUsd: row.incentiveUsd,
        incentiveNzd: row.incentiveNzd,
        shortfallNzd: row.shortfallNzd,
        netRevenue: row.netRevenue,
        sharedRevenue: row.sharedRevenue,
      },
    ]
  })

  const now = rows.find((row) => row.phase === "now")
  const horizon = rows.at(-1)
  const yieldLabel = yieldPa == null ? "the gross yield" : `${(yieldPa * 100).toFixed(2)}%`
  const retainedPa =
    yieldPa != null && counterpartyShare != null && issuerTax != null
      ? retainedYieldPa(yieldPa, counterpartyShare, issuerTax)
      : null
  const nowMonths = now ? yieldMonthsElapsed(now.isoDate, now.phase) : null
  const horizonMonths = horizon ? yieldMonthsElapsed(horizon.isoDate, horizon.phase) : null
  const untaxedNowUsd =
    yieldPa != null && counterpartyShare != null && now && nowMonths != null
      ? requiredAucUsd(now.totalCumulativeUsd, yieldPa, counterpartyShare, nowMonths, 0)
      : null
  const untaxedNowNzd = untaxedNowUsd != null && nzdPerUsd != null ? untaxedNowUsd * nzdPerUsd : null
  const sharePercent = counterpartyShare == null ? null : counterpartyShare * 100
  const taxPercent = issuerTax == null ? null : issuerTax * 100
  const netPercent =
    counterpartyShare != null && issuerTax != null
      ? (1 - counterpartyShare) * (1 - issuerTax) * 100
      : null
  const taxSlicePercent =
    counterpartyShare != null && issuerTax != null ? (1 - counterpartyShare) * issuerTax * 100 : null

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
            taxPercent != null &&
            netPercent != null ? (
              <>
                On {SNAPSHOT_LABEL} the existing shortfall is {formatMoney(now.totalCumulativeUsd, "USD")} (
                {formatMoney(now.shortfallNzd, "NZD")}). {nowMonths} months of yield have accrued.
                Counterparties take {sharePercent.toFixed(2)}% of the {yieldLabel}. The issuer pays{" "}
                {taxPercent.toFixed(2)}% tax on the yield it receives, so NewMoney keeps{" "}
                {(retainedPa * 100).toFixed(2)}% a year. Cumulative net yield equals that shortfall
                {issuerTax != null && issuerTax > 0 && untaxedNowNzd != null && untaxedNowUsd != null ? (
                  <>
                    , and the tax raises required AUC from {formatMoney(untaxedNowNzd, "NZD")} (
                    {formatMoney(untaxedNowUsd, "USD")}) to {formatMoney(now.aucNzd, "NZD")} (
                    {formatMoney(now.aucUsd, "USD")})
                  </>
                ) : (
                  <> on {formatMoney(now.aucNzd, "NZD")} of stablecoin</>
                )}
                . By 1 Sep 2027, after {horizonMonths} months, the same rule calls for{" "}
                {formatMoney(horizon.aucNzd, "NZD")} ({formatMoney(horizon.aucUsd, "USD")}).
              </>
            ) : (
              <>Enter a spot rate, a yield above zero, a counterparty share below 100%, and an issuer tax below 100%.</>
            )}
          </CardDescription>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
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
            <div>
              <label
                htmlFor="issuer-tax"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Issuer tax on yield
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="issuer-tax"
                  inputMode="decimal"
                  value={taxInput}
                  aria-invalid={issuerTax == null}
                  aria-describedby="yield-rate-hint"
                  onChange={(event) => setTaxInput(event.target.value)}
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <p
            id="yield-rate-hint"
            className={`text-xs leading-5 ${yieldPa == null || counterpartyShare == null || issuerTax == null ? "text-destructive" : "text-muted-foreground"}`}
          >
            {yieldPa == null
              ? "Enter a yield above 0 and up to 100."
              : counterpartyShare == null
                ? "Enter the percent of yield shared with counterparties, from 0 up to but not including 100."
                : issuerTax == null
                  ? "Enter the issuer tax on yield received, from 0 up to but not including 100."
                  : "NZD stablecoin earning, accrued monthly. Counterparties take their share first. The issuer pays tax on the yield it receives. NewMoney keeps the net."}
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
              {nowMonths ?? "—"} months of net yield cover the existing shortfall
            </p>
          </div>
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">AUC required on 1 Sep 2027</p>
            <div className="mt-2">
              <DualMoney usd={horizon?.aucUsd ?? null} nzd={horizon?.aucNzd ?? null} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {horizonMonths ?? "—"} months of net yield cover the existing shortfall
            </p>
          </div>
          <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">Cumulative yield by today</p>
            <div className="mt-2">
              <DualMoney usd={now?.keptUsd ?? null} nzd={now?.keptNzd ?? null} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Net yield equals the existing shortfall. Tax on yield received is{" "}
              {now?.taxNzd == null || now.taxUsd == null
                ? "—"
                : `${formatMoney(now.taxNzd, "NZD")} (${formatMoney(now.taxUsd, "USD")})`}
              . Counterparties have taken{" "}
              {now?.incentiveNzd == null || now.incentiveUsd == null
                ? "—"
                : `${formatMoney(now.incentiveNzd, "NZD")} (${formatMoney(now.incentiveUsd, "USD")})`}
              .
            </p>
          </div>
        </div>

        {sharePercent != null && taxSlicePercent != null && netPercent != null ? (
          <div className="mt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Gross yield split on required AUC
            </p>
            <div
              className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`NewMoney keeps ${netPercent.toFixed(2)} percent after tax. Tax takes ${taxSlicePercent.toFixed(2)} percent of gross yield. Counterparties receive ${sharePercent.toFixed(2)} percent.`}
            >
              <div style={{ width: `${netPercent}%`, backgroundColor: custody }} />
              <div style={{ width: `${taxSlicePercent}%`, backgroundColor: issuerTaxColor }} />
              <div style={{ width: `${sharePercent}%`, backgroundColor: otherTech }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
              <p>
                <span className="text-muted-foreground">NewMoney keeps </span>
                <span className="font-mono">{netPercent.toFixed(2)}%</span>
              </p>
              <p>
                <span className="text-muted-foreground">Issuer tax </span>
                <span className="font-mono">{taxSlicePercent.toFixed(2)}%</span>
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
              Enter a USD to NZD rate, a stablecoin yield, a counterparty share below 100%, and an issuer
              tax below 100% to plot required custody.
            </p>
          )}
        </div>

        <div className="mt-6 overflow-x-auto border-t border-border pt-5">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <caption className="sr-only">
              Monthly NZD stablecoin assets under custody required so NewMoney’s net yield covers the
              cumulative liability shortfall, after the counterparty incentive and tax on yield received.
            </caption>
            <thead>
              <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-1 py-3 font-medium">Month</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">Existing shortfall</th>
                <th scope="col" className="px-3 py-3 font-medium">AUC required</th>
                <th scope="col" className="px-3 py-3 font-medium">Cumulative net yield</th>
                <th scope="col" className="px-3 py-3 font-medium">Tax on yield received</th>
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
                    <td className="px-3 py-3 font-mono text-xs leading-5">
                      <span className="block">{row.taxNzd == null ? "—" : formatMoney(row.taxNzd, "NZD")}</span>
                      <span className="block text-muted-foreground">
                        {row.taxUsd == null ? "—" : formatMoney(row.taxUsd, "USD")}
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
