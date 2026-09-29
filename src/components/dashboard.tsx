"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AucSection } from "@/components/auc-section"
import { CumulativeChart } from "@/components/cumulative-chart"
import { brale, otherTech } from "@/lib/colors"
import { formatMoney, formatNzd, parseNzdPerUsd, type Currency } from "@/lib/money"
import {
  DEFAULT_NZD_PER_USD,
  SNAPSHOT_LABEL,
  summarize,
  type ScheduleRow,
} from "@/lib/projection"

function MoneyPair({
  usd,
  nzdPerUsd,
  tone = "ink",
}: {
  usd: number
  nzdPerUsd: number | null
  tone?: "ink" | "fuse"
}) {
  return (
    <div>
      <p
        className={`font-mono text-3xl tracking-tight ${tone === "fuse" ? "text-[#b4331a]" : "text-foreground"}`}
      >
        {formatMoney(usd, "USD")}
      </p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">{formatNzd(usd, nzdPerUsd)}</p>
    </div>
  )
}

function StackShare({
  label,
  braleUsd,
  otherUsd,
  nzdPerUsd,
}: {
  label: string
  braleUsd: number
  otherUsd: number
  nzdPerUsd: number | null
}) {
  const total = braleUsd + otherUsd
  const bralePct = total === 0 ? 0 : (braleUsd / total) * 100
  const otherPct = total === 0 ? 0 : (otherUsd / total) * 100

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div
        className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: Brale ${formatMoney(braleUsd, "USD")}, other tech ${formatMoney(otherUsd, "USD")}`}
      >
        <div style={{ width: `${bralePct}%`, backgroundColor: brale }} />
        <div
          style={{
            width: `${otherPct}%`,
            backgroundColor: otherTech,
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(246,241,231,0.75) 2px, rgba(246,241,231,0.75) 3.5px)",
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
        <p>
          <span className="text-muted-foreground">Brale </span>
          <span className="font-mono">{formatMoney(braleUsd, "USD")}</span>
          <span className="font-mono text-muted-foreground"> · {formatNzd(braleUsd, nzdPerUsd)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Other tech </span>
          <span className="font-mono">{formatMoney(otherUsd, "USD")}</span>
          <span className="font-mono text-muted-foreground"> · {formatNzd(otherUsd, nzdPerUsd)}</span>
        </p>
      </div>
    </div>
  )
}

function statusLabel(phase: ScheduleRow["phase"]) {
  if (phase === "overdue") return "Past due"
  if (phase === "now") return "Now"
  return "Projected"
}

export function Dashboard({ schedule }: { schedule: ScheduleRow[] }) {
  const summary = useMemo(() => summarize(schedule), [schedule])
  const [requestedCurrency, setRequestedCurrency] = useState<Currency>("USD")
  const [rateInput, setRateInput] = useState(DEFAULT_NZD_PER_USD.toFixed(4))
  const nzdPerUsd = parseNzdPerUsd(rateInput)
  const currency: Currency =
    requestedCurrency === "NZD" && nzdPerUsd == null ? "USD" : requestedCurrency

  const chartLabel = `Cumulative liability from August 2026 to September 2027. Today, ${SNAPSHOT_LABEL}, the balance is ${formatMoney(summary.overdueUsd, "USD")}. On 1 September 2027 it is ${formatMoney(summary.horizonUsd, "USD")}, stacked from Brale and other tech.`

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 420px at 0% -10%, rgba(180,51,26,0.08), transparent 55%), radial-gradient(800px 380px at 100% 0%, rgba(35,78,69,0.1), transparent 50%)",
        }}
      />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium tracking-[0.22em] text-[#234e45] uppercase">
              NewMoney debt desk
            </p>
            <h1 className="mt-3 font-heading text-[2.7rem] leading-[0.95] tracking-[-0.03em] text-balance md:text-6xl">
              Financial Liability{" "}
              <span className="italic text-[#b4331a]">Ticking Time Bomb</span>
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="fuse-pulse inline-block size-2 rounded-full bg-[#b4331a]" aria-hidden />
                Snapshot {SNAPSHOT_LABEL}
              </span>
              <Badge variant="destructive">Past due on the books</Badge>
              <Badge variant="outline">12 months forward</Badge>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Two Brale tokenisation cycles of {formatMoney(2_500, "USD")} are already past due.
              From October, each month stacks another {formatMoney(2_500, "USD")} of Brale on{" "}
              {formatMoney(300, "USD")} of other tech. The vertical line is today. The bars are
              the running total if nothing is paid. The custody view sizes the NZD stablecoin
              balance whose cumulative net yield to date, after tax on the yield the issuer receives,
              covers the shortfall already outstanding that month.
            </p>
          </div>
          <div className="w-full max-w-xs rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <label htmlFor="nzd-rate" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              NZD per 1 USD
            </label>
            <Input
              id="nzd-rate"
              inputMode="decimal"
              value={rateInput}
              aria-invalid={nzdPerUsd == null}
              aria-describedby="nzd-rate-hint"
              onChange={(event) => setRateInput(event.target.value)}
              className="mt-2 font-mono"
            />
            <p
              id="nzd-rate-hint"
              className={`mt-2 text-xs leading-5 ${nzdPerUsd == null ? "text-destructive" : "text-muted-foreground"}`}
            >
              {nzdPerUsd == null
                ? "Enter a rate above 0 and up to 5. NZD figures use that rate."
                : "Mid-market spot on 29 September 2026. Edit the rate to restate every NZD figure."}
            </p>
          </div>
        </header>

        <section aria-label="Liability totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Already past due</CardDescription>
              <CardTitle className="sr-only">Already past due</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyPair usd={summary.overdueUsd} nzdPerUsd={nzdPerUsd} tone="fuse" />
              <p className="mt-3 text-sm text-muted-foreground">2 × $2,500 Brale, unpaid</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Monthly stack</CardDescription>
              <CardTitle className="sr-only">Monthly stack</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyPair usd={summary.monthlyTotalUsd} nzdPerUsd={nzdPerUsd} />
              <p className="mt-3 text-sm text-muted-foreground">$2,500 Brale + $300 other tech</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Added over the next 12 months</CardDescription>
              <CardTitle className="sr-only">Added over the next 12 months</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyPair usd={summary.addedNext12Usd} nzdPerUsd={nzdPerUsd} />
              <p className="mt-3 text-sm text-muted-foreground">
                {formatMoney(summary.addedBraleUsd, "USD")} Brale and{" "}
                {formatMoney(summary.addedOtherUsd, "USD")} other tech
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Cumulative on 1 Sep 2027</CardDescription>
              <CardTitle className="sr-only">Cumulative on 1 September 2027</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyPair usd={summary.horizonUsd} nzdPerUsd={nzdPerUsd} tone="fuse" />
              <p className="mt-3 text-sm text-muted-foreground">Opening balance plus twelve unpaid months</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <CardTitle id="cumulative-heading" className="font-heading text-2xl tracking-tight">
                Cumulative stack
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                Today the line sits at {formatMoney(summary.overdueUsd, "USD")} (
                {formatNzd(summary.overdueUsd, nzdPerUsd)}), all of it past-due Brale. Twelve
                monthly stacks later the cumulative liability is {formatMoney(summary.horizonUsd, "USD")} (
                {formatNzd(summary.horizonUsd, nzdPerUsd)}).
              </CardDescription>
            </div>
            <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Chart currency">
              <Button
                type="button"
                size="sm"
                variant={currency === "USD" ? "default" : "ghost"}
                aria-pressed={currency === "USD"}
                onClick={() => setRequestedCurrency("USD")}
              >
                USD
              </Button>
              <Button
                type="button"
                size="sm"
                variant={currency === "NZD" ? "default" : "ghost"}
                aria-pressed={currency === "NZD"}
                disabled={nzdPerUsd == null}
                onClick={() => setRequestedCurrency("NZD")}
              >
                NZD
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div aria-label={chartLabel}>
              <CumulativeChart schedule={schedule} currency={currency} nzdPerUsd={nzdPerUsd} />
            </div>
            <div className="mt-6 grid gap-5 border-t border-border pt-5 md:grid-cols-2">
              <StackShare
                label="Stack today"
                braleUsd={summary.now.braleCumulativeUsd}
                otherUsd={summary.now.otherCumulativeUsd}
                nzdPerUsd={nzdPerUsd}
              />
              <StackShare
                label="Stack on 1 Sep 2027"
                braleUsd={summary.horizonBraleUsd}
                otherUsd={summary.horizonOtherUsd}
                nzdPerUsd={nzdPerUsd}
              />
            </div>
          </CardContent>
        </Card>

        <AucSection
          schedule={schedule}
          currency={currency}
          nzdPerUsd={nzdPerUsd}
          onCurrencyChange={setRequestedCurrency}
        />

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-tight">Monthly schedule</CardTitle>
            <CardDescription className="text-sm leading-6">
              Each row adds to the rows above it. Cumulative Brale and cumulative other tech are the
              two layers of the bar. Cumulative total is the line.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <caption className="sr-only">
                  Cumulative NewMoney liability by month in USD and NZD, from the overdue Brale
                  cycles through September 2027.
                </caption>
                <thead>
                  <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-4 py-3 font-medium">Month</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 font-medium">Added</th>
                    <th scope="col" className="px-3 py-3 font-medium">Cumulative Brale</th>
                    <th scope="col" className="px-3 py-3 font-medium">Cumulative other tech</th>
                    <th scope="col" className="px-4 py-3 font-medium">Cumulative total</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => {
                    const added = row.braleAddedUsd + row.otherAddedUsd
                    return (
                      <tr
                        key={row.id}
                        data-phase={row.phase}
                        className={
                          row.phase === "now"
                            ? "bg-[#b4331a]/10"
                            : row.phase === "overdue"
                              ? "bg-[#b4331a]/5"
                              : "odd:bg-black/[0.015]"
                        }
                      >
                        <th
                          scope="row"
                          className={`px-4 py-3 text-left font-medium ${row.phase === "now" ? "border-l-2 border-[#b4331a]" : "border-l-2 border-transparent"}`}
                        >
                          <span className="block">{row.heading}</span>
                          <span className="block font-mono text-xs font-normal text-muted-foreground">
                            {row.axisLabel}
                          </span>
                        </th>
                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              row.phase === "overdue"
                                ? "destructive"
                                : row.phase === "now"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {statusLabel(row.phase)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs leading-5">
                          {added === 0 ? (
                            <span className="text-muted-foreground">No posting</span>
                          ) : (
                            <>
                              <span className="block">{formatMoney(row.braleAddedUsd, "USD")} Brale</span>
                              {row.otherAddedUsd > 0 ? (
                                <span className="block">{formatMoney(row.otherAddedUsd, "USD")} other tech</span>
                              ) : null}
                              <span className="block text-muted-foreground">{formatNzd(added, nzdPerUsd)}</span>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs leading-5">
                          <span className="block">{formatMoney(row.braleCumulativeUsd, "USD")}</span>
                          <span className="block text-muted-foreground">
                            {formatNzd(row.braleCumulativeUsd, nzdPerUsd)}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs leading-5">
                          <span className="block">{formatMoney(row.otherCumulativeUsd, "USD")}</span>
                          <span className="block text-muted-foreground">
                            {formatNzd(row.otherCumulativeUsd, nzdPerUsd)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm leading-5 font-medium">
                          <span className="block">{formatMoney(row.totalCumulativeUsd, "USD")}</span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {formatNzd(row.totalCumulativeUsd, nzdPerUsd)}
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

        <section aria-labelledby="assumptions-heading" className="max-w-3xl pb-6">
          <h2 id="assumptions-heading" className="font-heading text-xl tracking-tight">
            How this projection is built
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>The snapshot date is {SNAPSHOT_LABEL}.</li>
            <li>
              Two Brale tokenisation liabilities of {formatMoney(2_500, "USD")} are already past due.
              They are drawn on 1 August 2026 and 1 September 2026.
            </li>
            <li>
              From 1 October 2026 through 1 September 2027, each month adds {formatMoney(2_500, "USD")} of
              Brale liability and {formatMoney(300, "USD")} of other tech spend.
            </li>
            <li>
              The chart stacks those postings into a running total. The vertical line is today. Every
              cycle stays unpaid, so the cumulative total only grows.
            </li>
            <li>
              NZD amounts restate the USD balance at the spot rate in the header, held flat across the
              year. The opening rate is 1 USD = {DEFAULT_NZD_PER_USD.toFixed(4)} NZD, the mid-market
              price on {SNAPSHOT_LABEL}.
            </li>
            <li>
              NZD stablecoin assets under custody earn 2.5% per year. Yield accrues in simple monthly
              parts, with no compounding. August 2026 is the first accrual. Today is still on
              September’s second accrual. September 2027 is the fourteenth.
            </li>
            <li>
              A share of that gross yield can be paid to counterparties as an incentive. The opening share is
              0%. The stablecoin issuer then pays tax on the yield it receives. The opening tax rate is 28%,
              the New Zealand company tax rate. NewMoney’s cumulative net yield is what remains.
            </li>
            <li>
              Required AUC in a month is the balance whose cumulative net yield so far equals the shortfall
              outstanding that month. A higher counterparty share or a higher issuer tax lowers the yield
              NewMoney keeps and increases the custody needed to cover that same shortfall.
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
