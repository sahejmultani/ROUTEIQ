# ROUTEIQ

RouteIQ is a fleet‑management heatmap application using **Next.js** (frontend) and **FastAPI** (backend).

Data is sourced from the Geotab demo API (https://my.geotab.com/demo_vibe_code_comp/#dashboard) and processed to highlight high‑risk driving areas based on braking events, speed delta from limits and other telematics.

## Architecture

- `backend/` – FastAPI service that fetches and analyses Geotab data, exposing a `/heatmap` endpoint returning risk points.
- `frontend/` – Next.js app displaying a Leaflet map with a colored heat overlay and modern UI.

## Getting started

### Prerequisites

- Python 3.10+
- Node 18 (or newer) for the frontend
- `pip` and `npm` available on your PATH

### Backend

1. Create a virtual environment and activate it:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   ```
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) configure Geotab credentials via environment variables.
4. Run the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

The API will be available at `http://localhost:8000`.

### Frontend

1. Change into the frontend directory and install packages:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser to view the map.

The Next.js API route `/api/heatmap` proxies to the backend, so both servers must be running.

## Future work

- Implement actual Geotab authentication and event parsing
- Calculate risk based on braking, speed vs limit, blind‑spot slowdowns
- Add filtering by vehicle, date range, region
- Enhance the frontend with a modern component library (Tailwind, Chakra, Material)
  or custom stylesheet; include interactive controls (toggle heat layers, select
date, choose vehicle groups)
- Improve the map UI with cluster layers, animated transitions, and responsive
  layout for fleet managers on desktop and mobile
- Deploy to a cloud provider with HTTPS
