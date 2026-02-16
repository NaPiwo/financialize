# Technical Reference

**Last Updated:** 2026-02-15

---

## 1. Architecture

**Pattern:** Client-Server on localhost (web-first, Electron optional later)

```
┌─────────────────────┐         HTTP/JSON          ┌──────────────────────┐
│  Frontend (React)   │  ◄────────────────────►    │  Backend (FastAPI)   │
│  localhost:5173     │                             │  localhost:8000      │
│                     │                             │                     │
│  Zustand Store      │                             │  SQLite DB           │
│  + localStorage     │                             │  financialize.db     │
└─────────────────────┘                             └──────────────────────┘
```

- Frontend and backend are fully decoupled — they communicate only via REST
- The backend is stateless per-request; all persistence is in SQLite
- Client-side preferences (income, expenses, sim params) live in localStorage via Zustand `persist`
- Account/balance data lives in SQLite via the backend

---

## 2. Tech Stack

### Backend (`/backend`)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Python | 3.11+ | |
| Framework | FastAPI | >=0.110 | REST API with auto-generated Swagger docs |
| Validation | Pydantic | >=2.5 | Request/response schemas, type safety |
| ORM | SQLAlchemy | >=2.0 | Database models with `declarative_base` |
| Database | SQLite | — | Single-file local storage (`financialize.db`) |
| Math | NumPy | >=1.26 | Vectorized projection calculations |
| Data | Pandas | >=2.1 | Time-series aggregation for forecasting |
| Testing | Pytest | >=8.0 | Financial math verification |
| Server | Uvicorn | >=0.27 | ASGI server with hot-reload |

### Frontend (`/frontend`)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Build | Vite | 7.x | Dev server + production bundler |
| Framework | React | 19.x | UI framework |
| Language | TypeScript | 5.9 | Strict typing |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| Components | shadcn/ui (Radix) | — | Accessible primitives (Slider, Dialog, Tabs, etc.) |
| State | Zustand | 5.x | Global store with persistence middleware |
| Charts | Recharts | 3.x | Area, Pie, Sankey charts |
| HTTP | Axios | 1.x | Centralized API client |
| Animation | Framer Motion | 12.x | Page transitions, micro-interactions |
| Icons | Lucide React | — | Consistent icon set |
| Routing | React Router DOM | 7.x | Client-side routing (5 pages + onboarding) |
| Effects | canvas-confetti | 1.x | Celebration animation on goal achievement |

### Desktop Packaging

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Bundler | PyInstaller | Package Python + frontend into a single `.exe` |
| Launcher | `backend/launcher.py` | Finds free port, starts server, opens browser |

> **Note:** The app runs as a local web server and opens in the user's default browser. See Section 7 for build instructions.

---

## 3. Directory Structure

```
/financialize
├── /backend
│   ├── /app
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── database.py          # Engine, SessionLocal, Base, get_db
│   │   ├── models.py            # SQLAlchemy models (Account, BalanceEntry, UserScenario)
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── logic.py             # Financial math (projections, FIRE, forecast, reverse)
│   │   ├── routers.py           # Scenario + Coach endpoints
│   │   ├── routers_tracker.py   # Account + Balance CRUD endpoints
│   │   └── routers_scenarios.py # Saved scenario CRUD endpoints
│   ├── requirements.txt         # Pinned dependency ranges
│   ├── financialize.db          # SQLite database (gitignored in prod)
│   └── venv/                    # Python virtual environment
│
├── /frontend
│   ├── /src
│   │   ├── /api
│   │   │   ├── client.ts        # Centralized Axios instance (VITE_API_URL)
│   │   │   └── tracker.ts       # Account + entry API methods + types
│   │   ├── /components
│   │   │   ├── /features        # CoachCorner, ProjectionChart, AllocationChart, CashFlowSankey, FinancialTooltip, OnboardingWizard
│   │   │   ├── /layout          # MainLayout, Sidebar
│   │   │   └── /ui              # shadcn/ui primitives (button, card, dialog, input, slider, tabs, badge, separator)
│   │   ├── /pages               # Dashboard, Tracker, Simulation, Planning, Settings
│   │   ├── /lib/utils.ts        # cn() helper (clsx + tailwind-merge)
│   │   ├── store.ts             # Zustand store (state, actions, persistence)
│   │   ├── App.tsx              # Router setup
│   │   ├── main.tsx             # React entry point
│   │   └── index.css            # Tailwind base + CSS variables (light/dark themes)
│   ├── tailwind.config.js       # Theme: colors, neo-brutal shadows, radius
│   ├── vite.config.ts           # @ alias, React plugin
│   ├── package.json             # Dependencies (pinned)
│   └── tsconfig.json            # TypeScript config
│
├── /electron                    # Placeholder for desktop packaging
├── /The Idea                    # Project documentation
│   ├── current_Situation.md     # What's built right now
│   ├── Tech.md                  # This file — technical reference
│   └── Vision.md                # Product vision and roadmap
└── package.json                 # Root: concurrently runs frontend + backend
```

