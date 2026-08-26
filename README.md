<div align="center">

# 🌊 JalSaarthi (जलसारथी)

### *Your Companion for Water-Smart Farming*

**A Groundwater & Agricultural Irrigation Decision Support Platform**

Connecting groundwater intelligence, irrigation science, field verification, sustainability scoring, and government schemes — in a single platform.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](#)
[![Python](https://img.shields.io/badge/Python-3.8--3.11-3776AB?logo=python&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-ML%20Microservice-009688?logo=fastapi&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14+-4169E1?logo=postgresql&logoColor=white)](#)


[Overview](#-the-problem) • [Features](#-core-features) • [Architecture](#️-architecture) • [Quick Start](#-quick-start) • [API](#-api-overview) • [Team Docs](#-documentation-index)

</div>

---
## 🚩 The Problem

Groundwater is India's single biggest source of irrigation water — and in states like **Haryana**, large parts of the aquifer are being pumped faster than rainfall can replenish them. The **Central Ground Water Board (CGWB)** classifies many areas as **Semi-Critical**, **Critical**, or **Over-Exploited**.

**Farmers** struggle to answer three basic questions:

| ❓ Question | 😕 Current Reality |
|---|---|
| How stressed is groundwater in *my* village or block? | No easy, localized access to this data |
| Which crop + irrigation method saves water without hurting yield? | No personalized, science-backed guidance |
| What subsidies exist for drip, sprinkler, or AWD adoption? | Scattered, hard-to-discover scheme information |

**Government officials** face the mirror-image problem — aggregate data exists, but there's no easy way to:

- 📍 Monitor farm-level irrigation adoption
- ✅ Verify practices through field audits
- 📊 Measure and rank sustainability performance
- 🎯 Target schemes toward the areas that need them most

> **JalSaarthi bridges both sides** — turning raw groundwater data into action for farmers *and* accountability for administrators.

---

## 💡 What JalSaarthi Does

<div align="center">

```
                            JALSAARTHI
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   🌍 Groundwater        🌾 Agriculture          🏛️ Government
   Intelligence          Advisory                Schemes
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ⚙️  Recommendation Engine
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
          📋 Farm Actions              🔍 Field Audits
                  │                           │
                  └─────────────┬─────────────┘
                                │
                    🏆 Sustainability Scoring
                                │
                   🗺️  Village / District Rankings
```

</div>

**Groundwater intelligence → irrigation decisions → field verification → sustainability measurement → government scheme targeting**, all within one decision-support platform, serving **four distinct user roles**.

A **Python ML microservice** predicts future groundwater levels and recharge (not just historical readings) using trained **XGBoost** and **Random Forest** pipelines — making JalSaarthi genuinely forward-looking.

---

## ⚙️ Recommendation Engine

Built as a **transparent, explainable weighted-scoring model** — not a black box — grounded in **FAO-56** and **ICAR** irrigation guidelines.

<div align="center">

| Factor | Weight |
|---|:---:|
| 💧 Groundwater stress | **35%** |
| 🌱 Soil texture / drainage | **20%** |
| 🌾 Crop water requirement | **20%** |
| 🌧️ Rainfall deficit | **15%** |
| 🚜 Farmer's current practice | **10%** |

</div>

**Techniques evaluated:** Drip · Sprinkler · AWD · Furrow · Border · Raised Bed · Pitcher · Flood

For every suitable technique, farmers get:

✅ Ranked recommendation &nbsp;•&nbsp; ✅ Confidence score &nbsp;•&nbsp; ✅ Estimated water savings (m³/ha) &nbsp;•&nbsp; ✅ Cost impact

📄 *Full formulas & sources:* [`RECOMMENDATION_ENGINE_FORMULA_AND_SOURCES.md`](./RECOMMENDATION_ENGINE_FORMULA_AND_SOURCES.md)

---

## 👥 Who Uses It

<div align="center">

| Role | Represents | Key Powers |
|---|---|---|
| 🧑‍🌾 **Village Head** | Manages one assigned village | Farms, crop records, irrigation advisory, schemes, groundwater maps |
| 🔍 **Auditor** | Verifies field activity for a district | Field audits, adoption verification, evidence upload |
| 🏛️ **Government Employee** | Policy & oversight | Scheme catalogs, groundwater visibility |
| 🛠️ **Admin** | Platform & scheme configuration | Scheme rules, sustainability rankings, ML testing, GIS |

</div>

<details>
<summary><b>🧑‍🌾 Village Head — expand for details</b></summary>

**Farm Register**
- Add farms · Log seasonal crop records · View farm totals · Verified-audit counts · Sustainability score per farm

**Irrigation Advisory**
- Run the recommendation engine interactively · Select crop/soil/season · View water-saving & cost diagnostics

**Subsidies & Schemes**
- Browse central and state scheme directories

**Groundwater Maps**
- GIS explorer with year-over-year comparison

</details>

<details>
<summary><b>🔍 Auditor — expand for details</b></summary>

**Audit Field Logs** — mark irrigation status as `Adopted` / `Not Adopted` / `In Progress`, attach notes & evidence

**Groundwater Maps** — GIS context while conducting field verification

</details>

<details>
<summary><b>🏛️ Government Employee — expand for details</b></summary>

**Schemes Catalog** — search central & state schemes, review water-conservation subsidy programs

**Groundwater Maps** — full GIS explorer access

</details>

<details>
<summary><b>🛠️ Admin — expand for details</b></summary>

**Scheme Catalogue** — create/manage schemes, eligibility rules, benefit links

**Sustainability Scores** — village & district rankings, leaderboards, export

**ML Microservice** — test prediction endpoints directly from the dashboard

**Groundwater Maps** — full GIS explorer access

</details>

> **🔑 Design Note:** Farmers themselves are **not** user accounts. Village Heads manage farm records *on behalf of* farmers, while Auditors **independently verify** irrigation adoption in the field. This separation of self-reported data from field-verified truth is what makes the sustainability scores trustworthy.

---

## ✨ Core Features

| # | Feature | Highlights |
|---|---|---|
| 🗺️ 6.1 | **Groundwater GIS Map** (`AssessmentExplorer`) | Leaflet-powered district/village polygons · Normal / High-priority / Critical zones · Historical year selector |
| ⚙️ 6.2 | **Irrigation Recommendation Engine** | Ranked techniques · confidence scores · savings & cost impact |
| 🏆 6.3 | **Sustainability Scoring** | Rolls up crop records + verified audits into farm → village → district rankings |
| 📜 6.4 | **Schemes Directory** | Searchable central & state scheme catalogue with eligibility & benefits |
| 🤖 6.5 | **ML Predictions** | Groundwater level & recharge forecasting, technique recommendation, proxied via `/api/ml/predict` |

---

## 🏗️ Architecture

Three cooperating services power JalSaarthi end-to-end:

<div align="center">

```
   React + Vite Dashboard

           │
         HTTP
           |
            ▼
      Node.js / Express API
            │
   ┌────────┴────────┐
   ▼                 ▼
PostgreSQL     FastAPI ML Service
                     │
                     ▼
              ML Predictions
```

</div>

| Layer | Location | Responsibilities |
|---|---|---|
| 🖥️ **React + Vite Dashboard** | `frontend/` | UI, role-based workspaces, Leaflet GIS, irrigation advisory |
| 🔗 **Node.js / Express API** | `Backend/` | Auth, JWT + RBAC, farms, crops, audits, schemes, scoring, recommendation engine, PostgreSQL |
| 🧠 **Python FastAPI ML Service** | `Backend/Model/` | Groundwater-level prediction, recharge estimation, irrigation-technique prediction (XGBoost / Random Forest) |

Roles enforced at the API layer: `VILLAGE_HEAD` · `AUDITOR` · `GOVERNMENT_EMPLOYEE` · `ADMIN`

> 🔌 The Express server **auto-spawns** the FastAPI service as a subprocess on port `8000` — no manual startup required.

---

## 📁 Repository Layout

```text
.
├── Backend/                  # Express API + ML microservice + legacy static demo
│   ├── src/                  # app.js, server.js, routes/controllers/services/engine/db
│   ├── Model/                # api_intergate.py, trained .pkl pipelines, training scripts
│   ├── Dataset/              # source CSV/XLSX/geojson data for training & seeding
│   ├── frontend/             # legacy static HTML/JS dashboard, served by Express at "/"
│   ├── database/             # migrations & seeds
│   ├── tests/                # plain Node.js integration tests
│   ├── scratch/              # one-off/experimental scripts
│   └── *.js                  # setup_db.js, seed_*.js, create_test_users.js, etc.
│
├── frontend/                 #  dashboard — React + Vite
├── install.sh                # macOS/Linux automated setup
├── install.ps1               # Windows automated setup
└── requirements.txt          # Python dependencies for ML microservice
```


---

## 📋 Prerequisites

| Requirement | Version |
|---|---|
| Node.js | v18+ |
| npm | latest |
| Python | 3.8 – 3.11 |
| pip | latest |
| PostgreSQL | v14+ (local or remote) |

---

## 🚀 Quick Start

<table>
<tr>
<td width="50%" valign="top">

**🪟 Windows — PowerShell**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
./install.ps1
```

</td>
<td width="50%" valign="top">

**🍎 macOS / 🐧 Linux — Bash**

```bash
chmod +x install.sh
./install.sh
```

</td>
</tr>
</table>

The automated scripts install Node dependencies, create the Python virtual environment, and install Python dependencies.

> 💡 If a script fails on `cd backend`, run `cd Backend` instead (case mismatch).

---

## 🔧 Manual Setup

### 1️⃣ Database

```sql
CREATE DATABASE backend_db;
```

```bash
cp Backend/.env.example Backend/.env
```

Then configure PostgreSQL credentials in `Backend/.env`.

### 2️⃣ Backend — Express API

```bash
cd Backend
npm install
```

### 3️⃣ ML Microservice — Python

```bash
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

> The Express server auto-detects `.venv` and launches `uvicorn` — no separate ML startup needed.

### 4️⃣ Frontend — React Dashboard

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

If the API isn't on the default address, set `VITE_API_BASE_URL` in the frontend `.env`.

---

## 🔐 Environment Variables

<table>
<tr>
<td valign="top">

**`Backend/.env`**
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backend_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

</td>
<td valign="top">

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:3000
```

</td>
</tr>
</table>

---

## ▶️ Running the Application

```bash
# Terminal 1 — Backend (also spawns ML service on :8000)
cd Backend
npm start
```

```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
```

| Service | Port |
|---|:---:|
| Express API | `3000` |
| FastAPI ML Microservice | `8000` |
| React/Vite Dashboard | `5173` |

---

## 🌱 Seeding Initial Data

Run **in order** from `Backend/`:

```bash
node setup_db.js                     # 1. Create schema & tables
node seed_all_villages.js            # 2. Seed Haryana village data
node create_test_users.js            # 3. Create test accounts (Village Head, Auditor, Admin)
node seed_dummy_farms_and_scores.js  # 4. Dummy farm & sustainability data
node assign_villages.js              # 5. Assign test Village Heads to villages
```

---

## 📡 API Overview

All routes mounted under **`/api`** &nbsp;•&nbsp; Health check: `GET /api/health`

| Area | Base Path | Function |
|---|---|---|
| Auth | `/api/auth` | Registration, login, user info |
| Geography | `/api/geography` | States, districts, villages |
| Agriculture | `/api/agriculture` | Seasons, crops, irrigation methods |
| Farms | `/api/farms` | Farm CRUD |
| Crop Records | `/api` | Farm crop records |
| Audits | `/api/audits` | Field audit records |
| Schemes | `/api/schemes` | Government schemes |
| Sustainability | `/api` | Farm & sustainability scores |
| Groundwater | `/api/groundwater` | Predictions & heatmaps |
| Groundwater Assessments | `/api/groundwater-assessments` | Assessment data |
| Recommendations | `/api` | Irrigation recommendations |
| Reference | `/api/reference` | Recommendation options |
| ML Proxy | `/api/ml` | ML prediction requests |

**FastAPI ML Endpoints** (internal, port `8000`, proxied by Node):

```text
POST /predict
POST /predict-recharge
POST /recommend-technique
```
---

## 🧪 Testing

```bash
cd Backend
npm test
```

Plain Node.js integration tests covering: Authentication · Farms · Crop records · Audits · Schemes · Sustainability scores · Groundwater heatmaps · Groundwater assessments · ML recharge functionality.

> Requires a running database and live API services — these are real endpoint tests, not Jest/Mocha mocks.

---


## 📚 Documentation Index

| Doc | Contents |
|---|---|
| [`Backend/AGENTS.md`](./Backend/AGENTS.md) | Backend architecture & data model reference |
| [`SITEMAP.md`](./SITEMAP.md) | Frontend route structure & role-based workspace mapping |
| [`RECOMMENDATION_ENGINE_FORMULA_AND_SOURCES.md`](./RECOMMENDATION_ENGINE_FORMULA_AND_SOURCES.md) | Scoring methodology, formulas, supporting sources |

---

<div align="center">

### 💧 JalSaarthi

*Groundwater intelligence → Irrigation decisions → Field verification → Sustainability measurement → Government scheme targeting*

**Built for farmers. Built for policy makers. Built for water.**

</div>
