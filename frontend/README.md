# AI-Powered Irrigation Advisory Dashboard — KJS-AGR-01

A React + Vite dashboard prototype for the KIAAR/GBL "Irrigation Advisory
System for Sugarcane Crop using AI and Sensor-based Technology" use case
(KJS-AGR-01). Built to mirror the sections called out in the use-case
document: irrigation advisory, soil & sensor status, weather forecast, crop
health, fertigation advisory, yield prediction, alerts, and irrigation/water
summary.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL (Vite defaults to `http://localhost:5173`).

## What's real vs. mocked

- **Weather Forecast** calls a real, free API — [Open-Meteo](https://open-meteo.com)
  — with the browser's Fetch API, no key required. It's centered on
  Sameerwadi, Karnataka (the KIAAR/GBL region) and shows a live 5-day
  forecast.
- Everything else (soil moisture, NDVI, AI irrigation/fertigation/yield
  predictions, alerts, irrigation history) is mock data in
  `src/data/mockData.js`, modelled on the AI models and workflow described in
  Sections 9 and 11 of the use-case document. In the real system these would
  come from the sensor network, the AI prediction models, and the LLM-based
  advisory generation layer.

## Forms

- **Farm / Plot selector** (top bar) — switches which plot's data the whole
  dashboard displays. Two farms with three plots are wired up as presets.
- **Log irrigation event** (from the Irrigation Advisory card) — records an
  irrigation date, duration, and method; confirms with a toast.
- **Report an issue / request field visit** (from the Alerts card) —
  category, urgency, description, and an optional contact number.

## Structure

```
src/
  data/mockData.js         farm/plot mock data
  components/
    Sidebar.jsx             left nav
    TopBar.jsx               farm/plot selection form
    WeatherCard.jsx          live Open-Meteo fetch
    IrrigationAdvisoryCard.jsx
    SoilSensorCard.jsx
    CropHealthCard.jsx       NDVI / water-stress sparklines (recharts)
    IrrigationHistoryCard.jsx  bar chart of recent irrigations
    FertigationCard.jsx
    YieldPredictionCard.jsx
    AlertsCard.jsx
    Modal.jsx, LogIrrigationForm.jsx, ReportIssueForm.jsx
  App.jsx / App.css
```

## Next steps for a real build

- Swap `mockData.js` for calls to the actual sensor/AI backend APIs
  described in Section 11 (Data Acquisition → AI Analytics → Decision
  Support).
- Add auth for farmer login, and role-based views for field supervisors vs.
  farmers per the Human-in-the-Loop governance note (Section 13).
- Wire the "Log irrigation" and "Report an issue" forms to real endpoints
  instead of local state.
