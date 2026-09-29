# Financial Liability Ticking Time Bomb

NewMoney debt desk for the next 12 months. It shows cumulative liability in USD and NZD, with the two Brale tokenisation cycles that are already past due and the monthly stack that follows.

## What it projects

Snapshot date: **29 September 2026**.

| When | Brale tokenisation | Other tech | Status |
| --- | ---: | ---: | --- |
| 1 Aug 2026 | $2,500 | — | Past due |
| 1 Sep 2026 | $2,500 | — | Past due |
| 29 Sep 2026 | — | — | Today. Outstanding **$5,000** |
| 1 Oct 2026 – 1 Sep 2027 | $2,500 each month | $300 each month | Next 12 months |

The chart stacks Brale and other tech into a running total. A vertical line marks today. Nothing is assumed paid, so the balance on 1 September 2027 is **$38,600**.

NZD figures use a mid-market spot of **1 USD = 1.7640 NZD** on 29 September 2026. Change the rate in the header to restate every New Zealand dollar amount. The rate stays flat across the year.

## Stablecoin assets under custody

NZD stablecoin balances earn **2.5% per year**, accrued as one twelfth each month with no compounding. For each month, required custody is the balance whose **cumulative retained yield so far equals the shortfall outstanding that month**:

`AUC = existing shortfall ÷ (2.5% × (1 − counterparty share) × months elapsed / 12)`

August 2026 is month 1. Today is still month 2. 1 September 2027 is month 14. NewMoney’s cumulative yield equals the existing shortfall. Counterparties’ cumulative yield is their share of the gross.

| At a 0% share | Today (2 months, shortfall $5,000) | 1 Sep 2027 (14 months, shortfall $38,600) |
| --- | ---: | ---: |
| Cumulative yield kept by NewMoney | NZ$8,820 / $5,000 | NZ$68,090.40 / $38,600 |
| AUC required | NZ$2,116,800 / $1,200,000 | NZ$2,334,528 / $1,323,428.57 |

The opening counterparty share is **0%**. At 20%, today’s AUC rises to about NZ$2,646,000. The chart includes the vertical line for 29 September 2026.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
```
