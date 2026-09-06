
# ============================================================
# STEP 57.1 — RailETA public Hugging Face application
# ============================================================

import json
from datetime import date
from pathlib import Path

import gradio as gr

import runtime


PACKAGE_ROOT = Path(__file__).resolve().parent
SAVED_DEMO_PATH = (
    PACKAGE_ROOT
    / "demo"
    / "saved_journey_12615.json"
)

DASHBOARD_CSS = '\n:root {\n  --rail-blue: #12355b;\n  --rail-blue-light: #eaf2fb;\n  --rail-orange: #f97316;\n  --rail-green: #15803d;\n  --rail-red: #dc2626;\n  --rail-ink: #172033;\n  --rail-muted: #64748b;\n  --rail-border: #dbe4ef;\n  --rail-surface: #ffffff;\n  --rail-background: #f4f7fb;\n}\n\n.gradio-container {\n  max-width: 1440px !important;\n  margin: auto !important;\n  background: var(--rail-background) !important;\n  color: var(--rail-ink) !important;\n}\n\n.public-shell {\n  margin-top: 8px;\n}\n\n.public-brand {\n  padding: 22px 26px;\n  border-radius: 20px;\n  color: white;\n  background:\n    linear-gradient(120deg, #0f2f50 0%, #174f7c 65%, #1f6f8b 100%);\n  box-shadow: 0 14px 40px rgba(15, 47, 80, 0.18);\n}\n\n.public-brand h1 {\n  margin: 0;\n  font-size: 30px;\n  line-height: 1.15;\n}\n\n.public-brand p {\n  margin: 8px 0 0;\n  color: #d9ecff;\n  font-size: 15px;\n}\n\n.search-panel {\n  padding: 18px !important;\n  border: 1px solid var(--rail-border) !important;\n  border-radius: 18px !important;\n  background: white !important;\n  box-shadow: 0 8px 28px rgba(30, 64, 100, 0.07);\n}\n\n.journey-hero {\n  display: flex;\n  justify-content: space-between;\n  gap: 24px;\n  padding: 26px;\n  border-radius: 20px;\n  color: white;\n  background: linear-gradient(120deg, #12355b, #1d5f8f);\n}\n\n.train-badge,\n.live-label {\n  font-size: 12px;\n  font-weight: 800;\n  letter-spacing: 0.09em;\n}\n\n.journey-hero h1 {\n  margin: 8px 0;\n  font-size: 28px;\n}\n\n.route-title {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  color: #d7eaff;\n  font-size: 16px;\n}\n\n.route-arrow {\n  color: #fdba74;\n  font-size: 22px;\n}\n\n.live-location {\n  min-width: 240px;\n  padding: 18px;\n  border: 1px solid rgba(255,255,255,0.24);\n  border-radius: 16px;\n  background: rgba(255,255,255,0.10);\n}\n\n.live-dot {\n  display: inline-block;\n  width: 9px;\n  height: 9px;\n  margin-right: 7px;\n  border-radius: 50%;\n  background: #4ade80;\n  box-shadow: 0 0 0 5px rgba(74,222,128,0.15);\n}\n\n.location-title {\n  margin-top: 13px;\n  font-size: 20px;\n  font-weight: 750;\n}\n\n.location-code {\n  margin-top: 4px;\n  color: #d7eaff;\n}\n\n.metric-grid {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 14px;\n  margin: 16px 0;\n}\n\n.metric-card {\n  min-height: 132px;\n  padding: 18px;\n  border: 1px solid var(--rail-border);\n  border-radius: 17px;\n  background: white;\n  box-shadow: 0 7px 22px rgba(30,64,100,0.06);\n}\n\n.metric-label {\n  color: var(--rail-muted);\n  font-size: 13px;\n  font-weight: 700;\n}\n\n.metric-value {\n  margin-top: 12px;\n  color: var(--rail-ink);\n  font-size: 25px;\n  font-weight: 800;\n}\n\n.small-value {\n  font-size: 18px;\n}\n\n.metric-note {\n  margin-top: 8px;\n  color: var(--rail-muted);\n  font-size: 12px;\n}\n\n.warning-card {\n  border-left: 5px solid var(--rail-orange);\n}\n\n.success-card {\n  border-left: 5px solid var(--rail-green);\n}\n\n.early-card {\n  border-left: 5px solid #2563eb;\n}\n\n.progress-panel {\n  margin: 10px 0 18px;\n  padding: 21px;\n  border: 1px solid var(--rail-border);\n  border-radius: 17px;\n  background: white;\n}\n\n.progress-heading,\n.progress-labels {\n  display: flex;\n  justify-content: space-between;\n}\n\n.progress-heading {\n  margin-bottom: 18px;\n}\n\n.progress-track {\n  position: relative;\n  height: 12px;\n  border-radius: 20px;\n  background: #dce6f1;\n}\n\n.progress-fill {\n  height: 100%;\n  border-radius: 20px;\n  background: linear-gradient(90deg, #2563eb, #16a34a);\n}\n\n.train-marker {\n  position: absolute;\n  top: -22px;\n  transform: translateX(-50%);\n  font-size: 27px;\n}\n\n.progress-labels {\n  margin-top: 13px;\n  color: var(--rail-muted);\n  font-size: 11px;\n}\n\n.model-explanation {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 14px;\n}\n\n.model-explanation > div {\n  padding: 17px;\n  border: 1px solid var(--rail-border);\n  border-radius: 15px;\n  background: white;\n}\n\n.model-explanation p {\n  color: var(--rail-muted);\n  font-size: 13px;\n}\n\n.engine-pill {\n  display: inline-block;\n  margin-right: 8px;\n  padding: 4px 8px;\n  border-radius: 8px;\n  color: white;\n  font-size: 10px;\n  font-weight: 800;\n}\n\n.engine-two {\n  background: #2563eb;\n}\n\n.engine-three {\n  background: #f97316;\n}\n\n.confidence-pill {\n  background: #15803d;\n}\n\n.error-panel {\n  padding: 20px;\n  border-radius: 15px;\n  color: #991b1b;\n  background: #fee2e2;\n}\n\n@media (max-width: 900px) {\n  .metric-grid,\n  .model-explanation {\n    grid-template-columns: repeat(2, 1fr);\n  }\n\n  .journey-hero {\n    flex-direction: column;\n  }\n}\n\n@media (max-width: 600px) {\n  .metric-grid,\n  .model-explanation {\n    grid-template-columns: 1fr;\n  }\n\n  .public-brand h1 {\n    font-size: 24px;\n  }\n}\n\n/* ========================================================\n   RailETA public accessibility overrides\n   ======================================================== */\n\n.gradio-container {\n  color-scheme: light !important;\n\n  --body-background-fill: #f4f7fb !important;\n  --body-text-color: #172033 !important;\n\n  --block-background-fill: #ffffff !important;\n  --block-label-background-fill: transparent !important;\n  --block-label-text-color: #334155 !important;\n  --block-title-text-color: #172033 !important;\n\n  --input-background-fill: #ffffff !important;\n  --input-border-color: #cbd5e1 !important;\n  --input-placeholder-color: #94a3b8 !important;\n\n  --button-secondary-background-fill: #eaf2fb !important;\n  --button-secondary-text-color: #12355b !important;\n}\n\n/* Search panel */\n.search-panel,\n.search-panel .form,\n.search-panel .block {\n  background: #ffffff !important;\n  color: #172033 !important;\n}\n\n.search-panel h3,\n.search-panel label,\n.search-panel label span,\n.search-panel .label-wrap {\n  color: #334155 !important;\n  background: transparent !important;\n  font-weight: 700 !important;\n}\n\n.search-panel input,\n.search-panel textarea {\n  color: #172033 !important;\n  background: #ffffff !important;\n  border-color: #cbd5e1 !important;\n}\n\n.search-panel input::placeholder {\n  color: #94a3b8 !important;\n}\n\n/* Tabs: ensure every tab is visible */\n.public-tabs button[role="tab"] {\n  color: #475569 !important;\n  background: transparent !important;\n  opacity: 1 !important;\n  font-weight: 700 !important;\n}\n\n.public-tabs button[role="tab"]:hover {\n  color: #1d4ed8 !important;\n  background: #eff6ff !important;\n}\n\n.public-tabs button[role="tab"][aria-selected="true"] {\n  color: #1d4ed8 !important;\n  border-bottom-color: #2563eb !important;\n  background: #eff6ff !important;\n}\n\n/* Travel update */\n.travel-update,\n.travel-update .prose,\n.travel-update h1,\n.travel-update h2,\n.travel-update h3,\n.travel-update p,\n.travel-update strong {\n  color: #172033 !important;\n  opacity: 1 !important;\n}\n\n.travel-update {\n  padding: 18px 20px;\n  border: 1px solid #bfdbfe;\n  border-left: 5px solid #2563eb;\n  border-radius: 15px;\n  background: #eff6ff !important;\n}\n\n/* Journey progress */\n.progress-panel,\n.progress-panel span,\n.progress-panel strong,\n.progress-heading,\n.progress-labels {\n  color: #334155 !important;\n  opacity: 1 !important;\n}\n\n.progress-heading strong {\n  color: #12355b !important;\n}\n\n.progress-labels span {\n  color: #64748b !important;\n}\n\n/* Model explanation */\n.model-explanation strong {\n  color: #172033 !important;\n  opacity: 1 !important;\n}\n\n.model-explanation p {\n  color: #475569 !important;\n  opacity: 1 !important;\n}\n\n/* Public table */\n.public-timeline,\n.public-timeline label,\n.public-timeline .label-wrap {\n  color: #334155 !important;\n  background: #ffffff !important;\n}\n\n.public-timeline table {\n  font-size: 14px !important;\n}\n\n.public-timeline th {\n  color: #ffffff !important;\n  background: #12355b !important;\n  font-weight: 750 !important;\n}\n\n.public-timeline td {\n  color: #172033 !important;\n  background: #ffffff !important;\n}\n\n.public-timeline tr:nth-child(even) td {\n  background: #f8fafc !important;\n}\n\n/* Chart and content cards */\n.public-chart,\n.public-chart .block {\n  color: #172033 !important;\n  background: #ffffff !important;\n}\n\n/* General readable headings */\n.public-content-title,\n.public-content-title * {\n  color: #172033 !important;\n}\n\n/* Mobile improvements */\n@media (max-width: 700px) {\n  .public-tabs button[role="tab"] {\n    padding: 9px 8px !important;\n    font-size: 12px !important;\n  }\n\n  .public-timeline table {\n    font-size: 12px !important;\n  }\n\n  .progress-labels {\n    gap: 12px;\n  }\n}\n\n/* ========================================================\n   RailETA V3 — guaranteed contrast\n   ======================================================== */\n\n/* Brand banner */\n.public-brand,\n.public-brand h1,\n.public-brand p {\n  color: #ffffff !important;\n  opacity: 1 !important;\n}\n\n.public-brand h1 {\n  text-shadow: 0 1px 2px rgba(0,0,0,0.14);\n}\n\n/* Hero remains white on blue */\n.journey-hero,\n.journey-hero h1,\n.journey-hero .train-badge,\n.journey-hero .route-title,\n.journey-hero .route-title span,\n.journey-hero .live-label,\n.journey-hero .location-title,\n.journey-hero .location-code {\n  color: #ffffff !important;\n  opacity: 1 !important;\n}\n\n.journey-hero .route-title,\n.journey-hero .location-code {\n  color: #d9ecff !important;\n}\n\n/* Passenger route table */\n.passenger-timeline-shell {\n  width: 100%;\n  overflow: hidden;\n  border: 1px solid #d7e2ef;\n  border-radius: 16px;\n  background: #ffffff;\n  box-shadow: 0 7px 24px rgba(30,64,100,0.06);\n}\n\n.timeline-legend {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 20px;\n  padding: 15px 18px;\n  color: #475569 !important;\n  background: #f8fafc;\n  border-bottom: 1px solid #e2e8f0;\n  font-size: 13px;\n  font-weight: 650;\n}\n\n.timeline-legend span {\n  color: #475569 !important;\n}\n\n.legend-dot {\n  display: inline-block;\n  width: 9px;\n  height: 9px;\n  margin-right: 7px;\n  border-radius: 50%;\n}\n\n.passed-dot {\n  background: #2563eb;\n}\n\n.current-dot {\n  background: #16a34a;\n  box-shadow: 0 0 0 4px rgba(22,163,74,0.14);\n}\n\n.upcoming-dot {\n  border: 2px solid #f97316;\n  background: #ffffff;\n}\n\n.passenger-timeline-scroll {\n  width: 100%;\n  max-height: 650px;\n  overflow: auto;\n}\n\n.passenger-timeline-table {\n  width: 100%;\n  min-width: 1040px;\n  border-collapse: collapse;\n  background: #ffffff !important;\n}\n\n.passenger-timeline-table thead {\n  position: sticky;\n  top: 0;\n  z-index: 4;\n}\n\n.passenger-timeline-table th {\n  padding: 15px 13px;\n  color: #ffffff !important;\n  background: #12355b !important;\n  border-right: 1px solid rgba(255,255,255,0.14);\n  text-align: left;\n  font-size: 13px;\n  font-weight: 750;\n}\n\n.passenger-timeline-table td {\n  padding: 14px 13px;\n  color: #172033 !important;\n  background: #ffffff !important;\n  border-bottom: 1px solid #e6edf5;\n  vertical-align: middle;\n  font-size: 13px;\n}\n\n.passenger-timeline-table tr:hover td {\n  background: #f8fbff !important;\n}\n\n.passenger-timeline-table tr.timeline-current td {\n  background: #ecfdf5 !important;\n  border-top: 1px solid #86efac;\n  border-bottom: 1px solid #86efac;\n}\n\n.passenger-timeline-table tr.timeline-upcoming td {\n  background: #fffdf9 !important;\n}\n\n.timeline-status-cell {\n  width: 45px;\n  text-align: center;\n}\n\n.route-node {\n  display: inline-flex;\n  width: 25px;\n  height: 25px;\n  align-items: center;\n  justify-content: center;\n  border-radius: 50%;\n  color: #ffffff !important;\n  font-weight: 800;\n}\n\n.route-node.status-passed {\n  background: #2563eb;\n}\n\n.route-node.status-current {\n  background: #16a34a;\n  box-shadow: 0 0 0 5px rgba(22,163,74,0.14);\n}\n\n.route-node.status-upcoming {\n  color: #f97316 !important;\n  border: 2px solid #f97316;\n  background: #ffffff;\n}\n\n.route-node.status-scheduled {\n  color: #64748b !important;\n  border: 1px solid #94a3b8;\n  background: #ffffff;\n}\n\n.timeline-station-name,\n.timeline-primary,\n.timeline-delay,\n.confidence-text {\n  color: #172033 !important;\n  opacity: 1 !important;\n}\n\n.timeline-station-name {\n  font-size: 14px;\n  font-weight: 760;\n}\n\n.timeline-secondary {\n  margin-top: 3px;\n  color: #64748b !important;\n  font-size: 11px;\n}\n\n.timeline-delay {\n  font-weight: 720;\n}\n\n.status-badge {\n  display: inline-block;\n  padding: 5px 9px;\n  border-radius: 20px;\n  font-size: 11px;\n  font-weight: 750;\n}\n\n.status-badge.status-passed {\n  color: #1d4ed8 !important;\n  background: #dbeafe;\n}\n\n.status-badge.status-current {\n  color: #166534 !important;\n  background: #dcfce7;\n}\n\n.status-badge.status-upcoming {\n  color: #9a3412 !important;\n  background: #ffedd5;\n}\n\n.status-badge.status-scheduled {\n  color: #475569 !important;\n  background: #e2e8f0;\n}\n\n.mobile-status-label {\n  display: none;\n}\n\n/* Ensure passenger notice stays readable */\n.passenger-notice,\n.passenger-notice * {\n  color: #9a3412 !important;\n}\n\n/* Mobile station cards */\n@media (max-width: 720px) {\n  .timeline-legend {\n    gap: 12px;\n  }\n\n  .passenger-timeline-scroll {\n    max-height: none;\n    overflow: visible;\n  }\n\n  .passenger-timeline-table,\n  .passenger-timeline-table tbody {\n    display: block;\n    min-width: 0;\n  }\n\n  .passenger-timeline-table thead {\n    display: none;\n  }\n\n  .passenger-timeline-table tr {\n    display: grid;\n    grid-template-columns: 38px 1fr;\n    margin: 10px;\n    padding: 12px;\n    border: 1px solid #dbe4ef;\n    border-radius: 13px;\n    background: #ffffff;\n  }\n\n  .passenger-timeline-table td {\n    display: block;\n    padding: 5px 8px;\n    border: 0;\n    background: transparent !important;\n  }\n\n  .passenger-timeline-table td:first-child {\n    grid-row: 1 / span 6;\n    grid-column: 1;\n  }\n\n  .passenger-timeline-table td:nth-child(n+2) {\n    grid-column: 2;\n  }\n\n  .passenger-timeline-table td:nth-child(3) {\n    display: none;\n  }\n\n  .mobile-status-label {\n    display: block;\n    margin-top: 3px;\n    color: #64748b !important;\n    font-size: 11px;\n  }\n}\n'


