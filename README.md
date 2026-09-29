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
