# Current Situation

**Application:** Financialize
**Status:** Feature-complete v1.1
**Last Updated:** 2026-02-15

---

## Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui + Recharts + Zustand + canvas-confetti
- **Backend:** Python FastAPI + SQLAlchemy 2 + SQLite + NumPy + Pandas
- **State:** Zustand store with `persist` middleware (localStorage for client prefs + theme, backend DB for accounts/history/scenarios)
- **API:** Centralized Axios client (`src/api/client.ts`) with `VITE_API_URL` env var support
- **Design:** Neo-brutalist aesthetic with soft pastels, slider-driven UX, light/dark/system theme support

---

## Pages & Features

### 1. Dashboard (`/`)

- **KPI Cards:** Total Net Worth (live from Tracker) with 30-day delta indicator, Monthly Income, Savings Rate (auto-calculated)
- **Income Sources:** Add/remove/edit income entries with live totals
- **Smart Allocations:** Slider-based expense allocation with 100% clamping. Fully custom categories — add/remove/rename via inline editable inputs
- **Financial Tooltips:** Hover `(?)` icons on key terms (Net Worth, Savings Rate, Allocations) with plain-English explanations
- **Visualizations:** Toggle between Sankey flow diagram and donut chart (currency-aware tooltips)
- **Coach's Corner:** AI-driven nudges from `/api/coach/analyze` (Power of $50, Savings Rate check, Super Saver badge)
- **Projected Savings CTA:** Links to Simulation with current savings figure
- **Recent Activity:** Shows 3 most recent balance entries from Tracker (fetched on load)

### 2. Tracker (`/tracker`)

- **Account Management:** Full CRUD — create, rename, change type, delete accounts (General, Cash, Investment, Liability)
- **Liability Handling:** Liability accounts correctly subtract from net worth everywhere
- **Balance Logging:** Date + amount + optional note per entry. Loading states on submit
- **Entry CRUD:** Create, edit (PUT), and delete balance entries via backend endpoints
- **Staleness Indicator:** Each account shows "Xd ago" badge; turns orange with ⚠️ after 14 days without update
- **Visualizations:** Area chart for individual account history or aggregated net worth trend ("All Accounts" view with replay logic)
- **Log Entries List:** Reverse-chronological display per account with delete capability

### 3. Simulation (`/simulation`)

- **Dual Modes:**
  - **Assumptions:** User-defined sliders (Market Return 0-15%, Annual Raise 0-10%, Inflation 0-10%, Time Horizon 0-50yr)
  - **Historical Trend:** Linear regression forecast from actual Tracker data with R², monthly growth, implied annual return
- **Live Integration:** Checkbox to use live net worth from Tracker as starting capital
- **Configurable Age:** `current_age` flows through to backend projections (no longer hardcoded)
- **Life Events:** One-time or recurring financial events (name, year, amount, recurring toggle + duration) affecting the projection curve
- **Lifestyle Creep Simulator:** Dual-line comparison chart — "Save Your Raises" vs. "Spend Your Raises" with cumulative difference callout
- **Milestones:** Auto-detected: Debt Free, $100k Club, Millionaire, Financial Independence, Money Machine (returns > contributions)
- **Goal Overlay:** Reference lines for target amount and target year from Planning tab
- **Debounced API:** 500ms debounce on all parameter changes

### 4. Planning (`/planning`)

- **Reverse Calculator:** Binary search solver for required monthly savings given target net worth + years
- **Gap Analysis:** Compares required vs. current savings rate with On Track / Short By indicators. Confetti animation fires when status flips to "On Track"
- **Financial Tooltips:** Hover explanations on FIRE Number, Gap Analysis, Reverse Planning terms
- **FIRE Station:**
  - FIRE Number (25x annual spend / SWR)
  - Years to Coast FIRE (compound growth only, inflation-adjusted)
  - Progress bar visualization
  - Configurable SWR slider (2-6%)
  - Annual spend auto-derived from income - savings, with manual override