def load_saved_demo():
    """Load the packaged journey without consuming API quota."""

    if not SAVED_DEMO_PATH.exists():
        raise gr.Error(
            "The saved demonstration journey is unavailable."
        )

    with open(
        SAVED_DEMO_PATH,
        "r",
        encoding="utf-8",
    ) as file:
        raw_payload = json.load(file)

    normalized_df = runtime.normalize_live_journey(
        raw_payload
    )

    service_response = (
        runtime.build_hybrid_eta_service_response(
            normalized_df
        )
    )

    return runtime.render_public_journey_v3(
        normalized_df,
        service_response,
    )


def run_live_lookup(train_number, journey_date):
    """Run one live RailRadar lookup and render its forecast."""

    cleaned_train_number = str(
        train_number or ""
    ).strip()

    if not cleaned_train_number.isdigit():
        raise gr.Error(
            "Enter a valid numeric train number."
        )

    if len(cleaned_train_number) != 5:
        raise gr.Error(
            "Train number must contain exactly five digits."
        )

    cleaned_journey_date = str(
        journey_date or ""
    ).strip()

    if not cleaned_journey_date:
        raise gr.Error(
            "Select the journey start date."
        )

    if not runtime.RAILRADAR_API_KEY:
        raise gr.Error(
            "Live lookup is temporarily unavailable because "
            "the RailRadar API secret is not configured. "
            "You can still use the saved journey demonstration."
        )

    try:
        return runtime.run_live_train_forecast(
            cleaned_train_number,
            cleaned_journey_date,
        )

    except Exception as error:
        raise gr.Error(str(error)) from error


