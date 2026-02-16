# Product Vision

**Application:** Financialize
**Tagline:** "Don't just plan your future. Play with it."
**Last Updated:** 2026-02-15

---

## 1. Core Philosophy

- **Manual by design:** Users enter balances themselves. This keeps them engaged and aware of their money — no auto-syncing with banks.
- **Zero intimidation:** No spreadsheets, no accounting jargon. Sliders and visuals first.
- **Immediate gratification:** Every slider move or input change triggers an instant visual update.
- **Educational:** The app should teach financial concepts passively through interaction and tooltips.
- **Playground mentality:** "What if?" experimentation is the primary use case. Not rigid budgeting.

---

## 2. Design Language

**Aesthetic:** Neo-brutalist with soft pastels. Bold borders, playful shadows, generous whitespace.

### Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Primary | Emerald/Mint (`hsl(158, 45%, 45%)`) | Income, growth, positive states |
| Secondary | Lavender (`hsl(240, 60%, 94%)`) | Cards, backgrounds |
| Accent | Soft Mint (`hsl(158, 50%, 95%)`) | Hover states |
| Destructive | Coral/Rose (`hsl(0, 70%, 65%)`) | Debt, warnings, delete actions |
| Chart: Future | Violet/Indigo (`#8884d8`) | Projections, investments |
| Chart: Trend | Emerald (`#10b981`) | Net worth, positive trends |
| Background | Off-white cream (`hsl(45, 29%, 97%)`) | Page background |
| Border | Pure black | Neo-brutal contrast |

### Interaction Principles

- **Sliders over inputs** for percentages and ranges — encourages experimentation
- **Emoji labels** on categories (🏠 Housing, 🍔 Food, etc.) for instant recognition
- **Debounced reactivity** — changes propagate to charts within 500ms
- **Animate-in transitions** using Tailwind's `animate-in` + Framer Motion
- **Neo-brutal shadows** (`4px 4px 0px 0px rgba(0,0,0,1)`) on interactive cards

---

## 3. Implemented Features

### Dashboard ("The Now")
- [x] Dynamic income sources (add/remove/edit)
- [x] Percentage-based expense allocations with slider UI
- [x] 100% allocation clamping
- [x] Custom expense categories — add/remove/rename freely
- [x] Month-over-month net worth delta (30-day change indicator on KPI card)
- [x] Financial term tooltips on key terms (Net Worth, Savings Rate, Allocations)
- [x] Sankey flow diagram + donut chart toggle
- [x] Currency-aware tooltips
- [x] Coach's Corner with smart nudges
- [x] Recent Activity feed from Tracker
- [x] Projected Savings CTA linking to Simulation

### Tracker ("The Bookkeeper")
- [x] Multi-account management (General, Cash, Investment, Liability)
- [x] Edit accounts — rename and change type inline
- [x] Balance logging with date, amount, note
- [x] Edit and delete balance entries (full CRUD via PUT/DELETE endpoints)
- [x] Balance update reminders — staleness indicator per account (⚠️ after 14 days)
- [x] Net worth trend chart (aggregated "All Accounts" view)
- [x] Individual account history charts
- [x] Loading/error states on all async actions

### Simulation ("The Future Playground")
- [x] Assumptions mode with macro variable sliders
- [x] Historical Trend mode (linear regression forecast)
- [x] Live Net Worth toggle from Tracker
- [x] Configurable starting age
- [x] Life Events with recurring toggle + duration field
- [x] Lifestyle Creep Simulator — dual-line "Save Raises" vs. "Spend Raises" chart
- [x] Auto-detected milestones (Debt Free, $100k, $1M, FI, Money Machine)
- [x] Goal overlay lines from Planning tab

### Planning ("The Time Machine")
- [x] Reverse calculator (binary search for required monthly savings)
- [x] Gap analysis with On Track / Short By indicators + confetti on "On Track"
- [x] Financial tooltips on FIRE Number, Gap Analysis, Reverse Planning terms
- [x] FIRE Station (FIRE number, Coast FIRE years, progress bar)
- [x] Configurable SWR slider

### Settings
- [x] Currency selection (5 currencies)
- [x] Dark mode toggle (Light / Dark / System) with persistence
- [x] Saved scenarios — save/load/delete named financial plan snapshots
- [x] Data export/import — full JSON backup and restore
- [x] Data reset (danger zone)

### Onboarding
- [x] First-run wizard (Welcome → Income → Allocations → Done)
- [x] Replaces default dummy data with user's actual inputs

---

## 4. Future Roadmap

- [ ] **Stacked area chart** — Principal vs. interest breakdown in Simulation
- [ ] **Helpful gap suggestions** — "Reduce Dining Out by 10% OR increase income by 3%"
- [ ] **Electron packaging** — Bundle as desktop app
- [ ] **Multi-user / auth** — Login system for shared devices
- [ ] **Bank CSV import** — Bulk-import balance history from bank statements
- [ ] **Notifications / reminders** — Push or email reminders to update stale accounts

---

## 5. User Journey (Target)

1. **First launch:** Onboarding asks for monthly income and a few expense estimates
2. **Dashboard:** User sees their cash flow visualized instantly. Sliders invite experimentation.
3. **Tracker:** User creates accounts (checking, savings, investment) and logs current balances
4. **Simulation:** User plays with "what if" scenarios — different return rates, life events, time horizons
5. **Planning:** User sets a goal ($1M in 20 years). App shows the required monthly savings and compares to current rate.
6. **Action loop:** Gap analysis drives user back to Dashboard sliders to optimize allocations

---

## 6. Visual & UX Requirements

- **Desktop-first** but usable on tablet (responsive grid with `lg:` breakpoints)
- **No full-page reloads** — SPA with React Router, Framer Motion transitions
- **Dark mode support** — Light / Dark / System theme toggle, fully implemented
- **Accessibility** — shadcn/ui provides Radix primitives with keyboard nav and ARIA labels
- **Performance** — Debounced API calls, loading skeletons, no blocking renders