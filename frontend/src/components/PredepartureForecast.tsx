"use client";

import {
    FormEvent,
    useState,
} from "react";

import {
    railEtaApi,
} from "@/lib/api/raileta-api";

import {
    RailETAApiError,
} from "@/lib/api/api-client";

import type {
    PredepartureForecastRequest,
    PredepartureForecastResponse,
} from "@/lib/api/api-types";


const initialPayload: PredepartureForecastRequest = {
    train: {
        train_number: "12615",
        train_type: "Express",
    },

    schedule: {
        year: 2026,
        month: 9,
        day_of_week: 1,
        departure_hour: 10,
        is_weekend: 0,
        is_night_departure: 0,
        is_peak_hour: 0,
        is_festival_season: 0,
        season: "Monsoon",
    },

    route: {
        zone: "SR",
        zone_abbr: "SR",
        source_station_category: "A1",
        destination_station_category: "A1",
        distance_km: 2182,
        num_scheduled_stops: 40,
        scheduled_travel_hours: 36,
        route_historical_ontime_pct: 70,
    },

    infrastructure: {
        track_doubled: 1,
        is_hdn_route: 1,
        traction_type: "Electric (25kV AC)",
        is_electrified: 1,
        psr_count: 1,
        is_circular_route: 0,
    },

    weather_risk: {
        is_monsoon_season: 1,
        is_fog_risk: 0,
        fog_risk_score: 0.1,
        zone_fog_index: 0.2,
        zone_congestion_index: 0.3,
        season_severity_score: 0.4,
    },

    operations: {
        loco_age_years: 5,
        coach_age_years: 4,
        has_lhb_coaches: 1,
        is_rake_shared: 0,
        maintenance_score: 85,
        seat_utilisation_pct: 80,
        is_overloaded: 0,
        late_incoming_rake: 0,
        is_special_train: 0,
    },
};