with gr.Blocks(
    title="RailETA — AI Train Arrival Forecasts",
    css=DASHBOARD_CSS,
    theme=gr.themes.Soft(
        primary_hue="blue",
        secondary_hue="orange",
        neutral_hue="slate",
    ),
) as demo:

    gr.HTML(
        """
        <section class="rail-hero">
            <h1>RailETA</h1>
            <p>
                Live, AI-powered arrival forecasts for
                Indian coaching trains
            </p>
        </section>
        """
    )

    with gr.Group(elem_id="search-panel"):
        gr.Markdown("## Find your train")

        with gr.Row():
            train_number_input = gr.Textbox(
                label="Train number",
                placeholder="Example: 12615",
                value="12615",
                max_lines=1,
                scale=2,
            )

            journey_date_input = gr.Textbox(
                label="Journey start date",
                placeholder="YYYY-MM-DD",
                value="2026-08-29",
                max_lines=1,
                scale=2,
            )

            live_button = gr.Button(
                "Check live ETA",
                variant="primary",
                elem_id="live-button",
                scale=1,
            )

        demo_button = gr.Button(
            "Explore saved journey demo",
            elem_id="demo-button",
        )

        gr.Markdown(
            "*Saved demo does not consume API quota.*"
        )

    status_message = gr.Markdown(
        "Use the saved demo or search for a live train."
    )

    journey_header_output = gr.HTML()
    metric_cards_output = gr.HTML()
    progress_output = gr.HTML()
    passenger_insight_output = gr.HTML()

    with gr.Tabs():
        with gr.Tab("Journey timeline"):
            timeline_output = gr.HTML()

        with gr.Tab("Delay forecast"):
            delay_chart_output = gr.Plot()

        with gr.Tab("Forecast details"):
            raw_response_output = gr.JSON(
                label="Structured journey forecast"
            )

        with gr.Tab("About the AI"):
            model_explanation_output = gr.HTML()

    gr.HTML(
        """
        <div style="
            margin: 28px 0 10px;
            padding: 14px 18px;
            border: 1px solid #fed7aa;
            border-radius: 14px;
            background: #fff7ed;
            color: #9a3412;
        ">
            <strong>Passenger notice:</strong>
            RailETA provides AI-generated arrival estimates.
            Confirm critical travel decisions with official
            Indian Railways information.
        </div>
        """
    )

    dashboard_outputs = [
        journey_header_output,
        metric_cards_output,
        progress_output,
        passenger_insight_output,
        timeline_output,
        delay_chart_output,
        model_explanation_output,
        raw_response_output,
    ]

    live_event = live_button.click(
        fn=run_live_lookup,
        inputs=[
            train_number_input,
            journey_date_input,
        ],
        outputs=dashboard_outputs,
        show_progress="full",
        concurrency_limit=1,
    )

    demo_event = demo_button.click(
        fn=load_saved_demo,
        inputs=[],
        outputs=dashboard_outputs,
        show_progress="full",
        concurrency_limit=2,
    )

    live_event.success(
        fn=lambda: (
            "✅ Live journey forecast loaded successfully."
        ),
        outputs=status_message,
    )

    demo_event.success(
        fn=lambda: (
            "✅ Saved journey demonstration loaded successfully."
        ),
        outputs=status_message,
    )

    demo.load(
        fn=load_saved_demo,
        inputs=[],
        outputs=dashboard_outputs,
    )


if __name__ == "__main__":
    demo.queue(
        default_concurrency_limit=2,
        max_size=10,
    ).launch()