### 5. Settings (`/settings`)

- **Currency:** Selectable symbol ($, €, £, ¥, ₹) persisted to store
- **Theme:** Light / Dark / System toggle with persistence and instant application
- **Saved Scenarios:** Save current setup (incomes, expenses, sim params, events) as named snapshots. Load/delete from list. Stored in SQLite via backend
- **Data Backup:** Export all data (client state + backend accounts/history) as JSON file. Import from file to restore
- **Danger Zone:** Full data reset (localStorage + store)
- **About:** Version info and badges

### 6. Onboarding (First Run)

- **Wizard:** 4-step flow (Welcome → Income → Quick Allocations → Done) shown on first visit
- **Detection:** `localStorage` flag `financialize-onboarded` controls display
- **Applies:** Sets user's income and housing/savings allocation percentages on completion

---

## Cross-Module Integration

```
Tracker ──(Net Worth)──> Dashboard, Simulation, Planning
Dashboard ──(Savings Rate / Cash Flow)──> Simulation, Planning
Planning ──(Goal Amount + Target Year)──> Simulation (reference lines)
Coach ──(Nudges from backend)──> Dashboard
```

---

## Backend API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/status` | Health check |
| POST | `/api/scenarios/calculate` | Forward projection with milestones |
| POST | `/api/scenarios/reverse` | Binary search for required savings |
| POST | `/api/scenarios/fire` | FIRE number + years to coast |
| POST | `/api/scenarios/forecast` | Linear regression forecast from history |
| POST | `/api/coach/analyze` | Smart nudges based on financial situation |
| GET | `/api/tracker/accounts` | List all accounts with latest balance |
| POST | `/api/tracker/accounts` | Create account |
| DELETE | `/api/tracker/accounts/{id}` | Delete account + cascade entries |
| POST | `/api/tracker/entries` | Log balance entry |
| DELETE | `/api/tracker/entries/{id}` | Delete balance entry |
| GET | `/api/tracker/history` | Get entries (optional `account_id` filter) |
| PUT | `/api/tracker/accounts/{id}` | Rename / change account type |
| PUT | `/api/tracker/entries/{id}` | Edit balance entry (date, amount, note) |
| GET | `/api/scenarios/saved` | List all saved scenarios |
| GET | `/api/scenarios/saved/{id}` | Get a single scenario |
| POST | `/api/scenarios/saved` | Save current state as named scenario |
| PUT | `/api/scenarios/saved/{id}` | Update a saved scenario |
| DELETE | `/api/scenarios/saved/{id}` | Delete a saved scenario |

---

## Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| `UserScenario` | `scenarios` | Named financial plan snapshots (JSON `data` column stores full client state) |
| `IncomeItem` | `incomes` | Income sources linked to a scenario |
| `ExpenseItem` | `expenses` | Expense categories linked to a scenario |
| `Account` | `accounts` | User-managed accounts (General, Cash, Investment, Liability) |
| `BalanceEntry` | `balance_entries` | Point-in-time balance snapshots per account |

---

## Key Design Decisions

- **Manual by design:** Users enter balances themselves to stay aware of their financial state
- **Percentage-based expenses:** Allocations are % of income, not fixed amounts — scales naturally
- **Client-side persistence:** Income/expenses/sim params stored in localStorage; account data in SQLite via backend
- **Centralized API client:** Single Axios instance at `src/api/client.ts` with env var for deployment flexibility
- **100% allocation clamping:** Expense sliders can't exceed 100% total
- **Custom categories:** Users can add/remove/rename expense categories freely
- **Theme system:** CSS variables for light/dark, applied via `<html>` class toggle, persisted in Zustand
- **Onboarding:** First-run wizard replaces dummy data with user's actual inputs
- **Financial education:** Reusable `FinancialTooltip` component with 16-term glossary
