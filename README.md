# Financialize

**"Don't just plan your future. Play with it."**

A personal finance playground that makes financial planning visual, interactive, and fun. No spreadsheets, no jargon — just sliders, charts, and instant feedback.

![React](https://img.shields.io/badge/React-19-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Python](https://img.shields.io/badge/Python-3.11+-yellow) ![SQLite](https://img.shields.io/badge/SQLite-local-lightgrey)

---

## Features

- **Dashboard** — Income sources, expense allocations with slider UI, Sankey/donut flow visualization, Coach's Corner with smart nudges
- **Tracker** — Multi-account management (checking, savings, investment, liability), balance logging, net worth trend charts
- **Simulation** — "What if?" projections with market return, inflation, raise sliders, life events, lifestyle creep comparison, auto-detected milestones
- **Planning** — Reverse calculator (required monthly savings), gap analysis, FIRE Station (FIRE number, Coast FIRE, progress bar)
- **Settings** — Currency selection, dark/light/system theme, saved scenarios, full data export/import

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS, shadcn/ui, Recharts, Zustand, Framer Motion |
| Backend | Python, FastAPI, SQLAlchemy 2, SQLite, NumPy, Pandas |
| Packaging | PyInstaller (single `.exe` for distribution) |

## Getting Started

### Building a Distributable

Package everything into a single executable that anyone can run — no Python or Node.js required.

**Windows:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
cd ..
python build.py
```
Output: `release/Financialize.exe` — double-click to launch.

**macOS / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
python build.py
```
Output: `release/Financialize` — run with `./Financialize` from Terminal.

See [`The Idea/Tech.md`](The%20Idea/Tech.md) for full technical documentation.

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**

### Setup

```bash
# Clone the repo
git clone https://github.com/<your-username>/financialize.git
cd financialize

# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate      # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Or run both at once

```bash
npm install        # root (installs concurrently)
npm run start      # starts backend + frontend together
```

## Project Structure

```
financialize/
├── backend/           # Python FastAPI server
│   ├── app/           # Main application package
│   │   ├── main.py    # FastAPI app, CORS, static file serving
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── logic.py   # Financial math (projections, FIRE, forecast)
│   │   ├── routers.py
│   │   ├── routers_tracker.py
│   │   └── routers_scenarios.py
│   ├── launcher.py    # Entry point for packaged exe
│   └── requirements.txt
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── api/       # Axios client + tracker API
│   │   ├── components/# UI components (features, layout, ui)
│   │   ├── pages/     # Dashboard, Tracker, Simulation, Planning, Settings
│   │   └── store.ts   # Zustand state management
│   └── package.json
├── build.py           # Automated packaging script
├── create_shortcut.py # Windows desktop shortcut creator
└── The Idea/          # Design docs (Vision, Tech, Current Situation)
```


## License

This project is for personal use. All rights reserved.
