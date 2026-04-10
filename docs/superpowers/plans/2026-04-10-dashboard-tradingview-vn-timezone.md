# Dashboard TradingView Vietnam Timezone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard TradingView datafeed normalize date parameters and news mark date keys using `Asia/Ho_Chi_Minh`.

**Architecture:** Extract timezone-specific date formatting into a small dashboard utility module and reuse it from the TradingView datafeed. Keep the widget `timezone` setting as-is and only normalize the request/date-key conversion points that currently depend on the browser/runtime timezone or UTC string slicing.

**Tech Stack:** React, TypeScript, Vite, TradingView Charting Library, Vitest via `npx`

---

### Task 1: Add timezone helper tests

**Files:**
- Create: `dashboard/src/lib/tradingview-timezone.spec.ts`
- Create: `dashboard/src/lib/tradingview-timezone.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { formatVietnamDateKey, formatVietnamDateParam } from "./tradingview-timezone"

describe("tradingview Vietnam timezone helpers", () => {
  it("formats a UTC timestamp into the Vietnam calendar date", () => {
    const date = new Date("2026-04-09T18:30:00.000Z")

    expect(formatVietnamDateKey(date)).toBe("2026-04-10")
    expect(formatVietnamDateParam(date)).toBe("10-04-2026")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard && npx vitest run src/lib/tradingview-timezone.spec.ts`
Expected: FAIL because `./tradingview-timezone` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh"

function getVietnamParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(date)
  const valueOf = (type: string) => parts.find((part) => part.type === type)?.value ?? ""

  return {
    year: valueOf("year"),
    month: valueOf("month"),
    day: valueOf("day"),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard && npx vitest run src/lib/tradingview-timezone.spec.ts`
Expected: PASS

### Task 2: Wire helpers into TradingView datafeed

**Files:**
- Modify: `dashboard/src/lib/tradingview-datafeed.ts`
- Test: `dashboard/src/lib/tradingview-timezone.spec.ts`

- [ ] **Step 1: Update history/news date formatting to use the helpers**

```ts
if (from) url += `&from=${formatVietnamDateParam(new Date(from * 1000))}`
if (to) url += `&to=${formatVietnamDateParam(new Date(to * 1000))}`

const fromDate = formatVietnamDateKey(new Date(from * 1000))
const toDate = formatVietnamDateKey(rawTo > now ? now : rawTo)
```

- [ ] **Step 2: Re-run the targeted test**

Run: `cd dashboard && npx vitest run src/lib/tradingview-timezone.spec.ts`
Expected: PASS

- [ ] **Step 3: Run dashboard build**

Run: `cd dashboard && npm run build`
Expected: build exits with code 0
