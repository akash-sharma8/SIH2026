# RailETA (SIH26028) - System Architecture & Development Guide

This document outlines the core architecture, data flow, and development strategy for the RailETA project. It serves as a unified mental model for the entire team (Frontend, Backend, and ML).

---

## 1. The Mental Model (The Restaurant Analogy)
To understand how our system works, think of it like a restaurant:
*   **Frontend (Dashboard):** The Waiter. Takes the order from the customer and serves the final dish.
*   **Backend (FastAPI):** The Kitchen Manager. Takes the order, gathers ingredients, cleans them, passes them to the right chef, and plates the final dish.
*   **RailRadar (Live Data):** The Raw Ingredients.
*   **ML Models:** The Chefs. They don't fetch data; they just process what the manager gives them and output a prediction.

**Backend's Golden Rule:** The backend's job is *not* to make predictions. Its job is to orchestrate: 
Receive Request -> Fetch Data -> Clean Data -> Route to Correct ML Model -> Return Proper JSON.

---

## 2. Core Architecture & Data Flow

`	ext
USER
 │
 ▼
Frontend Dashboard (Train Number + Date)
 │
 ▼
FastAPI Backend
 ├── 1. Input Validation
 ├── 2. Cache Check (Save API Quota)
 ├── 3. Fetch Live Data (RailRadar API)
 ├── 4. Data Normalization & Leakage Protection
 ├── 5. Identify Journey Stage (Pre-departure vs. Running)
 ├── 6. Route to Correct ML Model (Model 1, 2, or 3)
 ├── 7. Generate Prediction
 └── 8. Format JSON Response & Cache Result
 │
 ▼
Frontend Dashboard (Displays ETA & Timeline)
`

---

## 3. The Three Specialized ML Models
We are not using a "one-size-fits-all" model. The ML team has provided 3 specialized models:

1.  **Model 1 (Pre-Departure Specialist):** Used when the train hasn't started yet. Predicts destination delay based on historical data.
2.  **Model 2 (Next-Station Specialist):** Used for running trains. Predicts the ETA for the *immediate next station* based on current delay and speed.
3.  **Model 3 (Later-Stations Forecaster):** Predicts delay recovery or propagation for all subsequent stations (Station +2, +3, +4... Destination).

---

## 4. The "Normalizer" (Crucial for Data Integrity)
RailRadar provides live data, but it includes *provider-estimated* future times. If we feed these future estimates directly into our ML models, it causes **Data Leakage** (fake-good predictions). 

**The Normalizer's Job:**
*   Past Stations -> Actual timestamps (Allowed)
*   Future Stations -> Strip provider ETAs, leave actual arrival empty (Protected)
This ensures our ML models are making real predictions based purely on observed facts.

---

## 5. Hackathon Fail-Safe Strategy (Demo vs. Live)

Live APIs (like RailRadar) often fail or hit rate limits during live hackathon presentations. We have a robust fail-safe:

*   **GET /v1/demo (The Safety Net):** Uses a saved, verified JSON (saved_journey_12615.json). It runs through the *real* Normalizer and *real* ML Models, but skips the external RailRadar network call. **This ensures our demo will never break on stage.**
*   **POST /v1/forecast/live (The Real Engine):** Fetches live data from RailRadar. Uses In-Memory Caching (TTL) so if 20 judges search the same train, we only hit the external API once, protecting our quota.

---

## 6. MVP Scope (What we are doing NOW vs. LATER)

To ensure we have a 100% working project, we are strictly scoping our features.
**Phase 1 (Core MVP - Mandatory):**
✅ Python 3.11, FastAPI, Pandas/Numpy
✅ CatBoost & LightGBM Models integration
✅ Standalone API endpoints & Caching
✅ Working Frontend Dashboard

**Phase 2 (Optional Enhancements - ONLY if time permits):**
⏳ PostgreSQL (History/Analytics)
⏳ Redis Cluster (Distributed caching)
⏳ Weather API Integration
⏳ SHAP (Explainability - "Why is the train late?")
⏳ Interactive Geo-Map (Leaflet)

---

## 7. Backend Folder Structure

*   pp/api/ -> Handles HTTP requests and routes.
*   pp/services/ -> Core business logic (Inference routing, Cache management).
*   pp/clients/ -> Talks to external APIs (RailRadar).
*   pp/inference/ -> ML-related code and model loading.
*   pp/schemas/ -> Pydantic models for Input/Output validation.
*   pp/core/ -> Configurations, logging, and error handling.

---

## 8. Development Methodology
We build iteratively to prevent untrackable bugs.
**Write -> Run -> Verify -> Mark Complete -> Next.**
