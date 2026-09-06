---
title: RailETA
emoji: 🚆
colorFrom: blue
colorTo: green
sdk: gradio
app_file: app.py
pinned: false
license: mit
---

# RailETA

RailETA is a three-model train-delay and station ETA
forecasting prototype developed for SIH26028.

- Model 1: pre-departure destination-delay prior
- Model 2: immediate next-station prediction
- Model 3: later-station multi-horizon ETA prediction

The application includes a saved demonstration that does not
consume live API quota. Live lookups require the
`RAILRADAR_API_KEY` Space secret.

AI-generated estimates should be verified against official
Indian Railways information before making critical travel
decisions.