export default function PredepartureForecast() {
    const [
        payload,
        setPayload,
    ] = useState<
        PredepartureForecastRequest
    >(initialPayload);

    const [
        showAdvancedDetails,
        setShowAdvancedDetails,
    ] = useState(false);

    const [
        result,
        setResult,
    ] = useState<
        PredepartureForecastResponse | null
    >(null);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    const [
        requestId,
        setRequestId,
    ] = useState<string | null>(null);

    function riskBadgeClass(
        risk: string,
    ) {
        if (risk === "LOW") {
            return "border-green-200 bg-green-50 text-green-700";
        }

        if (risk === "MODERATE") {
            return "border-yellow-200 bg-yellow-50 text-yellow-700";
        }

        if (
            risk === "HIGH"
            || risk === "SEVERE"
        ) {
            return "border-red-200 bg-red-50 text-red-700";
        }

        return "border-gray-200 bg-gray-50 text-gray-700";
    }


    function confidenceBadgeClass(
        confidence: string,
    ) {
        if (confidence === "HIGH") {
            return "border-green-200 bg-green-50 text-green-700";
        }

        if (confidence === "MEDIUM") {
            return "border-yellow-200 bg-yellow-50 text-yellow-700";
        }

        return "border-gray-200 bg-gray-50 text-gray-700";
    }
    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        try {
            setLoading(true);
            setError(null);
            setRequestId(null);
            setResult(null);

            const response =
                await railEtaApi
                    .getPredepartureForecast(
                        payload,
                    );

            setResult(response);

        } catch (err) {
            if (
                err instanceof RailETAApiError
            ) {
                setError(err.message);
                setRequestId(
                    err.requestId,
                );
                return;
            }

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to generate pre-departure forecast.",
            );

        } finally {
            setLoading(false);
        }
    }


    function updateTrainNumber(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,

            train: {
                ...current.train,
                train_number: value,
            },
        }));
    }


    function updateDepartureHour(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,

            schedule: {
                ...current.schedule,
                departure_hour:
                    Number(value),
            },
        }));
    }


    function updateDistance(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,

            route: {
                ...current.route,
                distance_km:
                    Number(value),
            },
        }));
    }
    function formatDelay(
        minutes: number,
    ) {
        const rounded =
            Math.round(minutes);

        if (rounded <= 0) {
            return "On time";
        }

        if (rounded < 60) {
            return `${rounded} min late`;
        }

        const hours =
            Math.floor(rounded / 60);

        const remaining =
            rounded % 60;

        if (remaining === 0) {
            return `${hours} hr late`;
        }

        return `${hours} hr ${remaining} min late`;
    }


    function confidenceText(
        confidence: string,
    ) {
        if (confidence === "HIGH") {
            return "Strong estimate based on the available journey information.";
        }

        if (confidence === "MEDIUM") {
            return "Useful estimate, but the actual delay may vary.";
        }

        return "Early estimate only. Live journey data will improve this after departure.";
    }


    function riskText(
        risk: string,
    ) {
        if (risk === "LOW") {
            return "Low delay risk";
        }

        if (risk === "MODERATE") {
            return "Moderate delay risk";
        }

        if (
            risk === "HIGH"
            || risk === "SEVERE"
        ) {
            return "High delay risk";
        }

        return `${risk} delay risk`;
    }

    const visibleLimitations =
        result?.limitations
            ?.map(
                (item) => item.trim(),
            )
            .filter(Boolean)
        ?? [];


    return (
        <section className="space-y-6">

            <div>
                <h2 className="text-2xl font-bold">
                    Pre-departure Delay Forecast
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Estimate destination delay before
                    live station observations are available.
                </p>
            </div>


            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
            >
                <div className="grid gap-4 md:grid-cols-3">

                    <div>
                        <label
                            htmlFor="pre-train-number"
                            className="mb-1 block font-medium"
                        >
                            Train Number
                        </label>

                        <input
                            id="pre-train-number"
                            value={
                                payload.train
                                    .train_number
                            }
                            onChange={(event) =>
                                updateTrainNumber(
                                    event.target.value,
                                )
                            }
                            required
                            inputMode="numeric"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>


                    <div>
                        <label
                            htmlFor="departure-hour"
                            className="mb-1 block font-medium"
                        >
                            Departure Hour
                        </label>

                        <input
                            id="departure-hour"
                            type="number"
                            min={0}
                            max={23}
                            value={
                                payload.schedule
                                    .departure_hour
                            }
                            onChange={(event) =>
                                updateDepartureHour(
                                    event.target.value,
                                )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>


                    <div>
                        <label
                            htmlFor="distance"
                            className="mb-1 block font-medium"
                        >
                            Route Distance (km)
                        </label>

                        <input
                            id="distance"
                            type="number"
                            min={1}
                            value={
                                payload.route
                                    .distance_km
                            }
                            onChange={(event) =>
                                updateDistance(
                                    event.target.value,
                                )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                </div>


                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    {loading
                        ? "Generating Forecast..."
                        : "Predict Destination Delay"}
                </button>
                {loading && (
                    <p className="text-xs text-gray-500">
                        Evaluating route, schedule and operational conditions...
                    </p>
                )}
            </form>


            {error && (
                <div className="rounded-xl border p-5">
                    <p className="font-semibold">
                        Unable to generate forecast
                    </p>

                    <p className="mt-1">
                        {error}
                    </p>

                    {requestId && (
                        <p className="mt-2 text-xs text-gray-500">
                            Request ID: {requestId}
                        </p>
                    )}
                </div>
            )}


            {result && (
                <div className="space-y-5">

                    {/* Forecast Hero */}
                    <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                        Before Departure
                                    </span>

                                    <span className="text-xs text-gray-500">
                                        {result.model.role}
                                    </span>
                                </div>

                                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                                    Expected delay at destination
                                </p>

                                <p className="mt-2 text-5xl font-black text-gray-900 sm:text-6xl">
                                    {formatDelay(
                                        result.forecast
                                            .predicted_destination_delay_min,
                                    )}
                                </p>

                                <p className="mt-3 max-w-xl text-sm text-gray-600">
                                    Estimated destination delay before
                                    live station observations become
                                    available.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Delay Risk
                                    </p>

                                    <span
                                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${riskBadgeClass(
                                            result.forecast.risk_level,
                                        )}`}
                                    >
                                        {riskText(
                                            result.forecast.risk_level,
                                        )}
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Confidence
                                    </p>

                                    <span
                                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${confidenceBadgeClass(
                                            result.forecast.confidence,
                                        )}`}
                                    >
                                        {result.forecast.confidence}
                                    </span>

                                    <p className="mt-2 text-xs leading-5 text-gray-500">
                                        {confidenceText(
                                            result.forecast.confidence,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Expected Range */}
                        <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Expected Delay Range
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {formatDelay(
                                    result.forecast.lower_delay_min,
                                )}
                                {" to "}
                                {formatDelay(
                                    result.forecast.upper_delay_min,
                                )}
                            </p>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                                This range shows the uncertainty before departure.
                                Once the train starts running, RailETA switches to
                                live journey models and the estimate becomes more
                                specific.
                            </p>
                        </div>
                    </div>


                    {/* Passenger-friendly explanation */}
                    {result.diagnostics
                        ?.prediction_explanation
                        ?.explanation_available && (
                            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                    RailETA Insight
                                </p>

                                <h3 className="mt-1 text-xl font-bold text-gray-900">
                                    Why this forecast?
                                </h3>

                                <p className="mt-1 text-sm text-gray-600">
                                    The main conditions that influenced this estimate.
                                </p>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    {result.diagnostics
                                        .prediction_explanation
                                        .factors
                                        .slice(0, 3)
                                        .map((factor) => (
                                            <div
                                                key={`${factor.feature}-${factor.rank ?? 0}`}
                                                className="rounded-xl bg-gray-50 p-4"
                                            >
                                                <p className="font-semibold text-gray-900">
                                                    {factor.display_name
                                                        ?? factor.feature}
                                                </p>

                                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                                    {factor.direction
                                                        === "INCREASES_DELAY"
                                                        ? "This factor pushed the estimate toward a later arrival."
                                                        : factor.direction
                                                            === "REDUCES_DELAY"
                                                            ? "This factor pushed the estimate toward an earlier arrival."
                                                            : "This factor influenced the current estimate."}
                                                </p>
                                            </div>
                                        ))}
                                </div>

                                {result.diagnostics
                                    .prediction_explanation
                                    .interpretation && (
                                        <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                                            {
                                                result.diagnostics
                                                    .prediction_explanation
                                                    .interpretation
                                            }
                                        </p>
                                    )}
                            </div>
                        )}


                    {/* Input Coverage */}
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Input Coverage
                                </p>

                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    {
                                        result.input_quality
                                            .feature_completeness_pct
                                    }
                                    %
                                </p>

                                <p className="mt-1 text-sm text-gray-600">
                                    Share of model features
                                    successfully supplied.
                                </p>
                            </div>


                        </div>

                        {(
                            result.input_quality
                                .missing_features.length > 0
                            || result.input_quality
                                .missing_critical_features.length > 0
                            || Object.keys(
                                result.input_quality
                                    .unknown_categories,
                            ).length > 0
                        ) && (
                                <details className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50">
                                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-yellow-900">
                                        Technical input notes
                                    </summary>

                                    <div className="border-t border-yellow-200 p-4">
                                        <p className="font-semibold text-yellow-900">
                                            Input Quality Notes
                                        </p>

                                        {result.input_quality
                                            .missing_critical_features
                                            .length > 0 && (
                                                <p className="mt-2 text-sm text-yellow-900">
                                                    Missing critical features:{" "}
                                                    {result.input_quality
                                                        .missing_critical_features
                                                        .join(", ")}
                                                </p>
                                            )}

                                        {result.input_quality
                                            .missing_features
                                            .length > 0 && (
                                                <p className="mt-2 text-sm text-yellow-900">
                                                    Missing features:{" "}
                                                    {result.input_quality
                                                        .missing_features
                                                        .join(", ")}
                                                </p>
                                            )}

                                        {Object.keys(
                                            result.input_quality
                                                .unknown_categories,
                                        ).length > 0 && (
                                                <div className="mt-3 text-sm text-yellow-900">
                                                    <p className="font-medium">
                                                        Categories not recognized
                                                        by the served model:
                                                    </p>

                                                    <ul className="mt-1 list-disc pl-5">
                                                        {Object.entries(
                                                            result.input_quality
                                                                .unknown_categories,
                                                        ).map(
                                                            ([key, value]) => (
                                                                <li key={key}>
                                                                    {key}:{" "}
                                                                    {String(value)}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                    </div>
                                </details>
                            )}
                    </div>


                    {/* Limitations */}
                    {visibleLimitations.length > 0 && (
                        <details className="rounded-2xl border border-yellow-200 bg-yellow-50">
                            <summary className="cursor-pointer px-4 py-3 font-semibold text-yellow-900">
                                Forecast limitations
                            </summary>

                            <div className="border-t border-yellow-200 px-4 py-3">
                                <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900">
                                    {visibleLimitations.map(
                                        (limitation) => (
                                            <li key={limitation}>
                                                {limitation}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        </details>
                    )}


                    {/* Advanced Model Intelligence */}
                    {result.diagnostics && (
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">
                                        Model Intelligence
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-600">
                                        Technical explainability and
                                        model evaluation details.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAdvancedDetails(
                                            (current) => !current,
                                        )
                                    }
                                    className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
                                >
                                    {showAdvancedDetails
                                        ? "Hide Advanced Details"
                                        : "Show Advanced Details"}
                                </button>
                            </div>

                            {showAdvancedDetails && (
                                <div className="mt-5 grid gap-4 xl:grid-cols-2">

                                    {/* Explainability */}
                                    <div className="rounded-2xl border bg-gray-50 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Prediction Explainability
                                        </p>

                                        {result.diagnostics
                                            .prediction_explanation
                                            ?.explanation_available ? (
                                            <div className="mt-4 space-y-3">
                                                <p className="text-sm text-gray-600">
                                                    Method:{" "}
                                                    <span className="font-semibold text-gray-900">
                                                        {
                                                            result.diagnostics
                                                                .prediction_explanation
                                                                .method
                                                        }
                                                    </span>
                                                </p>

                                                {result.diagnostics
                                                    .prediction_explanation
                                                    .factors
                                                    .slice(0, 5)
                                                    .map((factor) => (
                                                        <div
                                                            key={`${factor.feature}-${factor.rank ?? 0}`}
                                                            className="rounded-xl border bg-white p-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-semibold">
                                                                        {factor.display_name
                                                                            ?? factor.feature}
                                                                    </p>

                                                                    <p className="text-xs text-gray-500">
                                                                        {
                                                                            factor.feature
                                                                        }
                                                                    </p>
                                                                </div>

                                                                <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                                                                    {factor.direction
                                                                        === "INCREASES_DELAY"
                                                                        ? "Pushes delay higher"
                                                                        : factor.direction
                                                                            === "REDUCES_DELAY"
                                                                            ? "Pulls delay lower"
                                                                            : factor.direction}
                                                                </span>
                                                            </div>

                                                            {factor.contribution
                                                                != null && (
                                                                    <p className="mt-2 text-sm text-gray-600">
                                                                        Contribution:{" "}
                                                                        <span className="font-semibold text-gray-900">
                                                                            {factor.contribution.toFixed(
                                                                                2,
                                                                            )}
                                                                            {" min"}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-xl border border-dashed bg-white p-4">
                                                <p className="font-semibold">
                                                    Explainability unavailable
                                                </p>

                                                <p className="mt-1 text-sm text-gray-600">
                                                    The served prediction
                                                    could not be safely
                                                    reconstructed for
                                                    explanation.
                                                </p>
                                            </div>
                                        )}
                                    </div>


                                    {/* Evaluation */}
                                    <div className="rounded-2xl border bg-gray-50 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Model Evaluation
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-gray-500">
                                            These values are evaluation
                                            errors in minutes, not an
                                            accuracy percentage. Lower is
                                            better.
                                        </p>

                                        {result.diagnostics
                                            .evaluation ? (
                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-xl bg-white p-3">
                                                    <p className="text-xs text-gray-500">
                                                        MAE
                                                    </p>

                                                    <p className="mt-1 text-xl font-bold">
                                                        {result.diagnostics
                                                            .evaluation
                                                            .mae_minutes
                                                            != null
                                                            ? `${result.diagnostics.evaluation.mae_minutes.toFixed(2)} min`
                                                            : "N/A"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Average absolute
                                                        prediction error.
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-white p-3">
                                                    <p className="text-xs text-gray-500">
                                                        RMSE
                                                    </p>

                                                    <p className="mt-1 text-xl font-bold">
                                                        {result.diagnostics
                                                            .evaluation
                                                            .rmse_minutes
                                                            != null
                                                            ? `${result.diagnostics.evaluation.rmse_minutes.toFixed(2)} min`
                                                            : "N/A"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Gives more weight
                                                        to larger errors.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-xl border border-dashed bg-white p-4">
                                                <p className="font-semibold">
                                                    Evaluation unavailable
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

        </section>
    );
}