---

## 4. Data Flow Patterns

### State Split

| Data | Where | Why |
|------|-------|-----|
| Income sources, expense %, sim params, currency | Zustand + localStorage | Fast, offline, no backend needed |
| Accounts, balance entries | SQLite via backend API | Persistent, queryable, supports aggregation |
| Projection results, FIRE calcs, forecasts | Transient (component state) | Computed on-demand, not stored |

### API Call Pattern

All frontend API calls go through the centralized client:

```typescript
// src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const apiClient = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 10000 })
```

Pages use `apiClient.post(...)` directly for scenario calculations.
Tracker CRUD goes through `fileApi` methods in `src/api/tracker.ts`.

---

## 5. Development Rules

- **Strict typing:** Pydantic models in Python, TypeScript interfaces in frontend. Avoid `any`.
- **No magic numbers:** Financial constants (rates, thresholds) are always variables or request params.
- **Loading states:** Every async operation shows feedback (spinner, disabled button, skeleton).
- **Debounced API calls:** Simulation and Planning use 500-800ms debounce on parameter changes.
- **Import discipline:** All imports at the top of the file. No mid-file imports.
- **Error boundaries:** Backend uses HTTPException; frontend catches and logs with `console.error`.

---

## 6. Running the App

```bash
# Terminal 1: Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Or from root:
npm run start  # uses concurrently to run both
```

Backend runs on `http://localhost:8000` (Swagger at `/docs`).
Frontend runs on `http://localhost:5173`.

---

## 7. Packaging & Distribution

### How It Works

The app is packaged into a **single `.exe`** using PyInstaller:

1. The React frontend is built into static HTML/JS/CSS (`frontend/dist/`)
2. FastAPI serves those static files directly (no separate frontend server)
3. PyInstaller bundles Python + dependencies + frontend into one executable
4. On launch, the exe starts a local server and auto-opens the browser

**End result:** Double-click `Financialize.exe` → app opens in the browser. No Python, Node.js, or any other software needed.

### Build Steps (Developer Machine Only)

```bash
# Prerequisites (one-time)
cd backend
.\venv\Scripts\Activate
pip install pyinstaller

# Build everything (frontend + PyInstaller bundle)
cd ..
python build.py
```

Output goes to `/release/Financialize.exe`.

### Create Desktop Shortcut

```bash
python create_shortcut.py
```

Creates a `Financialize.lnk` on your Windows Desktop.

### Sharing With Others

Send the entire `release/` folder (or just `Financialize.exe`). The recipient:
- Double-clicks the `.exe`
- Their default browser opens with the app
- Data is stored in `financialize.db` next to the exe
- **No install, no dependencies, no setup**

### Key Files

| File | Purpose |
|------|---------|
| `backend/launcher.py` | Entry point: finds free port, opens browser, starts server |
| `build.py` | Automated build script (frontend build + PyInstaller) |
| `create_shortcut.py` | Creates a Windows desktop shortcut |
| `release/` | Output folder with the distributable `.exe` |